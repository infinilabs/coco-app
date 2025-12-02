use super::super::check::InvalidPluginJsonError;
use crate::common::error::serialize_error;
use crate::extension::third_party::install::ParsingMinimumCocoVersionError;
use crate::server::http_client::HttpRequestError;
use crate::util::platform::Platform;
use serde::Serialize;
use snafu::prelude::*;
use std::collections::HashSet;
use std::ffi::OsString;
use std::io;
use std::path::PathBuf;

#[derive(Debug, Snafu, Serialize)]
#[snafu(visibility(pub(crate)))]
pub(crate) enum InvalidExtensionError {
    #[snafu(display("path '{}' contains no filename", path.display()))]
    NoFileName { path: PathBuf },
    #[snafu(display("'{}' is not UTF-8 encoded", os_str.display()))]
    NonUtf8Encoding { os_str: OsString },
    #[snafu(display("file 'plugin.json' does not exist"))]
    MissingPluginJson,
    #[snafu(display("failed to read 'plugin.json'"))]
    ReadPluginJson {
        #[serde(serialize_with = "serialize_error")]
        source: io::Error,
    },
    #[snafu(display("failed to decode 'plugin.json'"))]
    DecodePluginJson {
        #[serde(serialize_with = "serialize_error")]
        source: serde_json::Error,
    },
    #[snafu(display("'plugin.json' is invalid"))]
    InvalidPluginJson { source: InvalidPluginJsonError },
    #[snafu(display("failed to parse field 'minimum_coco_version'"))]
    ParseMinimumCocoVersion {
        source: ParsingMinimumCocoVersionError,
    },
}

#[derive(Debug, Snafu, Serialize)]
#[snafu(visibility(pub(crate)))]
pub(crate) enum InstallExtensionError {
    #[snafu(display("extension is invalid"))]
    InvalidExtension { source: InvalidExtensionError },
    #[snafu(display("extension '{}' does not exist", id))]
    NotFound { id: String },
    #[snafu(display("failed to download extension"))]
    DownloadFailure { source: HttpRequestError },
    #[snafu(display("failed to decode the downloaded archive"))]
    ZipArchiveDecodingError {
        #[serde(serialize_with = "serialize_error")]
        source: zip::result::ZipError,
    },
    #[snafu(display("extension is already installed"))]
    AlreadyInstalled,
    #[snafu(display(
        "extension is incompatible with your current platform '{}', it can be installed on '{:?}'",
        current_platform,
        // Use Display print instead of Debug
        compatible_platforms.into_iter().map(|p|p.to_string()).collect::<Vec<String>>(),
    ))]
    IncompatiblePlatform {
        current_platform: Platform,
        compatible_platforms: HashSet<Platform>,
    },
    #[snafu(display("extension is incompatible with your Coco AI app",))]
    // TODO: include the actual 'minimum_coco_version' in the Display impl
    IncompatibleCocoApp,
    #[snafu(display("I/O Error"))]
    IoError {
        #[serde(serialize_with = "serialize_error")]
        source: io::Error,
    },
}
