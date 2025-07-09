use super::super::LOCAL_QUERY_SOURCE_TYPE;
use crate::common::{
    document::{DataSourceReference, Document},
    error::SearchError,
    search::{QueryResponse, QuerySource, SearchQuery},
    traits::SearchSource,
};
use crate::extension::OnOpened;
use async_trait::async_trait;
use futures::stream::Stream;
use futures::stream::StreamExt;
use hostname;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::os::fd::OwnedFd;
use std::path::Path;
use std::sync::LazyLock;
use tauri_plugin_store::StoreExt;
use tokio::io::AsyncBufReadExt;
use tokio::io::BufReader;
use tokio::process::Child;
use tokio::process::Command;
use tokio_stream::wrappers::LinesStream;

pub(crate) const EXTENSION_ID: &str = "File Search";

/// JSON file for this extension.
pub(crate) const PLUGIN_JSON_FILE: &str = r#"
{
  "id": "File Search",
  "name": "File Search",
  "platforms": ["macos"],
  "description": "Search files on your system using macOS Spotlight",
  "icon": "font_Filesearch",
  "type": "extension",
  "enabled": true
}
"#;

// Tauri store keys for file system configuration
const TAURI_STORE_FILE_SYSTEM_CONFIG: &str = "file_system_config";

const TAURI_STORE_KEY_SEARCH_BY: &str = "search_by";
const TAURI_STORE_KEY_SEARCH_PATHS: &str = "search_paths";
const TAURI_STORE_KEY_EXCLUDE_PATHS: &str = "exclude_paths";
const TAURI_STORE_KEY_FILE_TYPES: &str = "file_types";

static HOME_DIR: LazyLock<String> = LazyLock::new(|| {
    let os_string = dirs::home_dir()
        .expect("$HOME should be set")
        .into_os_string();
    os_string
        .into_string()
        .expect("User home directory should be encoded with UTF-8")
});

#[derive(Debug, Clone, Serialize, Deserialize, Copy)]
pub enum SearchBy {
    Name,
    NameAndContents,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileSearchConfig {
    pub search_paths: Vec<String>,
    pub exclude_paths: Vec<String>,
    pub file_types: Vec<String>,
    pub search_by: SearchBy,
}

impl Default for FileSearchConfig {
    fn default() -> Self {
        Self {
            search_paths: vec![
                format!("{}/Documents", HOME_DIR.as_str()),
                format!("{}/Desktop", HOME_DIR.as_str()),
                format!("{}/Downloads", HOME_DIR.as_str()),
            ],
            exclude_paths: Vec::new(),
            file_types: Vec::new(),
            search_by: SearchBy::Name,
        }
    }
}

impl FileSearchConfig {
    fn get() -> Self {
        let tauri_app_handle = crate::GLOBAL_TAURI_APP_HANDLE
            .get()
            .expect("global tauri app handle not set");

        let store = tauri_app_handle
            .store(TAURI_STORE_FILE_SYSTEM_CONFIG)
            .unwrap_or_else(|e| {
                panic!(
                    "store [{}] not found/loaded, error [{}]",
                    TAURI_STORE_FILE_SYSTEM_CONFIG, e
                )
            });

        // Default value, will be used when specific config entries are not set
        let default_config = FileSearchConfig::default();

        let search_paths = {
            if let Some(search_paths) = store.get(TAURI_STORE_KEY_SEARCH_PATHS) {
                match search_paths {
                    Value::Array(arr) => {
                        let mut vec = Vec::with_capacity(arr.len());
                        for v in arr {
                            match v {
                                Value::String(s) => vec.push(s),
                                other => panic!(
                                    "Expected all elements of 'search_paths' to be strings, but found: {:?}",
                                    other
                                ),
                            }
                        }
                        vec
                    }
                    other => panic!(
                        "Expected 'search_paths' to be an array of strings in the file system config store, but got: {:?}",
                        other
                    ),
                }
            } else {
                store.set(
                    TAURI_STORE_KEY_SEARCH_PATHS,
                    default_config.search_paths.as_slice(),
                );
                default_config.search_paths
            }
        };

        let exclude_paths = {
            if let Some(exclude_paths) = store.get(TAURI_STORE_KEY_EXCLUDE_PATHS) {
                match exclude_paths {
                    Value::Array(arr) => {
                        let mut vec = Vec::with_capacity(arr.len());
                        for v in arr {
                            match v {
                                Value::String(s) => vec.push(s),
                                other => panic!(
                                    "Expected all elements of 'exclude_paths' to be strings, but found: {:?}",
                                    other
                                ),
                            }
                        }
                        vec
                    }
                    other => panic!(
                        "Expected 'exclude_paths' to be an array of strings in the file system config store, but got: {:?}",
                        other
                    ),
                }
            } else {
                store.set(
                    TAURI_STORE_KEY_EXCLUDE_PATHS,
                    default_config.exclude_paths.as_slice(),
                );
                default_config.exclude_paths
            }
        };

        let file_types = {
            if let Some(file_types) = store.get(TAURI_STORE_KEY_FILE_TYPES) {
                match file_types {
                    Value::Array(arr) => {
                        let mut vec = Vec::with_capacity(arr.len());
                        for v in arr {
                            match v {
                                Value::String(s) => vec.push(s),
                                other => panic!(
                                    "Expected all elements of 'file_types' to be strings, but found: {:?}",
                                    other
                                ),
                            }
                        }
                        vec
                    }
                    other => panic!(
                        "Expected 'file_types' to be an array of strings in the file system config store, but got: {:?}",
                        other
                    ),
                }
            } else {
                store.set(
                    TAURI_STORE_KEY_FILE_TYPES,
                    default_config.file_types.as_slice(),
                );
                default_config.file_types
            }
        };

        let search_by = {
            if let Some(search_by) = store.get(TAURI_STORE_KEY_SEARCH_BY) {
                serde_json::from_value(search_by.clone()).unwrap_or_else(|e| {
                    panic!(
                        "Failed to deserialize 'search_by' from file system config store. Invalid JSON: {:?}, error: {}",
                        search_by, e
                    )
                })
            } else {
                store.set(
                    TAURI_STORE_KEY_SEARCH_BY,
                    serde_json::to_value(default_config.search_by).unwrap(),
                );
                default_config.search_by
            }
        };

        Self {
            search_by,
            search_paths,
            exclude_paths,
            file_types,
        }
    }
}

pub struct FileSearchExtensionSearchSource {
    base_score: f64,
}

impl FileSearchExtensionSearchSource {
    pub fn new(base_score: f64) -> Self {
        FileSearchExtensionSearchSource { base_score }
    }

    /// Return an array containing the `mdfind` command and its arguments.
    fn build_mdfind_query(query_string: &str, config: &FileSearchConfig) -> Vec<String> {
        let mut args = vec!["mdfind".to_string()];

        match config.search_by {
            SearchBy::Name => {
                args.push(format!("kMDItemFSName == '*{}*'", query_string));
            }
            SearchBy::NameAndContents => {
                args.push(format!(
                    "kMDItemFSName == '*{}*' || kMDItemTextContent == '{}'",
                    query_string, query_string
                ));
            }
        }

        // Add search paths using -onlyin
        for path in &config.search_paths {
            if Path::new(path).exists() {
                args.extend_from_slice(&["-onlyin".to_string(), path.to_string()]);
            }
        }

        args
    }

    /// Spawn the `mdfind` child process and return an async iterator over its output,
    /// allowing us to collect the results asynchronously.
    ///
    /// # Return value:
    ///
    /// * impl Stream: an async iterator that will yield the matched files
    /// * Child: The handle to the mdfind process, we need to kill it once we
    ///   collect all the results to avoid zombie processes.
    fn execute_mdfind_query(
        query_string: &str,
        from: usize,
        size: usize,
        config: &FileSearchConfig,
    ) -> Result<(impl Stream<Item = std::io::Result<String>>, Child), String> {
        let args = Self::build_mdfind_query(query_string, &config);
        let (rx, tx) = std::io::pipe().unwrap();
        let rx_owned = OwnedFd::from(rx);
        let async_rx = tokio::net::unix::pipe::Receiver::from_owned_fd(rx_owned).unwrap();
        let buffered_rx = BufReader::new(async_rx);
        let lines = LinesStream::new(buffered_rx.lines());

        let child = Command::new(&args[0])
            .args(&args[1..])
            .stdout(tx)
            .stderr(std::process::Stdio::null())
            .spawn()
            .map_err(|e| format!("Failed to spawn mdfind: {}", e))?;
        let config_clone = config.clone();
        let iter = lines
            .filter(move |res_path| {
                std::future::ready({
                    match res_path {
                        Ok(path) => !Self::should_be_filtered_out(&config_clone, path),
                        Err(_) => {
                            // Don't filter out Err() values
                            true
                        }
                    }
                })
            })
            .skip(from)
            .take(size);

        Ok((iter, child))
    }

    /// If `file_path` should be removed from the search results given the filter
    /// conditions specified in `config`.
    fn should_be_filtered_out(config: &FileSearchConfig, file_path: &str) -> bool {
        let is_excluded = config
            .exclude_paths
            .iter()
            .any(|exclude_path| file_path.starts_with(exclude_path));

        if is_excluded {
            return true;
        }

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
                // `config.file_types` is not empty, then the search results
                // should have extensions.
                false
            }
        };

        !matches_file_type
    }
}

#[async_trait]
impl SearchSource for FileSearchExtensionSearchSource {
    fn get_type(&self) -> QuerySource {
        QuerySource {
            r#type: LOCAL_QUERY_SOURCE_TYPE.into(),
            name: hostname::get()
                .unwrap_or(EXTENSION_ID.into())
                .to_string_lossy()
                .into(),
            id: EXTENSION_ID.into(),
        }
    }

    async fn search(&self, query: SearchQuery) -> Result<QueryResponse, SearchError> {
        let Some(query_string) = query.query_strings.get("query") else {
            return Ok(QueryResponse {
                source: self.get_type(),
                hits: Vec::new(),
                total_hits: 0,
            });
        };
        let from = usize::try_from(query.from).expect("from too big");
        let size = usize::try_from(query.size).expect("size too big");

        let query_string = query_string.trim();
        if query_string.is_empty() {
            return Ok(QueryResponse {
                source: self.get_type(),
                hits: Vec::new(),
                total_hits: 0,
            });
        }

        // Get configuration from tauri store
        let config = FileSearchConfig::get();

        // If search paths are empty, then the hit should be empty.
        //
        // Without this, empty search paths will result in a mdfind that has no `-onlyin`
        // option, which will in turn query the whole disk volume.
        if config.search_paths.is_empty() {
            return Ok(QueryResponse {
                source: self.get_type(),
                hits: Vec::new(),
                total_hits: 0,
            });
        }

        // Execute search in a blocking task
        let query_source = self.get_type();
        let base_score = self.base_score;

        let (mut iter, mut mdfind_child_process) =
            Self::execute_mdfind_query(&query_string, from, size, &config)
                .map_err(SearchError::InternalError)?;

        // Convert results to documents
        let mut hits: Vec<(Document, f64)> = Vec::new();
        while let Some(res_file_path) = iter.next().await {
            let file_path =
                res_file_path.map_err(|io_err| SearchError::InternalError(io_err.to_string()))?;

            let file_type = get_file_type(&file_path).await;
            let icon = type_to_icon(file_type);
            let file_path_of_type_path = camino::Utf8Path::new(&file_path);
            let r#where = file_path_of_type_path
                .parent()
                .unwrap_or_else(|| {
                    panic!(
                        "expect path [{}] to have a parent, but it does not",
                        file_path
                    );
                })
                .to_string();

            let file_name = file_path_of_type_path.file_name().unwrap_or_else(|| {
                panic!(
                    "expect path [{}] to have a file name, but it does not",
                    file_path
                );
            });
            let on_opened = OnOpened::Document {
                url: file_path.clone(),
            };

            let doc = Document {
                id: file_path.clone(),
                title: Some(file_name.to_string()),
                source: Some(DataSourceReference {
                    r#type: Some(LOCAL_QUERY_SOURCE_TYPE.into()),
                    name: Some(EXTENSION_ID.into()),
                    id: Some(EXTENSION_ID.into()),
                    icon: Some(String::from("font_Filesearch")),
                }),
                category: Some(r#where),
                on_opened: Some(on_opened),
                url: Some(file_path),
                icon: Some(icon.to_string()),
                ..Default::default()
            };

            hits.push((doc, base_score));
        }
        mdfind_child_process
            .kill()
            .await
            .map_err(|e| SearchError::InternalError(format!("{:?}", e)))?;

        let total_hits = hits.len();
        Ok(QueryResponse {
            source: query_source,
            hits,
            total_hits,
        })
    }
}

#[derive(Debug, Clone, PartialEq, Copy)]
enum FileType {
    Folder,
    JPEGImage,
    PNGImage,
    PDFDocument,
    PlainTextDocument,
    MicrosoftWordDocument,
    MicrosoftExcelSpreadsheet,
    AudioFile,
    VideoFile,
    CHeaderFile,
    TOMLDocument,
    RustScript,
    CSourceCode,
    MarkdownDocument,
    TerminalSettings,
    ZipArchive,
    Dmg,
    Html,
    Json,
    Xml,
    Yaml,
    Css,
    Vue,
    React,
    Sql,
    Csv,
    Javascript,
    Typescript,
    Python,
    Java,
    Golang,
    Ruby,
    Php,
    Sass,
    Sketch,
    AdobeAi,
    AdobePsd,
    AdobePr,
    AdobeAu,
    AdobeAe,
    AdobeLr,
    AdobeXd,
    AdobeFl,
    AdobeId,
    Svg,
    Epub,
    Unknown,
}

async fn get_file_type(path: &str) -> FileType {
    let path = camino::Utf8Path::new(path);

    // stat() is more precise than file extension, use it if possible.
    if path.is_dir() {
        return FileType::Folder;
    }

    let Some(ext) = path.extension() else {
        return FileType::Unknown;
    };

    let ext = ext.to_lowercase();
    match ext.as_str() {
        "pdf" => FileType::PDFDocument,
        "txt" | "text" => FileType::PlainTextDocument,
        "doc" | "docx" => FileType::MicrosoftWordDocument,
        "xls" | "xlsx" => FileType::MicrosoftExcelSpreadsheet,
        "jpg" | "jpeg" => FileType::JPEGImage,
        "png" => FileType::PNGImage,
        "mp3" | "wav" | "flac" | "aac" | "ogg" | "m4a" => FileType::AudioFile,
        "mp4" | "avi" | "mov" | "mkv" | "wmv" | "flv" | "webm" => FileType::VideoFile,
        "h" | "hpp" => FileType::CHeaderFile,
        "c" | "cpp" | "cc" | "cxx" => FileType::CSourceCode,
        "toml" => FileType::TOMLDocument,
        "rs" => FileType::RustScript,
        "md" | "markdown" => FileType::MarkdownDocument,
        "terminal" => FileType::TerminalSettings,
        "zip" | "rar" | "7z" | "tar" | "gz" | "bz2" => FileType::ZipArchive,
        "dmg" => FileType::Dmg,
        "html" | "htm" => FileType::Html,
        "json" => FileType::Json,
        "xml" => FileType::Xml,
        "yaml" | "yml" => FileType::Yaml,
        "css" => FileType::Css,
        "vue" => FileType::Vue,
        "jsx" | "tsx" => FileType::React,
        "sql" => FileType::Sql,
        "csv" => FileType::Csv,
        "js" | "mjs" => FileType::Javascript,
        "ts" => FileType::Typescript,
        "py" | "pyw" => FileType::Python,
        "java" => FileType::Java,
        "go" => FileType::Golang,
        "rb" => FileType::Ruby,
        "php" => FileType::Php,
        "sass" | "scss" => FileType::Sass,
        "sketch" => FileType::Sketch,
        "ai" => FileType::AdobeAi,
        "psd" => FileType::AdobePsd,
        "prproj" => FileType::AdobePr,
        "aup" | "aup3" => FileType::AdobeAu,
        "aep" => FileType::AdobeAe,
        "lrcat" => FileType::AdobeLr,
        "xd" => FileType::AdobeXd,
        "fla" => FileType::AdobeFl,
        "indd" => FileType::AdobeId,
        "svg" => FileType::Svg,
        "epub" => FileType::Epub,
        _ => FileType::Unknown,
    }
}

fn type_to_icon(ty: FileType) -> &'static str {
    match ty {
        FileType::Folder => "font_file_folder",
        FileType::JPEGImage => "font_file_image",
        FileType::PNGImage => "font_file_image",
        FileType::PDFDocument => "font_file_document_pdf",
        FileType::PlainTextDocument => "font_file_txt",
        FileType::MicrosoftWordDocument => "font_file_document_word",
        FileType::MicrosoftExcelSpreadsheet => "font_file_spreadsheet_excel",
        FileType::AudioFile => "font_file_audio",
        FileType::VideoFile => "font_file_video",
        FileType::CHeaderFile => "font_file_csource",
        FileType::TOMLDocument => "font_file_toml",
        FileType::RustScript => "font_file_rustscript1",
        FileType::CSourceCode => "font_file_csource",
        FileType::MarkdownDocument => "font_file_markdown",
        FileType::TerminalSettings => "font_file_terminal1",
        FileType::ZipArchive => "font_file_zip",
        FileType::Dmg => "font_file_dmg",
        FileType::Html => "font_file_html",
        FileType::Json => "font_file_json",
        FileType::Xml => "font_file_xml",
        FileType::Yaml => "font_file_yaml",
        FileType::Css => "font_file_css",
        FileType::Vue => "font_file_vue",
        FileType::React => "font_file_react",
        FileType::Sql => "font_file_sql",
        FileType::Csv => "font_file_csv",
        FileType::Javascript => "font_file_javascript",
        FileType::Typescript => "font_file_typescript",
        FileType::Python => "font_file_python",
        FileType::Java => "font_file_java",
        FileType::Golang => "font_file_golang",
        FileType::Ruby => "font_file_ruby",
        FileType::Php => "font_file_php",
        FileType::Sass => "font_file_sass",
        FileType::Sketch => "font_file_sketch",
        FileType::AdobeAi => "font_file_adobe_ai",
        FileType::AdobePsd => "font_file_adobe_psd",
        FileType::AdobePr => "font_file_adobe_pr",
        FileType::AdobeAu => "font_file_adobe_au",
        FileType::AdobeAe => "font_file_adobe_ae",
        FileType::AdobeLr => "font_file_adobe_lr",
        FileType::AdobeXd => "font_file_adobe_xd",
        FileType::AdobeFl => "font_file_adobe_fl",
        FileType::AdobeId => "font_file_adobe_id",
        FileType::Svg => "font_file_svg",
        FileType::Epub => "font_file_epub",
        FileType::Unknown => "font_file_unknown",
    }
}

// Tauri commands for managing file system configuration
#[tauri::command]
pub async fn get_file_system_config() -> FileSearchConfig {
    FileSearchConfig::get()
}

#[tauri::command]
pub async fn set_file_system_config(config: FileSearchConfig) -> Result<(), String> {
    let tauri_app_handle = crate::GLOBAL_TAURI_APP_HANDLE
        .get()
        .expect("global tauri app handle not set");

    let store = tauri_app_handle
        .store(TAURI_STORE_FILE_SYSTEM_CONFIG)
        .map_err(|e| e.to_string())?;

    store.set(TAURI_STORE_KEY_SEARCH_PATHS, config.search_paths);
    store.set(TAURI_STORE_KEY_EXCLUDE_PATHS, config.exclude_paths);
    store.set(TAURI_STORE_KEY_FILE_TYPES, config.file_types);
    store.set(
        TAURI_STORE_KEY_SEARCH_BY,
        serde_json::to_value(config.search_by).unwrap(),
    );

    Ok(())
}
