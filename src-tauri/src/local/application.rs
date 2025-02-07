use crate::common::document::{DataSourceReference, Document};
use crate::common::search::{QueryResponse, QuerySource, SearchQuery};
use crate::common::traits::{SearchError, SearchSource};
use async_trait::async_trait;
use base64::encode;
use dirs::data_dir;
use hostname;
use plist::Value;
use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};
use std::process::{Command, Stdio};

#[derive(Clone)]
pub struct ApplicationSearchSource {
    base_score: f64,
    app_dirs: Vec<PathBuf>,
    icons: HashMap<String, PathBuf>, // Map app names to their icon paths
}

/// Extracts the app icon from the `.app` bundle or system icons and converts it to PNG format.
fn extract_icon_from_app_bundle(app_dir: &Path, app_data_folder: &Path) -> Option<PathBuf> {
    // First, check if the icon is specified in the info.plist (e.g., CFBundleIconFile)
    if let Some(icon_name) = get_icon_name_from_info_plist(app_dir) {
        let icns_path = app_dir.join(format!("Contents/Resources/{}", icon_name));

        if icns_path.exists() {
            if let Some(output_path) = convert_icns_to_png(&app_dir, &icns_path, app_data_folder) {
                return Some(output_path);
            }
        } else {
            if !icon_name.ends_with(".icns") {
                // If the icon name doesn't end with .icns, try appending it
                let icns_path = app_dir.join(format!("Contents/Resources/{}.icns", icon_name));
                if icns_path.exists() {
                    if let Some(output_path) = convert_icns_to_png(&app_dir, &icns_path, app_data_folder) {
                        return Some(output_path);
                    }
                }
            }
        }
    }

    // Attempt to get the ICNS file from the app bundle (Contents/Resources/AppIcon.icns)
    if let Some(icon_path) = get_icns_from_app_bundle(app_dir) {
        if let Some(output_path) = convert_icns_to_png(&app_dir, &icon_path, app_data_folder) {
            return Some(output_path);
        }
    }

    // Fallback: Check for PNG icon in the Resources folder
    if let Some(png_icon_path) = get_png_from_resources(app_dir) {
        if let Some(output_path) = convert_png_to_png(&png_icon_path, app_data_folder) {
            return Some(output_path);
        }
    }

    // Fallback: If no icon found, return a default system icon
    if let Some(system_icon_path) = get_system_icon(app_dir) {
        return Some(system_icon_path);
    }

    None
}

/// Reads the info.plist and extracts the icon file name if specified (CFBundleIconFile).
fn get_icon_name_from_info_plist(app_dir: &Path) -> Option<String> {
    let plist_path = app_dir.join("Contents/Info.plist");

    if plist_path.exists() {
        // Use `Value::from_file` directly, which parses the plist into a `Value` type
        if let Ok(plist_value) = Value::from_file(plist_path) {
            // Check if the plist value is a dictionary
            if let Some(icon_value) = plist_value.as_dictionary() {
                // Look for the CFBundleIconFile key in the dictionary
                if let Some(icon_file) = icon_value.get("CFBundleIconFile") {
                    // Ensure the value is a string and return it
                    if let Some(icon_name) = icon_file.as_string() {
                        return Some(icon_name.to_string());
                    }
                }
            }
        }
    }
    None
}

/// Tries to get the ICNS icon from the `.app` bundle.
fn get_icns_from_app_bundle(app_dir: &Path) -> Option<PathBuf> {
    let icns_path = app_dir.join("Contents/Resources/AppIcon.icns");
    if icns_path.exists() {
        Some(icns_path)
    } else {
        None
    }
}

/// Tries to get a PNG icon from the `.app` bundle's Resources folder.
fn get_png_from_resources(app_dir: &Path) -> Option<PathBuf> {
    let png_path = app_dir.join("Contents/Resources/Icon.png");
    if png_path.exists() {
        Some(png_path)
    } else {
        None
    }
}

/// Converts an ICNS file to PNG using macOS's `sips` command.
fn convert_icns_to_png(app_dir: &Path, icns_path: &Path, app_data_folder: &Path) -> Option<PathBuf> {
    if let Some(app_name) = app_dir.file_name().and_then(|name| name.to_str()) {
        let icon_storage_dir = app_data_folder.join("coco-appIcons");
        fs::create_dir_all(&icon_storage_dir).ok();

        // dbg!("app_name:", &app_name);

        let output_png_path = icon_storage_dir.join(format!("{}.png", app_name));

        // dbg!("Converting ICNS to PNG:", &output_png_path);

        // Run the `sips` command to convert the ICNS to PNG
        let status = Command::new("sips")
            .arg("-s")
            .arg("format")
            .arg("png")
            .arg(icns_path)
            .arg("--out")
            .arg(&output_png_path)
            .stdout(Stdio::null())  // Redirect stdout to null
            .stderr(Stdio::null())  // Redirect stderr to null
            .status();

        if let Ok(status) = status {
            if status.success() {
                return Some(output_png_path);
            }
        }
    }
    None
}

/// Converts a PNG file to PNG (essentially just copying it to a new location).
fn convert_png_to_png(png_path: &Path, app_data_folder: &Path) -> Option<PathBuf> {
    if let Some(app_name) = png_path.parent().and_then(|p| p.file_name()).and_then(|name| name.to_str()) {
        let icon_storage_dir = app_data_folder.join("coco-appIcons");
        fs::create_dir_all(&icon_storage_dir).ok();

        let output_png_path = icon_storage_dir.join(format!("{}.png", app_name));

        // Copy the PNG file to the output directory
        if let Err(e) = fs::copy(png_path, &output_png_path) {
            return None;
        }

        return Some(output_png_path);
    }
    None
}

/// Fallback function to fetch a system icon if the app doesn't have its own.
fn get_system_icon(app_dir: &Path) -> Option<PathBuf> {
    // Just a placeholder for getting a default icon if no app-specific icon is found
    let default_icon_path = Path::new("/System/Library/CoreServices/CoreTypes.bundle/Contents/Resources/GenericApplicationIcon.icns");

    if default_icon_path.exists() {
        Some(default_icon_path.to_path_buf())
    } else {
        None
    }
}


impl ApplicationSearchSource {
    pub fn new(base_score: f64, app_dirs: Vec<PathBuf>) -> Self {
        let mut icons = HashMap::new();

        // Iterate over the directories to find .app files and extract icons
        for app_dir in &app_dirs {
            if let Ok(entries) = fs::read_dir(app_dir) {
                for entry in entries.filter_map(Result::ok) {
                    let file_path = entry.path();
                    // Only process .app directories
                    if file_path.is_dir() && file_path.extension() == Some("app".as_ref()) {
                        if let Some(app_data_folder) = data_dir() {
                            if let Some(icon_path) = extract_icon_from_app_bundle(&file_path, &app_data_folder) {
                                // dbg!("Icon path:", &file_path, &icon_path);
                                if let Some(app_name) = file_path.file_name().and_then(|name| name.to_str()) {
                                    // dbg!("Save Icon path:", &file_path, &icon_path);
                                    icons.insert(file_path.to_string_lossy().to_string(), icon_path);
                                }
                            } else {
                                // dbg!("Icon not found for:");
                                // dbg!("Icon not found for:", &file_path);
                            }
                        }
                    }
                }
            }
        }

        ApplicationSearchSource {
            base_score,
            app_dirs,
            icons,
        }
    }
}


/// Extracts the clean app name by removing `.app`
fn clean_app_name(path: &Path) -> Option<String> {
    path.file_name()?
        .to_str()
        .map(|name| name.trim_end_matches(".app").to_string())
}

#[async_trait]
impl SearchSource for ApplicationSearchSource {
    fn get_type(&self) -> QuerySource {
        QuerySource {
            r#type: "Local".into(),
            name: hostname::get().unwrap_or("My Computer".into()).to_string_lossy().into(),
            id: "local_app_1".into(),
        }
    }

    // Implement the search method to return a Future
    async fn search(
        &self,
        query: SearchQuery,
    ) -> Result<QueryResponse, SearchError> {
        let mut total_hits = 0;
        let mut hits: Vec<(Document, f64)> = Vec::new();

        // Extract query string from query
        let query_string = query.query_strings.get("query").unwrap_or(&"".to_string()).to_lowercase().clone();

        // If query string is empty, return default response
        if query_string.is_empty() {
            return Ok(QueryResponse {
                source: self.get_type(),
                hits,
                total_hits,
            });
        }

        // Iterate over app directories asynchronously
        for app_dir in &self.app_dirs {
            if let Ok(entries) = fs::read_dir(app_dir) {
                // Use async iterator to process entries
                for entry in entries.filter_map(Result::ok) {
                    let full_path = entry.path().to_string_lossy().to_string();
                    let file_name_str = clean_app_name(&entry.path()).unwrap();

                    if file_name_str.starts_with('.') || !full_path.ends_with(".app") {
                        // dbg!("Skipping:", &file_name_str);
                        continue;
                    }

                    // Check if the file name contains the query string
                    if file_name_str.to_lowercase().contains(&query_string) {
                        total_hits += 1;
                        let path = entry.path().to_string_lossy().to_string();

                        let mut doc = Document::new(
                            Some(DataSourceReference {
                                r#type: Some("Local".into()),
                                name: Some(app_dir.to_string_lossy().to_string().into()),
                                id: Some(file_name_str.clone()), // Using the app name as ID
                            }),
                            path.clone(),
                            "Application".to_string(),
                            file_name_str.clone(),
                            path.clone(),
                        );
                        match self.icons.get(&path) {
                            Some(icon_path) => {
                                // dbg!("Icon path:", &path, &icon_path);
                                if let Ok(icon_data) = read_icon_and_encode(icon_path) {
                                    // Update doc.icon with the base64 encoded icon data
                                    doc.icon = Some(format!("data:image/png;base64,{}", icon_data));
                                    // dbg!("doc:",&doc.clone());
                                } else {
                                    dbg!("Failed to read or encode icon:", &icon_path);
                                }
                            }
                            None => {
                                // Log a warning if the icon path is not found for the given path
                                dbg!("Icon not found for:", &path);
                            }
                        };

                        // dbg!("Found hit:", &file_name_str);
                        hits.push((doc, self.base_score));
                    }
                }
            }
        }

        // Return the results in the QueryResponse format
        Ok(QueryResponse {
            source: self.get_type(),
            hits,
            total_hits,
        })
    }
}

// Function to read the icon file and convert it to base64
fn read_icon_and_encode(icon_path: &Path) -> Result<String, std::io::Error> {
    // Read the icon file as binary data
    let icon_data = fs::read(icon_path)?;

    // Encode the data to base64
    Ok(encode(&icon_data))
}