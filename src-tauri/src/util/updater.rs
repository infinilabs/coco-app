use semver::Version;
use tauri_plugin_updater::RemoteRelease;

/// Helper function to extract the build number out of `version`.
///
/// If the version string is in the `x.y.z` format and does not include a build
/// number, we assume a build number of 0.
fn extract_version_number(version: &Version) -> u32 {
    let pre = &version.pre;

    if pre.is_empty() {
        // A special value for the versions that do not have array
        0
    } else {
        let pre_str = pre.as_str();
        let build_number_str = {
            match pre_str.strip_prefix("SNAPSHOT-") {
                Some(str) => str,
                None => pre_str,
            }
        };
        let build_number : u32 = build_number_str.parse().unwrap_or_else(|e| {
            panic!(
                "invalid build number, cannot parse [{}] to a valid build number, error [{}], version [{}]",
                build_number_str, e,  version
            )
        });

        build_number
    }
}

/// # Local version format
///
/// Packages built in our CI use the following format:
///
///   * `x.y.z-SNAPSHOT-<build number>`
///   * `x.y.z-<build number>`
///
/// If you build Coco from src, the version will be in format `x.y.z`
///
/// # Remote version format
///
/// `x.y.z-<build number>`
///
/// # How we compare versions
///
/// We compare versions based solely on the build number.  
/// If the version string is in the `x.y.z` format and does not include a build number,  
/// we assume a build number of 0. As a result, such versions are considered older  
/// than any version with an explicit build number.
pub(crate) fn custom_version_comparator(local: Version, remote_release: RemoteRelease) -> bool {
    let remote = remote_release.version;

    let local_build_number = extract_version_number(&local);
    let remote_build_number = extract_version_number(&remote);

    let should_update = remote_build_number > local_build_number;
    log::debug!(
        "custom version comparator invoked, local version [{}], remote version [{}], should update [{}]",
        local,
        remote,
        should_update
    );

    should_update
}
