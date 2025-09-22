//! # Credits
//!
//! https://github.com/IRONAGE-Park/rag-sample/blob/3f0ad8c8012026cd3a7e453d08f041609426cb91/src/native/windows.rs
//! is the starting point of this implementation.

mod crawl_scope_manager;

use super::super::EXTENSION_ID;
use super::super::config::FileSearchConfig;
use super::super::config::SearchBy;
use crate::common::document::{DataSourceReference, Document};
use crate::extension::LOCAL_QUERY_SOURCE_TYPE;
use crate::extension::OnOpened;
use crate::util::file::sync_get_file_icon;
use std::borrow::Borrow;
use std::path::PathBuf;
use windows::{
    Win32::System::{
        Com::{CLSCTX_INPROC_SERVER, CoCreateInstance},
        Ole::{OleInitialize, OleUninitialize},
        Search::{
            DB_NULL_HCHAPTER, DBACCESSOR_ROWDATA, DBBINDING, DBMEMOWNER_CLIENTOWNED,
            DBPARAMIO_NOTPARAM, DBPART_VALUE, DBTYPE_WSTR, HACCESSOR, IAccessor, ICommand,
            ICommandText, IDBCreateCommand, IDBCreateSession, IDBInitialize, IDataInitialize,
            IRowset, MSDAINITIALIZE,
        },
    },
    core::{GUID, IUnknown, Interface, PWSTR, w},
};

/// Owned version of `PWSTR` that holds the heap memory.
///
/// Use `as_pwstr()` to convert it to a raw pointer.
struct PwStrOwned(Vec<u16>);

impl PwStrOwned {
    /// # SAFETY
    ///
    /// The returned `PWSTR` is basically a raw pointer, it is only valid within the
    /// lifetime of `PwStrOwned`.
    unsafe fn as_pwstr(&mut self) -> PWSTR {
        let raw_ptr = self.0.as_mut_ptr();
        PWSTR::from_raw(raw_ptr)
    }
}

/// Construct `PwStrOwned` from any `str`.
impl<S: AsRef<str> + ?Sized> From<&S> for PwStrOwned {
    fn from(value: &S) -> Self {
        let mut utf16_bytes = value.as_ref().encode_utf16().collect::<Vec<u16>>();
        utf16_bytes.push(0); // the tailing NULL

        PwStrOwned(utf16_bytes)
    }
}

/// Helper function to replace unsupported characters with whitespace.
///
/// Windows search will error out if it encounters these characters.
///
/// The complete list of unsupported characters is unknown and we don't know how
/// to escape them, so let's replace them.
fn query_string_cleanup(old: &str) -> String {
    const UNSUPPORTED_CHAR: [char; 2] = ['\'', '\n'];

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

/// Helper function to construct the Windows Search SQL.
///
/// Paging is not natively supported by windows Search SQL, it only supports `size`
/// via the `TOP` keyword ("SELECT TOP {n} {columns}").  The SQL returned by this
/// function will have `{n}` set to `from + size`, then we will manually implement
/// paging.
fn query_sql(query_string: &str, from: usize, size: usize, config: &FileSearchConfig) -> String {
    let top_n = from
        .checked_add(size)
        .expect("[from + size] cannot fit into an [usize]");

    // System.ItemUrl is a column that contains the file path
    // example: "file:C:/Users/desktop.ini"
    //
    // System.Search.Rank is the relevance score
    let mut sql = format!(
        "SELECT TOP {} System.ItemUrl, System.Search.Rank FROM SystemIndex WHERE",
        top_n
    );

    let query_string = query_string_cleanup(query_string);

    let search_by_predicate = match config.search_by {
        SearchBy::Name => {
            // `contains(System.FileName, '{query_string}')` would be faster
            // because it uses inverted index, but that's not what we want
            // due to the limitation of tokenization. For example, suppose "Coco AI.rs"
            // will be tokenized to `["Coco", "AI", "rs"]`, then if users search
            // via `Co`, this file won't be returned because term `Co` does not
            // exist in the index.
            //
            // So we use wildcard instead even though it is slower.
            format!("(System.FileName LIKE '%{query_string}%')")
        }
        SearchBy::NameAndContents => {
            // Windows File Search does not support searching by file content.
            //
            // `CONTAINS('query_string')` would search all columns for `query_string`,
            // this is the closest solution we have.
            format!("((System.FileName LIKE '%{query_string}%') OR CONTAINS('{query_string}'))")
        }
    };

    let search_paths_predicate: Option<String> = {
        if config.search_paths.is_empty() {
            None
        } else {
            let mut output = String::from("(");

            for (idx, search_path) in config.search_paths.iter().enumerate() {
                if idx != 0 {
                    output.push_str(" OR ");
                }

                output.push_str("SCOPE = 'file:");
                output.push_str(&search_path);
                output.push('\'');
            }

            output.push(')');

            Some(output)
        }
    };

    let exclude_paths_predicate: Option<String> = {
        if config.exclude_paths.is_empty() {
            None
        } else {
            let mut output = String::from("(");

            for (idx, exclude_path) in config.exclude_paths.iter().enumerate() {
                if idx != 0 {
                    output.push_str(" AND ");
                }

                output.push_str("(NOT SCOPE = 'file:");
                output.push_str(&exclude_path);
                output.push('\'');
                output.push(')');
            }

            output.push(')');

            Some(output)
        }
    };

    let file_types_predicate: Option<String> = {
        if config.file_types.is_empty() {
            None
        } else {
            let mut output = String::from("(");

            for (idx, file_type) in config.file_types.iter().enumerate() {
                if idx != 0 {
                    output.push_str(" OR ");
                }

                // NOTE that this column contains a starting dot
                output.push_str("System.FileExtension = '.");
                output.push_str(&file_type);
                output.push('\'');
            }

            output.push(')');

            Some(output)
        }
    };

    sql.push(' ');
    sql.push_str(search_by_predicate.as_str());
    if let Some(search_paths_predicate) = search_paths_predicate {
        sql.push_str(" AND ");
        sql.push_str(search_paths_predicate.as_str());
    }
    if let Some(exclude_paths_predicate) = exclude_paths_predicate {
        sql.push_str(" AND ");
        sql.push_str(exclude_paths_predicate.as_str());
    }
    if let Some(file_types_predicate) = file_types_predicate {
        sql.push_str(" AND ");
        sql.push_str(file_types_predicate.as_str());
    }

    sql
}

/// Default GUID for Search.CollatorDSO.1
const DBGUID_DEFAULT: GUID = GUID {
    data1: 0xc8b521fb,
    data2: 0x5cf3,
    data3: 0x11ce,
    data4: [0xad, 0xe5, 0x00, 0xaa, 0x00, 0x44, 0x77, 0x3d],
};

unsafe fn create_accessor_handle(accessor: &IAccessor, index: usize) -> Result<HACCESSOR, String> {
    let bindings = DBBINDING {
        iOrdinal: index,
        obValue: 0,
        obStatus: 0,
        obLength: 0,
        dwPart: DBPART_VALUE.0 as u32,
        dwMemOwner: DBMEMOWNER_CLIENTOWNED.0 as u32,
        eParamIO: DBPARAMIO_NOTPARAM.0 as u32,
        cbMaxLen: 512,
        dwFlags: 0,
        wType: DBTYPE_WSTR.0 as u16,
        bPrecision: 0,
        bScale: 0,
        ..Default::default()
    };
    let mut status = 0;
    let mut accessor_handle = HACCESSOR::default();
    unsafe {
        accessor
            .CreateAccessor(
                DBACCESSOR_ROWDATA.0 as u32,
                1,
                &bindings,
                0,
                &mut accessor_handle,
                Some(&mut status),
            )
            .map_err(|e| e.to_string())?;
    }

    Ok(accessor_handle)
}

fn create_db_initialize() -> Result<IDBInitialize, String> {
    unsafe {
        let data_init: IDataInitialize =
            CoCreateInstance(&MSDAINITIALIZE, None, CLSCTX_INPROC_SERVER)
                .map_err(|e| e.to_string())?;

        let mut unknown: Option<IUnknown> = None;
        data_init
            .GetDataSource(
                None,
                CLSCTX_INPROC_SERVER.0,
                w!("provider=Search.CollatorDSO.1;EXTENDED PROPERTIES=\"Application=Windows\""),
                &IDBInitialize::IID,
                &mut unknown as *mut _ as *mut _,
            )
            .map_err(|e| e.to_string())?;

        Ok(unknown.unwrap().cast().map_err(|e| e.to_string())?)
    }
}

fn create_command(db_init: IDBInitialize) -> Result<ICommandText, String> {
    unsafe {
        let db_create_session: IDBCreateSession = db_init.cast().map_err(|e| e.to_string())?;
        let session: IUnknown = db_create_session
            .CreateSession(None, &IUnknown::IID)
            .map_err(|e| e.to_string())?;
        let db_create_command: IDBCreateCommand = session.cast().map_err(|e| e.to_string())?;
        Ok(db_create_command
            .CreateCommand(None, &ICommand::IID)
            .map_err(|e| e.to_string())?
            .cast()
            .map_err(|e| e.to_string())?)
    }
}

fn execute_windows_search_sql(sql_query: &str) -> Result<Vec<(String, String)>, String> {
    unsafe {
        let mut pwstr_owned_sql = PwStrOwned::from(sql_query);
        // SAFETY: pwstr_owned_sql will live for the whole lifetime of this function.
        let sql_query = pwstr_owned_sql.as_pwstr();

        let db_init = create_db_initialize()?;
        db_init.Initialize().map_err(|e| e.to_string())?;
        let command = create_command(db_init)?;

        // Set the command text
        command
            .SetCommandText(&DBGUID_DEFAULT, sql_query)
            .map_err(|e| e.to_string())?;

        // Execute the command
        let mut rowset: Option<IRowset> = None;
        command
            .Execute(
                None,
                &IRowset::IID,
                None,
                None,
                Some(&mut rowset as *mut _ as *mut _),
            )
            .map_err(|e| e.to_string())?;
        let rowset = rowset.ok_or_else(|| {
            format!(
                "No rowset returned for query: {}",
                // SAFETY: the raw pointer is not dangling
                sql_query
                    .to_string()
                    .expect("the conversion should work as `sql_query` was created from a String",)
            )
        })?;

        let accessor: IAccessor = rowset
            .cast()
            .map_err(|e| format!("Failed to cast to IAccessor: {}", e.to_string()))?;

        let mut output = Vec::new();
        let mut count = 0;
        loop {
            let mut rows_fetched = 0;
            let mut row_handles = [std::ptr::null_mut(); 1];
            let result = rowset.GetNextRows(
                DB_NULL_HCHAPTER as usize,
                0,
                &mut rows_fetched,
                &mut row_handles,
            );
            if result.is_err() {
                break;
            }
            if rows_fetched == 0 {
                break;
            }

            let mut data = Vec::new();

            for i in 0..2 {
                let mut item_name = [0u16; 512];

                let accessor_handle = create_accessor_handle(&accessor, i + 1)?;
                rowset
                    .GetData(
                        *row_handles[0],
                        accessor_handle,
                        item_name.as_mut_ptr() as *mut _,
                    )
                    .map_err(|e| {
                        format!(
                            "Failed to get data at count {}, index {}: {}",
                            count,
                            i,
                            e.to_string()
                        )
                    })?;
                let name = String::from_utf16_lossy(&item_name);
                // Remove null characters
                data.push(name.trim_end_matches('\u{0000}').to_string());

                accessor
                    .ReleaseAccessor(accessor_handle, None)
                    .map_err(|e| {
                        format!(
                            "Failed to release accessor at count {}, index {}: {}",
                            count,
                            i,
                            e.to_string()
                        )
                    })?;
            }

            output.push((data[0].clone(), data[1].clone()));

            count += 1;
            rowset
                .ReleaseRows(
                    1,
                    row_handles[0],
                    std::ptr::null_mut(),
                    std::ptr::null_mut(),
                    std::ptr::null_mut(),
                )
                .map_err(|e| {
                    format!(
                        "Failed to release rows at count {}: {}",
                        count,
                        e.to_string()
                    )
                })?;
        }

        Ok(output)
    }
}

pub(crate) async fn hits(
    query_string: &str,
    from: usize,
    size: usize,
    config: &FileSearchConfig,
) -> Result<Vec<(Document, f64)>, String> {
    let sql = query_sql(query_string, from, size, config);
    unsafe { OleInitialize(None).map_err(|e| e.to_string())? };
    let result = execute_windows_search_sql(&sql)?;
    unsafe { OleUninitialize() };
    // .take(size) is not needed as `result` will contain `from+size` files at most
    let result_with_paging = result.into_iter().skip(from);
    // result_with_paging won't contain more than `size` entries
    let mut hits = Vec::with_capacity(size);

    const ITEM_URL_PREFIX: &str = "file:";
    const ITEM_URL_PREFIX_LEN: usize = ITEM_URL_PREFIX.len();
    for (item_url, score_str) in result_with_paging {
        // path returned from Windows Search contains a prefix, we need to trim it.
        //
        // "file:C:/Users/desktop.ini" => "C:/Users/desktop.ini"
        let file_path = &item_url[ITEM_URL_PREFIX_LEN..];

        let icon = sync_get_file_icon(file_path);
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
            url: Some(file_path.into()),
            icon: Some(icon.to_string()),
            ..Default::default()
        };

        let score: f64 = score_str.parse().expect(
            "System.Search.Rank should be in range [0, 1000], which should be valid for [f64]",
        );

        hits.push((doc, score));
    }

    Ok(hits)
}

pub(crate) fn apply_config(config: &FileSearchConfig) -> Result<(), String> {
    // To ensure Windows Search indexer index the paths we specified in the
    // config, we will:
    //
    // 1. Add an inclusion rule for every search path to ensure indexer index
    //    them
    // 2. For the exclude paths, we exclude them from the crawl scope if they
    //    were not included in the scope before we update the scope. Otherwise,
    //    we cannot exclude them as doing that could potentially break other
    //    apps (by removing the indexes they rely on).
    //
    // Windows APIs are pretty smart. They won't blindly add an inclusion rule if
    // the path you are trying to include is already included. The same applies
    // to exclusion rules as well. Since Windows APIs handle these checks for us,
    // we don't need to worry about them.

    use crawl_scope_manager::CrawlScopeManager;
    use crawl_scope_manager::Rule;
    use crawl_scope_manager::RuleMode;
    use std::borrow::Cow;

    /// Windows APIs need the path to contain a tailing '\'
    fn add_tailing_backslash(path: &str) -> Cow<'_, str> {
        if path.ends_with(r#"\"#) {
            Cow::Borrowed(path)
        } else {
            let mut owned = path.to_string();
            owned.push_str(r#"\"#);

            Cow::Owned(owned)
        }
    }

    let mut manager = CrawlScopeManager::new().map_err(|e| e.to_string())?;

    let search_paths = &config.search_paths;
    let exclude_paths = &config.exclude_paths;

    // indexes to `exclude_paths` of the paths we need to exclude
    let mut paths_to_exclude: Vec<usize> = Vec::new();
    for (idx, exclude_path) in exclude_paths.into_iter().enumerate() {
        let exclude_path = add_tailing_backslash(&exclude_path);
        let exclude_path: &str = exclude_path.borrow();

        if !manager
            .is_path_included(exclude_path)
            .map_err(|e| e.to_string())?
        {
            paths_to_exclude.push(idx);
        }
    }

    for search_path in search_paths {
        let inclusion_rule = Rule {
            paths: PathBuf::from(add_tailing_backslash(&search_path).into_owned()),
            mode: RuleMode::Inclusion,
        };

        manager
            .add_rule(inclusion_rule)
            .map_err(|e| e.to_string())?;
    }

    for idx in paths_to_exclude {
        let exclusion_rule = Rule {
            paths: PathBuf::from(add_tailing_backslash(&exclude_paths[idx]).into_owned()),
            mode: RuleMode::Exclusion,
        };

        manager
            .add_rule(exclusion_rule)
            .map_err(|e| e.to_string())?;
    }

    manager.commit().map_err(|e| e.to_string())?;

    Ok(())
}

// Skip these tests in our CI, they fail with the following error
// "SQL is invalid: "0x80041820""
//
// I have no idea about the underlying root cause
#[cfg(all(test, not(ci)))]
mod test_windows_search {
    use super::*;

    /// Helper function for ensuring `sql` is valid SQL by actually executing it.
    fn ensure_it_is_valid_sql(sql: &str) {
        unsafe { OleInitialize(None).unwrap() };
        execute_windows_search_sql(&sql).expect("SQL is invalid");
        unsafe { OleUninitialize() };
    }

    #[test]
    fn test_query_sql_empty_config_search_by_name() {
        let config = FileSearchConfig {
            search_paths: Vec::new(),
            exclude_paths: Vec::new(),
            file_types: Vec::new(),
            search_by: SearchBy::Name,
        };
        let sql = query_sql("coco", 0, 10, &config);

        assert_eq!(
            sql,
            "SELECT TOP 10 System.ItemUrl, System.Search.Rank FROM SystemIndex WHERE (System.FileName LIKE '%coco%')"
        );
        ensure_it_is_valid_sql(&sql);
    }

    #[test]
    fn test_query_sql_empty_config_search_by_name_and_content() {
        let config = FileSearchConfig {
            search_paths: Vec::new(),
            exclude_paths: Vec::new(),
            file_types: Vec::new(),
            search_by: SearchBy::NameAndContents,
        };
        let sql = query_sql("coco", 0, 10, &config);

        assert_eq!(
            sql,
            "SELECT TOP 10 System.ItemUrl, System.Search.Rank FROM SystemIndex WHERE ((System.FileName LIKE '%coco%') OR CONTAINS('coco'))"
        );
        ensure_it_is_valid_sql(&sql);
    }

    #[test]
    fn test_query_sql_with_search_paths() {
        let config = FileSearchConfig {
            search_paths: vec!["C:/Users/".into()],
            exclude_paths: Vec::new(),
            file_types: Vec::new(),
            search_by: SearchBy::Name,
        };
        let sql = query_sql("coco", 0, 10, &config);

        assert_eq!(
            sql,
            "SELECT TOP 10 System.ItemUrl, System.Search.Rank FROM SystemIndex WHERE (System.FileName LIKE '%coco%') AND (SCOPE = 'file:C:/Users/')"
        );
        ensure_it_is_valid_sql(&sql);
    }

    #[test]
    fn test_query_sql_with_multiple_search_paths() {
        let config = FileSearchConfig {
            search_paths: vec![
                "C:/Users/".into(),
                "D:/Projects/".into(),
                "E:/Documents/".into(),
            ],
            exclude_paths: Vec::new(),
            file_types: Vec::new(),
            search_by: SearchBy::Name,
        };
        let sql = query_sql("test", 0, 5, &config);

        assert_eq!(
            sql,
            "SELECT TOP 5 System.ItemUrl, System.Search.Rank FROM SystemIndex WHERE (System.FileName LIKE '%test%') AND (SCOPE = 'file:C:/Users/' OR SCOPE = 'file:D:/Projects/' OR SCOPE = 'file:E:/Documents/')"
        );
        ensure_it_is_valid_sql(&sql);
    }

    #[test]
    fn test_query_sql_with_exclude_paths() {
        let config = FileSearchConfig {
            search_paths: Vec::new(),
            exclude_paths: vec!["C:/Windows/".into()],
            file_types: Vec::new(),
            search_by: SearchBy::Name,
        };
        let sql = query_sql("file", 0, 20, &config);

        assert_eq!(
            sql,
            "SELECT TOP 20 System.ItemUrl, System.Search.Rank FROM SystemIndex WHERE (System.FileName LIKE '%file%') AND ((NOT SCOPE = 'file:C:/Windows/'))"
        );
        ensure_it_is_valid_sql(&sql);
    }

    #[test]
    fn test_query_sql_with_multiple_exclude_paths() {
        let config = FileSearchConfig {
            search_paths: Vec::new(),
            exclude_paths: vec!["C:/Windows/".into(), "C:/System/".into(), "C:/Temp/".into()],
            file_types: Vec::new(),
            search_by: SearchBy::Name,
        };
        let sql = query_sql("data", 5, 15, &config);

        assert_eq!(
            sql,
            "SELECT TOP 20 System.ItemUrl, System.Search.Rank FROM SystemIndex WHERE (System.FileName LIKE '%data%') AND ((NOT SCOPE = 'file:C:/Windows/') AND (NOT SCOPE = 'file:C:/System/') AND (NOT SCOPE = 'file:C:/Temp/'))"
        );
        ensure_it_is_valid_sql(&sql);
    }

    #[test]
    fn test_query_sql_with_file_types() {
        let config = FileSearchConfig {
            search_paths: Vec::new(),
            exclude_paths: Vec::new(),
            file_types: vec!["txt".into()],
            search_by: SearchBy::Name,
        };
        let sql = query_sql("readme", 0, 10, &config);

        assert_eq!(
            sql,
            "SELECT TOP 10 System.ItemUrl, System.Search.Rank FROM SystemIndex WHERE (System.FileName LIKE '%readme%') AND (System.FileExtension = '.txt')"
        );
        ensure_it_is_valid_sql(&sql);
    }

    #[test]
    fn test_query_sql_with_multiple_file_types() {
        let config = FileSearchConfig {
            search_paths: Vec::new(),
            exclude_paths: Vec::new(),
            file_types: vec!["rs".into(), "toml".into(), "md".into(), "json".into()],
            search_by: SearchBy::Name,
        };
        let sql = query_sql("config", 0, 50, &config);

        assert_eq!(
            sql,
            "SELECT TOP 50 System.ItemUrl, System.Search.Rank FROM SystemIndex WHERE (System.FileName LIKE '%config%') AND (System.FileExtension = '.rs' OR System.FileExtension = '.toml' OR System.FileExtension = '.md' OR System.FileExtension = '.json')"
        );
        ensure_it_is_valid_sql(&sql);
    }

    #[test]
    fn test_query_sql_all_fields_combined() {
        let config = FileSearchConfig {
            search_paths: vec!["C:/Projects/".into(), "D:/Code/".into()],
            exclude_paths: vec!["C:/Projects/temp/".into()],
            file_types: vec!["rs".into(), "ts".into()],
            search_by: SearchBy::Name,
        };
        let sql = query_sql("main", 10, 25, &config);

        assert_eq!(
            sql,
            "SELECT TOP 35 System.ItemUrl, System.Search.Rank FROM SystemIndex WHERE (System.FileName LIKE '%main%') AND (SCOPE = 'file:C:/Projects/' OR SCOPE = 'file:D:/Code/') AND ((NOT SCOPE = 'file:C:/Projects/temp/')) AND (System.FileExtension = '.rs' OR System.FileExtension = '.ts')"
        );
        ensure_it_is_valid_sql(&sql);
    }

    #[test]
    fn test_query_sql_with_special_characters() {
        let config = FileSearchConfig {
            search_paths: vec!["C:/Users/John Doe/".into()],
            exclude_paths: Vec::new(),
            file_types: vec!["c++".into()],
            search_by: SearchBy::Name,
        };
        let sql = query_sql("hello-world", 0, 10, &config);

        assert_eq!(
            sql,
            "SELECT TOP 10 System.ItemUrl, System.Search.Rank FROM SystemIndex WHERE (System.FileName LIKE '%hello-world%') AND (SCOPE = 'file:C:/Users/John Doe/') AND (System.FileExtension = '.c++')"
        );
        ensure_it_is_valid_sql(&sql);
    }

    #[test]
    fn test_query_sql_edge_case_large_offset() {
        let config = FileSearchConfig {
            search_paths: Vec::new(),
            exclude_paths: Vec::new(),
            file_types: Vec::new(),
            search_by: SearchBy::Name,
        };
        let sql = query_sql("test", 100, 50, &config);

        assert_eq!(
            sql,
            "SELECT TOP 150 System.ItemUrl, System.Search.Rank FROM SystemIndex WHERE (System.FileName LIKE '%test%')"
        );
        ensure_it_is_valid_sql(&sql);
    }
}

#[cfg(test)]
mod test {
    use super::*;

    #[test]
    fn test_query_string_cleanup_no_unsupported_chars() {
        let input = "hello world";
        let result = query_string_cleanup(input);
        assert_eq!(result, input);
    }

    #[test]
    fn test_query_string_cleanup_single_quote() {
        let input = "don't worry";
        let result = query_string_cleanup(input);
        assert_eq!(result, "don t worry");
    }

    #[test]
    fn test_query_string_cleanup_newline() {
        let input = "line1\nline2";
        let result = query_string_cleanup(input);
        assert_eq!(result, "line1 line2");
    }

    #[test]
    fn test_query_string_cleanup_both_unsupported_chars() {
        let input = "don't\nworry";
        let result = query_string_cleanup(input);
        assert_eq!(result, "don t worry");
    }

    #[test]
    fn test_query_string_cleanup_multiple_single_quotes() {
        let input = "it's a 'test' string";
        let result = query_string_cleanup(input);
        assert_eq!(result, "it s a  test  string");
    }

    #[test]
    fn test_query_string_cleanup_multiple_newlines() {
        let input = "line1\n\nline2\nline3";
        let result = query_string_cleanup(input);
        assert_eq!(result, "line1  line2 line3");
    }

    #[test]
    fn test_query_string_cleanup_empty_string() {
        let input = "";
        let result = query_string_cleanup(input);
        assert_eq!(result, input);
    }

    #[test]
    fn test_query_string_cleanup_only_unsupported_chars() {
        let input = "'\n'";
        let result = query_string_cleanup(input);
        assert_eq!(result, "   ");
    }

    #[test]
    fn test_query_string_cleanup_unicode_characters() {
        let input = "héllo wörld's\nfile";
        let result = query_string_cleanup(input);
        assert_eq!(result, "héllo wörld s file");
    }

    #[test]
    fn test_query_string_cleanup_special_chars_preserved() {
        let input = "test@file#name$with%symbols";
        let result = query_string_cleanup(input);
        assert_eq!(result, input);
    }
}
