use derive_more::Display;
use serde::{Deserialize, Serialize};
use std::borrow::Cow;
use strum::EnumCount;
use strum::VariantArray;

#[derive(
    Debug,
    Deserialize,
    Serialize,
    Copy,
    Clone,
    Hash,
    PartialEq,
    Eq,
    Display,
    EnumCount,
    VariantArray,
)]
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
        panic!("std::env::consts::OS is [{}], which is not a valid value for [enum Platform], valid values: {:?}", os_str, Self::VARIANTS.iter().map(|platform|platform.to_string()).collect::<Vec<String>>());
      })
    }

    /// Return the `X-OS-NAME` HTTP request header.
    pub(crate) fn to_os_name_http_header_str(&self) -> Cow<'static, str> {
        match self {
            Self::Macos => Cow::Borrowed("macos"),
            Self::Windows => Cow::Borrowed("windows"),
            // For Linux, we need the actual distro `ID`, not just a "linux".
            Self::Linux => Cow::Owned(sysinfo::System::distribution_id()),
        }
    }

    /// Returns the number of platforms supported by Coco.
    //
    // a.k.a., the number of this enum's variants.
    pub(crate) fn num_of_supported_platforms() -> usize {
        Platform::COUNT
    }

    /// Returns a set that contains all the platforms.
    pub(crate) fn all() -> std::collections::HashSet<Self> {
        Platform::VARIANTS.into_iter().copied().collect()
    }
}
