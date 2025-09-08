use super::actions::Action;
use crate::common::document::OnOpened;
use serde_plain;

pub(crate) fn on_opened(command_id: &str) -> OnOpened {
    let action: Action = serde_plain::from_str(command_id).unwrap_or_else(|_| {
        panic!("Window Management commands IDs should be valid for `enum Action`, someone corrupts the JSON file");
    });
    OnOpened::WindowManagementAction { action }
}
