//! This module contains the code of extension installation.
//!
//!
//! # How
//!
//! Technically, installing an extension involves the following steps. The order
//! varies between 2 implementations.
//!
//!   1. Check if it is already installed, if so, return
//!   
//!   2. Check if it is compatible by inspecting the "minimum_coco_version"
//!      field. If it is incompatible, reject and error out.
//!
//!      This should be done before convert `plugin.json` JSON to `struct Extension`
//!      as the definition of `struct Extension` could change in the future, in this
//!      case, we want to tell users that "it is an incompatible extension" rather
//!      than "this extension is invalid".
//!   
//!   3. Correct the `plugin.json` JSON if it does not conform to our `struct
//!      Extension` definition. This can happen because the JSON written by
//!      developers is in a simplified form for a better developer experience.
//!
//!   4. Validate the corrected `plugin.json`
//!      1. misc checks
//!      2. Platform compatibility check
//!
//!   5. Write the extension files to the corresponding location
//!
//!      * developer directory
//!        * extension directory
//!          * assets directory
//!            * various assets files, e.g., "icon.png"
//!          * plugin.json file
//!          * View pages if exist
//!
//!   6. Canonicalize `Extension.icon` and `Extension.page` fields if they are
//!      relative paths
//!
//!      * icon: relative to the `assets` directory
//!      * page: relative to the extension root directory
//!
//!   7. Add the extension to the in-memory extension list.

pub(crate) mod error;
pub(crate) mod local_extension;
pub(crate) mod store;

use crate::extension::Extension;
use crate::extension::PLUGIN_JSON_FIELD_MINIMUM_COCO_VERSION;
use crate::util::platform::Platform;
use crate::util::version::ParseVersionError;
use crate::util::version::{COCO_VERSION, parse_coco_semver};
use serde::Serialize;
use serde_json::Value as Json;
use snafu::prelude::*;
use std::ops::Deref;

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

    // For main extensions, None means all.
    let main_extension_supported_platforms = extension.platforms.clone().unwrap_or(Platform::all());

    // Filter commands
    if let Some(ref mut commands) = extension.commands {
        commands.retain(|sub_ext| {
            if let Some(ref platforms) = sub_ext.platforms {
                platforms.contains(&current_platform)
            } else {
                main_extension_supported_platforms.contains(&current_platform)
            }
        });
    }

    // Filter scripts
    if let Some(ref mut scripts) = extension.scripts {
        scripts.retain(|sub_ext| {
            if let Some(ref platforms) = sub_ext.platforms {
                platforms.contains(&current_platform)
            } else {
                main_extension_supported_platforms.contains(&current_platform)
            }
        });
    }

    // Filter quicklinks
    if let Some(ref mut quicklinks) = extension.quicklinks {
        quicklinks.retain(|sub_ext| {
            if let Some(ref platforms) = sub_ext.platforms {
                platforms.contains(&current_platform)
            } else {
                main_extension_supported_platforms.contains(&current_platform)
            }
        });
    }

    // Filter views
    if let Some(ref mut views) = extension.views {
        views.retain(|sub_ext| {
            if let Some(ref platforms) = sub_ext.platforms {
                platforms.contains(&current_platform)
            } else {
                main_extension_supported_platforms.contains(&current_platform)
            }
        });
    }
}

#[derive(Debug, Snafu, Serialize)]
pub(crate) enum ParsingMinimumCocoVersionError {
    #[snafu(display("field 'minimum_coco_version' should be a string, but it is not"))]
    MismatchType,
    #[snafu(display("failed to parse field 'minimum_coco_version'"))]
    ParsingVersionError { source: ParseVersionError },
}

/// Inspect the "minimum_coco_version" field and see if this extension is
/// compatible with the current Coco app.
fn check_compatibility_via_mcv(plugin_json: &Json) -> Result<bool, ParsingMinimumCocoVersionError> {
    let Some(mcv_json) = plugin_json.get(PLUGIN_JSON_FIELD_MINIMUM_COCO_VERSION) else {
        return Ok(true);
    };
    if mcv_json == &Json::Null {
        return Ok(true);
    }

    let Some(mcv_str) = mcv_json.as_str() else {
        return Err(ParsingMinimumCocoVersionError::MismatchType);
    };

    let mcv = parse_coco_semver(mcv_str).context(ParsingVersionSnafu)?;

    Ok(COCO_VERSION.deref() >= &mcv)
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
            views: None,
            alias: None,
            hotkey: None,
            enabled: true,
            settings: None,
            page: None,
            ui: None,
            minimum_coco_version: None,
            permission: None,
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
        let views = vec![create_test_extension(
            ExtensionType::View,
            Some(HashSet::from([Platform::Macos])),
        )];
        // Set sub extensions
        main_extension.commands = Some(commands);
        main_extension.quicklinks = Some(quicklinks);
        main_extension.scripts = Some(scripts);
        main_extension.views = Some(views);

        // Current platform is Linux, all the sub extensions should be filtered out.
        filter_out_incompatible_sub_extensions(&mut main_extension, Platform::Linux);

        // assertions
        assert!(main_extension.commands.unwrap().is_empty());
        assert!(main_extension.quicklinks.unwrap().is_empty());
        assert!(main_extension.scripts.unwrap().is_empty());
        assert!(main_extension.views.unwrap().is_empty());
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
            let views = vec![create_test_extension(
                ExtensionType::View,
                Some(Platform::all()),
            )];
            // Set sub extensions
            main_extension.commands = Some(commands);
            main_extension.quicklinks = Some(quicklinks);
            main_extension.scripts = Some(scripts);
            main_extension.views = Some(views);

            // Current platform is Linux, all the sub extensions should be filtered out.
            filter_out_incompatible_sub_extensions(&mut main_extension, Platform::Linux);

            // assertions
            assert_eq!(main_extension.commands.unwrap().len(), 1);
            assert_eq!(main_extension.quicklinks.unwrap().len(), 1);
            assert_eq!(main_extension.scripts.unwrap().len(), 1);
            assert_eq!(main_extension.views.unwrap().len(), 1);
        }

        // main extension is compatible with all platforms, sub extension's platforms
        // is None, which means all platforms are supported
        {
            let mut main_extension = create_test_extension(ExtensionType::Group, None);
            // init sub extensions, which are compatible with all the platforms
            let commands = vec![create_test_extension(ExtensionType::Command, None)];
            let quicklinks = vec![create_test_extension(ExtensionType::Quicklink, None)];
            let scripts = vec![create_test_extension(ExtensionType::Script, None)];
            let views = vec![create_test_extension(ExtensionType::View, None)];
            // Set sub extensions
            main_extension.commands = Some(commands);
            main_extension.quicklinks = Some(quicklinks);
            main_extension.scripts = Some(scripts);
            main_extension.views = Some(views);

            // Current platform is Linux, all the sub extensions should be filtered out.
            filter_out_incompatible_sub_extensions(&mut main_extension, Platform::Linux);

            // assertions
            assert_eq!(main_extension.commands.unwrap().len(), 1);
            assert_eq!(main_extension.quicklinks.unwrap().len(), 1);
            assert_eq!(main_extension.scripts.unwrap().len(), 1);
            assert_eq!(main_extension.views.unwrap().len(), 1);
        }
    }

    #[test]
    fn test_main_extension_is_incompatible_sub_extension_platforms_none() {
        {
            let mut main_extension =
                create_test_extension(ExtensionType::Group, Some(HashSet::from([Platform::Macos])));
            let commands = vec![create_test_extension(ExtensionType::Command, None)];
            main_extension.commands = Some(commands);
            filter_out_incompatible_sub_extensions(&mut main_extension, Platform::Linux);
            assert_eq!(main_extension.commands.unwrap().len(), 0);
        }

        {
            let mut main_extension =
                create_test_extension(ExtensionType::Group, Some(HashSet::from([Platform::Macos])));
            let scripts = vec![create_test_extension(ExtensionType::Script, None)];
            main_extension.scripts = Some(scripts);
            filter_out_incompatible_sub_extensions(&mut main_extension, Platform::Linux);
            assert_eq!(main_extension.scripts.unwrap().len(), 0);
        }

        {
            let mut main_extension =
                create_test_extension(ExtensionType::Group, Some(HashSet::from([Platform::Macos])));
            let quicklinks = vec![create_test_extension(ExtensionType::Quicklink, None)];
            main_extension.quicklinks = Some(quicklinks);
            filter_out_incompatible_sub_extensions(&mut main_extension, Platform::Linux);
            assert_eq!(main_extension.quicklinks.unwrap().len(), 0);
        }
        {
            let mut main_extension =
                create_test_extension(ExtensionType::Group, Some(HashSet::from([Platform::Macos])));
            let views = vec![create_test_extension(ExtensionType::View, None)];
            main_extension.views = Some(views);
            filter_out_incompatible_sub_extensions(&mut main_extension, Platform::Linux);
            assert_eq!(main_extension.views.unwrap().len(), 0);
        }
    }

    #[test]
    fn test_main_extension_compatible_sub_extension_platforms_none() {
        let mut main_extension =
            create_test_extension(ExtensionType::Group, Some(HashSet::from([Platform::Macos])));
        let views = vec![create_test_extension(ExtensionType::View, None)];
        main_extension.views = Some(views);
        filter_out_incompatible_sub_extensions(&mut main_extension, Platform::Macos);
        assert_eq!(main_extension.views.unwrap().len(), 1);
    }
}
