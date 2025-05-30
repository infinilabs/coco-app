//! Built-in extensions and related stuff.

pub mod ai_overview;
pub mod application;
pub mod calculator;
pub mod file_system;
pub mod pizza_engine_runtime;
pub mod quick_ai_access;

use super::Extension;
use crate::extension::{alter_extension_json_file, load_extension_from_json_file};
use crate::{SearchSourceRegistry, GLOBAL_TAURI_APP_HANDLE};
use std::path::PathBuf;
use std::sync::LazyLock;
use tauri::path::BaseDirectory;
use tauri::Manager;

pub(crate) static BUILT_IN_EXTENSION_DIRECTORY: LazyLock<PathBuf> = LazyLock::new(|| {
    let mut resource_dir = GLOBAL_TAURI_APP_HANDLE
        .get()
        .expect("global tauri app handle not set")
        .path()
        .resolve("assets", BaseDirectory::Resource)
        .expect(
            "User home directory not found, which should be impossible on desktop environments",
        );
    resource_dir.push("extension");

    resource_dir
});

pub(super) async fn init_built_in_extension(
    extension: &Extension,
    search_source_registry: &SearchSourceRegistry,
) {
    log::trace!("initializing built-in extensions");

    if extension.id == application::QUERYSOURCE_ID_DATASOURCE_ID_DATASOURCE_NAME {
        search_source_registry
            .register_source(application::ApplicationSearchSource)
            .await;
        log::debug!("built-in extension [{}] initialized", extension.id);
    }

    if extension.id == calculator::DATA_SOURCE_ID {
        let calculator_search = calculator::CalculatorSource::new(2000f64);
        search_source_registry
            .register_source(calculator_search)
            .await;
        log::debug!("built-in extension [{}] initialized", extension.id);
    }
}

pub(crate) fn is_extension_built_in(extension_id: &str) -> bool {
    if extension_id == application::QUERYSOURCE_ID_DATASOURCE_ID_DATASOURCE_NAME {
        return true;
    }

    if extension_id.starts_with(&format!(
        "{}.",
        application::QUERYSOURCE_ID_DATASOURCE_ID_DATASOURCE_NAME
    )) {
        return true;
    }

    if extension_id == calculator::DATA_SOURCE_ID {
        return true;
    }

    if extension_id == quick_ai_access::EXTENSION_ID {
        return true;
    }

    if extension_id == ai_overview::EXTENSION_ID {
        return true;
    }

    false
}

pub(crate) async fn enable_built_in_extension(extension_id: &str) -> Result<(), String> {
    let tauri_app_handle = GLOBAL_TAURI_APP_HANDLE
        .get()
        .expect("global tauri app handle not set");
    let search_source_registry_tauri_state = tauri_app_handle.state::<SearchSourceRegistry>();

    let update_extension = |extension: &mut Extension| -> Result<(), String> {
        extension.enabled = true;
        Ok(())
    };

    if extension_id == application::QUERYSOURCE_ID_DATASOURCE_ID_DATASOURCE_NAME {
        search_source_registry_tauri_state
            .register_source(application::ApplicationSearchSource)
            .await;
        alter_extension_json_file(
            &BUILT_IN_EXTENSION_DIRECTORY.as_path(),
            extension_id,
            update_extension,
        )?;

        return Ok(());
    }

    // Check if this is an application
    let application_prefix = format!(
        "{}.",
        application::QUERYSOURCE_ID_DATASOURCE_ID_DATASOURCE_NAME
    );
    if extension_id.starts_with(&application_prefix) {
        let app_path = &extension_id[application_prefix.len()..];
        application::enable_app_search(tauri_app_handle, app_path)?;
        return Ok(());
    }

    if extension_id == calculator::DATA_SOURCE_ID {
        let calculator_search = calculator::CalculatorSource::new(2000f64);
        search_source_registry_tauri_state
            .register_source(calculator_search)
            .await;
        alter_extension_json_file(
            &BUILT_IN_EXTENSION_DIRECTORY.as_path(),
            extension_id,
            update_extension,
        )?;
        return Ok(());
    }

    if extension_id == quick_ai_access::EXTENSION_ID {
        alter_extension_json_file(
            &BUILT_IN_EXTENSION_DIRECTORY.as_path(),
            extension_id,
            update_extension,
        )?;
        return Ok(());
    }

    if extension_id == ai_overview::EXTENSION_ID {
        alter_extension_json_file(
            &BUILT_IN_EXTENSION_DIRECTORY.as_path(),
            extension_id,
            update_extension,
        )?;
        return Ok(());
    }

    Ok(())
}

pub(crate) async fn disable_built_in_extension(extension_id: &str) -> Result<(), String> {
    let tauri_app_handle = GLOBAL_TAURI_APP_HANDLE
        .get()
        .expect("global tauri app handle not set");
    let search_source_registry_tauri_state = tauri_app_handle.state::<SearchSourceRegistry>();

    let update_extension = |extension: &mut Extension| -> Result<(), String> {
        extension.enabled = false;
        Ok(())
    };

    if extension_id == application::QUERYSOURCE_ID_DATASOURCE_ID_DATASOURCE_NAME {
        search_source_registry_tauri_state
            .remove_source(extension_id)
            .await;
        alter_extension_json_file(
            &BUILT_IN_EXTENSION_DIRECTORY.as_path(),
            extension_id,
            update_extension,
        )?;
        return Ok(());
    }

    // Check if this is an application
    let application_prefix = format!(
        "{}.",
        application::QUERYSOURCE_ID_DATASOURCE_ID_DATASOURCE_NAME
    );
    if extension_id.starts_with(&application_prefix) {
        let app_path = &extension_id[application_prefix.len()..];
        application::disable_app_search(tauri_app_handle, app_path)?;
        return Ok(());
    }

    if extension_id == calculator::DATA_SOURCE_ID {
        search_source_registry_tauri_state
            .remove_source(extension_id)
            .await;
        alter_extension_json_file(
            &BUILT_IN_EXTENSION_DIRECTORY.as_path(),
            extension_id,
            update_extension,
        )?;
        return Ok(());
    }

    if extension_id == quick_ai_access::EXTENSION_ID {
        alter_extension_json_file(
            &BUILT_IN_EXTENSION_DIRECTORY.as_path(),
            extension_id,
            update_extension,
        )?;

        return Ok(());
    }

    if extension_id == ai_overview::EXTENSION_ID {
        alter_extension_json_file(
            &BUILT_IN_EXTENSION_DIRECTORY.as_path(),
            extension_id,
            update_extension,
        )?;

        return Ok(());
    }

    Ok(())
}

pub(crate) fn set_built_in_extension_alias(extension_id: &str, alias: &str) {
    let tauri_app_handle = GLOBAL_TAURI_APP_HANDLE
        .get()
        .expect("global tauri app handle not set");

    let application_prefix = format!(
        "{}.",
        application::QUERYSOURCE_ID_DATASOURCE_ID_DATASOURCE_NAME
    );
    if extension_id.starts_with(&application_prefix) {
        let app_path = &extension_id[application_prefix.len()..];
        application::set_app_alias(tauri_app_handle, app_path, alias);
    }
}

pub(crate) fn register_built_in_extension_hotkey(
    extension_id: &str,
    hotkey: &str,
) -> Result<(), String> {
    let tauri_app_handle = GLOBAL_TAURI_APP_HANDLE
        .get()
        .expect("global tauri app handle not set");
    let application_prefix = format!(
        "{}.",
        application::QUERYSOURCE_ID_DATASOURCE_ID_DATASOURCE_NAME
    );
    if extension_id.starts_with(&application_prefix) {
        let app_path = &extension_id[application_prefix.len()..];
        application::register_app_hotkey(&tauri_app_handle, app_path, hotkey)?;
    }
    Ok(())
}

pub(crate) fn unregister_built_in_extension_hotkey(extension_id: &str) -> Result<(), String> {
    let tauri_app_handle = GLOBAL_TAURI_APP_HANDLE
        .get()
        .expect("global tauri app handle not set");
    let application_prefix = format!(
        "{}.",
        application::QUERYSOURCE_ID_DATASOURCE_ID_DATASOURCE_NAME
    );
    if extension_id.starts_with(&application_prefix) {
        let app_path = &extension_id[application_prefix.len()..];
        application::unregister_app_hotkey(&tauri_app_handle, app_path)?;
    }
    Ok(())
}

pub(crate) async fn is_built_in_extension_enabled(extension_id: &str) -> Result<bool, String> {
    let tauri_app_handle = GLOBAL_TAURI_APP_HANDLE
        .get()
        .expect("global tauri app handle not set");
    let search_source_registry_tauri_state = tauri_app_handle.state::<SearchSourceRegistry>();

    if extension_id == application::QUERYSOURCE_ID_DATASOURCE_ID_DATASOURCE_NAME {
        return Ok(search_source_registry_tauri_state
            .get_source(extension_id)
            .await
            .is_some());
    }

    // Check if this is an application
    let application_prefix = format!(
        "{}.",
        application::QUERYSOURCE_ID_DATASOURCE_ID_DATASOURCE_NAME
    );
    if extension_id.starts_with(&application_prefix) {
        let app_path = &extension_id[application_prefix.len()..];
        return Ok(application::is_app_search_enabled(app_path));
    }

    if extension_id == calculator::DATA_SOURCE_ID {
        return Ok(search_source_registry_tauri_state
            .get_source(extension_id)
            .await
            .is_some());
    }

    if extension_id == quick_ai_access::EXTENSION_ID {
        let extension =
            load_extension_from_json_file(&BUILT_IN_EXTENSION_DIRECTORY.as_path(), extension_id)?;
        return Ok(extension.enabled);
    }

    if extension_id == ai_overview::EXTENSION_ID {
        let extension =
            load_extension_from_json_file(&BUILT_IN_EXTENSION_DIRECTORY.as_path(), extension_id)?;
        return Ok(extension.enabled);
    }

    unreachable!("extension [{}] is not a built-in extension", extension_id)
}
