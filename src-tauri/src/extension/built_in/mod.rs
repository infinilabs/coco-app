//! Built-in extensions and related stuff.

pub mod application;
pub mod calculator;
pub mod file_system;
pub mod pizza_engine_runtime;

use super::Extension;
use crate::{SearchSourceRegistry, GLOBAL_TAURI_APP_HANDLE};
use tauri::Manager;

pub(super) async fn init_built_in_extension(
    extension: &Extension,
    search_source_registry: &SearchSourceRegistry,
) {
    if extension.id == application::QUERYSOURCE_ID_DATASOURCE_ID_DATASOURCE_NAME {
        search_source_registry
            .register_source(application::ApplicationSearchSource)
            .await;
    }

    if extension.id == calculator::DATA_SOURCE_ID {
        let calculator_search = calculator::CalculatorSource::new(2000f64);
        search_source_registry
            .register_source(calculator_search)
            .await;
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

    false
}

// FIXME: persist this change
pub(crate) fn enable_built_in_extension(extension_id: &str) {
    let tauri_app_handle = GLOBAL_TAURI_APP_HANDLE
        .get()
        .expect("global tauri app handle not set");
    let search_source_registry_tauri_state = tauri_app_handle.state::<SearchSourceRegistry>();

    if extension_id == application::QUERYSOURCE_ID_DATASOURCE_ID_DATASOURCE_NAME {
        search_source_registry_tauri_state.register_source(application::ApplicationSearchSource);
    }

    // Check if this is an application
    let application_prefix = format!(
        "{}.",
        application::QUERYSOURCE_ID_DATASOURCE_ID_DATASOURCE_NAME
    );
    if extension_id.starts_with(&application_prefix) {
        let app_path = &extension_id[application_prefix.len()..];
        application::enable_app_search(tauri_app_handle, app_path);
    }

    if extension_id == calculator::DATA_SOURCE_ID {
        let calculator_search = calculator::CalculatorSource::new(2000f64);
        search_source_registry_tauri_state.register_source(calculator_search);
    }
}

// FIXME: persist this change
pub(crate) fn disable_built_in_extension(extension_id: &str) {
    let tauri_app_handle = GLOBAL_TAURI_APP_HANDLE
        .get()
        .expect("global tauri app handle not set");
    let search_source_registry_tauri_state = tauri_app_handle.state::<SearchSourceRegistry>();

    if extension_id == application::QUERYSOURCE_ID_DATASOURCE_ID_DATASOURCE_NAME {
        search_source_registry_tauri_state.remove_source(extension_id);
    }

    // Check if this is an application
    let application_prefix = format!(
        "{}.",
        application::QUERYSOURCE_ID_DATASOURCE_ID_DATASOURCE_NAME
    );
    if extension_id.starts_with(&application_prefix) {
        let app_path = &extension_id[application_prefix.len()..];
        application::disable_app_search(tauri_app_handle, app_path);
    }

    if extension_id == calculator::DATA_SOURCE_ID {
        search_source_registry_tauri_state.remove_source(extension_id);
    }
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

pub(crate) fn register_built_in_extension_hotkey(extension_id: &str, hotkey: &str) {
    let tauri_app_handle = GLOBAL_TAURI_APP_HANDLE
        .get()
        .expect("global tauri app handle not set");
    let application_prefix = format!(
        "{}.",
        application::QUERYSOURCE_ID_DATASOURCE_ID_DATASOURCE_NAME
    );
    if extension_id.starts_with(&application_prefix) {
        let app_path = &extension_id[application_prefix.len()..];
        application::register_app_hotkey(&tauri_app_handle, app_path, hotkey);
    }
}

pub(crate) fn unregister_built_in_extension_hotkey(extension_id: &str) {
    let tauri_app_handle = GLOBAL_TAURI_APP_HANDLE
        .get()
        .expect("global tauri app handle not set");
    let application_prefix = format!(
        "{}.",
        application::QUERYSOURCE_ID_DATASOURCE_ID_DATASOURCE_NAME
    );
    if extension_id.starts_with(&application_prefix) {
        let app_path = &extension_id[application_prefix.len()..];
        application::unregister_app_hotkey(&tauri_app_handle, app_path);
    }
}
