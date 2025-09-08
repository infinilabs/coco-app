use objc2_application_services::AXError;
use objc2_core_graphics::CGError;
use thiserror::Error;

#[derive(Debug, Error)]
pub enum Error {
    /// Cannot find the focused window.
    #[error("Cannot find the focused window.")]
    CannotFindFocusWindow,
    /// Error code from the macOS Accessibility APIs.
    #[error("Error code from the macOS Accessibility APIs: {0:?}")]
    AXError(AXError),
    /// Function should be in called from the main thread, but it is not.
    #[error("Function should be in called from the main thread, but it is not.")]
    NotInMainThread,
    /// No monitor detected.
    #[error("No monitor detected.")]
    NoDisplay,
    /// Can only handle 16 Workspaces at most.
    #[error("libwmgr can only handle 16 Workspaces at most.")]
    TooManyWorkspace,
    /// Error code from the macOS Core Graphics APIs.
    #[error("Error code from the macOS Core Graphics APIs: {0:?}")]
    CGError(CGError),
}
