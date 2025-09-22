//! File search for KDE, powered by its Baloo engine.

use super::super::super::EXTENSION_ID;
use super::super::super::config::FileSearchConfig;
use super::super::super::config::SearchBy;
use super::super::should_be_filtered_out;
use crate::common::document::{DataSourceReference, Document};
use crate::extension::LOCAL_QUERY_SOURCE_TYPE;
use crate::extension::OnOpened;
use crate::util::file::sync_get_file_icon;
use camino::Utf8Path;
use configparser::ini::Ini;
use configparser::ini::WriteOptions;
use futures::stream::Stream;
use futures::stream::StreamExt;
use std::os::fd::OwnedFd;
use std::path::PathBuf;
use tokio::io::AsyncBufReadExt;
use tokio::io::BufReader;
use tokio::process::Child;
use tokio::process::Command;
use tokio_stream::wrappers::LinesStream;

/// Baloo does not support scoring, use this score for all the documents.
const SCORE: f64 = 1.0;

/// KDE6 updates the binary name to "baloosearch6", but I believe there still have
/// distros using the original name.  So we need to check both.
fn cli_tool_lookup() -> Option<PathBuf> {
    use which::which;

    let res_path = which("baloosearch").or_else(|_| which("baloosearch6"));
    res_path.ok()
}

pub(crate) async fn hits(
    query_string: &str,
    _from: usize,
    size: usize,
    config: &FileSearchConfig,
) -> Result<Vec<(Document, f64)>, String> {
    // Special cases that will make querying faster.
    if query_string.is_empty() || size == 0 || config.search_paths.is_empty() {
        return Ok(Vec::new());
    }

    // If the tool is not found, return an empty result as well.
    let Some(tool_path) = cli_tool_lookup() else {
        return Ok(Vec::new());
    };

    let (mut iter, _baloosearch_child_process) =
        execute_baloosearch_query(tool_path, query_string, size, config)?;

    // Convert results to documents
    let mut hits: Vec<(Document, f64)> = Vec::new();
    while let Some(res_file_path) = iter.next().await {
        let file_path = res_file_path.map_err(|io_err| io_err.to_string())?;

        let icon = sync_get_file_icon(&file_path);
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

        hits.push((doc, SCORE));
    }

    Ok(hits)
}

/// Return an array containing the `baloosearch` command and its arguments.
fn build_baloosearch_query(
    tool_path: PathBuf,
    query_string: &str,
    config: &FileSearchConfig,
) -> Vec<String> {
    let tool_path = tool_path
        .into_os_string()
        .into_string()
        .expect("binary path should be UTF-8 encoded");

    let mut args = vec![tool_path];

    match config.search_by {
        SearchBy::Name => {
            args.push(format!("filename:{query_string}"));
        }
        SearchBy::NameAndContents => {
            args.push(query_string.to_string());
        }
    }

    for search_path in config.search_paths.iter() {
        args.extend_from_slice(&["-d".into(), search_path.clone()]);
    }

    args
}

/// Spawn the `baloosearch` child process and return an async iterator over its output,
/// allowing us to collect the results asynchronously.
///
/// # Return value:
///
/// * impl Stream: an async iterator that will yield the matched files
/// * Child: The handle to the baloosearch process.  The child process will be
///   killed when this handle gets dropped so we need to keep it alive util we
///   exhaust the stream.
fn execute_baloosearch_query(
    tool_path: PathBuf,
    query_string: &str,
    size: usize,
    config: &FileSearchConfig,
) -> Result<(impl Stream<Item = std::io::Result<String>>, Child), String> {
    let args = build_baloosearch_query(tool_path, query_string, config);

    let (rx, tx) = std::io::pipe().unwrap();
    let rx_owned = OwnedFd::from(rx);
    let async_rx = tokio::net::unix::pipe::Receiver::from_owned_fd(rx_owned).unwrap();
    let buffered_rx = BufReader::new(async_rx);
    let lines = LinesStream::new(buffered_rx.lines());

    let child = Command::new(&args[0])
        .args(&args[1..])
        .stdout(tx)
        .stderr(std::process::Stdio::null())
        // The child process will be killed when the Child instance gets dropped.
        .kill_on_drop(true)
        .spawn()
        .map_err(|e| format!("Failed to spawn baloosearch: {e}"))?;
    let config_clone = config.clone();
    let iter = lines
        .filter(move |res_path| {
            std::future::ready({
                match res_path {
                    Ok(path) => !should_be_filtered_out(&config_clone, path, false, true, true),
                    Err(_) => {
                        // Don't filter out Err() values
                        true
                    }
                }
            })
        })
        .take(size);

    Ok((iter, child))
}

pub(crate) fn apply_config(config: &FileSearchConfig) -> Result<(), String> {
    // Users can tweak Baloo via its configuration file, below are the fields that
    // we need to modify:
    //
    // * Indexing-Enabled: turn indexing on or off
    // * only basic indexing: If true, Baloo only indexes file names
    // * folders: directories to index
    // * exclude folders: directories to skip
    //
    // ```ini
    // [Basic Settings]
    // Indexing-Enabled=true
    //
    // [General]
    // only basic indexing=true
    // folders[$e]=$HOME/
    // exclude folders[$e]=$HOME/FolderA/,$HOME/FolderB/
    // ```

    const SECTION_GENERAL: &str = "General";
    const KEY_INCLUDE_FOLDERS: &str = "folders[$e]";
    const KEY_EXCLUDE_FOLDERS: &str = "exclude folders[$e]";
    const FOLDERS_SEPARATOR: &str = ",";

    let rc_file_path = {
        let mut home = dirs::home_dir()
            .expect("cannot find the home directory, Coco should never run in such a environment");
        home.push(".config/baloofilerc");
        home
    };

    // Parse and load the rc file, it is in format INI
    //
    // Use `new_cs()`, the case-sensitive version of constructor as the config
    // file contains uppercase letters, so it is case-sensitive.
    let mut baloo_config = Ini::new_cs();
    if rc_file_path.try_exists().map_err(|e| e.to_string())? {
        let _ = baloo_config.load(rc_file_path.as_path())?;
    }

    // Ensure indexing is enabled
    let _ = baloo_config.setstr("Basic Settings", "Indexing-Enabled", Some("true"));

    // Let baloo index file content if we need that
    if config.search_by == SearchBy::NameAndContents {
        let _ = baloo_config.setstr(SECTION_GENERAL, "only basic indexing", Some("false"));
    }

    let mut include_folders = {
        match baloo_config.get(SECTION_GENERAL, KEY_INCLUDE_FOLDERS) {
            Some(str) => str
                .split(FOLDERS_SEPARATOR)
                .map(|str| str.to_string())
                .collect::<Vec<String>>(),
            None => Vec::new(),
        }
    };

    let mut exclude_folders = {
        match baloo_config.get(SECTION_GENERAL, KEY_EXCLUDE_FOLDERS) {
            Some(str) => str
                .split(FOLDERS_SEPARATOR)
                .map(|str| str.to_string())
                .collect::<Vec<String>>(),
            None => Vec::new(),
        }
    };

    fn ensure_path_included_include_folders(
        include_folders: &mut Vec<String>,
        search_path: &Utf8Path,
    ) {
        for include_folder in include_folders.iter() {
            let include_folder = Utf8Path::new(include_folder.as_str());
            if search_path.starts_with(include_folder) {
                return;
            }
        }

        include_folders.push(search_path.as_str().to_string());
    }

    fn ensure_path_and_descendants_not_excluded(
        exclude_folders: &mut Vec<String>,
        search_path: &Utf8Path,
    ) {
        let mut items_to_remove = Vec::new();
        for (idx, exclude_folder) in exclude_folders.iter().enumerate() {
            let exclude_folder = Utf8Path::new(exclude_folder);

            if exclude_folder.starts_with(search_path) {
                items_to_remove.push(idx);
            }
        }

        for idx in items_to_remove.into_iter().rev() {
            exclude_folders.remove(idx);
        }
    }

    for search_path in config.search_paths.iter() {
        let search_path = Utf8Path::new(search_path.as_str());

        ensure_path_included_include_folders(&mut include_folders, search_path);
        ensure_path_and_descendants_not_excluded(&mut exclude_folders, search_path);
    }

    let include_folders_str: String = include_folders.as_slice().join(FOLDERS_SEPARATOR);
    let exclude_folders_str: String = exclude_folders.as_slice().join(FOLDERS_SEPARATOR);

    let _ = baloo_config.set(
        SECTION_GENERAL,
        KEY_INCLUDE_FOLDERS,
        Some(include_folders_str),
    );
    let _ = baloo_config.set(
        SECTION_GENERAL,
        KEY_EXCLUDE_FOLDERS,
        Some(exclude_folders_str),
    );

    baloo_config
        .pretty_write(rc_file_path.as_path(), &WriteOptions::new())
        .map_err(|e| e.to_string())?;

    Ok(())
}
