//! File system powered by GNOME's Tracker engine.

use super::super::EXTENSION_ID;
use super::super::config::FileSearchConfig;
use super::should_be_filtered_out;
use crate::common::document::DataSourceReference;
use crate::extension::LOCAL_QUERY_SOURCE_TYPE;
use crate::util::file::sync_get_file_icon;
use crate::{
    common::document::{Document, OnOpened},
    extension::built_in::file_search::config::SearchBy,
};
use gio::Cancellable;
use tracker::{SparqlConnection, SparqlCursor, prelude::SparqlCursorExtManual};

/// The service that we will connect to.
const SERVICE_NAME: &str = "org.freedesktop.Tracker3.Miner.Files";

/// Tracker won't return scores when we are not using full-text seach.  In that
/// case, we use this score.
const SCORE: f64 = 1.0;

/// Helper function to return different SPARQL queries depending on the different configurations.
fn query_sparql(query_string: &str, config: &FileSearchConfig) -> String {
    match config.search_by {
        SearchBy::Name => {
            // Cannot use the inverted index as that searches for all the attributes,
            // but we only want to search the filename.
            format!(
                "SELECT nie:url(?file_item) WHERE {{ ?file_item nfo:fileName ?fileName . FILTER(regex(?fileName, '{query_string}', 'i')) }}"
            )
        }
        SearchBy::NameAndContents => {
            // Full-text search against all attributes
            // OR
            // filename search
            format!(
                "SELECT nie:url(?file_item) fts:rank(?file_item) WHERE {{ {{ ?file_item fts:match '{query_string}' }} UNION {{ ?file_item nfo:fileName ?fileName . FILTER(regex(?fileName, '{query_string}', 'i'))  }} }} ORDER BY DESC fts:rank(?file_item)"
            )
        }
    }
}

/// Helper function to replace unsupported characters with whitespace.
///
/// Tracker will error out if it encounters these characters.
///
/// The complete list of unsupported characters is unknown and we don't know how
/// to escape them, so let's replace them.
fn query_string_cleanup(old: &str) -> String {
    const UNSUPPORTED_CHAR: [char; 3] = ['\'', '\n', '\\'];

    // Using len in bytes is ok
    let mut chars = Vec::with_capacity(old.len());
    for char in old.chars() {
        if UNSUPPORTED_CHAR.contains(&char) {
            chars.push(' ');
        } else {
            chars.push(char);
        }
    }

    chars.into_iter().collect()
}

struct Query {
    conn: SparqlConnection,
    cursor: SparqlCursor,
}

impl Query {
    fn new(query_string: &str, config: &FileSearchConfig) -> Result<Self, String> {
        let query_string = query_string_cleanup(query_string);
        let sparql = query_sparql(&query_string, config);
        let conn =
            SparqlConnection::bus_new(SERVICE_NAME, None, None).map_err(|e| e.to_string())?;
        let cursor = conn
            .query(&sparql, Cancellable::NONE)
            .map_err(|e| e.to_string())?;

        Ok(Self { conn, cursor })
    }
}

impl Drop for Query {
    fn drop(&mut self) {
        self.cursor.close();
        self.conn.close();
    }
}

impl Iterator for Query {
    /// It yields a tuple `(file path, score)`
    type Item = Result<(String, f64), String>;

    fn next(&mut self) -> Option<Self::Item> {
        loop {
            let has_next = match self
                .cursor
                .next(Cancellable::NONE)
                .map_err(|e| e.to_string())
            {
                Ok(has_next) => has_next,
                Err(err_str) => return Some(Err(err_str)),
            };

            if !has_next {
                return None;
            }

            // The first column is the URL
            let file_url_column = self.cursor.string(0);
            // It could be None (or NULL ptr if you use C), I have no clue why.
            let opt_str = file_url_column.as_ref().map(|gstr| gstr.as_str());

            match opt_str {
                Some(url) => {
                    // The returned URL has a prefix that we need to trim
                    const PREFIX: &str = "file://";
                    const PREFIX_LEN: usize = PREFIX.len();

                    let file_path = url[PREFIX_LEN..].to_string();
                    assert!(!file_path.is_empty());
                    assert_ne!(file_path, "/", "file search should not hit the root path");

                    let score = {
                        // The second column is the score, this column may not
                        // exist.  We use SCORE if the real value is absent.
                        let score_column = self.cursor.string(1);
                        let opt_score_str = score_column.as_ref().map(|g_str| g_str.as_str());
                        let opt_score = opt_score_str.map(|str| {
                            str.parse::<f64>()
                                .expect("score should be valid for type f64")
                        });

                        opt_score.unwrap_or(SCORE)
                    };

                    return Some(Ok((file_path, score)));
                }
                None => {
                    // another try
                    continue;
                }
            }
        }
    }
}

pub(crate) async fn hits(
    query_string: &str,
    from: usize,
    size: usize,
    config: &FileSearchConfig,
) -> Result<Vec<(Document, f64)>, String> {
    // Special cases that will make querying faster.
    if query_string.is_empty() || size == 0 || config.search_paths.is_empty() {
        return Ok(Vec::new());
    }

    let mut result_hits = Vec::with_capacity(size);

    let need_to_skip = {
        if matches!(config.search_by, SearchBy::Name) {
            // We don't use full-text search in this case, the returned documents
            // won't be scored, the query hits won't be sorted, so processing the
            // from parameter is meaningless.
            false
        } else {
            from > 0
        }
    };
    let mut num_skipped = 0;
    let should_skip = from;

    let query = Query::new(query_string, config)?;
    for res_entry in query {
        let (file_path, score) = res_entry?;

        // This should be called before processing the `from` parameter.
        if should_be_filtered_out(config, &file_path, true, true, true) {
            continue;
        }

        // Process the `from` parameter.
        if need_to_skip && num_skipped < should_skip {
            // Skip this
            num_skipped += 1;
            continue;
        }

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
            url: file_path.to_string(),
        };

        let doc = Document {
            id: file_path.to_string(),
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

        result_hits.push((doc, score));

        // Collected enough documents, return
        if result_hits.len() >= size {
            break;
        }
    }

    Ok(result_hits)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_query_string_cleanup_basic() {
        assert_eq!(query_string_cleanup("test"), "test");
        assert_eq!(query_string_cleanup("hello world"), "hello world");
        assert_eq!(query_string_cleanup("file.txt"), "file.txt");
    }

    #[test]
    fn test_query_string_cleanup_unsupported_chars() {
        assert_eq!(query_string_cleanup("test'file"), "test file");
        assert_eq!(query_string_cleanup("test\nfile"), "test file");
        assert_eq!(query_string_cleanup("test\\file"), "test file");
    }

    #[test]
    fn test_query_string_cleanup_multiple_unsupported() {
        assert_eq!(query_string_cleanup("test'file\nname"), "test file name");
        assert_eq!(query_string_cleanup("test\'file"), "test file");
        assert_eq!(query_string_cleanup("\n'test"), "  test");
    }

    #[test]
    fn test_query_string_cleanup_edge_cases() {
        assert_eq!(query_string_cleanup(""), "");
        assert_eq!(query_string_cleanup("'"), " ");
        assert_eq!(query_string_cleanup("\n"), " ");
        assert_eq!(query_string_cleanup("\\"), " ");
        assert_eq!(query_string_cleanup(" '\n\\ "), "     ");
    }

    #[test]
    fn test_query_string_cleanup_mixed_content() {
        assert_eq!(
            query_string_cleanup("document's content\nwith\\backslash"),
            "document s content with backslash"
        );
        assert_eq!(
            query_string_cleanup("path/to'file\nextension\\test"),
            "path/to file extension test"
        );
    }
}
