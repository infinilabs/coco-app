use serde::{Deserialize, Serialize};
use derive_more::Display;
use std::borrow::Cow;

#[derive(Debug, Deserialize, Serialize, Copy, Clone, Hash, PartialEq, Eq, Display)]
#[serde(rename_all(serialize = "lowercase", deserialize = "lowercase"))]
pub(crate) enum Platform {
    #[display("macOS")]
    Macos,
    #[display("Linux")]
    Linux,
    #[display("windows")]
    Windows,
}


impl Platform {
    /// Helper function to determine the current platform.
    pub(crate) fn current() -> Platform {
      let os_str = std::env::consts::OS;
      serde_plain::from_str(os_str).unwrap_or_else(|_e| {
        panic!("std::env::consts::OS is [{}], which is not a valid value for [enum Platform], valid values: ['macos', 'linux', 'windows']", os_str)
      })
    }

    /// Return the `X-OS-NAME` HTTP request header.
    pub(crate) fn to_os_name_http_header_str(&self) -> Cow<'static, str> {
        match self {
            Self::Macos => {
                Cow::Borrowed("macos")
            } 
            Self::Windows => {
                Cow::Borrowed("windows")
            } 
            // For Linux, we need the actual distro `ID`, not just a "linux".
            Self::Linux => {
                Cow::Owned(sysinfo::System::distribution_id())
            } 
        }
    }
}