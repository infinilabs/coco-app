pub(crate) mod install;

use super::Extension;
use super::ExtensionType;
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
use crate::util::platform::Platform;
use async_trait::async_trait;
use borrowme::ToOwned;
use function_name::named;
use std::ffi::OsStr;
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

pub(crate) async fn list_third_party_extensions(
    directory: &Path,
) -> Result<(bool, Vec<Extension>), String> {
    let mut found_invalid_extensions = false;

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
            found_invalid_extensions = true;
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

            let extension_dir_file_type =
                extension_dir.file_type().await.map_err(|e| e.to_string())?;
            if !extension_dir_file_type.is_dir() {
                found_invalid_extensions = true;
                log::warn!(
                    "invalid extension [{}]: a valid extension should be a directory, but it is not",
                    extension_dir.file_name().display()
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
                found_invalid_extensions = true;
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
            let mut extension = match serde_json::from_str::<Extension>(&plugin_json_file_content) {
                Ok(extension) => extension,
                Err(e) => {
                    found_invalid_extensions = true;
                    log::warn!(
                        "invalid extension: [{}]: extension file [{}] is invalid, error: '{}'",
                        extension_dir.file_name().display(),
                        plugin_json_file_path.display(),
                        e
                    );
                    continue 'extension;
                }
            };

            // Turn it into an absolute path if it is a valid relative path because frontend code need this.
            canonicalize_relative_icon_path(&extension_dir.path(), &mut extension)?;

            if !validate_extension(
                &extension,
                &extension_dir.file_name(),
                &extensions,
                current_platform,
            ) {
                found_invalid_extensions = true;
                // Skip invalid extension
                continue;
            }

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

    Ok((found_invalid_extensions, extensions))
}

/// Helper function to validate `extension`, return `true` if it is valid.
fn validate_extension(
    extension: &Extension,
    extension_dir_name: &OsStr,
    listed_extensions: &[Extension],
    current_platform: Platform,
) -> bool {
    if OsStr::new(&extension.id) != extension_dir_name {
        log::warn!(
            "invalid extension []: id [{}] and extension directory name [{}] do not match",
            extension.id,
            extension_dir_name.display()
        );
        return false;
    }

    // Extension ID should be unique
    if listed_extensions.iter().any(|ext| ext.id == extension.id) {
        log::warn!(
            "invalid extension []: extension with id [{}] already exists",
            extension.id,
        );
        return false;
    }

    if !validate_extension_or_sub_item(extension) {
        return false;
    }

    // Extension is incompatible
    if let Some(ref platforms) = extension.platforms {
        if !platforms.contains(&current_platform) {
            log::warn!(
                "extension [{}] is not compatible with the current platform [{}], it is available to {:?}",
                extension.id,
                current_platform,
                platforms
                    .iter()
                    .map(|os| os.to_string())
                    .collect::<Vec<_>>()
            );
            return false;
        }
    }

    if let Some(ref commands) = extension.commands {
        if !validate_sub_items(&extension.id, commands) {
            return false;
        }
    }

    if let Some(ref scripts) = extension.scripts {
        if !validate_sub_items(&extension.id, scripts) {
            return false;
        }
    }

    if let Some(ref quicklinks) = extension.quicklinks {
        if !validate_sub_items(&extension.id, quicklinks) {
            return false;
        }
    }

    true
}

/// Checks that can be performed against an extension or a sub item.
fn validate_extension_or_sub_item(extension: &Extension) -> bool {
    // If field `action` is Some, then it should be a Command
    if extension.action.is_some() && extension.r#type != ExtensionType::Command {
        log::warn!(
            "invalid extension [{}], [action] is set for a non-Command extension",
            extension.id
        );
        return false;
    }

    if extension.r#type == ExtensionType::Command && extension.action.is_none() {
        log::warn!(
            "invalid extension [{}], [action] should be set for a Command extension",
            extension.id
        );
        return false;
    }

    // If field `quicklink` is Some, then it should be a Quicklink
    if extension.quicklink.is_some() && extension.r#type != ExtensionType::Quicklink {
        log::warn!(
            "invalid extension [{}], [quicklink] is set for a non-Quicklink extension",
            extension.id
        );
        return false;
    }

    if extension.r#type == ExtensionType::Quicklink && extension.quicklink.is_none() {
        log::warn!(
            "invalid extension [{}], [quicklink] should be set for a Quicklink extension",
            extension.id
        );
        return false;
    }

    // Group and Extension cannot have alias
    if extension.alias.is_some() {
        if extension.r#type == ExtensionType::Group || extension.r#type == ExtensionType::Extension
        {
            log::warn!(
                "invalid extension [{}], extension of type [{:?}] cannot have alias",
                extension.id,
                extension.r#type
            );
            return false;
        }
    }

    // Group and Extension cannot have hotkey
    if extension.hotkey.is_some() {
        if extension.r#type == ExtensionType::Group || extension.r#type == ExtensionType::Extension
        {
            log::warn!(
                "invalid extension [{}], extension of type [{:?}] cannot have hotkey",
                extension.id,
                extension.r#type
            );
            return false;
        }
    }

    if extension.commands.is_some() || extension.scripts.is_some() || extension.quicklinks.is_some()
    {
        if extension.r#type != ExtensionType::Group && extension.r#type != ExtensionType::Extension
        {
            log::warn!(
                "invalid extension [{}], only extension of type [Group] and [Extension] can have sub-items",
                extension.id,
            );
            return false;
        }
    }

    true
}

/// Helper function to check sub-items.
fn validate_sub_items(extension_id: &str, sub_items: &[Extension]) -> bool {
    for (sub_item_index, sub_item) in sub_items.iter().enumerate() {
        // If field `action` is Some, then it should be a Command
        if sub_item.action.is_some() && sub_item.r#type != ExtensionType::Command {
            log::warn!(
                "invalid extension sub-item [{}-{}]: [action] is set for a non-Command extension",
                extension_id,
                sub_item.id
            );
            return false;
        }

        if sub_item.r#type == ExtensionType::Group || sub_item.r#type == ExtensionType::Extension {
            log::warn!(
                "invalid extension sub-item [{}-{}]: sub-item should not be of type [Group] or [Extension]",
                extension_id,
                sub_item.id
            );
            return false;
        }

        let sub_item_with_same_id_count = sub_items
            .iter()
            .enumerate()
            .filter(|(_idx, ext)| ext.id == sub_item.id)
            .filter(|(idx, _ext)| *idx != sub_item_index)
            .count();
        if sub_item_with_same_id_count != 0 {
            log::warn!(
                "invalid extension [{}]: found more than one sub-items with the same ID [{}]",
                extension_id,
                sub_item.id
            );
            return false;
        }

        if !validate_extension_or_sub_item(sub_item) {
            return false;
        }

        if sub_item.platforms.is_some() {
            log::warn!(
                "invalid extension [{}]: key [platforms] should not be set in sub-items",
                extension_id,
            );
            return false;
        }
    }

    true
}

/// All the third-party extensions will be registered as one search source.
///
/// Since some `#[tauri::command]`s need to access it, we store it in a global
/// static variable as well.
#[derive(Debug, Clone)]
pub(super) struct ThirdPartyExtensionsSearchSource {
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
    pub(super) async fn init(&self, tauri_app_handle: &AppHandle) -> Result<(), String> {
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

    /// Add `extension` to the **in-memory** extension list.
    pub(crate) async fn add_extension(&self, extension: Extension) {
        assert!(
            extension.developer.is_some(),
            "loaded third party extension should have its developer set"
        );

        let mut write_lock_guard = self.inner.extensions.write().await;
        if write_lock_guard
            .iter()
            .any(|ext| ext.developer == extension.developer && ext.id == extension.id)
        {
            panic!(
                "extension [{}/{}] already installed",
                extension
                    .developer
                    .as_ref()
                    .expect("just checked it is Some"),
                extension.id
            );
        }
        write_lock_guard.push(extension);
    }

    /// Remove `extension` from the **in-memory** extension list.
    pub(crate) async fn remove_extension(&self, developer: &str, extension_id: &str) -> Extension {
        let mut write_lock_guard = self.inner.extensions.write().await;
        let Some(index) = write_lock_guard
            .iter()
            .position(|ext| ext.developer.as_deref() == Some(developer) && ext.id == extension_id)
        else {
            panic!(
                "extension [{}/{}] not installed, but we are trying to remove it",
                developer, extension_id
            );
        };

        write_lock_guard.remove(index)
    }
}

pub(super) static THIRD_PARTY_EXTENSIONS_SEARCH_SOURCE: OnceLock<ThirdPartyExtensionsSearchSource> =
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

            for extension in extensions_read_lock.iter().filter(|ext| ext.enabled) {
                if extension.r#type.contains_sub_items() {
                    if let Some(ref commands) = extension.commands {
                        for command in commands.iter().filter(|cmd| cmd.enabled) {
                            if let Some(hit) =
                                extension_to_hit(command, &query_lower, opt_data_source.as_deref())
                            {
                                hits.push(hit);
                            }
                        }
                    }

                    if let Some(ref scripts) = extension.scripts {
                        for script in scripts.iter().filter(|script| script.enabled) {
                            if let Some(hit) =
                                extension_to_hit(script, &query_lower, opt_data_source.as_deref())
                            {
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
                            ) {
                                hits.push(hit);
                            }
                        }
                    }
                } else {
                    if let Some(hit) =
                        extension_to_hit(extension, &query_lower, opt_data_source.as_deref())
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

fn extension_to_hit(
    extension: &Extension,
    query_lower: &str,
    opt_data_source: Option<&str>,
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
        total_score += title_score * 1.0; // Weight for title
    }

    // Score based on alias match if available
    // Alias is considered less important than title, so it gets a lower weight.
    if let Some(alias) = &extension.alias {
        if let Some(alias_score) = calculate_text_similarity(&query_lower, &alias.to_lowercase()) {
            total_score += alias_score * 0.7; // Weight for alias
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

// Calculates a similarity score between a query and a text, aiming for a [0, 1] range.
// Assumes query and text are already lowercased.
fn calculate_text_similarity(query: &str, text: &str) -> Option<f64> {
    if query.is_empty() || text.is_empty() {
        return None;
    }

    if text == query {
        return Some(1.0); // Perfect match
    }

    let query_len = query.len() as f64;
    let text_len = text.len() as f64;
    let ratio = query_len / text_len;
    let mut score: f64 = 0.0;

    // Case 1: Text starts with the query (prefix match)
    // Score: base 0.5, bonus up to 0.4 for how much of `text` is covered by `query`. Max 0.9.
    if text.starts_with(query) {
        score = score.max(0.5 + 0.4 * ratio);
    }

    // Case 2: Text contains the query (substring match, not necessarily prefix)
    // Score: base 0.3, bonus up to 0.3. Max 0.6.
    // `score.max` ensures that if it's both a prefix and contains, the higher score (prefix) is taken.
    if text.contains(query) {
        score = score.max(0.3 + 0.3 * ratio);
    }

    // Case 3: Fallback for "all query characters exist in text" (order-independent)
    if score < 0.2 {
        if query.chars().all(|c_q| text.contains(c_q)) {
            score = score.max(0.15); // Fixed low score for this weaker match type
        }
    }

    if score > 0.0 {
        // Cap non-perfect matches slightly below 1.0 to make perfect (1.0) distinct.
        Some(score.min(0.95))
    } else {
        None
    }
}

#[tauri::command]
pub(crate) async fn uninstall_extension(
    tauri_app_handle: AppHandle,
    developer: String,
    extension_id: String,
) -> Result<(), String> {
    let extension_dir = {
        let mut path = get_third_party_extension_directory(&tauri_app_handle);
        path.push(developer.as_str());
        path.push(extension_id.as_str());

        path
    };
    if !extension_dir.try_exists().map_err(|e| e.to_string())? {
        panic!(
            "we are uninstalling extension [{}/{}], but there is no such extension files on disk",
            developer, extension_id
        )
    }
    tokio::fs::remove_dir_all(extension_dir.as_path())
        .await
        .map_err(|e| e.to_string())?;

    let extension = THIRD_PARTY_EXTENSIONS_SEARCH_SOURCE
        .get()
        .unwrap()
        .remove_extension(&developer, &extension_id)
        .await;

    // Unregister the extension hotkey, if set.
    //
    // Unregistering hotkey is the only thing that we will do when we disable
    // an extension, so we directly use this function here even though "disabling"
    // the extension that one is trying to uninstall does not make too much sense.
    ThirdPartyExtensionsSearchSource::_disable_extension(&tauri_app_handle, &extension).await?;

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    // Helper function for approximate floating point comparison
    fn approx_eq(a: f64, b: f64) -> bool {
        (a - b).abs() < 1e-10
    }

    #[test]
    fn test_empty_strings() {
        assert_eq!(calculate_text_similarity("", "text"), None);
        assert_eq!(calculate_text_similarity("query", ""), None);
        assert_eq!(calculate_text_similarity("", ""), None);
    }

    #[test]
    fn test_perfect_match() {
        assert_eq!(calculate_text_similarity("text", "text"), Some(1.0));
        assert_eq!(calculate_text_similarity("a", "a"), Some(1.0));
    }

    #[test]
    fn test_prefix_match() {
        // For "te" and "text":
        // score = 0.5 + 0.4 * (2/4) = 0.5 + 0.2 = 0.7
        let score = calculate_text_similarity("te", "text").unwrap();
        assert!(approx_eq(score, 0.7));

        // For "tex" and "text":
        // score = 0.5 + 0.4 * (3/4) = 0.5 + 0.3 = 0.8
        let score = calculate_text_similarity("tex", "text").unwrap();
        assert!(approx_eq(score, 0.8));
    }

    #[test]
    fn test_substring_match() {
        // For "ex" and "text":
        // score = 0.3 + 0.3 * (2/4) = 0.3 + 0.15 = 0.45
        let score = calculate_text_similarity("ex", "text").unwrap();
        assert!(approx_eq(score, 0.45));

        // Prefix should score higher than substring
        assert!(
            calculate_text_similarity("te", "text").unwrap()
                > calculate_text_similarity("ex", "text").unwrap()
        );
    }

    #[test]
    fn test_character_presence() {
        // Characters present but not in sequence
        // "tac" in "contact" - not a substring, but all chars exist
        let score = calculate_text_similarity("tac", "contact").unwrap();
        assert!(approx_eq(0.3 + 0.3 * (3.0 / 7.0), score));

        assert!(calculate_text_similarity("ac", "contact").is_some());

        // Should not apply if some characters are missing
        assert_eq!(calculate_text_similarity("xyz", "contact"), None);
    }

    #[test]
    fn test_combined_scenarios() {
        // Test that character presence fallback doesn't override higher scores
        // "tex" is a prefix of "text" with score 0.8
        let score = calculate_text_similarity("tex", "text").unwrap();
        assert!(approx_eq(score, 0.8));

        // Test a case where the characters exist but it's already a substring
        // "act" is a substring of "contact" with score > 0.2, so fallback won't apply
        let expected_score = 0.3 + 0.3 * (3.0 / 7.0);
        let actual_score = calculate_text_similarity("act", "contact").unwrap();
        assert!(approx_eq(actual_score, expected_score));
    }

    #[test]
    fn test_no_similarity() {
        assert_eq!(calculate_text_similarity("xyz", "test"), None);
    }

    #[test]
    fn test_score_capping() {
        // Use a long query that's a prefix of a slightly longer text
        let long_text = "abcdefghijklmnopqrstuvwxyz";
        let long_prefix = "abcdefghijklmnopqrstuvwxy"; // All but last letter

        // Expected score would be 0.5 + 0.4 * (25/26) = 0.5 + 0.385 = 0.885
        let expected_score = 0.5 + 0.4 * (25.0 / 26.0);
        let actual_score = calculate_text_similarity(long_prefix, long_text).unwrap();
        assert!(approx_eq(actual_score, expected_score));

        // Verify that non-perfect matches are capped at 0.95
        assert!(calculate_text_similarity("almost", "almost perfect").unwrap() <= 0.95);
    }
}
