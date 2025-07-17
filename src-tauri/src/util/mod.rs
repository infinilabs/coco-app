pub(crate) mod file;
pub(crate) mod platform;
pub(crate) mod app_lang;

use std::{path::Path, process::Command};
use tauri::{AppHandle, Runtime};
use tauri_plugin_shell::ShellExt;

enum LinuxDesktopEnvironment {
    Gnome,
    Kde,
}

impl LinuxDesktopEnvironment {
    // This impl is based on: https://wiki.archlinux.org/title/Desktop_entries#Usage
    fn launch_app_via_desktop_file<P: AsRef<Path>>(&self, file: P) -> Result<(), String> {
        let path = file.as_ref();
        if !path.try_exists().map_err(|e| e.to_string())? {
            return Err(format!("desktop file [{}] does not exist", path.display()));
        }

        let cmd_output = match self {
            Self::Gnome => {
                let uri = path
                    .file_stem()
                    .expect("the desktop file should contain a file stem part");

                Command::new("gtk-launch")
                    .arg(uri)
                    .output()
                    .map_err(|e| e.to_string())?
            }
            Self::Kde => Command::new("kde-open")
                .arg(path)
                .output()
                .map_err(|e| e.to_string())?,
        };

        if !cmd_output.status.success() {
            return Err(format!(
                "failed to launch app via desktop file [{}], underlying command stderr [{}]",
                path.display(),
                String::from_utf8_lossy(&cmd_output.stderr)
            ));
        }

        Ok(())
    }
}

fn get_linux_desktop_environment() -> Option<LinuxDesktopEnvironment> {
    let de_os_str = std::env::var_os("XDG_CURRENT_DESKTOP")?;
    let de_str = de_os_str
        .into_string()
        .expect("$XDG_CURRENT_DESKTOP should be UTF-8 encoded");

    let de = match de_str.as_str() {
        "GNOME" => LinuxDesktopEnvironment::Gnome,
        "KDE" => LinuxDesktopEnvironment::Kde,

        unsupported_de => unimplemented!(
            "This desktop environment [{}] has not been supported yet",
            unsupported_de
        ),
    };

    Some(de)
}

/// Homemade open() function to support open Linux applications via the `.desktop` file.
//
// tauri_plugin_shell::open() is deprecated, but we still use it.
#[allow(deprecated)]
pub async fn open<R: Runtime>(app_handle: AppHandle<R>, path: String) -> Result<(), String> {
    if cfg!(target_os = "linux") {
        let borrowed_path = Path::new(&path);
        if let Some(file_extension) = borrowed_path.extension() {
            if file_extension == "desktop" {
                let desktop_environment = get_linux_desktop_environment().expect("The Linux OS is running without a desktop, Coco could never run in such a environment");
                return desktop_environment.launch_app_via_desktop_file(path);
            }
        }
    }

    app_handle
        .shell()
        .open(path, None)
        .map_err(|e| e.to_string())
}
