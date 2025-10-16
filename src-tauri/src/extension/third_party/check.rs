//! Coco has 4 sources of `plugin.json` to check and validate:
//!
//! 1. From coco-extensions repository
//!   
//!    Granted, Coco APP won't check these files directly, but the code here
//!    will run in that repository's CI to prevent errors in the first place.
//!
//! 2. From the "<data directory>/third_party_extensions" directory
//! 3. Imported via "Import Local Extension"
//! 4. Downloaded from the "store/extension/<extension ID>/_download" API
//!
//! This file contains the checks that are general enough to be applied to all
//! these 4 sources

use crate::extension::Extension;
use crate::extension::ExtensionType;
use crate::util::platform::Platform;
use std::collections::HashSet;

pub(crate) fn general_check(extension: &Extension) -> Result<(), String> {
    // Check main extension
    check_main_extension_only(extension)?;
    check_main_extension_or_sub_extension(extension, &format!("extension [{}]", extension.id))?;

    // `None` if `extension` is compatible with all the platforms. Otherwise `Some(limited_platforms)`
    let limited_supported_platforms = match extension.platforms.as_ref() {
        Some(platforms) => {
            if platforms.len() == Platform::num_of_supported_platforms() {
                None
            } else {
                Some(platforms)
            }
        }
        None => None,
    };

    // Check sub extensions
    let commands = match extension.commands {
        Some(ref v) => v.as_slice(),
        None => &[],
    };
    let scripts = match extension.scripts {
        Some(ref v) => v.as_slice(),
        None => &[],
    };
    let quicklinks = match extension.quicklinks {
        Some(ref v) => v.as_slice(),
        None => &[],
    };
    let views = match extension.views {
        Some(ref v) => v.as_slice(),
        None => &[],
    };
    let sub_extensions = [commands, scripts, quicklinks, views].concat();
    let mut sub_extension_ids = HashSet::new();

    for sub_extension in sub_extensions.iter() {
        check_sub_extension_only(&extension.id, sub_extension, limited_supported_platforms)?;
        check_main_extension_or_sub_extension(
            extension,
            &format!("sub-extension [{}-{}]", extension.id, sub_extension.id),
        )?;

        if !sub_extension_ids.insert(sub_extension.id.as_str()) {
            // extension ID already exists
            return Err(format!(
                "sub-extension with ID [{}] already exists",
                sub_extension.id
            ));
        }
    }

    Ok(())
}

/// This checks the main extension only, it won't check sub-extensions.
fn check_main_extension_only(extension: &Extension) -> Result<(), String> {
    // Group and Extension cannot have alias
    if extension.alias.is_some() {
        if extension.r#type == ExtensionType::Group || extension.r#type == ExtensionType::Extension
        {
            return Err(format!(
                "invalid extension [{}], extension of type [{:?}] cannot have alias",
                extension.id, extension.r#type
            ));
        }
    }

    // Group and Extension cannot have hotkey
    if extension.hotkey.is_some() {
        if extension.r#type == ExtensionType::Group || extension.r#type == ExtensionType::Extension
        {
            return Err(format!(
                "invalid extension [{}], extension of type [{:?}] cannot have hotkey",
                extension.id, extension.r#type
            ));
        }
    }

    if extension.commands.is_some()
        || extension.scripts.is_some()
        || extension.quicklinks.is_some()
        || extension.views.is_some()
    {
        if extension.r#type != ExtensionType::Group && extension.r#type != ExtensionType::Extension
        {
            return Err(format!(
                "invalid extension [{}], only extension of type [Group] and [Extension] can have sub-extensions",
                extension.id,
            ));
        }
    }

    if extension.settings.is_some() {
        // Sub-extensions are all searchable, so this check is only for main extensions.
        if !extension.searchable() {
            return Err(format!(
                "invalid extension {}, field [settings] is currently only allowed in searchable extension, this type of extension is not searchable [{}]",
                extension.id, extension.r#type
            ));
        }
    }

    Ok(())
}

fn check_sub_extension_only(
    extension_id: &str,
    sub_extension: &Extension,
    limited_platforms: Option<&HashSet<Platform>>,
) -> Result<(), String> {
    if sub_extension.r#type == ExtensionType::Group
        || sub_extension.r#type == ExtensionType::Extension
    {
        return Err(format!(
            "invalid sub-extension [{}-{}]: sub-extensions should not be of type [Group] or [Extension]",
            extension_id, sub_extension.id
        ));
    }

    if sub_extension.commands.is_some()
        || sub_extension.scripts.is_some()
        || sub_extension.quicklinks.is_some()
        || sub_extension.views.is_some()
    {
        return Err(format!(
            "invalid sub-extension [{}-{}]: fields [commands/scripts/quicklinks/views] should not be set in sub-extensions",
            extension_id, sub_extension.id
        ));
    }

    if sub_extension.developer.is_some() {
        return Err(format!(
            "invalid sub-extension [{}-{}]: field [developer] should not be set in sub-extensions",
            extension_id, sub_extension.id
        ));
    }

    if let Some(platforms_supported_by_main_extension) = limited_platforms {
        match sub_extension.platforms {
            Some(ref platforms_supported_by_sub_extension) => {
                let diff = platforms_supported_by_sub_extension
                    .difference(&platforms_supported_by_main_extension)
                    .into_iter()
                    .map(|p| p.to_string())
                    .collect::<Vec<String>>();

                if !diff.is_empty() {
                    return Err(format!(
                        "invalid sub-extension [{}-{}]: it supports platforms {:?} that are not supported by the main extension",
                        extension_id, sub_extension.id, diff
                    ));
                }
            }
            None => {
                // if `sub_extension.platform` is None, it means it has the same value
                // as main extension's `platforms` field, so we don't need to check it.
            }
        }
    }

    Ok(())
}

fn check_main_extension_or_sub_extension(
    extension: &Extension,
    identifier: &str,
) -> Result<(), String> {
    // If field `action` is Some, then it should be a Command
    if extension.action.is_some() && extension.r#type != ExtensionType::Command {
        return Err(format!(
            "invalid {}, field [action] is set for a non-Command extension",
            identifier
        ));
    }

    if extension.r#type == ExtensionType::Command && extension.action.is_none() {
        return Err(format!(
            "invalid {}, field [action] should be set for a Command extension",
            identifier
        ));
    }

    // If field `quicklink` is Some, then it should be a Quicklink
    if extension.quicklink.is_some() && extension.r#type != ExtensionType::Quicklink {
        return Err(format!(
            "invalid {}, field [quicklink] is set for a non-Quicklink extension",
            identifier
        ));
    }

    if extension.r#type == ExtensionType::Quicklink && extension.quicklink.is_none() {
        return Err(format!(
            "invalid {}, field [quicklink] should be set for a Quicklink extension",
            identifier
        ));
    }

    // If field `page` is Some, then it should be a View
    if extension.page.is_some() && extension.r#type != ExtensionType::View {
        return Err(format!(
            "invalid {}, field [page] is set for a non-View extension",
            identifier
        ));
    }

    if extension.r#type == ExtensionType::View && extension.page.is_none() {
        return Err(format!(
            "invalid {}, field [page] should be set for a View extension",
            identifier
        ));
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::extension::{
        CommandAction, ExtensionSettings, Quicklink, QuicklinkLink, QuicklinkLinkComponent,
    };

    /// Helper function to create a basic valid extension
    fn create_basic_extension(id: &str, extension_type: ExtensionType) -> Extension {
        let page = if extension_type == ExtensionType::View {
            Some("index.html".into())
        } else {
            None
        };

        Extension {
            id: id.to_string(),
            name: "Test Extension".to_string(),
            developer: None,
            platforms: None,
            description: "Test description".to_string(),
            icon: "test-icon.png".to_string(),
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
            page,
            ui: None,
            permission: None,
            settings: None,
            screenshots: None,
            url: None,
            version: None,
        }
    }

    /// Helper function to create a command action
    fn create_command_action() -> CommandAction {
        CommandAction {
            exec: "echo".to_string(),
            args: Some(vec!["test".to_string()]),
        }
    }

    /// Helper function to create a quicklink
    fn create_quicklink() -> Quicklink {
        Quicklink {
            link: QuicklinkLink {
                components: vec![QuicklinkLinkComponent::StaticStr(
                    "https://example.com".to_string(),
                )],
            },
            open_with: None,
        }
    }

    /* test_check_main_extension_only */
    #[test]
    fn test_group_cannot_have_alias() {
        let mut extension = create_basic_extension("test-group", ExtensionType::Group);
        extension.alias = Some("group-alias".to_string());

        let result = general_check(&extension);
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("cannot have alias"));
    }

    #[test]
    fn test_extension_cannot_have_alias() {
        let mut extension = create_basic_extension("test-ext", ExtensionType::Extension);
        extension.alias = Some("ext-alias".to_string());

        let result = general_check(&extension);
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("cannot have alias"));
    }

    #[test]
    fn test_group_cannot_have_hotkey() {
        let mut extension = create_basic_extension("test-group", ExtensionType::Group);
        extension.hotkey = Some("cmd+g".to_string());

        let result = general_check(&extension);
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("cannot have hotkey"));
    }

    #[test]
    fn test_extension_cannot_have_hotkey() {
        let mut extension = create_basic_extension("test-ext", ExtensionType::Extension);
        extension.hotkey = Some("cmd+e".to_string());

        let result = general_check(&extension);
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("cannot have hotkey"));
    }

    #[test]
    fn test_non_container_types_cannot_have_sub_extensions() {
        let mut extension = create_basic_extension("test-cmd", ExtensionType::Command);
        extension.action = Some(create_command_action());
        extension.commands = Some(vec![create_basic_extension(
            "sub-cmd",
            ExtensionType::Command,
        )]);

        let result = general_check(&extension);
        assert!(result.is_err());
        assert!(
            result
                .unwrap_err()
                .contains("only extension of type [Group] and [Extension] can have sub-extensions")
        );
    }

    #[test]
    fn test_non_searchable_extension_set_field_settings() {
        let mut extension = create_basic_extension("test-group", ExtensionType::Group);
        extension.settings = Some(ExtensionSettings {
            hide_before_open: None,
        });
        let error_msg = general_check(&extension).unwrap_err();
        assert!(
            error_msg
                .contains("field [settings] is currently only allowed in searchable extension")
        );

        let mut extension = create_basic_extension("test-extension", ExtensionType::Extension);
        extension.settings = Some(ExtensionSettings {
            hide_before_open: None,
        });
        let error_msg = general_check(&extension).unwrap_err();
        assert!(
            error_msg
                .contains("field [settings] is currently only allowed in searchable extension")
        );
    }
    /* test_check_main_extension_only */

    /* test check_main_extension_or_sub_extension */
    #[test]
    fn test_command_must_have_action() {
        let extension = create_basic_extension("test-cmd", ExtensionType::Command);

        let result = general_check(&extension);
        assert!(result.is_err());
        assert!(
            result
                .unwrap_err()
                .contains("field [action] should be set for a Command extension")
        );
    }

    #[test]
    fn test_non_command_cannot_have_action() {
        let mut extension = create_basic_extension("test-script", ExtensionType::Script);
        extension.action = Some(create_command_action());

        let result = general_check(&extension);
        assert!(result.is_err());
        assert!(
            result
                .unwrap_err()
                .contains("field [action] is set for a non-Command extension")
        );
    }

    #[test]
    fn test_quicklink_must_have_quicklink_field() {
        let extension = create_basic_extension("test-quicklink", ExtensionType::Quicklink);

        let result = general_check(&extension);
        assert!(result.is_err());
        assert!(
            result
                .unwrap_err()
                .contains("field [quicklink] should be set for a Quicklink extension")
        );
    }

    #[test]
    fn test_non_quicklink_cannot_have_quicklink_field() {
        let mut extension = create_basic_extension("test-cmd", ExtensionType::Command);
        extension.action = Some(create_command_action());
        extension.quicklink = Some(create_quicklink());

        let result = general_check(&extension);
        assert!(result.is_err());
        assert!(
            result
                .unwrap_err()
                .contains("field [quicklink] is set for a non-Quicklink extension")
        );
    }

    #[test]
    fn test_view_must_have_page_field() {
        let mut extension = create_basic_extension("test-view", ExtensionType::View);
        // create_basic_extension() will set its page field if type is View, clear it
        extension.page = None;

        let result = general_check(&extension);
        assert!(result.is_err());
        assert!(
            result
                .unwrap_err()
                .contains("field [page] should be set for a View extension")
        );
    }

    #[test]
    fn test_non_view_cannot_have_page_field() {
        let mut extension = create_basic_extension("test-cmd", ExtensionType::Command);
        extension.action = Some(create_command_action());
        extension.page = Some("index.html".into());

        let result = general_check(&extension);
        assert!(result.is_err());
        assert!(
            result
                .unwrap_err()
                .contains("field [page] is set for a non-View extension")
        );
    }
    /* test check_main_extension_or_sub_extension */

    /* Test check_sub_extension_only */
    #[test]
    fn test_sub_extension_cannot_be_group() {
        let mut extension = create_basic_extension("test-group", ExtensionType::Group);
        let sub_group = create_basic_extension("sub-group", ExtensionType::Group);
        extension.commands = Some(vec![sub_group]);

        let result = general_check(&extension);
        assert!(result.is_err());
        assert!(
            result
                .unwrap_err()
                .contains("sub-extensions should not be of type [Group] or [Extension]")
        );
    }

    #[test]
    fn test_sub_extension_cannot_be_extension() {
        let mut extension = create_basic_extension("test-ext", ExtensionType::Extension);
        let sub_ext = create_basic_extension("sub-ext", ExtensionType::Extension);
        extension.scripts = Some(vec![sub_ext]);

        let result = general_check(&extension);
        assert!(result.is_err());
        assert!(
            result
                .unwrap_err()
                .contains("sub-extensions should not be of type [Group] or [Extension]")
        );
    }

    #[test]
    fn test_sub_extension_cannot_have_developer() {
        let mut extension = create_basic_extension("test-group", ExtensionType::Group);
        let mut sub_cmd = create_basic_extension("sub-cmd", ExtensionType::Command);
        sub_cmd.action = Some(create_command_action());
        sub_cmd.developer = Some("test-dev".to_string());

        extension.commands = Some(vec![sub_cmd]);

        let result = general_check(&extension);
        assert!(result.is_err());
        assert!(
            result
                .unwrap_err()
                .contains("field [developer] should not be set in sub-extensions")
        );
    }

    #[test]
    fn test_sub_extension_cannot_have_sub_extensions() {
        let mut extension = create_basic_extension("test-group", ExtensionType::Group);
        let mut sub_cmd = create_basic_extension("sub-cmd", ExtensionType::Command);
        sub_cmd.action = Some(create_command_action());
        sub_cmd.commands = Some(vec![create_basic_extension(
            "nested-cmd",
            ExtensionType::Command,
        )]);

        extension.commands = Some(vec![sub_cmd]);

        let result = general_check(&extension);
        assert!(result.is_err());
        assert!(result.unwrap_err().contains(
            "fields [commands/scripts/quicklinks/views] should not be set in sub-extensions"
        ));
    }
    /* Test check_sub_extension_only */

    #[test]
    fn test_duplicate_sub_extension_ids() {
        let mut extension = create_basic_extension("test-group", ExtensionType::Group);

        let mut cmd1 = create_basic_extension("duplicate-id", ExtensionType::Command);
        cmd1.action = Some(create_command_action());

        let mut cmd2 = create_basic_extension("duplicate-id", ExtensionType::Command);
        cmd2.action = Some(create_command_action());

        extension.commands = Some(vec![cmd1, cmd2]);

        let result = general_check(&extension);
        assert!(result.is_err());
        assert!(
            result
                .unwrap_err()
                .contains("sub-extension with ID [duplicate-id] already exists")
        );
    }

    #[test]
    fn test_duplicate_ids_across_different_sub_extension_types() {
        let mut extension = create_basic_extension("test-group", ExtensionType::Group);

        let mut cmd = create_basic_extension("same-id", ExtensionType::Command);
        cmd.action = Some(create_command_action());

        let script = create_basic_extension("same-id", ExtensionType::Script);

        extension.commands = Some(vec![cmd]);
        extension.scripts = Some(vec![script]);

        let result = general_check(&extension);
        assert!(result.is_err());
        assert!(
            result
                .unwrap_err()
                .contains("sub-extension with ID [same-id] already exists")
        );
    }

    #[test]
    fn test_valid_group_extension() {
        let mut extension = create_basic_extension("test-group", ExtensionType::Group);
        extension.commands = Some(vec![create_basic_extension("cmd1", ExtensionType::Command)]);

        assert!(general_check(&extension).is_ok());
    }

    #[test]
    fn test_valid_extension_type() {
        let mut extension = create_basic_extension("test-ext", ExtensionType::Extension);
        extension.scripts = Some(vec![create_basic_extension(
            "script1",
            ExtensionType::Script,
        )]);

        assert!(general_check(&extension).is_ok());
    }

    #[test]
    fn test_valid_command_extension() {
        let mut extension = create_basic_extension("test-cmd", ExtensionType::Command);
        extension.action = Some(create_command_action());

        assert!(general_check(&extension).is_ok());
    }

    #[test]
    fn test_valid_quicklink_extension() {
        let mut extension = create_basic_extension("test-quicklink", ExtensionType::Quicklink);
        extension.quicklink = Some(create_quicklink());

        assert!(general_check(&extension).is_ok());
    }

    #[test]
    fn test_valid_complex_extension() {
        let mut extension = create_basic_extension("spotify-controls", ExtensionType::Extension);

        // Add valid commands
        let mut play_pause = create_basic_extension("play-pause", ExtensionType::Command);
        play_pause.action = Some(create_command_action());

        let mut next_track = create_basic_extension("next-track", ExtensionType::Command);
        next_track.action = Some(create_command_action());

        let mut prev_track = create_basic_extension("prev-track", ExtensionType::Command);
        prev_track.action = Some(create_command_action());

        extension.commands = Some(vec![play_pause, next_track, prev_track]);

        assert!(general_check(&extension).is_ok());
    }

    #[test]
    fn test_valid_single_layer_command() {
        let mut extension = create_basic_extension("empty-trash", ExtensionType::Command);
        extension.action = Some(create_command_action());

        assert!(general_check(&extension).is_ok());
    }

    #[test]
    fn test_command_alias_and_hotkey_allowed() {
        let mut extension = create_basic_extension("test-cmd", ExtensionType::Command);
        extension.action = Some(create_command_action());
        extension.alias = Some("cmd-alias".to_string());
        extension.hotkey = Some("cmd+t".to_string());

        assert!(general_check(&extension).is_ok());
    }

    /*
     * Tests for check that sub extension cannot support extensions that are not
     * supported by the main extension
     *
     * Start here
     */
    #[test]
    fn test_platform_validation_both_none() {
        // Case 1: main extension's platforms = None, sub extension's platforms = None
        // Should return Ok(())
        let mut main_extension = create_basic_extension("main-ext", ExtensionType::Group);
        main_extension.platforms = None;

        let mut sub_cmd = create_basic_extension("sub-cmd", ExtensionType::Command);
        sub_cmd.action = Some(create_command_action());
        sub_cmd.platforms = None;

        main_extension.commands = Some(vec![sub_cmd]);

        let result = general_check(&main_extension);
        assert!(result.is_ok());
    }

    #[test]
    fn test_platform_validation_main_all_sub_none() {
        // Case 2: main extension's platforms = Some(all platforms), sub extension's platforms = None
        // Should return Ok(())
        let mut main_extension = create_basic_extension("main-ext", ExtensionType::Group);
        main_extension.platforms = Some(Platform::all());

        let mut sub_cmd = create_basic_extension("sub-cmd", ExtensionType::Command);
        sub_cmd.action = Some(create_command_action());
        sub_cmd.platforms = None;

        main_extension.commands = Some(vec![sub_cmd]);

        let result = general_check(&main_extension);
        assert!(result.is_ok());
    }

    #[test]
    fn test_platform_validation_main_none_sub_some() {
        // Case 3: main extension's platforms = None, sub extension's platforms = Some([Platform::Macos])
        // Should return Ok(()) because None means supports all platforms
        let mut main_extension = create_basic_extension("main-ext", ExtensionType::Group);
        main_extension.platforms = None;

        let mut sub_cmd = create_basic_extension("sub-cmd", ExtensionType::Command);
        sub_cmd.action = Some(create_command_action());
        sub_cmd.platforms = Some(HashSet::from([Platform::Macos]));

        main_extension.commands = Some(vec![sub_cmd]);

        let result = general_check(&main_extension);
        assert!(result.is_ok());
    }

    #[test]
    fn test_platform_validation_main_all_sub_subset() {
        // Case 4: main extension's platforms = Some(all platforms), sub extension's platforms = Some([Platform::Macos])
        // Should return Ok(()) because sub extension supports a subset of main extension's platforms
        let mut main_extension = create_basic_extension("main-ext", ExtensionType::Group);
        main_extension.platforms = Some(Platform::all());

        let mut sub_cmd = create_basic_extension("sub-cmd", ExtensionType::Command);
        sub_cmd.action = Some(create_command_action());
        sub_cmd.platforms = Some(HashSet::from([Platform::Macos]));

        main_extension.commands = Some(vec![sub_cmd]);

        let result = general_check(&main_extension);
        assert!(result.is_ok());
    }

    #[test]
    fn test_platform_validation_main_limited_sub_unsupported() {
        // Case 5: main extension's platforms = Some([Platform::Macos]), sub extension's platforms = Some([Platform::Linux])
        // Should return Err because sub extension supports a platform not supported by main extension
        let mut main_extension = create_basic_extension("main-ext", ExtensionType::Group);
        main_extension.platforms = Some(HashSet::from([Platform::Macos]));

        let mut sub_cmd = create_basic_extension("sub-cmd", ExtensionType::Command);
        sub_cmd.action = Some(create_command_action());
        sub_cmd.platforms = Some(HashSet::from([Platform::Linux]));

        main_extension.commands = Some(vec![sub_cmd]);

        let result = general_check(&main_extension);
        assert!(result.is_err());
        let error_msg = result.unwrap_err();
        assert!(error_msg.contains("it supports platforms"));
        assert!(error_msg.contains("that are not supported by the main extension"));
        assert!(error_msg.contains("Linux")); // Should mention the unsupported platform
    }

    #[test]
    fn test_platform_validation_main_partial_sub_unsupported() {
        // Case 6: main extension's platforms = Some([Platform::Macos, Platform::Windows]), sub extension's platforms = Some([Platform::Linux])
        // Should return Err because sub extension supports a platform not supported by main extension
        let mut main_extension = create_basic_extension("main-ext", ExtensionType::Group);
        main_extension.platforms = Some(HashSet::from([Platform::Macos, Platform::Windows]));

        let mut sub_cmd = create_basic_extension("sub-cmd", ExtensionType::Command);
        sub_cmd.action = Some(create_command_action());
        sub_cmd.platforms = Some(HashSet::from([Platform::Linux]));

        main_extension.commands = Some(vec![sub_cmd]);

        let result = general_check(&main_extension);
        assert!(result.is_err());
        let error_msg = result.unwrap_err();
        assert!(error_msg.contains("it supports platforms"));
        assert!(error_msg.contains("that are not supported by the main extension"));
        assert!(error_msg.contains("Linux")); // Should mention the unsupported platform
    }

    #[test]
    fn test_platform_validation_main_limited_sub_none() {
        // Case 7: main extension's platforms = Some([Platform::Macos]), sub extension's platforms = None
        // Should return Ok(()) because when sub extension's platforms is None, it inherits main extension's platforms
        let mut main_extension = create_basic_extension("main-ext", ExtensionType::Group);
        main_extension.platforms = Some(HashSet::from([Platform::Macos]));

        let mut sub_cmd = create_basic_extension("sub-cmd", ExtensionType::Command);
        sub_cmd.action = Some(create_command_action());
        sub_cmd.platforms = None;

        main_extension.commands = Some(vec![sub_cmd]);

        let result = general_check(&main_extension);
        assert!(result.is_ok());
    }
    /*
     * Tests for check that sub extension cannot support extensions that are not
     * supported by the main extension
     *
     * End here
     */
}
