//! Built-in extensions and related stuff.

pub mod ai_overview;
pub mod application;
pub mod calculator;
#[cfg(target_os = "macos")]
pub mod file_search;
pub mod pizza_engine_runtime;
pub mod quick_ai_access;

use super::Extension;
use crate::extension::built_in::application::{set_apps_hotkey, unset_apps_hotkey};
use crate::extension::{
    alter_extension_json_file, ExtensionBundleIdBorrowed, PLUGIN_JSON_FILE_NAME,
};
use crate::{SearchSourceRegistry, GLOBAL_TAURI_APP_HANDLE};
use anyhow::Context;
use std::path::{Path, PathBuf};
use std::sync::LazyLock;
use tauri::{AppHandle, Manager, Runtime};

pub(crate) static BUILT_IN_EXTENSION_DIRECTORY: LazyLock<PathBuf> = LazyLock::new(|| {
    let mut resource_dir = GLOBAL_TAURI_APP_HANDLE
        .get()
        .expect("global tauri app handle not set")
        .path()
        .app_data_dir()
        .expect(
            "User home directory not found, which should be impossible on desktop environments",
        );
    resource_dir.push("built_in_extensions");

    resource_dir
});

/// Helper function to load the built-in extension specified by `extension_id`, used
/// in `list_built_in_extensions()`.
///
/// For built-in extensions, users are only allowed to edit these fields:
///
///   1. alias (if this extension supports alias)
///   2. hotkey (if this extension supports hotkey)
///   3. enabled
///
/// If
///
///   1. The above fields have invalid value
///   2. Other fields are modified
///
/// we ignore and reset them to the default value.
async fn load_built_in_extension(
    built_in_extensions_dir: &Path,
    extension_id: &str,
    default_plugin_json_file: &str,
) -> Result<Extension, String> {
    let mut extension_dir = built_in_extensions_dir.join(extension_id);
    let mut default_plugin_json = serde_json::from_str::<Extension>(&default_plugin_json_file).unwrap_or_else( |e| {
          panic!("the default extension {} file of built-in extension [{}] cannot be parsed as a valid [struct Extension], error [{}]", PLUGIN_JSON_FILE_NAME, extension_id, e);
        });

    if !extension_dir.try_exists().map_err(|e| e.to_string())? {
        tokio::fs::create_dir_all(extension_dir.as_path())
            .await
            .map_err(|e| e.to_string())?;
    }

    let plugin_json_file_path = {
        extension_dir.push(PLUGIN_JSON_FILE_NAME);
        extension_dir
    };

    // If the JSON file does not exist, create a file with the default template and return.
    if !plugin_json_file_path
        .try_exists()
        .map_err(|e| e.to_string())?
    {
        tokio::fs::write(plugin_json_file_path, default_plugin_json_file)
            .await
            .map_err(|e| e.to_string())?;

        return Ok(default_plugin_json);
    }

    let plugin_json_file_content = tokio::fs::read_to_string(plugin_json_file_path.as_path())
        .await
        .map_err(|e| e.to_string())?;
    let res_plugin_json = serde_json::from_str::<Extension>(&plugin_json_file_content);
    let Ok(plugin_json) = res_plugin_json else {
        log::warn!("user invalidated built-in extension [{}] file, overwriting it with the default template", extension_id);

        // If the JSON file cannot be parsed as `struct Extension`, overwrite it with the default template and return.
        tokio::fs::write(plugin_json_file_path, default_plugin_json_file)
            .await
            .map_err(|e| e.to_string())?;

        return Ok(default_plugin_json);
    };

    // Users are only allowed to edit the below fields
    //   1. alias (if this extension supports alias)
    //   2. hotkey (if this extension supports hotkey)
    //   3. enabled
    // so we ignore all other fields.
    let alias = if default_plugin_json.supports_alias_hotkey() {
        plugin_json.alias.clone()
    } else {
        None
    };
    let hotkey = if default_plugin_json.supports_alias_hotkey() {
        plugin_json.hotkey.clone()
    } else {
        None
    };

    let enabled = plugin_json.enabled;

    default_plugin_json.alias = alias;
    default_plugin_json.hotkey = hotkey;
    default_plugin_json.enabled = enabled;

    let final_plugin_json_file_content = serde_json::to_string_pretty(&default_plugin_json)
        .expect("failed to serialize `struct Extension`");
    tokio::fs::write(plugin_json_file_path, final_plugin_json_file_content)
        .await
        .map_err(|e| e.to_string())?;

    Ok(default_plugin_json)
}

/// Return the built-in extension list.
///
/// Will create extension files when they are not found.
///
/// Users may put extension files in the built-in extension directory, but
/// we do not care and will ignore them.
///
/// We only read alias/hotkey/enabled from the JSON file, we have ensured that if
/// alias/hotkey is not supported, then it will be `None`. Besides that, no further
/// validation is needed because nothing could go wrong.
pub(crate) async fn list_built_in_extensions() -> Result<Vec<Extension>, String> {
    let dir = BUILT_IN_EXTENSION_DIRECTORY.as_path();

    let mut built_in_extensions = Vec::new();
    built_in_extensions.push(
        load_built_in_extension(
            dir,
            application::QUERYSOURCE_ID_DATASOURCE_ID_DATASOURCE_NAME,
            application::PLUGIN_JSON_FILE,
        )
        .await?,
    );
    built_in_extensions.push(
        load_built_in_extension(
            dir,
            calculator::DATA_SOURCE_ID,
            calculator::PLUGIN_JSON_FILE,
        )
        .await?,
    );
    built_in_extensions.push(
        load_built_in_extension(
            dir,
            ai_overview::EXTENSION_ID,
            ai_overview::PLUGIN_JSON_FILE,
        )
        .await?,
    );
    built_in_extensions.push(
        load_built_in_extension(
            dir,
            quick_ai_access::EXTENSION_ID,
            quick_ai_access::PLUGIN_JSON_FILE,
        )
        .await?,
    );

    cfg_if::cfg_if! {
        if #[cfg(target_os = "macos")] {
            built_in_extensions.push(
                load_built_in_extension(
                    dir,
                    file_search::EXTENSION_ID,
                    file_search::PLUGIN_JSON_FILE,
                )
                .await?,
            );
        }
    }

    Ok(built_in_extensions)
}

pub(super) async fn init_built_in_extension<R: Runtime>(
    tauri_app_handle: &AppHandle<R>,
    extension: &Extension,
    search_source_registry: &SearchSourceRegistry,
) -> Result<(), String> {
    log::trace!("initializing built-in extensions [{}]", extension.id);

    if extension.id == application::QUERYSOURCE_ID_DATASOURCE_ID_DATASOURCE_NAME {
        search_source_registry
            .register_source(application::ApplicationSearchSource)
            .await;
        set_apps_hotkey(&tauri_app_handle)?;
        log::debug!("built-in extension [{}] initialized", extension.id);
    }

    if extension.id == calculator::DATA_SOURCE_ID {
        let calculator_search = calculator::CalculatorSource::new(2000f64);
        search_source_registry
            .register_source(calculator_search)
            .await;
        log::debug!("built-in extension [{}] initialized", extension.id);
    }

    cfg_if::cfg_if! {
        if #[cfg(target_os = "macos")] {
            if extension.id == file_search::EXTENSION_ID {
                let file_system_search = file_search::FileSearchExtensionSearchSource::new(1f64);
                search_source_registry
                    .register_source(file_system_search)
                    .await;
                log::debug!("built-in extension [{}] initialized", extension.id);
            }
        }
    }

    Ok(())
}

pub(crate) fn is_extension_built_in(bundle_id: &ExtensionBundleIdBorrowed<'_>) -> bool {
    bundle_id.developer.is_none()
}

pub(crate) async fn enable_built_in_extension(
    bundle_id: &ExtensionBundleIdBorrowed<'_>,
) -> Result<(), String> {
    let tauri_app_handle = GLOBAL_TAURI_APP_HANDLE
        .get()
        .expect("global tauri app handle not set");
    let search_source_registry_tauri_state = tauri_app_handle.state::<SearchSourceRegistry>();

    let update_extension = |extension: &mut Extension| -> Result<(), String> {
        extension.enabled = true;
        Ok(())
    };

    if bundle_id.extension_id == application::QUERYSOURCE_ID_DATASOURCE_ID_DATASOURCE_NAME
        && bundle_id.sub_extension_id.is_none()
    {
        search_source_registry_tauri_state
            .register_source(application::ApplicationSearchSource)
            .await;
        set_apps_hotkey(tauri_app_handle)?;

        alter_extension_json_file(
            &BUILT_IN_EXTENSION_DIRECTORY.as_path(),
            bundle_id,
            update_extension,
        )?;

        return Ok(());
    }

    // Check if this is an application
    if bundle_id.extension_id == application::QUERYSOURCE_ID_DATASOURCE_ID_DATASOURCE_NAME
        && bundle_id.sub_extension_id.is_some()
    {
        let app_path = bundle_id.sub_extension_id.expect("just checked it is Some");
        application::enable_app_search(tauri_app_handle, app_path)?;
        return Ok(());
    }

    if bundle_id.extension_id == calculator::DATA_SOURCE_ID {
        let calculator_search = calculator::CalculatorSource::new(2000f64);
        search_source_registry_tauri_state
            .register_source(calculator_search)
            .await;
        alter_extension_json_file(
            &BUILT_IN_EXTENSION_DIRECTORY.as_path(),
            bundle_id,
            update_extension,
        )?;
        return Ok(());
    }

    if bundle_id.extension_id == quick_ai_access::EXTENSION_ID {
        alter_extension_json_file(
            &BUILT_IN_EXTENSION_DIRECTORY.as_path(),
            bundle_id,
            update_extension,
        )?;
        return Ok(());
    }

    if bundle_id.extension_id == ai_overview::EXTENSION_ID {
        alter_extension_json_file(
            &BUILT_IN_EXTENSION_DIRECTORY.as_path(),
            bundle_id,
            update_extension,
        )?;
        return Ok(());
    }

    cfg_if::cfg_if! {
        if #[cfg(target_os = "macos")] {
            if bundle_id.extension_id == file_search::EXTENSION_ID {
                let file_system_search = file_search::FileSearchExtensionSearchSource::new(1f64);
                search_source_registry_tauri_state
                    .register_source(file_system_search)
                    .await;
                alter_extension_json_file(
                    &BUILT_IN_EXTENSION_DIRECTORY.as_path(),
                    bundle_id,
                    update_extension,
                )?;
                return Ok(());
            }
        }
    }

    Ok(())
}

pub(crate) async fn disable_built_in_extension(
    bundle_id: &ExtensionBundleIdBorrowed<'_>,
) -> Result<(), String> {
    let tauri_app_handle = GLOBAL_TAURI_APP_HANDLE
        .get()
        .expect("global tauri app handle not set");
    let search_source_registry_tauri_state = tauri_app_handle.state::<SearchSourceRegistry>();

    let update_extension = |extension: &mut Extension| -> Result<(), String> {
        extension.enabled = false;
        Ok(())
    };

    if bundle_id.extension_id == application::QUERYSOURCE_ID_DATASOURCE_ID_DATASOURCE_NAME
        && bundle_id.sub_extension_id.is_none()
    {
        search_source_registry_tauri_state
            .remove_source(bundle_id.extension_id)
            .await;
        unset_apps_hotkey(tauri_app_handle)?;

        alter_extension_json_file(
            &BUILT_IN_EXTENSION_DIRECTORY.as_path(),
            bundle_id,
            update_extension,
        )?;
        return Ok(());
    }

    // Check if this is an application
    if bundle_id.extension_id == application::QUERYSOURCE_ID_DATASOURCE_ID_DATASOURCE_NAME
        && bundle_id.sub_extension_id.is_some()
    {
        let app_path = bundle_id.sub_extension_id.expect("just checked it is Some");
        application::disable_app_search(tauri_app_handle, app_path)?;
        return Ok(());
    }

    if bundle_id.extension_id == calculator::DATA_SOURCE_ID {
        search_source_registry_tauri_state
            .remove_source(bundle_id.extension_id)
            .await;
        alter_extension_json_file(
            &BUILT_IN_EXTENSION_DIRECTORY.as_path(),
            bundle_id,
            update_extension,
        )?;
        return Ok(());
    }

    if bundle_id.extension_id == quick_ai_access::EXTENSION_ID {
        alter_extension_json_file(
            &BUILT_IN_EXTENSION_DIRECTORY.as_path(),
            bundle_id,
            update_extension,
        )?;

        return Ok(());
    }

    if bundle_id.extension_id == ai_overview::EXTENSION_ID {
        alter_extension_json_file(
            &BUILT_IN_EXTENSION_DIRECTORY.as_path(),
            bundle_id,
            update_extension,
        )?;

        return Ok(());
    }

    cfg_if::cfg_if! {
        if #[cfg(target_os = "macos")] {
            if bundle_id.extension_id == file_search::EXTENSION_ID {
                search_source_registry_tauri_state
                    .remove_source(bundle_id.extension_id)
                    .await;
                alter_extension_json_file(
                    &BUILT_IN_EXTENSION_DIRECTORY.as_path(),
                    bundle_id,
                    update_extension,
                )?;
                return Ok(());
            }
        }
    }

    Ok(())
}

pub(crate) fn set_built_in_extension_alias(bundle_id: &ExtensionBundleIdBorrowed<'_>, alias: &str) {
    let tauri_app_handle = GLOBAL_TAURI_APP_HANDLE
        .get()
        .expect("global tauri app handle not set");

    if bundle_id.extension_id == application::QUERYSOURCE_ID_DATASOURCE_ID_DATASOURCE_NAME {
        if let Some(app_path) = bundle_id.sub_extension_id {
            application::set_app_alias(tauri_app_handle, app_path, alias);
        }
    }
}

pub(crate) fn register_built_in_extension_hotkey(
    bundle_id: &ExtensionBundleIdBorrowed<'_>,
    hotkey: &str,
) -> Result<(), String> {
    let tauri_app_handle = GLOBAL_TAURI_APP_HANDLE
        .get()
        .expect("global tauri app handle not set");

    if bundle_id.extension_id == application::QUERYSOURCE_ID_DATASOURCE_ID_DATASOURCE_NAME {
        if let Some(app_path) = bundle_id.sub_extension_id {
            application::register_app_hotkey(&tauri_app_handle, app_path, hotkey)?;
        }
    }
    Ok(())
}

pub(crate) fn unregister_built_in_extension_hotkey(
    bundle_id: &ExtensionBundleIdBorrowed<'_>,
) -> Result<(), String> {
    let tauri_app_handle = GLOBAL_TAURI_APP_HANDLE
        .get()
        .expect("global tauri app handle not set");

    if bundle_id.extension_id == application::QUERYSOURCE_ID_DATASOURCE_ID_DATASOURCE_NAME {
        if let Some(app_path) = bundle_id.sub_extension_id {
            application::unregister_app_hotkey(&tauri_app_handle, app_path)?;
        }
    }
    Ok(())
}

fn split_extension_id(extension_id: &str) -> (&str, Option<&str>) {
    match extension_id.find('.') {
        Some(idx) => (&extension_id[..idx], Some(&extension_id[idx + 1..])),
        None => (extension_id, None),
    }
}

fn load_extension_from_json_file(
    extension_directory: &Path,
    extension_id: &str,
) -> Result<Extension, String> {
    let (parent_extension_id, _opt_sub_extension_id) = split_extension_id(extension_id);
    let json_file_path = {
        let mut extension_directory_path = extension_directory.join(parent_extension_id);
        extension_directory_path.push(PLUGIN_JSON_FILE_NAME);

        extension_directory_path
    };

    let mut extension = serde_json::from_reader::<_, Extension>(
        std::fs::File::open(&json_file_path)
            .with_context(|| {
                format!(
                    "the [{}] file for extension [{}] is missing or broken",
                    PLUGIN_JSON_FILE_NAME, parent_extension_id
                )
            })
            .map_err(|e| e.to_string())?,
    )
    .map_err(|e| e.to_string())?;

    super::canonicalize_relative_icon_path(extension_directory, &mut extension)?;

    Ok(extension)
}

pub(crate) async fn is_built_in_extension_enabled(
    bundle_id: &ExtensionBundleIdBorrowed<'_>,
) -> Result<bool, String> {
    let tauri_app_handle = GLOBAL_TAURI_APP_HANDLE
        .get()
        .expect("global tauri app handle not set");
    let search_source_registry_tauri_state = tauri_app_handle.state::<SearchSourceRegistry>();

    if bundle_id.extension_id == application::QUERYSOURCE_ID_DATASOURCE_ID_DATASOURCE_NAME
        && bundle_id.sub_extension_id.is_none()
    {
        return Ok(search_source_registry_tauri_state
            .get_source(bundle_id.extension_id)
            .await
            .is_some());
    }

    // Check if this is an application
    if bundle_id.extension_id == application::QUERYSOURCE_ID_DATASOURCE_ID_DATASOURCE_NAME {
        if let Some(app_path) = bundle_id.sub_extension_id {
            return Ok(application::is_app_search_enabled(app_path));
        }
    }

    if bundle_id.extension_id == calculator::DATA_SOURCE_ID {
        return Ok(search_source_registry_tauri_state
            .get_source(bundle_id.extension_id)
            .await
            .is_some());
    }

    if bundle_id.extension_id == quick_ai_access::EXTENSION_ID {
        let extension = load_extension_from_json_file(
            &BUILT_IN_EXTENSION_DIRECTORY.as_path(),
            bundle_id.extension_id,
        )?;
        return Ok(extension.enabled);
    }

    if bundle_id.extension_id == ai_overview::EXTENSION_ID {
        let extension = load_extension_from_json_file(
            &BUILT_IN_EXTENSION_DIRECTORY.as_path(),
            bundle_id.extension_id,
        )?;
        return Ok(extension.enabled);
    }

    cfg_if::cfg_if! {
        if #[cfg(target_os = "macos")] {
            if bundle_id.extension_id == file_search::EXTENSION_ID
                && bundle_id.sub_extension_id.is_none()
            {
                return Ok(search_source_registry_tauri_state
                    .get_source(bundle_id.extension_id)
                    .await
                    .is_some());
            }
        }
    }

    unreachable!("extension [{:?}] is not a built-in extension", bundle_id)
}
