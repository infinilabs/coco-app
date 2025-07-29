//! This module contains the code of extension installation.
//!
//!
//! # How
//!
//! Technically, installing an extension involves the following steps:
//!   
//!   1. Correct the `plugin.json` JSON if it does not conform to our `struct Extension`
//!      definition.
//!
//!   2. Write the extension files to the corresponding location
//!
//!      * developer directory
//!        * extension directory
//!          * assets directory
//!            * various assets files, e.g., "icon.png"
//!          * plugin.json file
//!
//!   3. Canonicalize the `Extension.icon` fields if they are relative paths
//!      (relative to the `assets` directory)
//!
//!   4. Deserialize the `plugin.json` file to a `struct Extension`, and call
//!      `THIRD_PARTY_EXTENSIONS_DIRECTORY.add_extension(extension)` to add it to
//!      the in-memory extension list.

pub(crate) mod local_extension;
pub(crate) mod store;

use super::THIRD_PARTY_EXTENSIONS_SEARCH_SOURCE;

pub(crate) async fn is_extension_installed(developer: &str, extension_id: &str) -> bool {
    THIRD_PARTY_EXTENSIONS_SEARCH_SOURCE
        .get()
        .unwrap()
        .extension_exists(developer, extension_id)
        .await
}
