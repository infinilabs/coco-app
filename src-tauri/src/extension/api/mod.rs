//! The Rust implementation of the Coco extension APIs.
//!
//! Extension developers do not use these Rust APIs directly, they use our
//! [Typescript library][ts_lib], which eventually calls these APIs.
//!
//! [ts_lib]: https://github.com/infinilabs/coco-api

// For the public function names, we use Typescript naming convention, so that
// it aligns with the interfaces exposed by the coco-api library.
//
// function name: camelCase
#[allow(non_snake_case)]
pub(crate) mod fs;

use std::collections::HashMap;

/// Return all the available APIs grouped by their category.
#[tauri::command]
pub(crate) fn apis() -> HashMap<String, Vec<String>> {
    static APIS_TOML: &str = include_str!("./apis.toml");

    let apis: HashMap<String, Vec<String>> =
        toml::from_str(APIS_TOML).expect("Failed to parse apis.toml file");

    apis
}
