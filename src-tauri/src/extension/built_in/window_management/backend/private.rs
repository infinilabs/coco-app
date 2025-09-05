//! Private macOS APIs.

use bitflags::bitflags;
use objc2_application_services::AXError;
use objc2_application_services::AXUIElement;
use objc2_core_foundation::CFArray;
use objc2_core_graphics::CGError;
use objc2_core_graphics::CGWindowID;
use std::ffi::c_int;
use std::ffi::c_uint;
use std::ffi::c_ushort;

pub(crate) type CGSConnectionID = u32;
pub(crate) type CGSSpaceID = c_int;

bitflags! {
    #[derive(Debug, Copy, Clone, PartialEq, Eq)]
    #[repr(transparent)]
    pub struct CGSSpaceMask: c_int {
        const INCLUDE_CURRENT = 1 << 0;
        const INCLUDE_OTHERS  = 1 << 1;

        const INCLUDE_USER    = 1 << 2;
        const INCLUDE_OS      = 1 << 3;

        const VISIBLE         = 1 << 16;

        const CURRENT_SPACES = Self::INCLUDE_USER.bits() | Self::INCLUDE_CURRENT.bits();
        const OTHER_SPACES = Self::INCLUDE_USER.bits() | Self::INCLUDE_OTHERS.bits();
        const ALL_SPACES =
            Self::INCLUDE_USER.bits() | Self::INCLUDE_OTHERS.bits() | Self::INCLUDE_CURRENT.bits();

        const ALL_VISIBLE_SPACES = Self::ALL_SPACES.bits() | Self::VISIBLE.bits();

        const CURRENT_OS_SPACES = Self::INCLUDE_OS.bits() | Self::INCLUDE_CURRENT.bits();
        const OTHER_OS_SPACES = Self::INCLUDE_OS.bits() | Self::INCLUDE_OTHERS.bits();
        const ALL_OS_SPACES =
            Self::INCLUDE_OS.bits() | Self::INCLUDE_OTHERS.bits() | Self::INCLUDE_CURRENT.bits();
    }
}

unsafe extern "C" {
    /// Extract `window_id` from an AXUIElement.
    pub(crate) fn _AXUIElementGetWindow(
        elem: *mut AXUIElement,
        window_id: *mut CGWindowID,
    ) -> AXError;

    /// Connect to the WindowServer and get a connection descriptor.
    pub(crate) fn CGSMainConnectionID() -> CGSConnectionID;

    /// It returns a CFArray of dictionaries. Each dictionary contains information
    /// about a display, including a list of all the spaces (CGSSpaceID) on that display.
    pub(crate) fn CGSCopyManagedDisplaySpaces(cid: CGSConnectionID) -> *mut CFArray;

    /// Gets the ID of the space currently visible to the user.
    pub(crate) fn CGSGetActiveSpace(cid: CGSConnectionID) -> CGSSpaceID;

    /// Returns the values the symbolic hot key represented by the given UID is configured with.
    pub(crate) fn CGSGetSymbolicHotKeyValue(
        hotKey: c_ushort,
        outKeyEquivalent: *mut c_ushort,
        outVirtualKeyCode: *mut c_ushort,
        outModifiers: *mut c_uint,
    ) -> CGError;
    /// Returns whether the symbolic hot key represented by the given UID is enabled.
    pub(crate) fn CGSIsSymbolicHotKeyEnabled(hotKey: c_ushort) -> bool;
    /// Sets whether the symbolic hot key represented by the given UID is enabled.
    pub(crate) fn CGSSetSymbolicHotKeyEnabled(hotKey: c_ushort, isEnabled: bool) -> CGError;
}
