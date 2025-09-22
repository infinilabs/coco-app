use cfg_if::cfg_if;

// * hits: the implementation of search
//
// * apply_config: Routines that should be performed to keep "other things"
//   synchronous with the passed configuration.
//   Currently, "other things" only include system indexer's setting entries.
cfg_if! {
    if #[cfg(target_os = "linux")] {
        mod linux;
        pub(crate) use linux::hits;
        pub(crate) use linux::apply_config;
    } else if #[cfg(target_os = "macos")] {
        mod macos;
        pub(crate) use macos::hits;
        pub(crate) use macos::apply_config;
    } else if #[cfg(target_os = "windows")] {
        mod windows;
        pub(crate) use windows::hits;
        pub(crate) use windows::apply_config;
    }
}

cfg_if! {
    if #[cfg(not(target_os = "windows"))] {
        use super::config::FileSearchConfig;
        use camino::Utf8Path;
    }
}

/// If `file_path` should be removed from the search results given the filter
/// conditions specified in `config`.
#[cfg(not(target_os = "windows"))] // Not used on Windows
pub(crate) fn should_be_filtered_out(
    config: &FileSearchConfig,
    file_path: &str,
    check_search_paths: bool,
    check_exclude_paths: bool,
    check_file_type: bool,
) -> bool {
    let file_path = Utf8Path::new(file_path);

    if check_search_paths {
        // search path
        let in_search_paths = config.search_paths.iter().any(|search_path| {
            let search_path = Utf8Path::new(search_path);
            file_path.starts_with(search_path)
        });
        if !in_search_paths {
            return true;
        }
    }

    if check_exclude_paths {
        // exclude path
        let is_excluded = config
            .exclude_paths
            .iter()
            .any(|exclude_path| file_path.starts_with(exclude_path));
        if is_excluded {
            return true;
        }
    }

    if check_file_type {
        // file type
        let matches_file_type = if config.file_types.is_empty() {
            true
        } else {
            let path_obj = camino::Utf8Path::new(&file_path);
            if let Some(extension) = path_obj.extension() {
                config
                    .file_types
                    .iter()
                    .any(|file_type| file_type == extension)
            } else {
                // `config.file_types` is not empty, the hit files should have extensions.
                false
            }
        };

        if !matches_file_type {
            return true;
        }
    }

    false
}

// should_be_filtered_out() is not defined for Windows
#[cfg(all(test, not(target_os = "windows")))]
mod tests {
    use super::super::config::SearchBy;
    use super::*;

    #[test]
    fn test_should_be_filtered_out_with_no_check() {
        let config = FileSearchConfig {
            search_paths: vec!["/home/user/Documents".to_string()],
            exclude_paths: vec![],
            file_types: vec!["fffffff".into()],
            search_by: SearchBy::Name,
        };

        assert!(!should_be_filtered_out(
            &config, "abbc", false, false, false
        ));
    }

    #[test]
    fn test_should_be_filtered_out_search_paths() {
        let config = FileSearchConfig {
            search_paths: vec![
                "/home/user/Documents".to_string(),
                "/home/user/Downloads".to_string(),
            ],
            exclude_paths: vec![],
            file_types: vec![],
            search_by: SearchBy::Name,
        };

        // Files in search paths should not be filtered
        assert!(!should_be_filtered_out(
            &config,
            "/home/user/Documents/file.txt",
            true,
            true,
            true
        ));
        assert!(!should_be_filtered_out(
            &config,
            "/home/user/Downloads/image.jpg",
            true,
            true,
            true
        ));
        assert!(!should_be_filtered_out(
            &config,
            "/home/user/Documents/folder/file.txt",
            true,
            true,
            true
        ));

        // Files not in search paths should be filtered
        assert!(should_be_filtered_out(
            &config,
            "/home/user/Pictures/photo.jpg",
            true,
            true,
            true
        ));
        assert!(should_be_filtered_out(
            &config,
            "/tmp/tempfile",
            true,
            true,
            true
        ));
        assert!(should_be_filtered_out(
            &config,
            "/usr/bin/ls",
            true,
            true,
            true
        ));
    }

    #[test]
    fn test_should_be_filtered_out_exclude_paths() {
        let config = FileSearchConfig {
            search_paths: vec!["/home/user".to_string()],
            exclude_paths: vec![
                "/home/user/Trash".to_string(),
                "/home/user/.cache".to_string(),
            ],
            file_types: vec![],
            search_by: SearchBy::Name,
        };

        // Files in search paths but not excluded should not be filtered
        assert!(!should_be_filtered_out(
            &config,
            "/home/user/Documents/file.txt",
            true,
            true,
            true
        ));
        assert!(!should_be_filtered_out(
            &config,
            "/home/user/Downloads/image.jpg",
            true,
            true,
            true
        ));

        // Files in excluded paths should be filtered
        assert!(should_be_filtered_out(
            &config,
            "/home/user/Trash/deleted_file",
            true,
            true,
            true
        ));
        assert!(should_be_filtered_out(
            &config,
            "/home/user/.cache/temp",
            true,
            true,
            true
        ));
        assert!(should_be_filtered_out(
            &config,
            "/home/user/Trash/folder/file.txt",
            true,
            true,
            true
        ));
    }

    #[test]
    fn test_should_be_filtered_out_file_types() {
        let config = FileSearchConfig {
            search_paths: vec!["/home/user/Documents".to_string()],
            exclude_paths: vec![],
            file_types: vec!["txt".to_string(), "md".to_string()],
            search_by: SearchBy::Name,
        };

        // Files with allowed extensions should not be filtered
        assert!(!should_be_filtered_out(
            &config,
            "/home/user/Documents/notes.txt",
            true,
            true,
            true
        ));
        assert!(!should_be_filtered_out(
            &config,
            "/home/user/Documents/readme.md",
            true,
            true,
            true
        ));

        // Files with disallowed extensions should be filtered
        assert!(should_be_filtered_out(
            &config,
            "/home/user/Documents/image.jpg",
            true,
            true,
            true
        ));
        assert!(should_be_filtered_out(
            &config,
            "/home/user/Documents/document.pdf",
            true,
            true,
            true
        ));

        // Files without extensions should be filtered when file_types is not empty
        assert!(should_be_filtered_out(
            &config,
            "/home/user/Documents/file",
            true,
            true,
            true
        ));
        assert!(should_be_filtered_out(
            &config,
            "/home/user/Documents/folder",
            true,
            true,
            true
        ));
    }

    #[test]
    fn test_should_be_filtered_out_empty_file_types() {
        let config = FileSearchConfig {
            search_paths: vec!["/home/user/Documents".to_string()],
            exclude_paths: vec![],
            file_types: vec![],
            search_by: SearchBy::Name,
        };

        // When file_types is empty, all file types should be allowed
        assert!(!should_be_filtered_out(
            &config,
            "/home/user/Documents/file.txt",
            true,
            true,
            true
        ));
        assert!(!should_be_filtered_out(
            &config,
            "/home/user/Documents/image.jpg",
            true,
            true,
            true
        ));
        assert!(!should_be_filtered_out(
            &config,
            "/home/user/Documents/document",
            true,
            true,
            true
        ));
        assert!(!should_be_filtered_out(
            &config,
            "/home/user/Documents/folder/",
            true,
            true,
            true
        ));
    }

    #[test]
    fn test_should_be_filtered_out_combined_filters() {
        let config = FileSearchConfig {
            search_paths: vec!["/home/user".to_string()],
            exclude_paths: vec!["/home/user/Trash".to_string()],
            file_types: vec!["txt".to_string()],
            search_by: SearchBy::Name,
        };

        // Should pass all filters: in search path, not excluded, and correct file type
        assert!(!should_be_filtered_out(
            &config,
            "/home/user/Documents/notes.txt",
            true,
            true,
            true
        ));

        // Fails file type filter
        assert!(should_be_filtered_out(
            &config,
            "/home/user/Documents/image.jpg",
            true,
            true,
            true
        ));

        // Fails exclude path filter
        assert!(should_be_filtered_out(
            &config,
            "/home/user/Trash/deleted.txt",
            true,
            true,
            true
        ));

        // Fails search path filter
        assert!(should_be_filtered_out(
            &config,
            "/tmp/temp.txt",
            true,
            true,
            true
        ));
    }

    #[test]
    fn test_should_be_filtered_out_edge_cases() {
        let config = FileSearchConfig {
            search_paths: vec!["/home/user".to_string()],
            exclude_paths: vec![],
            file_types: vec!["txt".to_string()],
            search_by: SearchBy::Name,
        };

        // Empty path
        assert!(should_be_filtered_out(&config, "", true, true, true));

        // Root path
        assert!(should_be_filtered_out(&config, "/", true, true, true));

        // Path that starts with search path but continues differently
        assert!(!should_be_filtered_out(
            &config,
            "/home/user/document.txt",
            true,
            true,
            true
        ));
        assert!(should_be_filtered_out(
            &config,
            "/home/user_other/file.txt",
            true,
            true,
            true
        ));
    }
}
