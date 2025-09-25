#[tauri::command]
pub(crate) fn path_absolute(path: &str) -> String {
    // We do not use std::path::absolute() because it does not clean ".."
    // https://doc.rust-lang.org/stable/std/path/fn.absolute.html#platform-specific-behavior
    use path_clean::clean;

    let clean_path = clean(path);
    clean_path
        .into_os_string()
        .into_string()
        .expect("path should be UTF-8 encoded")
}
