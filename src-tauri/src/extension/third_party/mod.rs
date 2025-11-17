pub(crate) mod check;
pub(crate) mod install;

use super::Extension;
use super::LOCAL_QUERY_SOURCE_TYPE;
use super::PLUGIN_JSON_FILE_NAME;
use super::alter_extension_json_file;
use super::canonicalize_relative_icon_path;
use crate::common::document::DataSourceReference;
use crate::common::document::Document;
use crate::common::document::open;
use crate::common::error::SearchError;
use crate::common::search::QueryResponse;
use crate::common::search::QuerySource;
use crate::common::search::SearchQuery;
use crate::common::traits::SearchSource;
use crate::extension::ExtensionBundleIdBorrowed;
use crate::extension::ExtensionType;
use crate::extension::PLUGIN_JSON_FIELD_MINIMUM_COCO_VERSION;
use crate::extension::calculate_text_similarity;
use crate::extension::canonicalize_relative_page_path;
use crate::extension::is_extension_compatible;
use crate::util::platform::Platform;
use crate::util::version::COCO_VERSION;
use crate::util::version::parse_coco_semver;
use async_trait::async_trait;
use borrowme::ToOwned;
use check::general_check;
use function_name::named;
use semver::Version as SemVer;
use serde_json::Value as Json;
use std::io::ErrorKind;
use std::ops::Deref;
use std::path::Path;
use std::path::PathBuf;
use std::sync::Arc;
use std::sync::OnceLock;
use tauri::AppHandle;
use tauri::Manager;
use tauri::async_runtime;
use tauri_plugin_global_shortcut::GlobalShortcutExt;
use tauri_plugin_global_shortcut::ShortcutState;
use tokio::fs::read_dir;
use tokio::sync::RwLock;
use tokio::sync::RwLockWriteGuard;

pub(crate) fn get_third_party_extension_directory(tauri_app_handle: &AppHandle) -> PathBuf {
    let mut app_data_dir = tauri_app_handle.path().app_data_dir().expect(
        "User home directory not found, which should be impossible on desktop environments",
    );
    app_data_dir.push("third_party_extensions");

    app_data_dir
}

pub(crate) async fn load_third_party_extensions_from_directory(
    directory: &Path,
) -> Result<Vec<Extension>, String> {
    let mut extensions_dir_iter = read_dir(&directory).await.map_err(|e| e.to_string())?;
    let current_platform = Platform::current();

    let mut extensions = Vec::new();

    'developer: loop {
        let opt_developer_dir = extensions_dir_iter
            .next_entry()
            .await
            .map_err(|e| e.to_string())?;
        let Some(developer_dir) = opt_developer_dir else {
            break;
        };
        let developer_dir_file_type = developer_dir.file_type().await.map_err(|e| e.to_string())?;
        if !developer_dir_file_type.is_dir() {
            log::warn!(
                "file [{}] under the third party extension directory should be a directory, but it is not",
                developer_dir.file_name().display()
            );

            // Skip this file
            continue 'developer;
        }

        let mut developer_dir_iter = read_dir(&developer_dir.path())
            .await
            .map_err(|e| e.to_string())?;

        'extension: loop {
            let opt_extension_dir = developer_dir_iter
                .next_entry()
                .await
                .map_err(|e| e.to_string())?;
            let Some(extension_dir) = opt_extension_dir else {
                break 'extension;
            };
            let extension_dir_file_name = extension_dir
                .file_name()
                .into_string()
                .expect("extension directory name should be UTF-8 encoded");

            let extension_dir_file_type =
                extension_dir.file_type().await.map_err(|e| e.to_string())?;
            if !extension_dir_file_type.is_dir() {
                log::warn!(
                    "invalid extension [{}]: a valid extension should be a directory, but it is not",
                    extension_dir_file_name
                );

                // Skip invalid extension
                continue 'extension;
            }

            let plugin_json_file_path = {
                let mut path = extension_dir.path();
                path.push(PLUGIN_JSON_FILE_NAME);

                path
            };

            if !plugin_json_file_path.is_file() {
                log::warn!(
                    "invalid extension: [{}]: extension file [{}] should be a JSON file, but it is not",
                    extension_dir.file_name().display(),
                    plugin_json_file_path.display()
                );

                // Skip invalid extension
                continue 'extension;
            }

            let plugin_json_file_content = tokio::fs::read_to_string(&plugin_json_file_path)
                .await
                .map_err(|e| e.to_string())?;

            let plugin_json = match serde_json::from_str::<Json>(&plugin_json_file_content) {
                Ok(json) => json,
                Err(e) => {
                    log::warn!(
                        "invalid extension: [{}]: file [{}] is not a JSON, error: '{}'",
                        extension_dir_file_name,
                        plugin_json_file_path.display(),
                        e
                    );
                    continue 'extension;
                }
            };
            let opt_mcv: Option<SemVer> = {
                match plugin_json.get(PLUGIN_JSON_FIELD_MINIMUM_COCO_VERSION) {
                    None => None,
                    // NULL is considered None as well.
                    Some(Json::Null) => None,

                    Some(mcv_json) => {
                        let Some(mcv_str) = mcv_json.as_str() else {
                            log::warn!(
                                "invalid extension: [{}]: field [{}] is not a string",
                                extension_dir_file_name,
                                PLUGIN_JSON_FIELD_MINIMUM_COCO_VERSION
                            );
                            continue 'extension;
                        };

                        let Some(mcv) = parse_coco_semver(mcv_str) else {
                            log::warn!(
                                "invalid extension: [{}]: field [{}] has invalid version string",
                                extension_dir_file_name,
                                PLUGIN_JSON_FIELD_MINIMUM_COCO_VERSION
                            );
                            continue 'extension;
                        };

                        Some(mcv)
                    }
                }
            };

            let is_compatible: bool = match opt_mcv {
                Some(ref mcv) => COCO_VERSION.deref() >= mcv,
                None => true,
            };

            if !is_compatible {
                /*
                 * Extract only these field: [id, name, icon, type] from the JSON,
                 * then return a minimal Extension instance with these fields set:
                 *
                 * - `id` and `developer`: to make it identifiable
                 * - `name`, `icon` and `type`: to display it in the Extensions page
                 * - `minimum_coco_version`: so that we can check compatibility using it
                 */
                let Some(id) = plugin_json.get("id").and_then(|v| v.as_str()) else {
                    log::warn!(
                        "invalid extension: [{}]: field [id] is missing or not a string",
                        extension_dir_file_name,
                    );
                    continue 'extension;
                };

                let Some(name) = plugin_json.get("name").and_then(|v| v.as_str()) else {
                    log::warn!(
                        "invalid extension: [{}]: field [name] is missing or not a string",
                        extension_dir_file_name,
                    );
                    continue 'extension;
                };

                let Some(icon) = plugin_json.get("icon").and_then(|v| v.as_str()) else {
                    log::warn!(
                        "invalid extension: [{}]: field [icon] is missing or not a string",
                        extension_dir_file_name,
                    );
                    continue 'extension;
                };

                let Some(extension_type_str) = plugin_json.get("type").and_then(|v| v.as_str())
                else {
                    log::warn!(
                        "invalid extension: [{}]: field [type] is missing or not a string",
                        extension_dir_file_name,
                    );
                    continue 'extension;
                };

                let extension_type: ExtensionType = match serde_plain::from_str(extension_type_str)
                {
                    Ok(t) => t,
                    // Future Coco may have new Extension types that the we don't know
                    //
                    // This should be the only place where `ExtensionType::Unknown`
                    // could be constructed.
                    Err(_e) => ExtensionType::Unknown,
                };

                // We don't extract the developer ID from the plugin.json to rely
                // less on it.
                let developer = developer_dir
                    .file_name()
                    .into_string()
                    .expect("developer ID should be UTF-8 encoded");

                let mut incompatible_extension = Extension {
                    id: id.to_string(),
                    name: name.to_string(),
                    icon: icon.to_string(),
                    r#type: extension_type,
                    developer: Some(developer),
                    description: String::new(),
                    enabled: false,
                    platforms: None,
                    action: None,
                    quicklink: None,
                    commands: None,
                    scripts: None,
                    quicklinks: None,
                    views: None,
                    alias: None,
                    hotkey: None,
                    settings: None,
                    page: None,
                    ui: None,
                    permission: None,
                    minimum_coco_version: opt_mcv,
                    screenshots: None,
                    url: None,
                    version: None,
                };

                // Turn icon path into an absolute path if it is a valid relative path
                canonicalize_relative_icon_path(
                    &extension_dir.path(),
                    &mut incompatible_extension,
                )?;
                // No need to canonicalize the path field as it is not set

                extensions.push(incompatible_extension);
                continue 'extension;
            }

            /*
             * This is a compatible extension.
             */
            let mut extension = match serde_json::from_str::<Extension>(&plugin_json_file_content) {
                Ok(extension) => extension,
                Err(e) => {
                    log::warn!(
                        "invalid extension: [{}]: cannot parse file [{}] as a [struct Extension], error: '{}'",
                        extension_dir_file_name,
                        plugin_json_file_path.display(),
                        e
                    );
                    continue 'extension;
                }
            };

            /* Check starts here */
            if extension.id != extension_dir_file_name {
                log::warn!(
                    "extension under [{}:{}] has an ID that is not same as the [{}]",
                    developer_dir.file_name().display(),
                    extension_dir_file_name,
                    extension.id,
                );

                continue;
            }

            // Extension should be unique
            if extensions.iter().any(|ext: &Extension| {
                ext.id == extension.id && ext.developer == extension.developer
            }) {
                log::warn!(
                    "an extension with the same bundle ID [ID {}, developer {:?}] already exists, skip this one",
                    extension.id,
                    extension.developer
                );

                continue;
            }

            if let Err(error_msg) = general_check(&extension) {
                log::warn!("{}", error_msg);

                // Skip invalid extension
                continue;
            }

            if let Some(ref platforms) = extension.platforms {
                if !platforms.contains(&current_platform) {
                    log::warn!(
                        "installed third-party extension [developer {}, ID {}] is not compatible with current platform, either user messes our directory or something wrong with our extension check",
                        extension
                            .developer
                            .as_ref()
                            .expect("third party extension should have [developer] set"),
                        extension.id
                    );
                    continue;
                }
            }
            /* Check ends here */

            // Turn it into an absolute path if it is a valid relative path because frontend code needs this.
            canonicalize_relative_icon_path(&extension_dir.path(), &mut extension)?;
            canonicalize_relative_page_path(&extension_dir.path(), &mut extension)?;

            extensions.push(extension);
        }
    }

    log::debug!(
        "loaded extensions: {:?}",
        extensions
            .iter()
            .map(|ext| ext.id.as_str())
            .collect::<Vec<_>>()
    );

    Ok(extensions)
}

/// All the third-party extensions will be registered as one search source.
///
/// Since some `#[tauri::command]`s need to access it, we store it in a global
/// static variable as well.
#[derive(Debug, Clone)]
pub(crate) struct ThirdPartyExtensionsSearchSource {
    inner: Arc<ThirdPartyExtensionsSearchSourceInner>,
}

impl ThirdPartyExtensionsSearchSource {
    /// Return a mutable reference to the extension specified by `bundle_id` if it exists.
    fn get_extension_mut<'lock, 'extensions>(
        extensions_write_lock: &'lock mut RwLockWriteGuard<'extensions, Vec<Extension>>,
        bundle_id: &ExtensionBundleIdBorrowed<'_>,
    ) -> Option<&'lock mut Extension> {
        let index = extensions_write_lock.iter().position(|ext| {
            ext.id == bundle_id.extension_id && ext.developer.as_deref() == bundle_id.developer
        })?;

        let extension = extensions_write_lock
            .get_mut(index)
            .expect("just checked this extension exists");

        let Some(sub_extension_id) = bundle_id.sub_extension_id else {
            return Some(extension);
        };

        extension.get_sub_extension_mut(sub_extension_id)
    }

    /// Difference between this function and `enable_extension()`
    ///
    /// This function does the actual job, i.e., to enable/activate the extension.
    /// `enable_extension()` needs to do 1 extra thing, update the enabled state.
    ///
    /// Note that when you enable a parent extension, its **enabled** children extensions
    /// should also be enabled.
    #[async_recursion::async_recursion]
    async fn _enable_extension(
        tauri_app_handle: &AppHandle,
        extension: &Extension,
    ) -> Result<(), String> {
        if extension.supports_alias_hotkey() {
            if let Some(ref hotkey) = extension.hotkey {
                let on_opened = extension.on_opened().unwrap_or_else(|| panic!( "extension has hotkey, but on_open() returns None, extension ID [{}], extension type [{:?}]", extension.id, extension.r#type));
                let extension_id_clone = extension.id.clone();

                tauri_app_handle
                    .global_shortcut()
                    .on_shortcut(hotkey.as_str(), move |tauri_app_handle, _hotkey, event| {
                        let on_opened_clone = on_opened.clone();
                        let extension_id_clone = extension_id_clone.clone();
                        let app_handle_clone = tauri_app_handle.clone();

                        if event.state() == ShortcutState::Pressed {
                            async_runtime::spawn(async move {
                                let result = open(app_handle_clone, on_opened_clone, None).await;
                                if let Err(msg) = result {
                                    log::warn!(
                                        "failed to open extension [{}], error [{}]",
                                        extension_id_clone,
                                        msg
                                    );
                                }
                            });
                        }
                    })
                    .map_err(|e| e.to_string())?;
            }
        }

        // We also need to enable its **enabled** children extensions.
        if extension.r#type.contains_sub_items() {
            if let Some(commands) = &extension.commands {
                for command in commands.iter().filter(|ext| ext.enabled) {
                    Self::_enable_extension(&tauri_app_handle, command).await?;
                }
            }

            if let Some(scripts) = &extension.scripts {
                for script in scripts.iter().filter(|ext| ext.enabled) {
                    Self::_enable_extension(&tauri_app_handle, script).await?;
                }
            }

            if let Some(quicklinks) = &extension.quicklinks {
                for quicklink in quicklinks.iter().filter(|ext| ext.enabled) {
                    Self::_enable_extension(&tauri_app_handle, quicklink).await?;
                }
            }
            if let Some(views) = &extension.views {
                for view in views.iter().filter(|ext| ext.enabled) {
                    Self::_enable_extension(&tauri_app_handle, view).await?;
                }
            }
        }

        Ok(())
    }

    /// Difference between this function and `disable_extension()`
    ///
    /// See the doc of `_enable_extension()`.
    ///
    /// Note that when you disable a parent extension, its **enabled** children extensions
    /// should also be disabled.
    #[async_recursion::async_recursion]
    async fn _disable_extension(
        tauri_app_handle: &AppHandle,
        extension: &Extension,
    ) -> Result<(), String> {
        if let Some(ref hotkey) = extension.hotkey {
            tauri_app_handle
                .global_shortcut()
                .unregister(hotkey.as_str())
                .map_err(|e| e.to_string())?;
        }

        // We also need to disable its **enabled** children extensions.
        if extension.r#type.contains_sub_items() {
            if let Some(commands) = &extension.commands {
                for command in commands.iter().filter(|ext| ext.enabled) {
                    Self::_disable_extension(tauri_app_handle, command).await?;
                }
            }

            if let Some(scripts) = &extension.scripts {
                for script in scripts.iter().filter(|ext| ext.enabled) {
                    Self::_disable_extension(tauri_app_handle, script).await?;
                }
            }

            if let Some(quicklinks) = &extension.quicklinks {
                for quicklink in quicklinks.iter().filter(|ext| ext.enabled) {
                    Self::_disable_extension(tauri_app_handle, quicklink).await?;
                }
            }
            if let Some(views) = &extension.views {
                for view in views.iter().filter(|ext| ext.enabled) {
                    Self::_disable_extension(tauri_app_handle, view).await?;
                }
            }
        }

        Ok(())
    }

    pub(super) fn new(extensions: Vec<Extension>) -> Self {
        Self {
            inner: Arc::new(ThirdPartyExtensionsSearchSourceInner {
                extensions: RwLock::new(extensions),
            }),
        }
    }

    /// Acquire the write lock to the extension list.
    pub(crate) async fn write_lock(&self) -> RwLockWriteGuard<'_, Vec<Extension>> {
        self.inner.extensions.write().await
    }

    #[named]
    pub(super) async fn enable_extension(
        &self,
        tauri_app_handle: &AppHandle,
        bundle_id: &ExtensionBundleIdBorrowed<'_>,
    ) -> Result<(), String> {
        let mut extensions_write_lock = self.inner.extensions.write().await;
        let extension =
            Self::get_extension_mut(&mut extensions_write_lock, bundle_id).ok_or_else(|| {
                format!(
                    "{} invoked with an extension that does not exist [{:?}]",
                    function_name!(),
                    bundle_id
                )
            })?;

        let update_extension = |ext: &mut Extension| -> Result<(), String> {
            if ext.enabled {
                return Err(format!(
                    "{} invoked with an extension that is already enabled [{:?}]",
                    function_name!(),
                    bundle_id
                ));
            }
            ext.enabled = true;

            Ok(())
        };

        update_extension(extension)?;
        alter_extension_json_file(
            &get_third_party_extension_directory(tauri_app_handle),
            bundle_id,
            update_extension,
        )?;
        Self::_enable_extension(tauri_app_handle, extension).await?;

        Ok(())
    }

    #[named]
    pub(super) async fn disable_extension(
        &self,
        tauri_app_handle: &AppHandle,
        bundle_id: &ExtensionBundleIdBorrowed<'_>,
    ) -> Result<(), String> {
        let mut extensions_write_lock = self.inner.extensions.write().await;
        let extension =
            Self::get_extension_mut(&mut extensions_write_lock, bundle_id).ok_or_else(|| {
                format!(
                    "{} invoked with an extension that does not exist [{:?}]",
                    function_name!(),
                    bundle_id
                )
            })?;

        let update_extension = |ext: &mut Extension| -> Result<(), String> {
            if !ext.enabled {
                return Err(format!(
                    "{} invoked with an extension that is already enabled [{:?}]",
                    function_name!(),
                    bundle_id
                ));
            }
            ext.enabled = false;

            Ok(())
        };

        update_extension(extension)?;
        alter_extension_json_file(
            &get_third_party_extension_directory(tauri_app_handle),
            bundle_id,
            update_extension,
        )?;
        Self::_disable_extension(tauri_app_handle, extension).await?;

        Ok(())
    }

    #[named]
    pub(super) async fn set_extension_alias(
        &self,
        tauri_app_handle: &AppHandle,
        bundle_id: &ExtensionBundleIdBorrowed<'_>,
        alias: &str,
    ) -> Result<(), String> {
        let mut extensions_write_lock = self.inner.extensions.write().await;
        let extension =
            Self::get_extension_mut(&mut extensions_write_lock, bundle_id).ok_or_else(|| {
                format!(
                    "{} invoked with an extension that does not exist [{:?}]",
                    function_name!(),
                    bundle_id
                )
            })?;

        let update_extension = |ext: &mut Extension| -> Result<(), String> {
            ext.alias = Some(alias.to_string());
            Ok(())
        };

        update_extension(extension)?;
        alter_extension_json_file(
            &get_third_party_extension_directory(tauri_app_handle),
            bundle_id,
            update_extension,
        )?;

        Ok(())
    }

    /// Initialize the third-party extensions, which literally means
    /// enabling/activating the enabled extensions.
    pub(crate) async fn init(&self, tauri_app_handle: &AppHandle) -> Result<(), String> {
        let extensions_read_lock = self.inner.extensions.read().await;

        for extension in extensions_read_lock.iter().filter(|ext| ext.enabled) {
            Self::_enable_extension(tauri_app_handle, extension).await?;
        }

        Ok(())
    }

    #[named]
    pub(super) async fn register_extension_hotkey(
        &self,
        tauri_app_handle: &AppHandle,
        bundle_id: &ExtensionBundleIdBorrowed<'_>,
        hotkey: &str,
    ) -> Result<(), String> {
        self.unregister_extension_hotkey(tauri_app_handle, bundle_id)
            .await?;

        let mut extensions_write_lock = self.inner.extensions.write().await;
        let extension =
            Self::get_extension_mut(&mut extensions_write_lock, bundle_id).ok_or_else(|| {
                format!(
                    "{} invoked with an extension that does not exist [{:?}]",
                    function_name!(),
                    bundle_id
                )
            })?;

        let update_extension = |ext: &mut Extension| -> Result<(), String> {
            ext.hotkey = Some(hotkey.into());
            Ok(())
        };

        // Update extension (memory and file)
        update_extension(extension)?;
        alter_extension_json_file(
            &get_third_party_extension_directory(tauri_app_handle),
            bundle_id,
            update_extension,
        )?;

        // Set hotkey
        let on_opened = extension.on_opened().unwrap_or_else(|| panic!(
            "setting hotkey for an extension that cannot be opened, extension ID [{:?}], extension type [{:?}]", bundle_id, extension.r#type,
        ));

        let bundle_id_owned = bundle_id.to_owned();
        tauri_app_handle
            .global_shortcut()
            .on_shortcut(hotkey, move |tauri_app_handle, _hotkey, event| {
                let on_opened_clone = on_opened.clone();
                let bundle_id_clone = bundle_id_owned.clone();
                let app_handle_clone = tauri_app_handle.clone();

                if event.state() == ShortcutState::Pressed {
                    async_runtime::spawn(async move {
                        let result = open(app_handle_clone, on_opened_clone, None).await;
                        if let Err(msg) = result {
                            log::warn!(
                                "failed to open extension [{:?}], error [{}]",
                                bundle_id_clone,
                                msg
                            );
                        }
                    });
                }
            })
            .map_err(|e| e.to_string())?;

        Ok(())
    }

    /// NOTE: this function won't error out if the extension specified by `extension_id`
    /// has no hotkey set because we need it to behave like this.
    #[named]
    pub(super) async fn unregister_extension_hotkey(
        &self,
        tauri_app_handle: &AppHandle,
        bundle_id: &ExtensionBundleIdBorrowed<'_>,
    ) -> Result<(), String> {
        let mut extensions_write_lock = self.inner.extensions.write().await;
        let extension =
            Self::get_extension_mut(&mut extensions_write_lock, bundle_id).ok_or_else(|| {
                format!(
                    "{} invoked with an extension that does not exist [{:?}]",
                    function_name!(),
                    bundle_id
                )
            })?;

        let Some(hotkey) = extension.hotkey.clone() else {
            log::warn!(
                "extension [{:?}] has no hotkey set, but we are trying to unregister it",
                bundle_id
            );
            return Ok(());
        };

        let update_extension = |extension: &mut Extension| -> Result<(), String> {
            extension.hotkey = None;
            Ok(())
        };

        update_extension(extension)?;
        alter_extension_json_file(
            &get_third_party_extension_directory(tauri_app_handle),
            bundle_id,
            update_extension,
        )?;

        // Set hotkey
        tauri_app_handle
            .global_shortcut()
            .unregister(hotkey.as_str())
            .map_err(|e| e.to_string())?;

        Ok(())
    }

    #[named]
    pub(super) async fn is_extension_enabled(
        &self,
        bundle_id: &ExtensionBundleIdBorrowed<'_>,
    ) -> Result<bool, String> {
        let extensions_read_lock = self.inner.extensions.read().await;

        let root_extension = extensions_read_lock
            .iter()
            .find(|root_ext| {
                root_ext.id == bundle_id.extension_id
                    && root_ext.developer.as_deref() == bundle_id.developer
            })
            .ok_or_else(|| {
                format!(
                    "{} invoked with an extension that does not exist [{:?}]",
                    function_name!(),
                    bundle_id
                )
            })?;

        let Some(sub_extension_id) = bundle_id.sub_extension_id else {
            // bundle_id points to a root extension, so our job is done.
            return Ok(root_extension.enabled);
        };

        let sub_extension = root_extension
            .get_sub_extension(sub_extension_id)
            .ok_or_else(|| {
                format!(
                    "{} invoked with an extension that does not exist [{:?}]",
                    function_name!(),
                    bundle_id
                )
            })?;

        // For a sub-extension, it is enabled iff:
        //
        // 1. Its parent extension is enabled, and
        // 2. It is enabled
        Ok(root_extension.enabled && sub_extension.enabled)
    }

    pub(crate) async fn extension_exists(&self, developer: &str, extension_id: &str) -> bool {
        let read_lock_guard = self.inner.extensions.read().await;
        read_lock_guard
            .iter()
            .any(|ext| ext.developer.as_deref() == Some(developer) && ext.id == extension_id)
    }

    pub(crate) async fn uninstall_extension(
        &self,
        tauri_app_handle: &AppHandle,
        developer: &str,
        extension_id: &str,
    ) -> Result<(), String> {
        let mut write_lock = self.inner.extensions.write().await;

        let Some(index) = write_lock
            .iter()
            .position(|ext| ext.developer.as_deref() == Some(developer) && ext.id == extension_id)
        else {
            return Err(format!(
                "The extension we are trying to uninstall [{}/{}] does not exist",
                developer, extension_id
            ));
        };
        let deleted_extension = write_lock.remove(index);

        let extension_dir = {
            let mut path = get_third_party_extension_directory(&tauri_app_handle);
            path.push(developer);
            path.push(extension_id);

            path
        };

        if let Err(e) = tokio::fs::remove_dir_all(extension_dir.as_path()).await {
            let error_kind = e.kind();
            if error_kind == ErrorKind::NotFound {
                // We accept this error because we do want it to not exist.  But
                // since it is not a state we expect, throw a warning.
                log::warn!(
                    "trying to uninstalling extension [developer {} id {}], but its directory does not exist",
                    developer,
                    extension_id
                );
            } else {
                return Err(format!(
                    "failed to uninstall extension [developer {} id {}] due to error {}",
                    developer, extension_id, e
                ));
            }
        }

        // Unregister the extension hotkey, if set.
        //
        // Unregistering hotkey is the only thing that we will do when we disable
        // an extension, so we directly use this function here even though "disabling"
        // the extension that one is trying to uninstall does not make too much sense.
        Self::_disable_extension(&tauri_app_handle, &deleted_extension).await?;

        Ok(())
    }

    /// Take a point-in-time snapshot at the extension list and return it.
    pub(crate) async fn extensions_snapshot(&self) -> Vec<Extension> {
        self.inner.extensions.read().await.clone()
    }
}

pub(crate) static THIRD_PARTY_EXTENSIONS_SEARCH_SOURCE: OnceLock<ThirdPartyExtensionsSearchSource> =
    OnceLock::new();

#[derive(Debug)]
struct ThirdPartyExtensionsSearchSourceInner {
    extensions: RwLock<Vec<Extension>>,
}

#[async_trait]
impl SearchSource for ThirdPartyExtensionsSearchSource {
    fn get_type(&self) -> QuerySource {
        QuerySource {
            r#type: LOCAL_QUERY_SOURCE_TYPE.into(),
            name: hostname::get()
                .unwrap_or("My Computer".into())
                .to_string_lossy()
                .into(),
            id: "extensions".into(),
        }
    }

    async fn search(
        &self,
        _tauri_app_handle: AppHandle,
        query: SearchQuery,
    ) -> Result<QueryResponse, SearchError> {
        let Some(query_string) = query.query_strings.get("query") else {
            return Ok(QueryResponse {
                source: self.get_type(),
                hits: Vec::new(),
                total_hits: 0,
            });
        };

        let opt_data_source = query
            .query_strings
            .get("datasource")
            .map(|owned_str| owned_str.to_string());

        let query_lower = query_string.to_lowercase();
        let inner_clone = Arc::clone(&self.inner);

        let closure = move || {
            let mut hits = Vec::new();
            let extensions_read_lock =
                futures::executor::block_on(async { inner_clone.extensions.read().await });

            for extension in extensions_read_lock
                .iter()
                // field minimum_coco_extension is only set for main extensions.
                .filter(|ext| ext.enabled && is_extension_compatible(Extension::clone(ext)))
            {
                if extension.r#type.contains_sub_items() {
                    let opt_main_extension_lowercase_name =
                        if extension.r#type == ExtensionType::Extension {
                            Some(extension.name.to_lowercase())
                        } else {
                            // None if it is of type `ExtensionType::Group`
                            None
                        };

                    if let Some(ref commands) = extension.commands {
                        for command in commands.iter().filter(|cmd| cmd.enabled) {
                            if let Some(hit) = extension_to_hit(
                                command,
                                &query_lower,
                                opt_data_source.as_deref(),
                                opt_main_extension_lowercase_name.as_deref(),
                            ) {
                                hits.push(hit);
                            }
                        }
                    }

                    if let Some(ref scripts) = extension.scripts {
                        for script in scripts.iter().filter(|script| script.enabled) {
                            if let Some(hit) = extension_to_hit(
                                script,
                                &query_lower,
                                opt_data_source.as_deref(),
                                opt_main_extension_lowercase_name.as_deref(),
                            ) {
                                hits.push(hit);
                            }
                        }
                    }

                    if let Some(ref quicklinks) = extension.quicklinks {
                        for quicklink in quicklinks.iter().filter(|link| link.enabled) {
                            if let Some(hit) = extension_to_hit(
                                quicklink,
                                &query_lower,
                                opt_data_source.as_deref(),
                                opt_main_extension_lowercase_name.as_deref(),
                            ) {
                                hits.push(hit);
                            }
                        }
                    }

                    if let Some(ref views) = extension.views {
                        for view in views.iter().filter(|view| view.enabled) {
                            if let Some(hit) = extension_to_hit(
                                view,
                                &query_lower,
                                opt_data_source.as_deref(),
                                opt_main_extension_lowercase_name.as_deref(),
                            ) {
                                hits.push(hit);
                            }
                        }
                    }
                } else {
                    if let Some(hit) =
                        extension_to_hit(extension, &query_lower, opt_data_source.as_deref(), None)
                    {
                        hits.push(hit);
                    }
                }
            }

            hits
        };

        let join_result = tokio::task::spawn_blocking(closure).await;

        let hits = match join_result {
            Ok(hits) => hits,
            Err(e) => std::panic::resume_unwind(e.into_panic()),
        };
        let total_hits = hits.len();

        Ok(QueryResponse {
            source: self.get_type(),
            hits,
            total_hits,
        })
    }
}

#[tauri::command]
pub(crate) async fn uninstall_extension(
    tauri_app_handle: AppHandle,
    developer: String,
    extension_id: String,
) -> Result<(), String> {
    THIRD_PARTY_EXTENSIONS_SEARCH_SOURCE
        .get()
        .expect("global third party search source not set")
        .uninstall_extension(&tauri_app_handle, &developer, &extension_id)
        .await
}

/// Argument `opt_main_extension_lowercase_name`: If `extension` is a sub-extension
/// of an `extension` type extension, then this argument contains the lowercase
/// name of that extension. Otherwise, None.
///
/// This argument is needed as an "extension" type extension should return all its
/// sub-extensions when the query string matches its name. To do this, we pass the
/// extension name, score it and take that into account.
pub(crate) fn extension_to_hit(
    extension: &Extension,
    query_lower: &str,
    opt_data_source: Option<&str>,
    opt_main_extension_lowercase_name: Option<&str>,
) -> Option<(Document, f64)> {
    if !extension.searchable() {
        return None;
    }

    let extension_type_string = extension.r#type.to_string();

    if let Some(data_source) = opt_data_source {
        let document_data_source_id = extension_type_string.as_str();

        if document_data_source_id != data_source {
            return None;
        }
    }

    let mut total_score = 0.0;

    // Score based on title match
    // Title is considered more important, so it gets a higher weight.
    if let Some(title_score) =
        calculate_text_similarity(&query_lower, &extension.name.to_lowercase())
    {
        total_score += title_score;
    }

    // Score based on alias match if available
    // Alias is considered less important than title, so it gets a lower weight.
    if let Some(alias) = &extension.alias {
        if let Some(alias_score) = calculate_text_similarity(&query_lower, &alias.to_lowercase()) {
            total_score += alias_score;
        }
    }

    // An "extension" type extension should return all its
    // sub-extensions when the query string matches its ID.
    // To do this, we score the extension ID and take that
    // into account.
    if let Some(main_extension_lowercase_id) = opt_main_extension_lowercase_name {
        if let Some(main_extension_score) =
            calculate_text_similarity(&query_lower, main_extension_lowercase_id)
        {
            total_score += main_extension_score;
        }
    }

    // Only include if there's some relevance (score is meaningfully positive)
    if total_score > 0.01 {
        let on_opened = extension.on_opened().unwrap_or_else(|| {
            panic!(
                "extension (id [{}], type [{:?}]) is searchable, and should have a valid on_opened",
                extension.id, extension.r#type
            )
        });
        let url = on_opened.url();

        let document = Document {
            id: extension.id.clone(),
            title: Some(extension.name.clone()),
            icon: Some(extension.icon.clone()),
            on_opened: Some(on_opened),
            url: Some(url),
            category: Some(extension_type_string.clone()),
            source: Some(DataSourceReference {
                id: Some(extension_type_string.clone()),
                name: Some(extension_type_string.clone()),
                icon: None,
                r#type: Some(extension_type_string),
            }),

            ..Default::default()
        };

        Some((document, total_score))
    } else {
        None
    }
}
