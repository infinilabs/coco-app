//! Ways of installing an extension.
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

pub(crate) mod store;
pub(crate) mod local_extension;