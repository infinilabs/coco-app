use semver::{BuildMetadata, Prerelease, Version};
use tauri_plugin_updater::RemoteRelease;

const SNAPSHOT_DASH: &str = "SNAPSHOT-";
const SNAPSHOT_DASH_LEN: usize = SNAPSHOT_DASH.len();
// trim the last dash
const SNAPSHOT: &str = SNAPSHOT_DASH.split_at(SNAPSHOT_DASH_LEN - 1).0;

/// Coco AI app adopt SemVer but the version string format does not adhere to
/// the SemVer specification, this function does the conversion.
///
/// # Example cases
///
/// * 0.8.0 => 0.8.0
///
///   You may see this when you develop Coco locally
///
/// * 0.8.0-<build num> => 0.8.0
///
///   This is the official release for 0.8.0
///
/// * 0.9.0-SNAPSHOT-<build num> => 0.9.0-SNAPSHOT.<build num>
///   
///   A pre-release of 0.9.0
fn to_semver(version: &Version) -> Version {
    let pre = &version.pre;

    if pre.is_empty() {
        return Version::new(version.major, version.minor, version.patch);
    }
    let is_pre_release = pre.starts_with(SNAPSHOT_DASH);

    let build_number_str = if is_pre_release {
        &pre[SNAPSHOT_DASH_LEN..]
    } else {
        pre.as_str()
    };
    // Parse the build number to validate it, we do not need the actual number though.
    build_number_str.parse::<usize>().unwrap_or_else(|_| {
        panic!(
            "looks like Coco changed the version string format, but forgot to update this function"
        );
    });

    // Return after checking the build number is valid
    if !is_pre_release {
        return Version::new(version.major, version.minor, version.patch);
    }

    let pre = {
        let pre_str = format!("{}.{}", SNAPSHOT, build_number_str);
        Prerelease::new(&pre_str).unwrap_or_else(|e| panic!("invalid Prerelease: {}", e))
    };

    Version {
        major: version.major,
        minor: version.minor,
        patch: version.patch,
        pre,
        build: BuildMetadata::EMPTY,
    }
}

pub(crate) fn custom_version_comparator(local: Version, remote_release: RemoteRelease) -> bool {
    let remote = remote_release.version;
    let local_semver = to_semver(&local);
    let remote_semver = to_semver(&remote);

    let should_update = remote_semver > local_semver;

    log::debug!(
        "custom version comparator invoked, local version [{}], remote version [{}], should update [{}]",
        local,
        remote,
        should_update
    );

    should_update
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::collections::HashMap;
    use tauri_plugin_updater::RemoteReleaseInner;

    #[test]
    fn test_try_into_semver_local_dev() {
        // Case: 0.8.0 => 0.8.0
        // Local development version without any pre-release or build metadata
        let input = Version::parse("0.8.0").unwrap();
        let result = to_semver(&input);

        assert_eq!(result.major, 0);
        assert_eq!(result.minor, 8);
        assert_eq!(result.patch, 0);
        assert_eq!(result.pre, Prerelease::EMPTY);
        assert!(result.build.is_empty());
        assert_eq!(result.to_string(), "0.8.0");
    }

    #[test]
    fn test_try_into_semver_official_release() {
        // Case: 0.8.0-<build num> => 0.8.0
        // Official release with build number in pre-release field
        let input = Version::parse("0.8.0-123").unwrap();
        let result = to_semver(&input);

        assert_eq!(result.major, 0);
        assert_eq!(result.minor, 8);
        assert_eq!(result.patch, 0);
        assert_eq!(result.pre, Prerelease::EMPTY);
        assert!(result.build.is_empty());
        assert_eq!(result.to_string(), "0.8.0");
    }

    #[test]
    fn test_try_into_semver_pre_release() {
        // Case: 0.9.0-SNAPSHOT-<build num> => 0.9.0-SNAPSHOT.<build num>
        // Pre-release version with SNAPSHOT prefix
        let input = Version::parse("0.9.0-SNAPSHOT-456").unwrap();
        let result = to_semver(&input);

        assert_eq!(result.major, 0);
        assert_eq!(result.minor, 9);
        assert_eq!(result.patch, 0);
        assert_eq!(result.pre.as_str(), "SNAPSHOT.456");
        assert!(result.build.is_empty());
        assert_eq!(result.to_string(), "0.9.0-SNAPSHOT.456");
    }

    #[test]
    fn test_try_into_semver_official_release_different_version() {
        // Test with different version numbers
        let input = Version::parse("1.2.3-9999").unwrap();
        let result = to_semver(&input);

        assert_eq!(result.major, 1);
        assert_eq!(result.minor, 2);
        assert_eq!(result.patch, 3);
        assert_eq!(result.pre, Prerelease::EMPTY);
        assert!(result.build.is_empty());
        assert_eq!(result.to_string(), "1.2.3");
    }

    #[test]
    fn test_try_into_semver_snapshot_different_version() {
        // Test SNAPSHOT with different version numbers
        let input = Version::parse("2.0.0-SNAPSHOT-777").unwrap();
        let result = to_semver(&input);

        assert_eq!(result.major, 2);
        assert_eq!(result.minor, 0);
        assert_eq!(result.patch, 0);
        assert_eq!(result.pre.as_str(), "SNAPSHOT.777");
        assert!(result.build.is_empty());
        assert_eq!(result.to_string(), "2.0.0-SNAPSHOT.777");
    }

    #[test]
    #[should_panic(expected = "looks like Coco changed the version string format")]
    fn test_try_into_semver_invalid_build_number() {
        // Should panic when build number is not a valid number
        let input = Version::parse("0.8.0-abc").unwrap();
        to_semver(&input);
    }

    #[test]
    #[should_panic(expected = "looks like Coco changed the version string format")]
    fn test_try_into_semver_invalid_snapshot_build_number() {
        // Should panic when SNAPSHOT build number is not a valid number
        let input = Version::parse("0.9.0-SNAPSHOT-xyz").unwrap();
        to_semver(&input);
    }

    #[test]
    fn test_custom_version_comparator() {
        fn new_local(str: &str) -> Version {
            Version::parse(str).unwrap()
        }
        fn new_remote_release(str: &str) -> RemoteRelease {
            let version = Version::parse(str).unwrap();

            RemoteRelease {
                version,
                notes: None,
                pub_date: None,
                data: RemoteReleaseInner::Static {
                    platforms: HashMap::new(),
                },
            }
        }

        assert_eq!(
            custom_version_comparator(new_local("0.8.0"), new_remote_release("0.8.0-2518")),
            false
        );
        assert_eq!(
            custom_version_comparator(new_local("0.8.0-2518"), new_remote_release("0.8.0")),
            false
        );
        assert_eq!(
            custom_version_comparator(new_local("0.9.0-SNAPSHOT-1"), new_remote_release("0.9.0")),
            true
        );
        assert_eq!(
            custom_version_comparator(new_local("0.9.0-SNAPSHOT-1"), new_remote_release("0.8.1")),
            false
        );
        assert_eq!(
            custom_version_comparator(new_local("0.9.0-SNAPSHOT-1"), new_remote_release("0.9.0-2")),
            true
        );
        assert_eq!(
            custom_version_comparator(
                new_local("0.9.0-SNAPSHOT-1"),
                new_remote_release("0.9.0-SNAPSHOT-1")
            ),
            false
        );
        assert_eq!(
            custom_version_comparator(
                new_local("0.9.0-SNAPSHOT-11"),
                new_remote_release("0.9.0-SNAPSHOT-9")
            ),
            false
        );
        assert_eq!(
            custom_version_comparator(
                new_local("0.9.0-SNAPSHOT-11"),
                new_remote_release("0.9.0-SNAPSHOT-19")
            ),
            true
        );
    }
}
