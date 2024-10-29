// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    coco_lib::run();

    tauri::Builder::default()
      .plugin(tauri_nspanel::init())
      .run(tauri::generate_context!())
      .expect("error while running tauri application");
}
