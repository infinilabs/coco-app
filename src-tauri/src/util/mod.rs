pub(crate) mod app_lang;
pub(crate) mod file;
pub(crate) mod path;
pub(crate) mod platform;
pub(crate) mod prevent_default;
pub(crate) mod system_lang;
pub(crate) mod updater;

use std::{path::Path, process::Command};
use tauri::AppHandle;
use tauri_plugin_shell::ShellExt;

/// We use this env variable to determine the DE on Linux.
const XDG_CURRENT_DESKTOP: &str = "XDG_CURRENT_DESKTOP";

#[derive(Debug, PartialEq)]
pub(crate) enum LinuxDesktopEnvironment {
    Gnome,
    Kde,
    Unsupported { xdg_current_desktop: String },
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
            Self::Unsupported {
                xdg_current_desktop,
            } => {
                return Err(format!(
                    "Cannot open apps as this Linux desktop environment [{}] is not supported",
                    xdg_current_desktop
                ));
            }
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

/// None means that it is likely that we do not have a desktop environment.
pub(crate) fn get_linux_desktop_environment() -> Option<LinuxDesktopEnvironment> {
    let de_os_str = std::env::var_os(XDG_CURRENT_DESKTOP)?;
    let de_str = de_os_str.into_string().unwrap_or_else(|_os_string| {
        panic!("${} should be UTF-8 encoded", XDG_CURRENT_DESKTOP);
    });

    let de = match de_str.as_str() {
        "GNOME" => LinuxDesktopEnvironment::Gnome,
        // Ubuntu uses "ubuntu:GNOME" instead of just "GNOME", they really love
        // their distro name.
        "ubuntu:GNOME" => LinuxDesktopEnvironment::Gnome,
        "KDE" => LinuxDesktopEnvironment::Kde,

        _ => LinuxDesktopEnvironment::Unsupported {
            xdg_current_desktop: de_str,
        },
    };

    Some(de)
}

/// Homemade open() function to support open Linux applications via the `.desktop` file.
//
// tauri_plugin_shell::open() is deprecated, but we still use it.
#[allow(deprecated)]
pub async fn open(app_handle: AppHandle, path: String) -> Result<(), String> {
    if cfg!(target_os = "linux") {
        let borrowed_path = Path::new(&path);
        if let Some(file_extension) = borrowed_path.extension() {
            if file_extension == "desktop" {
                let desktop_environment = get_linux_desktop_environment().expect("The Linux OS is running without a desktop, Coco could never run in such an environment");
                return desktop_environment.launch_app_via_desktop_file(path);
            }
        }
    }

    app_handle
        .shell()
        .open(path, None)
        .map_err(|e| e.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    // This test modifies env var XDG_CURRENT_DESKTOP, which is kinda unsafe
    // but considering this is just test, it is ok to do so.
    #[test]
    fn test_get_linux_desktop_environment() {
        // SAFETY: Rust code won't modify/read XDG_CURRENT_DESKTOP concurrently, we
        // have no guarantee from the underlying C code.
        unsafe {
            // Save the original value if it exists
            let original_value = std::env::var_os(XDG_CURRENT_DESKTOP);

            // Test when XDG_CURRENT_DESKTOP is not set
            std::env::remove_var(XDG_CURRENT_DESKTOP);
            assert!(get_linux_desktop_environment().is_none());

            // Test GNOME
            std::env::set_var(XDG_CURRENT_DESKTOP, "GNOME");
            let result = get_linux_desktop_environment();
            assert_eq!(result.unwrap(), LinuxDesktopEnvironment::Gnome);

            // Test ubuntu:GNOME
            std::env::set_var(XDG_CURRENT_DESKTOP, "ubuntu:GNOME");
            let result = get_linux_desktop_environment();
            assert_eq!(result.unwrap(), LinuxDesktopEnvironment::Gnome);

            // Test KDE
            std::env::set_var(XDG_CURRENT_DESKTOP, "KDE");
            let result = get_linux_desktop_environment();
            assert_eq!(result.unwrap(), LinuxDesktopEnvironment::Kde);

            // Test unsupported desktop environment
            std::env::set_var(XDG_CURRENT_DESKTOP, "XFCE");
            let result = get_linux_desktop_environment();
            assert_eq!(
                result.unwrap(),
                LinuxDesktopEnvironment::Unsupported {
                    xdg_current_desktop: "XFCE".into()
                }
            );

            // Restore the original value
            match original_value {
                Some(value) => std::env::set_var(XDG_CURRENT_DESKTOP, value),
                None => std::env::remove_var(XDG_CURRENT_DESKTOP),
            }
        }
    }
}
