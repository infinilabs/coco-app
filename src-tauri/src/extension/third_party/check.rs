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
use std::collections::HashSet;

pub(crate) fn general_check(extension: &Extension) -> Result<(), String> {
    // Check main extension
    check_main_extension_only(extension)?;
    check_main_extension_or_sub_extension(extension, &format!("extension [{}]", extension.id))?;

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
    let sub_extensions = [commands, scripts, quicklinks].concat();
    let mut sub_extension_ids = HashSet::new();

    for sub_extension in sub_extensions.iter() {
        check_sub_extension_only(&extension.id, sub_extension)?;
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

    if extension.commands.is_some() || extension.scripts.is_some() || extension.quicklinks.is_some()
    {
        if extension.r#type != ExtensionType::Group && extension.r#type != ExtensionType::Extension
        {
            return Err(format!(
                "invalid extension [{}], only extension of type [Group] and [Extension] can have sub-extensions",
                extension.id,
            ));
        }
    }

    Ok(())
}

fn check_sub_extension_only(extension_id: &str, sub_extension: &Extension) -> Result<(), String> {
    if sub_extension.r#type == ExtensionType::Group
        || sub_extension.r#type == ExtensionType::Extension
    {
        return Err(format!(
            "invalid sub-extension [{}-{}]: sub-extensions should not be of type [Group] or [Extension]",
            extension_id, sub_extension.id
        ));
    }

    if sub_extension.platforms.is_some() {
        return Err(format!(
            "invalid sub-extension [{}-{}]: field [platforms] should not be set in sub-extensions",
            extension_id, sub_extension.id
        ));
    }

    if sub_extension.commands.is_some()
        || sub_extension.scripts.is_some()
        || sub_extension.quicklinks.is_some()
    {
        return Err(format!(
            "invalid sub-extension [{}-{}]: fields [commands/scripts/quicklinks] should not be set in sub-extensions",
            extension_id, sub_extension.id
        ));
    }

    if sub_extension.developer.is_some() {
        return Err(format!(
            "invalid sub-extension [{}-{}]: field [developer] should not be set in sub-extensions",
            extension_id, sub_extension.id
        ));
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

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::extension::{CommandAction, Quicklink, QuicklinkLink, QuicklinkLinkComponent};
    use crate::util::platform::Platform;
    use std::collections::HashSet;

    /// Helper function to create a basic valid extension
    fn create_basic_extension(id: &str, extension_type: ExtensionType) -> Extension {
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
            alias: None,
            hotkey: None,
            enabled: true,
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
    fn test_sub_extension_cannot_have_platforms() {
        let mut extension = create_basic_extension("test-group", ExtensionType::Group);
        let mut sub_cmd = create_basic_extension("sub-cmd", ExtensionType::Command);
        sub_cmd.action = Some(create_command_action());

        let mut platforms = HashSet::new();
        platforms.insert(Platform::Macos);
        sub_cmd.platforms = Some(platforms);

        extension.commands = Some(vec![sub_cmd]);

        let result = general_check(&extension);
        assert!(result.is_err());
        assert!(
            result
                .unwrap_err()
                .contains("field [platforms] should not be set in sub-extensions")
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
        assert!(
            result.unwrap_err().contains(
                "fields [commands/scripts/quicklinks] should not be set in sub-extensions"
            )
        );
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
}
