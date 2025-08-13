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

use crate::extension::Extension;
use crate::util::platform::Platform;

use super::THIRD_PARTY_EXTENSIONS_SEARCH_SOURCE;

pub(crate) async fn is_extension_installed(developer: &str, extension_id: &str) -> bool {
    THIRD_PARTY_EXTENSIONS_SEARCH_SOURCE
        .get()
        .expect("global third party search source not set")
        .extension_exists(developer, extension_id)
        .await
}

/// Filters out sub-extensions that are not compatible with the current platform.
///
/// We make `current_platform` an argument so that this function is testable.
pub(crate) fn filter_out_incompatible_sub_extensions(
    extension: &mut Extension,
    current_platform: Platform,
) {
    // Only process extensions of type Group or Extension that can have sub-extensions
    if !extension.r#type.contains_sub_items() {
        return;
    }

    // Filter commands
    if let Some(ref mut commands) = extension.commands {
        commands.retain(|sub_ext| {
            // If platforms is None, the sub-extension is compatible with all platforms
            if let Some(ref platforms) = sub_ext.platforms {
                platforms.contains(&current_platform)
            } else {
                true
            }
        });
    }

    // Filter scripts
    if let Some(ref mut scripts) = extension.scripts {
        scripts.retain(|sub_ext| {
            // If platforms is None, the sub-extension is compatible with all platforms
            if let Some(ref platforms) = sub_ext.platforms {
                platforms.contains(&current_platform)
            } else {
                true
            }
        });
    }

    // Filter quicklinks
    if let Some(ref mut quicklinks) = extension.quicklinks {
        quicklinks.retain(|sub_ext| {
            // If platforms is None, the sub-extension is compatible with all platforms
            if let Some(ref platforms) = sub_ext.platforms {
                platforms.contains(&current_platform)
            } else {
                true
            }
        });
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::extension::ExtensionType;
    use std::collections::HashSet;

    /// Helper function to create a basic extension for testing
    /// `filter_out_incompatible_sub_extensions`
    fn create_test_extension(
        extension_type: ExtensionType,
        platforms: Option<HashSet<Platform>>,
    ) -> Extension {
        Extension {
            id: "ID".into(),
            name: "name".into(),
            developer: None,
            platforms,
            description: "Test extension".to_string(),
            icon: "test-icon".to_string(),
            r#type: extension_type,
            action: None,
            quicklink: None,
            commands: None,
            scripts: None,
            quicklinks: None,
            alias: None,
            hotkey: None,
            enabled: true,
            settings: None,
            screenshots: None,
            url: None,
            version: None,
        }
    }

    #[test]
    fn test_filter_out_incompatible_sub_extensions_filter_non_group_extension_unchanged() {
        // Command
        let mut extension = create_test_extension(ExtensionType::Command, None);
        let clone = extension.clone();
        filter_out_incompatible_sub_extensions(&mut extension, Platform::Linux);
        assert_eq!(extension, clone);

        // Quicklink
        let mut extension = create_test_extension(ExtensionType::Quicklink, None);
        let clone = extension.clone();
        filter_out_incompatible_sub_extensions(&mut extension, Platform::Linux);
        assert_eq!(extension, clone);
    }

    #[test]
    fn test_filter_out_incompatible_sub_extensions() {
        let mut main_extension = create_test_extension(ExtensionType::Group, None);
        // init sub extensions, which are macOS-only
        let commands = vec![create_test_extension(
            ExtensionType::Command,
            Some(HashSet::from([Platform::Macos])),
        )];
        let quicklinks = vec![create_test_extension(
            ExtensionType::Quicklink,
            Some(HashSet::from([Platform::Macos])),
        )];
        let scripts = vec![create_test_extension(
            ExtensionType::Script,
            Some(HashSet::from([Platform::Macos])),
        )];
        // Set sub extensions
        main_extension.commands = Some(commands);
        main_extension.quicklinks = Some(quicklinks);
        main_extension.scripts = Some(scripts);

        // Current platform is Linux, all the sub extensions should be filtered out.
        filter_out_incompatible_sub_extensions(&mut main_extension, Platform::Linux);

        // assertions
        assert!(main_extension.commands.unwrap().is_empty());
        assert!(main_extension.quicklinks.unwrap().is_empty());
        assert!(main_extension.scripts.unwrap().is_empty());
    }

    /// Sub extensions are compatible with all the platforms, nothing to filter out.
    #[test]
    fn test_filter_out_incompatible_sub_extensions_all_compatible() {
        {
            let mut main_extension = create_test_extension(ExtensionType::Group, None);
            // init sub extensions, which are compatible with all the platforms
            let commands = vec![create_test_extension(
                ExtensionType::Command,
                Some(Platform::all()),
            )];
            let quicklinks = vec![create_test_extension(
                ExtensionType::Quicklink,
                Some(Platform::all()),
            )];
            let scripts = vec![create_test_extension(
                ExtensionType::Script,
                Some(Platform::all()),
            )];
            // Set sub extensions
            main_extension.commands = Some(commands);
            main_extension.quicklinks = Some(quicklinks);
            main_extension.scripts = Some(scripts);

            // Current platform is Linux, all the sub extensions should be filtered out.
            filter_out_incompatible_sub_extensions(&mut main_extension, Platform::Linux);

            // assertions
            assert_eq!(main_extension.commands.unwrap().len(), 1);
            assert_eq!(main_extension.quicklinks.unwrap().len(), 1);
            assert_eq!(main_extension.scripts.unwrap().len(), 1);
        }

        // `platforms: None` means all platforms as well
        {
            let mut main_extension = create_test_extension(ExtensionType::Group, None);
            // init sub extensions, which are compatible with all the platforms
            let commands = vec![create_test_extension(ExtensionType::Command, None)];
            let quicklinks = vec![create_test_extension(ExtensionType::Quicklink, None)];
            let scripts = vec![create_test_extension(ExtensionType::Script, None)];
            // Set sub extensions
            main_extension.commands = Some(commands);
            main_extension.quicklinks = Some(quicklinks);
            main_extension.scripts = Some(scripts);

            // Current platform is Linux, all the sub extensions should be filtered out.
            filter_out_incompatible_sub_extensions(&mut main_extension, Platform::Linux);

            // assertions
            assert_eq!(main_extension.commands.unwrap().len(), 1);
            assert_eq!(main_extension.quicklinks.unwrap().len(), 1);
            assert_eq!(main_extension.scripts.unwrap().len(), 1);
        }
    }
}
