use std::path::PathBuf;
use tauri::plugin::TauriPlugin;

/// Return the log directory.
///
/// We use a custom log directory, which is similar to the one used by
/// Tauri, except that the "{bundleIdentifier}" will be "Coco AI" rather
/// than the real identifier.
///
/// We do this because our bundle ID ("rs.coco.app") ends with ".app", log directory 
/// "/Users/xxx/Library/Logs/rs.coco.app" is mistakenly thought as an application
/// by Finder on macOS, making it inconvenient to open. We do not want to change the
/// bundle identifier. The data directory, which stores all the data, still 
/// references it. So doing that will be a breaking change. Using a custom log 
/// directory make more sense.
///
/// ### Platform-specific
///
/// |Platform   | Value                                                              | Example                                     |
/// | --------- | -------------------------------------------------------------------| --------------------------------------------|
/// | Linux     | `$XDG_DATA_HOME/Coco AI/logs` or `$HOME/.local/share/Coco AI/logs` | `/home/alice/.local/share/Coco AI/logs`     |
/// | macOS/iOS | `{homeDir}/Library/Logs/Coco AI`                                   | `/Users/Alice/Library/Logs/Coco AI`         |
/// | Windows   | `{FOLDERID_LocalAppData}/Coco AI/logs`                             | `C:\Users\Alice\AppData\Local\Coco AI\logs` |
/// | Android   | `{ConfigDir}/logs`                                                 | `/data/data/com.tauri.dev/files/logs`       |
#[tauri::command]
pub fn app_log_dir() -> PathBuf {
    const IDENTIFIER: &str = "Coco AI";

    #[cfg(target_os = "macos")]
    let path = dirs::home_dir()
        .expect("cannot find the home directory, Coco should never run in such a environment")
        .join("Library/Logs")
        .join(IDENTIFIER);

    #[cfg(not(target_os = "macos"))]
    let path = dirs::data_local_dir()
        .expect("app local dir is None, we should not encounter this")
        .join(IDENTIFIER)
        .join("logs");

    path
}

/// Log format:
///
/// ```text
/// [time] [log level] [file module:line] message
/// ```
///
/// Example:
///
///
/// ```text
/// [05-11 17:00:00] [INF] [coco_lib:625] Coco-AI started
/// ```
pub(crate) fn set_up_tauri_logger() -> TauriPlugin<tauri::Wry> {
    use log::Level;
    use log::LevelFilter;
    use tauri_plugin_log::Builder;
    use tauri_plugin_log::Target;
    use tauri_plugin_log::TargetKind;

    /// Coco-AI app's default log level.
    const DEFAULT_LOG_LEVEL: LevelFilter = LevelFilter::Info;
    const LOG_LEVEL_ENV_VAR: &str = "COCO_LOG";

    fn format_log_level(level: Level) -> &'static str {
        match level {
            Level::Trace => "TRC",
            Level::Debug => "DBG",
            Level::Info => "INF",
            Level::Warn => "WAR",
            Level::Error => "ERR",
        }
    }

    fn format_target_and_line(record: &log::Record) -> String {
        let mut str = record.target().to_string();
        if let Some(line) = record.line() {
            str.push(':');
            str.push_str(&line.to_string());
        }

        str
    }

    /// Allow us to configure dynamic log levels via environment variable `COCO_LOG`.
    ///
    /// Generally, it mirrors the behavior of `env_logger`. Syntax: `COCO_LOG=[module][=][level][,...]`
    ///
    /// * If this environment variable is not set, use the default log level.
    /// * If it is set, respect it:
    ///
    /// * `COCO_LOG=coco_lib` turns on all logging for the `coco_lib` module, which is
    ///   equivalent to `COCO_LOG=coco_lib=trace`
    /// * `COCO_LOG=trace` turns on all logging for the application, regardless of its name
    /// * `COCO_LOG=TRACE` turns on all logging for the application, regardless of its name (same as previous)
    /// * `COCO_LOG=reqwest=debug` turns on debug logging for `reqwest`
    /// * `COCO_LOG=trace,tauri=off` turns on all the logging except for the logs come from `tauri`
    /// * `COCO_LOG=off` turns off all logging for the application
    /// * `COCO_LOG=` Since the value is empty, turns off all logging for the application as well
    fn dynamic_log_level(mut builder: Builder) -> Builder {
        let Some(log_levels) = std::env::var_os(LOG_LEVEL_ENV_VAR) else {
            return builder.level(DEFAULT_LOG_LEVEL);
        };

        builder = builder.level(LevelFilter::Off);

        let log_levels = log_levels.into_string().unwrap_or_else(|e| {
            panic!(
                "The value '{}' set in environment variable '{}' is not UTF-8 encoded",
                // Cannot use `.display()` here because that requires MSRV 1.87.0
                e.to_string_lossy(),
                LOG_LEVEL_ENV_VAR
            )
        });

        // COCO_LOG=[module][=][level][,...]
        let module_log_levels = log_levels.split(',');
        for module_log_level in module_log_levels {
            #[allow(clippy::collapsible_else_if)]
            if let Some(char_index) = module_log_level.chars().position(|c| c == '=') {
                let (module, equal_sign_and_level) = module_log_level.split_at(char_index);
                // Remove the equal sign, we know it takes 1 byte
                let level = &equal_sign_and_level[1..];

                if let Ok(level) = level.parse::<LevelFilter>() {
                    // Here we have to call `.to_string()` because `Cow<'static, str>` requires `&'static str`
                    builder = builder.level_for(module.to_string(), level);
                } else {
                    panic!(
                        "log level '{}' set in '{}={}' is invalid",
                        level, module, level
                    );
                }
            } else {
                if let Ok(level) = module_log_level.parse::<LevelFilter>() {
                    // This is a level
                    builder = builder.level(level);
                } else {
                    // This is a module, enable all the logging
                    let module = module_log_level;
                    // Here we have to call `.to_string()` because `Cow<'static, str>` requires `&'static str`
                    builder = builder.level_for(module.to_string(), LevelFilter::Trace);
                }
            }
        }

        builder
    }

    // When running the built binary, set `COCO_LOG` to `coco_lib=trace` to capture all logs
    // that come from Coco in the log file, which helps with debugging.
    if !tauri::is_dev() {
        // We have absolutely no guarantee that we (We have control over the Rust
        // code, but definitely no idea about the libc C code, all the shared objects
        // that we will link) will not concurrently read/write `envp`, so just use unsafe.
        unsafe {
            std::env::set_var("COCO_LOG", "coco_lib=trace");
        }
    }

    let mut builder = tauri_plugin_log::Builder::new();
    builder = builder.format(|out, message, record| {
        let now = chrono::Local::now().format("%m-%d %H:%M:%S");
        let level = format_log_level(record.level());
        let target_and_line = format_target_and_line(record);
        out.finish(format_args!(
            "[{}] [{}] [{}] {}",
            now, level, target_and_line, message
        ));
    });
    builder = dynamic_log_level(builder);

    /*
     * Use our custom log directory
     */
    // We have no public APIs to update targets in-place, so we need to remove
    // them all, then bring back the correct ones.
    builder = builder.clear_targets();
    builder = builder.target(Target::new(TargetKind::Stdout));
    builder = builder.target(Target::new(TargetKind::Folder {
        path: app_log_dir(),
        // Use the default value, which is "Coco-AI.log"
        file_name: None,
    }));

    builder.build()
}
