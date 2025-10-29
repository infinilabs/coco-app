//! This module contains the code of extension installation.
//!
//!
//! # How
//!
//! Technically, installing an extension involves the following steps. The order
//! varies between 2 implementations.
//!
//!   1. Check if it is already installed, if so, return
//!   
//!   2. Check if it is compatible by inspecting the "minimum_coco_version"
//!      field. If it is incompatible, reject and error out.
//!
//!      This should be done before convert `plugin.json` JSON to `struct Extension`
//!      as the definition of `struct Extension` could change in the future, in this
//!      case, we want to tell users that "it is an incompatible extension" rather
//!      than "this extension is invalid".
//!   
//!   3. Correct the `plugin.json` JSON if it does not conform to our `struct
//!      Extension` definition. This can happen because the JSON written by
//!      developers is in a simplified form for a better developer experience.
//!
//!   4. Validate the corrected `plugin.json`
//!      1. misc checks
//!      2. Platform compatibility check
//!
//!   5. Write the extension files to the corresponding location
//!
//!      * developer directory
//!        * extension directory
//!          * assets directory
//!            * various assets files, e.g., "icon.png"
//!          * plugin.json file
//!          * View pages if exist
//!
//!   6. If this extension contains any View extensions, call `convert_page()`
//!      on them to make them loadable by Tauri/webview.
//!
//!      See `convert_page()` for more info.
//!
//!   7. Canonicalize `Extension.icon` and `Extension.page` fields if they are
//!      relative paths
//!
//!      * icon: relative to the `assets` directory
//!      * page: relative to the extension root directory
//!
//!   8. Add the extension to the in-memory extension list.

pub(crate) mod local_extension;
pub(crate) mod store;

use crate::extension::Extension;
use crate::extension::ExtensionType;
use crate::extension::PLUGIN_JSON_FIELD_MINIMUM_COCO_VERSION;
use crate::util::platform::Platform;
use crate::util::version::{COCO_VERSION, parse_coco_semver};
use serde_json::Value as Json;
use std::ops::Deref;
use std::path::Path;
use std::path::PathBuf;

use super::THIRD_PARTY_EXTENSIONS_SEARCH_SOURCE;

pub(crate) async fn is_extension_installed(developer: &str, extension_id: &str) -> bool {
    THIRD_PARTY_EXTENSIONS_SEARCH_SOURCE
        .get()
        .expect("global third party search source not set")
        .extension_exists(developer, extension_id)
        .await
}

/// Filters out sub-extensions that are not compatible with the current platform.
///
/// We make `current_platform` an argument so that this function is testable.
pub(crate) fn filter_out_incompatible_sub_extensions(
    extension: &mut Extension,
    current_platform: Platform,
) {
    // Only process extensions of type Group or Extension that can have sub-extensions
    if !extension.r#type.contains_sub_items() {
        return;
    }

    // For main extensions, None means all.
    let main_extension_supported_platforms = extension.platforms.clone().unwrap_or(Platform::all());

    // Filter commands
    if let Some(ref mut commands) = extension.commands {
        commands.retain(|sub_ext| {
            if let Some(ref platforms) = sub_ext.platforms {
                platforms.contains(&current_platform)
            } else {
                main_extension_supported_platforms.contains(&current_platform)
            }
        });
    }

    // Filter scripts
    if let Some(ref mut scripts) = extension.scripts {
        scripts.retain(|sub_ext| {
            if let Some(ref platforms) = sub_ext.platforms {
                platforms.contains(&current_platform)
            } else {
                main_extension_supported_platforms.contains(&current_platform)
            }
        });
    }

    // Filter quicklinks
    if let Some(ref mut quicklinks) = extension.quicklinks {
        quicklinks.retain(|sub_ext| {
            if let Some(ref platforms) = sub_ext.platforms {
                platforms.contains(&current_platform)
            } else {
                main_extension_supported_platforms.contains(&current_platform)
            }
        });
    }

    // Filter views
    if let Some(ref mut views) = extension.views {
        views.retain(|sub_ext| {
            if let Some(ref platforms) = sub_ext.platforms {
                platforms.contains(&current_platform)
            } else {
                main_extension_supported_platforms.contains(&current_platform)
            }
        });
    }
}

/// Convert the page file to make it loadable by the Tauri/Webview.
pub(crate) async fn convert_page(absolute_page_path: &Path) -> Result<(), String> {
    assert!(absolute_page_path.is_absolute());

    let page_content = tokio::fs::read_to_string(absolute_page_path)
        .await
        .map_err(|e| e.to_string())?;

    let new_page_content = _convert_page(&page_content, absolute_page_path)?;

    // overwrite it
    tokio::fs::write(absolute_page_path, new_page_content)
        .await
        .map_err(|e| e.to_string())?;

    Ok(())
}

/// NOTE: There is no Rust implementation of `convertFileSrc()` in Tauri. Our
/// impl here is based on [comment](https://github.com/tauri-apps/tauri/issues/12022#issuecomment-2572879115)
fn convert_file_src(path: &Path) -> Result<String, String> {
    #[cfg(any(windows, target_os = "android"))]
    let base = "http://asset.localhost/";
    #[cfg(not(any(windows, target_os = "android")))]
    let base = "asset://localhost/";

    let path =
        dunce::canonicalize(path).map_err(|e| format!("Failed to canonicalize path: {}", e))?;
    let path_str = path.to_string_lossy();
    let encoded = urlencoding::encode(&path_str);

    Ok(format!("{base}{encoded}"))
}

/// Tauri cannot directly access the file system, to make a file loadable, we
/// have to `canonicalize()` and `convertFileSrc()` its path before passing it
/// to Tauri.
///
/// View extension's page is a HTML file that Coco (Tauri) will load, we need
/// to process all `<PATH>` tags:
///
/// 1. `<script type="xxx" crossorigin src="<PATH>"></script>`
/// 2. `<a href="<PATH>">xxx</a>`
/// 3. `<link rel="xxx" href="<PATH>"/>`
/// 4. `<img class="xxx" src="<PATH>" alt="xxx"/>`
fn _convert_page(page_content: &str, absolute_page_path: &Path) -> Result<String, String> {
    use scraper::{Html, Selector};

    /// Helper function.
    ///
    /// Search `document` for the tag attributes specified by `tag_with_attribute`
    /// and `tag_attribute`, call `convert_file_src()`, then update the attribute
    /// value with the function return value.
    fn modify_tag_attributes(
        document: &Html,
        modified_html: &mut String,
        base_dir: &Path,
        tag_with_attribute: &str,
        tag_attribute: &str,
    ) -> Result<(), String> {
        let script_selector = Selector::parse(tag_with_attribute).unwrap();
        for element in document.select(&script_selector) {
            if let Some(src) = element.value().attr(tag_attribute) {
                if !src.starts_with("http://")
                    && !src.starts_with("https://")
                    && !src.starts_with("asset://")
                    && !src.starts_with("http://asset.localhost/")
                {
                    // It could be a path like "/assets/index-41be3ec9.js", but it
                    // is still a relative path. We need to remove the starting /
                    // or path.join() will think it is an absolute path and does nothing
                    let corrected_src = if src.starts_with('/') { &src[1..] } else { src };

                    let full_path = base_dir.join(corrected_src);

                    let converted_path = convert_file_src(full_path.as_path())?;
                    *modified_html = modified_html.replace(
                        &format!("{}=\"{}\"", tag_attribute, src),
                        &format!("{}=\"{}\"", tag_attribute, converted_path),
                    );
                }
            }
        }

        Ok(())
    }

    let base_dir = absolute_page_path
        .parent()
        .ok_or_else(|| format!("page path is invalid, it should have a parent path"))?;
    let document: Html = Html::parse_document(page_content);
    let mut modified_html: String = page_content.to_string();

    modify_tag_attributes(
        &document,
        &mut modified_html,
        base_dir,
        "script[src]",
        "src",
    )?;
    modify_tag_attributes(&document, &mut modified_html, base_dir, "a[href]", "href")?;
    modify_tag_attributes(
        &document,
        &mut modified_html,
        base_dir,
        "link[href]",
        "href",
    )?;
    modify_tag_attributes(&document, &mut modified_html, base_dir, "img[src]", "src")?;

    Ok(modified_html)
}

async fn view_extension_convert_pages(
    extension: &Extension,
    extension_directory: &Path,
) -> Result<(), String> {
    let pages: Vec<&str> = {
        if extension.r#type == ExtensionType::View {
            let page = extension
                .page
                .as_ref()
                .expect("View extension should set its page field");

            vec![page.as_str()]
        } else if extension.r#type.contains_sub_items()
            && let Some(ref views) = extension.views
        {
            let mut pages = Vec::with_capacity(views.len());

            for view in views.iter() {
                let page = view
                    .page
                    .as_ref()
                    .expect("View extension should set its page field");

                pages.push(page.as_str());
            }

            pages
        } else {
            // No pages in this extension
            Vec::new()
        }
    };
    fn canonicalize_page_path(page_path: &Path, extension_root: &Path) -> PathBuf {
        if page_path.is_relative() {
            // It is relative to the extension root directory
            extension_root.join(page_path)
        } else {
            page_path.into()
        }
    }
    for page in pages {
        /*
         * Skip HTTP links
         */
        if let Ok(url) = url::Url::parse(page)
            && ["http", "https"].contains(&url.scheme())
        {
            continue;
        }

        let path = canonicalize_page_path(Path::new(page), &extension_directory);
        convert_page(&path).await?;
    }

    Ok(())
}

/// Inspect the "minimum_coco_version" field and see if this extension is
/// compatible with the current Coco app.
fn check_compatibility_via_mcv(plugin_json: &Json) -> Result<bool, String> {
    let Some(mcv_json) = plugin_json.get(PLUGIN_JSON_FIELD_MINIMUM_COCO_VERSION) else {
        return Ok(true);
    };
    if mcv_json == &Json::Null {
        return Ok(true);
    }

    let Some(mcv_str) = mcv_json.as_str() else {
        return Err(format!(
            "invalid extension: field [{}] should be a string",
            PLUGIN_JSON_FIELD_MINIMUM_COCO_VERSION
        ));
    };

    let Some(mcv) = parse_coco_semver(mcv_str) else {
        return Err(format!(
            "invalid extension: [{}] is not a valid version string",
            PLUGIN_JSON_FIELD_MINIMUM_COCO_VERSION
        ));
    };

    Ok(COCO_VERSION.deref() >= &mcv)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::extension::ExtensionType;
    use std::collections::HashSet;

    /// Helper function to create a basic extension for testing
    /// `filter_out_incompatible_sub_extensions`
    fn create_test_extension(
        extension_type: ExtensionType,
        platforms: Option<HashSet<Platform>>,
    ) -> Extension {
        Extension {
            id: "ID".into(),
            name: "name".into(),
            developer: None,
            platforms,
            description: "Test extension".to_string(),
            icon: "test-icon".to_string(),
            r#type: extension_type,
            action: None,
            quicklink: None,
            commands: None,
            scripts: None,
            quicklinks: None,
            views: None,
            alias: None,
            hotkey: None,
            enabled: true,
            settings: None,
            page: None,
            ui: None,
            minimum_coco_version: None,
            permission: None,
            screenshots: None,
            url: None,
            version: None,
        }
    }

    #[test]
    fn test_filter_out_incompatible_sub_extensions_filter_non_group_extension_unchanged() {
        // Command
        let mut extension = create_test_extension(ExtensionType::Command, None);
        let clone = extension.clone();
        filter_out_incompatible_sub_extensions(&mut extension, Platform::Linux);
        assert_eq!(extension, clone);

        // Quicklink
        let mut extension = create_test_extension(ExtensionType::Quicklink, None);
        let clone = extension.clone();
        filter_out_incompatible_sub_extensions(&mut extension, Platform::Linux);
        assert_eq!(extension, clone);
    }

    #[test]
    fn test_filter_out_incompatible_sub_extensions() {
        let mut main_extension = create_test_extension(ExtensionType::Group, None);
        // init sub extensions, which are macOS-only
        let commands = vec![create_test_extension(
            ExtensionType::Command,
            Some(HashSet::from([Platform::Macos])),
        )];
        let quicklinks = vec![create_test_extension(
            ExtensionType::Quicklink,
            Some(HashSet::from([Platform::Macos])),
        )];
        let scripts = vec![create_test_extension(
            ExtensionType::Script,
            Some(HashSet::from([Platform::Macos])),
        )];
        let views = vec![create_test_extension(
            ExtensionType::View,
            Some(HashSet::from([Platform::Macos])),
        )];
        // Set sub extensions
        main_extension.commands = Some(commands);
        main_extension.quicklinks = Some(quicklinks);
        main_extension.scripts = Some(scripts);
        main_extension.views = Some(views);

        // Current platform is Linux, all the sub extensions should be filtered out.
        filter_out_incompatible_sub_extensions(&mut main_extension, Platform::Linux);

        // assertions
        assert!(main_extension.commands.unwrap().is_empty());
        assert!(main_extension.quicklinks.unwrap().is_empty());
        assert!(main_extension.scripts.unwrap().is_empty());
        assert!(main_extension.views.unwrap().is_empty());
    }

    /// Sub extensions are compatible with all the platforms, nothing to filter out.
    #[test]
    fn test_filter_out_incompatible_sub_extensions_all_compatible() {
        {
            let mut main_extension = create_test_extension(ExtensionType::Group, None);
            // init sub extensions, which are compatible with all the platforms
            let commands = vec![create_test_extension(
                ExtensionType::Command,
                Some(Platform::all()),
            )];
            let quicklinks = vec![create_test_extension(
                ExtensionType::Quicklink,
                Some(Platform::all()),
            )];
            let scripts = vec![create_test_extension(
                ExtensionType::Script,
                Some(Platform::all()),
            )];
            let views = vec![create_test_extension(
                ExtensionType::View,
                Some(Platform::all()),
            )];
            // Set sub extensions
            main_extension.commands = Some(commands);
            main_extension.quicklinks = Some(quicklinks);
            main_extension.scripts = Some(scripts);
            main_extension.views = Some(views);

            // Current platform is Linux, all the sub extensions should be filtered out.
            filter_out_incompatible_sub_extensions(&mut main_extension, Platform::Linux);

            // assertions
            assert_eq!(main_extension.commands.unwrap().len(), 1);
            assert_eq!(main_extension.quicklinks.unwrap().len(), 1);
            assert_eq!(main_extension.scripts.unwrap().len(), 1);
            assert_eq!(main_extension.views.unwrap().len(), 1);
        }

        // main extension is compatible with all platforms, sub extension's platforms
        // is None, which means all platforms are supported
        {
            let mut main_extension = create_test_extension(ExtensionType::Group, None);
            // init sub extensions, which are compatible with all the platforms
            let commands = vec![create_test_extension(ExtensionType::Command, None)];
            let quicklinks = vec![create_test_extension(ExtensionType::Quicklink, None)];
            let scripts = vec![create_test_extension(ExtensionType::Script, None)];
            let views = vec![create_test_extension(ExtensionType::View, None)];
            // Set sub extensions
            main_extension.commands = Some(commands);
            main_extension.quicklinks = Some(quicklinks);
            main_extension.scripts = Some(scripts);
            main_extension.views = Some(views);

            // Current platform is Linux, all the sub extensions should be filtered out.
            filter_out_incompatible_sub_extensions(&mut main_extension, Platform::Linux);

            // assertions
            assert_eq!(main_extension.commands.unwrap().len(), 1);
            assert_eq!(main_extension.quicklinks.unwrap().len(), 1);
            assert_eq!(main_extension.scripts.unwrap().len(), 1);
            assert_eq!(main_extension.views.unwrap().len(), 1);
        }
    }

    #[test]
    fn test_main_extension_is_incompatible_sub_extension_platforms_none() {
        {
            let mut main_extension =
                create_test_extension(ExtensionType::Group, Some(HashSet::from([Platform::Macos])));
            let commands = vec![create_test_extension(ExtensionType::Command, None)];
            main_extension.commands = Some(commands);
            filter_out_incompatible_sub_extensions(&mut main_extension, Platform::Linux);
            assert_eq!(main_extension.commands.unwrap().len(), 0);
        }

        {
            let mut main_extension =
                create_test_extension(ExtensionType::Group, Some(HashSet::from([Platform::Macos])));
            let scripts = vec![create_test_extension(ExtensionType::Script, None)];
            main_extension.scripts = Some(scripts);
            filter_out_incompatible_sub_extensions(&mut main_extension, Platform::Linux);
            assert_eq!(main_extension.scripts.unwrap().len(), 0);
        }

        {
            let mut main_extension =
                create_test_extension(ExtensionType::Group, Some(HashSet::from([Platform::Macos])));
            let quicklinks = vec![create_test_extension(ExtensionType::Quicklink, None)];
            main_extension.quicklinks = Some(quicklinks);
            filter_out_incompatible_sub_extensions(&mut main_extension, Platform::Linux);
            assert_eq!(main_extension.quicklinks.unwrap().len(), 0);
        }
        {
            let mut main_extension =
                create_test_extension(ExtensionType::Group, Some(HashSet::from([Platform::Macos])));
            let views = vec![create_test_extension(ExtensionType::View, None)];
            main_extension.views = Some(views);
            filter_out_incompatible_sub_extensions(&mut main_extension, Platform::Linux);
            assert_eq!(main_extension.views.unwrap().len(), 0);
        }
    }

    #[test]
    fn test_main_extension_compatible_sub_extension_platforms_none() {
        let mut main_extension =
            create_test_extension(ExtensionType::Group, Some(HashSet::from([Platform::Macos])));
        let views = vec![create_test_extension(ExtensionType::View, None)];
        main_extension.views = Some(views);
        filter_out_incompatible_sub_extensions(&mut main_extension, Platform::Macos);
        assert_eq!(main_extension.views.unwrap().len(), 1);
    }

    #[test]
    fn test_convert_page_script_tag() {
        use tempfile::TempDir;

        let temp_dir = TempDir::new().unwrap();
        let html_file = temp_dir.path().join("test.html");
        let js_file = temp_dir.path().join("main.js");

        let html_content = r#"<html><body><script src="main.js"></script></body></html>"#;
        std::fs::write(&html_file, html_content).unwrap();
        std::fs::write(&js_file, "").unwrap();

        let result = _convert_page(html_content, &html_file).unwrap();

        let path = convert_file_src(&js_file).unwrap();
        let expected = format!(
            "<html><body><script src=\"{}\"></script></body></html>",
            path
        );

        assert_eq!(result, expected);
    }

    #[test]
    fn test_convert_page_script_tag_with_a_root_char() {
        use tempfile::TempDir;

        let temp_dir = TempDir::new().unwrap();
        let html_file = temp_dir.path().join("test.html");
        let js_file = temp_dir.path().join("main.js");

        let html_content = r#"<html><body><script src="/main.js"></script></body></html>"#;
        std::fs::write(&html_file, html_content).unwrap();
        std::fs::write(&js_file, "").unwrap();

        let result = _convert_page(html_content, &html_file).unwrap();

        let path = convert_file_src(&js_file).unwrap();
        let expected = format!(
            "<html><body><script src=\"{}\"></script></body></html>",
            path
        );

        assert_eq!(result, expected);
    }

    #[test]
    fn test_convert_page_a_tag() {
        use tempfile::TempDir;

        let temp_dir = TempDir::new().unwrap();
        let html_file = temp_dir.path().join("test.html");
        let js_file = temp_dir.path().join("main.js");

        let html_content = r#"<html><body><a href="main.js">foo</a></body></html>"#;
        std::fs::write(&html_file, html_content).unwrap();
        std::fs::write(&js_file, "").unwrap();

        let result = _convert_page(html_content, &html_file).unwrap();

        let path = convert_file_src(&js_file).unwrap();
        let expected = format!("<html><body><a href=\"{}\">foo</a></body></html>", path);

        assert_eq!(result, expected);
    }

    #[test]
    fn test_convert_page_a_tag_with_a_root_char() {
        use tempfile::TempDir;

        let temp_dir = TempDir::new().unwrap();
        let html_file = temp_dir.path().join("test.html");
        let js_file = temp_dir.path().join("main.js");

        let html_content = r#"<html><body><a href="/main.js">foo</a></body></html>"#;
        std::fs::write(&html_file, html_content).unwrap();
        std::fs::write(&js_file, "").unwrap();

        let result = _convert_page(html_content, &html_file).unwrap();

        let path = convert_file_src(&js_file).unwrap();
        let expected = format!("<html><body><a href=\"{}\">foo</a></body></html>", path);

        assert_eq!(result, expected);
    }

    #[test]
    fn test_convert_page_link_href_tag() {
        use tempfile::TempDir;

        let temp_dir = TempDir::new().unwrap();
        let html_file = temp_dir.path().join("test.html");
        let css_file = temp_dir.path().join("main.css");

        let html_content = r#"<html><body><link rel="stylesheet" href="main.css"/></body></html>"#;
        std::fs::write(&html_file, html_content).unwrap();
        std::fs::write(&css_file, "").unwrap();

        let result = _convert_page(html_content, &html_file).unwrap();

        let path = convert_file_src(&css_file).unwrap();
        let expected = format!(
            "<html><body><link rel=\"stylesheet\" href=\"{}\"/></body></html>",
            path
        );

        assert_eq!(result, expected);
    }

    #[test]
    fn test_convert_page_link_href_tag_with_a_root_tag() {
        use tempfile::TempDir;

        let temp_dir = TempDir::new().unwrap();
        let html_file = temp_dir.path().join("test.html");
        let css_file = temp_dir.path().join("main.css");

        let html_content = r#"<html><body><link rel="stylesheet" href="/main.css"/></body></html>"#;
        std::fs::write(&html_file, html_content).unwrap();
        std::fs::write(&css_file, "").unwrap();

        let result = _convert_page(html_content, &html_file).unwrap();

        let path = convert_file_src(&css_file).unwrap();
        let expected = format!(
            "<html><body><link rel=\"stylesheet\" href=\"{}\"/></body></html>",
            path
        );

        assert_eq!(result, expected);
    }

    #[test]
    fn test_convert_page_img_src_tag() {
        use tempfile::TempDir;

        let temp_dir = TempDir::new().unwrap();
        let html_file = temp_dir.path().join("test.html");
        let png_file = temp_dir.path().join("main.png");

        let html_content =
            r#"<html><body> <img class="fit-picture" src="main.png" alt="xxx" /></body></html>"#;
        std::fs::write(&html_file, html_content).unwrap();
        std::fs::write(&png_file, "").unwrap();

        let result = _convert_page(html_content, &html_file).unwrap();

        let path = convert_file_src(&png_file).unwrap();
        let expected = format!(
            "<html><body> <img class=\"fit-picture\" src=\"{}\" alt=\"xxx\" /></body></html>",
            path
        );

        assert_eq!(result, expected);
    }

    #[test]
    fn test_convert_page_img_src_tag_with_a_root_tag() {
        use tempfile::TempDir;

        let temp_dir = TempDir::new().unwrap();
        let html_file = temp_dir.path().join("test.html");
        let png_file = temp_dir.path().join("main.png");

        let html_content =
            r#"<html><body> <img class="fit-picture" src="/main.png" alt="xxx" /></body></html>"#;
        std::fs::write(&html_file, html_content).unwrap();
        std::fs::write(&png_file, "").unwrap();

        let result = _convert_page(html_content, &html_file).unwrap();

        let path = convert_file_src(&png_file).unwrap();
        let expected = format!(
            "<html><body> <img class=\"fit-picture\" src=\"{}\" alt=\"xxx\" /></body></html>",
            path
        );

        assert_eq!(result, expected);
    }

    #[test]
    fn test_convert_page_contain_both_script_and_a_tags() {
        use tempfile::TempDir;

        let temp_dir = TempDir::new().unwrap();
        let html_file = temp_dir.path().join("test.html");
        let js_file = temp_dir.path().join("main.js");

        let html_content =
            r#"<html><body><a href="main.js">foo</a><script src="main.js"></script></body></html>"#;
        std::fs::write(&html_file, html_content).unwrap();
        std::fs::write(&js_file, "").unwrap();

        let result = _convert_page(html_content, &html_file).unwrap();

        let path = convert_file_src(&js_file).unwrap();
        let expected = format!(
            "<html><body><a href=\"{}\">foo</a><script src=\"{}\"></script></body></html>",
            path, path
        );

        assert_eq!(result, expected);
    }

    #[test]
    fn test_convert_page_contain_both_script_and_a_tags_with_root_char() {
        use tempfile::TempDir;

        let temp_dir = TempDir::new().unwrap();
        let html_file = temp_dir.path().join("test.html");
        let js_file = temp_dir.path().join("main.js");

        let html_content = r#"<html><body><a href="/main.js">foo</a><script src="/main.js"></script></body></html>"#;
        std::fs::write(&html_file, html_content).unwrap();
        std::fs::write(&js_file, "").unwrap();

        let result = _convert_page(html_content, &html_file).unwrap();

        let path = convert_file_src(&js_file).unwrap();
        let expected = format!(
            "<html><body><a href=\"{}\">foo</a><script src=\"{}\"></script></body></html>",
            path, path
        );

        assert_eq!(result, expected);
    }

    #[test]
    fn test_convert_page_empty_html() {
        use tempfile::TempDir;

        let temp_dir = TempDir::new().unwrap();
        let html_file = temp_dir.path().join("test.html");

        let html_content = "";
        std::fs::write(&html_file, html_content).unwrap();
        let result = _convert_page(html_content, &html_file).unwrap();
        assert!(result.is_empty());
    }

    #[test]
    fn test_convert_page_only_html_tag() {
        use tempfile::TempDir;

        let temp_dir = TempDir::new().unwrap();
        let html_file = temp_dir.path().join("test.html");

        let html_content = "<html></html>";
        std::fs::write(&html_file, html_content).unwrap();
        let result = _convert_page(html_content, &html_file).unwrap();
        assert_eq!(result, html_content);
    }
}
