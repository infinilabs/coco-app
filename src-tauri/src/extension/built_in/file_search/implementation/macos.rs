use super::super::EXTENSION_ID;
use super::super::config::FileSearchConfig;
use super::super::config::SearchBy;
use crate::common::document::{DataSourceReference, Document};
use crate::extension::LOCAL_QUERY_SOURCE_TYPE;
use crate::extension::OnOpened;
use crate::util::file::get_file_icon;
use futures::stream::Stream;
use futures::stream::StreamExt;
use std::os::fd::OwnedFd;
use std::path::Path;
use tokio::io::AsyncBufReadExt;
use tokio::io::BufReader;
use tokio::process::Child;
use tokio::process::Command;
use tokio_stream::wrappers::LinesStream;

/// `mdfind` won't return scores, we use this score for all the documents.
const SCORE: f64 = 1.0;

pub(crate) async fn hits(
    query_string: &str,
    from: usize,
    size: usize,
    config: &FileSearchConfig,
) -> Result<Vec<(Document, f64)>, String> {
    let (mut iter, mut mdfind_child_process) =
        execute_mdfind_query(&query_string, from, size, &config)?;

    // Convert results to documents
    let mut hits: Vec<(Document, f64)> = Vec::new();
    while let Some(res_file_path) = iter.next().await {
        let file_path = res_file_path.map_err(|io_err| io_err.to_string())?;

        let icon = get_file_icon(file_path.clone()).await;
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
    // Kill the mdfind process once we get the needed results to prevent zombie
    // processes.
    mdfind_child_process
        .kill()
        .await
        .map_err(|e| format!("{:?}", e))?;

    Ok(hits)
}

/// Return an array containing the `mdfind` command and its arguments.
fn build_mdfind_query(query_string: &str, config: &FileSearchConfig) -> Vec<String> {
    let mut args = vec!["mdfind".to_string()];

    match config.search_by {
        SearchBy::Name => {
            // The tailing char 'c' makes the search case-insensitive.
            //
            // According to [1], we should use this syntax "kMDItemFSName ==[c] '*{}*'",
            // but it does not work on my machine (macOS 26 beta 7), and you 
            // can find similar complaints as well [2].
            //
            // [1]: https://developer.apple.com/library/archive/documentation/Carbon/Conceptual/SpotlightQuery/Concepts/QueryFormat.html
            // [2]: https://apple.stackexchange.com/q/263671/394687
            args.push(format!("kMDItemFSName == '*{}*'c", query_string));
        }
        SearchBy::NameAndContents => {
            // Do not specify any File System Metadata Attribute Keys to search
            // all of them.
            //
            // Previously, we use:
            //
            //    "kMDItemFSName == '*{}*' || kMDItemTextContent == '{}'"
            //
            // But the kMDItemTextContent attribute does not work as expected.
            // For example, if a PDF document contains both "Waterloo" and 
            // "waterloo", it is only matched by "Waterloo".
            args.push(query_string.to_string());
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
    let args = build_mdfind_query(query_string, &config);
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
                    Ok(path) => !should_be_filtered_out(&config_clone, path),
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
