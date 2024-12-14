use std::{fs::create_dir, io::Read};

use tauri::{Manager, Runtime};
use tauri_plugin_autostart::ManagerExt;

/// Start or stop according to configuration
pub fn enable_autostart(app: &mut tauri::App) {
    use tauri_plugin_autostart::MacosLauncher;
    use tauri_plugin_autostart::ManagerExt;

    app.handle()
        .plugin(tauri_plugin_autostart::init(
            MacosLauncher::AppleScript,
            None,
        ))
        .unwrap();

    let autostart_manager = app.autolaunch();

    // close autostart
    // autostart_manager.disable().unwrap();
    // return;

    match (
        autostart_manager.is_enabled(),
        current_autostart(app.app_handle()),
    ) {
        (Ok(false), Ok(true)) => match autostart_manager.enable() {
            Ok(_) => println!("Autostart enabled successfully."),
            Err(err) => eprintln!("Failed to enable autostart: {}", err),
        },
        (Ok(true), Ok(false)) => match autostart_manager.disable() {
            Ok(_) => println!("Autostart disable successfully."),
            Err(err) => eprintln!("Failed to disable autostart: {}", err),
        },
        _ => (),
    }
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
pub fn change_autostart<R: Runtime>(app: tauri::AppHandle<R>, open: bool) -> Result<(), String> {
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
