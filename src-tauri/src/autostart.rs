use std::{fs::create_dir, io::Read};

use tauri::{Manager, Runtime};
use tauri_plugin_autostart::ManagerExt;

/// If the state reported from the OS and the state stored by us differ, our state is
/// prioritized and seen as the correct one. Update the OS state to make them consistent.
pub fn ensure_autostart_state_consistent(app: &mut tauri::App) -> Result<(), String> {
    let autostart_manager = app.autolaunch();

    let os_state = autostart_manager.is_enabled().map_err(|e| e.to_string())?;
    let coco_stored_state = current_autostart(app.app_handle()).map_err(|e| e.to_string())?;

    if os_state != coco_stored_state {
        log::warn!(
            "autostart inconsistent states, OS state [{}], Coco state [{}], config file could be deleted or corrupted",
            os_state,
            coco_stored_state
        );
        log::info!("trying to correct the inconsistent states");

        let result = if coco_stored_state {
            autostart_manager.enable()
        } else {
            autostart_manager.disable()
        };

        match result {
            Ok(_) => {
                log::info!("inconsistent autostart states fixed");
            }
            Err(e) => {
                log::error!(
                    "failed to fix inconsistent autostart state due to error [{}]",
                    e
                );
                return Err(e.to_string());
            }
        }
    }

    Ok(())
}

fn current_autostart<R: Runtime>(app: &tauri::AppHandle<R>) -> Result<bool, String> {
    use std::fs::File;

    let path = app.path().app_config_dir().unwrap();
    let mut old_value = true;

    if path.exists() {
        let file_path = path.join("autostart.txt");
        if file_path.exists() {
            let mut file = File::open(file_path).unwrap();
            let mut data = String::new();
            if let Ok(_) = file.read_to_string(&mut data) {
                if data.is_empty() == false {
                    old_value = data.parse().unwrap_or(true)
                }
            }
        }
    };

    Ok(old_value)
}

#[tauri::command]
pub async fn change_autostart<R: Runtime>(
    app: tauri::AppHandle<R>,
    open: bool,
) -> Result<(), String> {
    use std::fs::File;
    use std::io::Write;

    let autostart_manager = app.autolaunch();

    let change = |open: bool| -> Result<(), String> {
        #[allow(unused_assignments)]
        let mut open_str = String::from("");
        if open {
            autostart_manager
                .enable()
                .map_err(|_| "enable autostar failed".to_owned())?;

            open_str = "true".to_owned();
        } else {
            autostart_manager
                .disable()
                .map_err(|_| "disable autostar failed".to_owned())?;

            open_str = "false".to_owned();
        }
        let path = app
            .path()
            .app_config_dir()
            .map_err(|_| "not found app config directory".to_owned())?;
        if path.exists() == false {
            create_dir(&path).map_err(|_| "creating app config directory failed".to_owned())?;
        }

        let file_path = path.join("autostart.txt");
        let mut file = File::create(file_path).unwrap();
        file.write_all(open_str.as_bytes()).unwrap();

        Ok(())
    };

    match (autostart_manager.is_enabled().unwrap(), open) {
        (false, true) => change(true),
        (true, false) => change(false),
        _ => Err("no change".to_owned()),
    }
}
