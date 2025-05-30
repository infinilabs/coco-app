use super::alter_extension_json_file;
use super::Extension;
use super::LOCAL_QUERY_SOURCE_TYPE;
use crate::common::document::open;
use crate::common::document::DataSourceReference;
use crate::common::document::Document;
use crate::common::error::SearchError;
use crate::common::search::QueryResponse;
use crate::common::search::QuerySource;
use crate::common::search::SearchQuery;
use crate::common::traits::SearchSource;
use crate::extension::split_extension_id;
use crate::GLOBAL_TAURI_APP_HANDLE;
use async_trait::async_trait;
use function_name::named;
use std::path::PathBuf;
use std::sync::Arc;
use std::sync::LazyLock;
use std::sync::OnceLock;
use tauri::async_runtime;
use tauri::Manager;
use tauri_plugin_global_shortcut::GlobalShortcutExt;
use tauri_plugin_global_shortcut::ShortcutState;
use tokio::sync::RwLock;

pub(crate) static THIRD_PARTY_EXTENSION_DIRECTORY: LazyLock<PathBuf> = LazyLock::new(|| {
    let mut app_data_dir = GLOBAL_TAURI_APP_HANDLE
        .get()
        .expect("global tauri app handle not set")
        .path()
        .app_data_dir()
        .expect(
            "User home directory not found, which should be impossible on desktop environments",
        );
    app_data_dir.push("extension");

    app_data_dir
});

/// All the third-party extensions will be registered as one search source.
///
/// Since some `#[tauri::command]`s need to access it, we store it in a global
/// static variable as well.
#[derive(Debug, Clone)]
pub(super) struct ThirdPartyExtensionsSearchSource {
    inner: Arc<ThirdPartyExtensionsSearchSourceInner>,
}

impl ThirdPartyExtensionsSearchSource {
    pub(super) fn new(extensions: Vec<Extension>) -> Self {
        Self {
            inner: Arc::new(ThirdPartyExtensionsSearchSourceInner {
                extensions: RwLock::new(extensions),
            }),
        }
    }

    #[named]
    pub(super) async fn enable_extension(&self, extension_id: &str) -> Result<(), String> {
        let (parent_extension_id, _opt_sub_extension_id) = split_extension_id(extension_id);

        let mut extensions_write_lock = self.inner.extensions.write().await;
        let opt_index = extensions_write_lock
            .iter()
            .position(|ext| ext.id == parent_extension_id);

        let Some(index) = opt_index else {
            return Err(format!(
                "{} invoked with an extension that does not exist [{}]",
                function_name!(),
                extension_id
            ));
        };

        let extension = extensions_write_lock
            .get_mut(index)
            .expect("just checked this extension exists");

        let update_extension = |ext: &mut Extension| -> Result<(), String> {
            if ext.enabled {
                return Err(format!(
                    "{} invoked with an extension that is already enabled [{}]",
                    function_name!(),
                    extension_id
                ));
            }
            ext.enabled = true;

            Ok(())
        };

        extension.modify(extension_id, update_extension)?;
        alter_extension_json_file(
            &THIRD_PARTY_EXTENSION_DIRECTORY,
            extension_id,
            update_extension,
        )?;

        Ok(())
    }

    #[named]
    pub(super) async fn disable_extension(&self, extension_id: &str) -> Result<(), String> {
        let (parent_extension_id, _opt_sub_extension_id) = split_extension_id(extension_id);

        let mut extensions_write_lock = self.inner.extensions.write().await;
        let opt_index = extensions_write_lock
            .iter()
            .position(|ext| ext.id == parent_extension_id);

        let Some(index) = opt_index else {
            return Err(format!(
                "{} invoked with an extension that does not exist [{}]",
                function_name!(),
                extension_id
            ));
        };

        let extension = extensions_write_lock
            .get_mut(index)
            .expect("just checked this extension exists");

        let update_extension = |ext: &mut Extension| -> Result<(), String> {
            if !ext.enabled {
                return Err(format!(
                    "{} invoked with an extension that is already enabled [{}]",
                    function_name!(),
                    extension_id
                ));
            }
            ext.enabled = false;

            Ok(())
        };

        extension.modify(extension_id, update_extension)?;
        alter_extension_json_file(
            &THIRD_PARTY_EXTENSION_DIRECTORY,
            extension_id,
            update_extension,
        )?;

        Ok(())
    }

    #[named]
    pub(super) async fn set_extension_alias(
        &self,
        extension_id: &str,
        alias: &str,
    ) -> Result<(), String> {
        let (parent_extension_id, _opt_sub_extension_id) = split_extension_id(extension_id);

        let mut extensions_write_lock = self.inner.extensions.write().await;
        let opt_index = extensions_write_lock
            .iter()
            .position(|ext| ext.id == parent_extension_id);

        let Some(index) = opt_index else {
            log::warn!(
                "{} invoked with an extension that does not exist [{}]",
                function_name!(),
                extension_id
            );
            return Ok(());
        };

        let extension = extensions_write_lock
            .get_mut(index)
            .expect("just checked this extension exists");

        let update_extension = |ext: &mut Extension| -> Result<(), String> {
            ext.alias = Some(alias.to_string());
            Ok(())
        };

        extension.modify(extension_id, update_extension)?;
        alter_extension_json_file(
            &THIRD_PARTY_EXTENSION_DIRECTORY,
            extension_id,
            update_extension,
        )?;

        Ok(())
    }

    pub(super) async fn restore_extensions_hotkey(&self) -> Result<(), String> {
        fn set_up_hotkey<R: tauri::Runtime>(
            tauri_app_handle: &tauri::AppHandle<R>,
            extension: &Extension,
        ) -> Result<(), String> {
            if let Some(ref hotkey) = extension.hotkey {
                let on_opened = extension.on_opened().unwrap_or_else(|| panic!( "extension has hotkey, but on_open() returns None, extension ID [{}], extension type [{:?}]", extension.id, extension.r#type));

                let extension_id_clone = extension.id.clone();

                tauri_app_handle
                    .global_shortcut()
                    .on_shortcut(hotkey.as_str(), move |_tauri_app_handle, _hotkey, event| {
                        let on_opened_clone = on_opened.clone();
                        let extension_id_clone = extension_id_clone.clone();
                        if event.state() == ShortcutState::Pressed {
                            async_runtime::spawn(async move {
                                let result = open(on_opened_clone).await;
                                if let Err(msg) = result {
                                    log::warn!(
                                        "failed to open extension [{}], error [{}]",
                                        extension_id_clone,
                                        msg
                                    );
                                }
                            });
                        }
                    })
                    .map_err(|e| e.to_string())?;
            }

            Ok(())
        }

        let extensions_read_lock = self.inner.extensions.read().await;
        let tauri_app_handle = GLOBAL_TAURI_APP_HANDLE
            .get()
            .expect("global tauri app handle not set");

        for extension in extensions_read_lock.iter() {
            if extension.r#type.contains_sub_items() {
                if let Some(commands) = &extension.commands {
                    for command in commands.iter().filter(|cmd| cmd.enabled) {
                        set_up_hotkey(tauri_app_handle, command)?;
                    }
                }

                if let Some(scripts) = &extension.scripts {
                    for script in scripts.iter().filter(|script| script.enabled) {
                        set_up_hotkey(tauri_app_handle, script)?;
                    }
                }

                if let Some(quick_links) = &extension.quick_links {
                    for quick_link in quick_links.iter().filter(|link| link.enabled) {
                        set_up_hotkey(tauri_app_handle, quick_link)?;
                    }
                }
            } else {
                set_up_hotkey(tauri_app_handle, extension)?;
            }
        }

        Ok(())
    }

    #[named]
    pub(super) async fn register_extension_hotkey(
        &self,
        extension_id: &str,
        hotkey: &str,
    ) -> Result<(), String> {
        self.unregister_extension_hotkey(extension_id).await?;

        let (parent_extension_id, _opt_sub_extension_id) = split_extension_id(extension_id);
        let mut extensions_write_lock = self.inner.extensions.write().await;
        let opt_index = extensions_write_lock
            .iter()
            .position(|ext| ext.id == parent_extension_id);

        let Some(index) = opt_index else {
            return Err(format!(
                "{} invoked with an extension that does not exist [{}]",
                function_name!(),
                extension_id
            ));
        };

        let mut extension = extensions_write_lock
            .get_mut(index)
            .expect("just checked this extension exists");

        let update_extension = |ext: &mut Extension| -> Result<(), String> {
            ext.hotkey = Some(hotkey.into());
            Ok(())
        };

        // Update extension (memory and file)
        extension.modify(extension_id, update_extension)?;
        alter_extension_json_file(
            &THIRD_PARTY_EXTENSION_DIRECTORY,
            extension_id,
            update_extension,
        )?;

        // To make borrow checker happy
        let extension_dbg_string = format!("{:?}", extension);
        extension = match extension.get_extension_mut(extension_id) {
            Some(ext) => ext,
            None => {
                panic!(
                    "extension [{}] should be found in {}",
                    extension_id, extension_dbg_string
                )
            }
        };

        // Set hotkey
        let tauri_app_handle = GLOBAL_TAURI_APP_HANDLE
            .get()
            .expect("global tauri app handle not set");
        let on_opened = extension.on_opened().unwrap_or_else(|| panic!(
            "setting hotkey for an extension that cannot be opened, extension ID [{}], extension type [{:?}]", extension_id, extension.r#type,
        ));

        let extension_id_clone = extension_id.to_string();
        tauri_app_handle
            .global_shortcut()
            .on_shortcut(hotkey, move |_tauri_app_handle, _hotkey, event| {
                let on_opened_clone = on_opened.clone();
                let extension_id_clone = extension_id_clone.clone();
                if event.state() == ShortcutState::Pressed {
                    async_runtime::spawn(async move {
                        let result = open(on_opened_clone).await;
                        if let Err(msg) = result {
                            log::warn!(
                                "failed to open extension [{}], error [{}]",
                                extension_id_clone,
                                msg
                            );
                        }
                    });
                }
            })
            .map_err(|e| e.to_string())?;

        Ok(())
    }

    /// NOTE: this function won't error out if the extension specified by `extension_id`
    /// has no hotkey set because we need it to behave like this.
    #[named]
    pub(super) async fn unregister_extension_hotkey(
        &self,
        extension_id: &str,
    ) -> Result<(), String> {
        let (parent_extension_id, _opt_sub_extension_id) = split_extension_id(extension_id);

        let mut extensions_write_lock = self.inner.extensions.write().await;
        let opt_index = extensions_write_lock
            .iter()
            .position(|ext| ext.id == parent_extension_id);

        let Some(index) = opt_index else {
            return Err(format!(
                "{} invoked with an extension that does not exist [{}]",
                function_name!(),
                extension_id
            ));
        };

        let parent_extension = extensions_write_lock
            .get_mut(index)
            .expect("just checked this extension exists");
        let Some(extension) = parent_extension.get_extension_mut(extension_id) else {
            return Err(format!(
                "{} invoked with an extension that does not exist [{}]",
                function_name!(),
                extension_id
            ));
        };

        let Some(hotkey) = extension.hotkey.clone() else {
            log::warn!(
                "extension [{}] has no hotkey set, but we are trying to unregister it",
                extension_id
            );
            return Ok(());
        };

        let update_extension = |extension: &mut Extension| -> Result<(), String> {
            extension.hotkey = None;
            Ok(())
        };

        parent_extension.modify(extension_id, update_extension)?;
        alter_extension_json_file(
            &THIRD_PARTY_EXTENSION_DIRECTORY,
            extension_id,
            update_extension,
        )?;

        // Set hotkey
        let tauri_app_handle = GLOBAL_TAURI_APP_HANDLE
            .get()
            .expect("global tauri app handle not set");
        tauri_app_handle
            .global_shortcut()
            .unregister(hotkey.as_str())
            .map_err(|e| e.to_string())?;

        Ok(())
    }

    #[named]
    pub(super) async fn is_extension_enabled(&self, extension_id: &str) -> Result<bool, String> {
        let (parent_extension_id, opt_sub_extension_id) = split_extension_id(extension_id);

        let extensions_read_lock = self.inner.extensions.read().await;
        let opt_index = extensions_read_lock
            .iter()
            .position(|ext| ext.id == parent_extension_id);

        let Some(index) = opt_index else {
            return Err(format!(
                "{} invoked with an extension that does not exist [{}]",
                function_name!(),
                extension_id
            ));
        };

        let extension = extensions_read_lock
            .get(index)
            .expect("just checked this extension exists");

        if let Some(sub_extension_id) = opt_sub_extension_id {
            // For a sub-extension, it is enabled iff:
            //
            // 1. Its parent extension is enabled, and
            // 2. It is enabled
            if !extension.enabled {
                return Ok(false);
            }

            if let Some(ref commands) = extension.commands {
                if let Some(sub_ext) = commands.iter().find(|cmd| cmd.id == sub_extension_id) {
                    return Ok(sub_ext.enabled);
                }
            }
            if let Some(ref scripts) = extension.scripts {
                if let Some(sub_ext) = scripts.iter().find(|script| script.id == sub_extension_id) {
                    return Ok(sub_ext.enabled);
                }
            }
            if let Some(ref commands) = extension.commands {
                if let Some(sub_ext) = commands
                    .iter()
                    .find(|quick_link| quick_link.id == sub_extension_id)
                {
                    return Ok(sub_ext.enabled);
                }
            }

            Err(format!(
                "{} invoked with a sub-extension that does not exist [{}/{}]",
                function_name!(),
                parent_extension_id,
                sub_extension_id
            ))
        } else {
            Ok(extension.enabled)
        }
    }
}

pub(super) static THIRD_PARTY_EXTENSIONS_SEARCH_SOURCE: OnceLock<ThirdPartyExtensionsSearchSource> =
    OnceLock::new();

#[derive(Debug)]
struct ThirdPartyExtensionsSearchSourceInner {
    extensions: RwLock<Vec<Extension>>,
}

#[async_trait]
impl SearchSource for ThirdPartyExtensionsSearchSource {
    fn get_type(&self) -> QuerySource {
        QuerySource {
            r#type: LOCAL_QUERY_SOURCE_TYPE.into(),
            name: hostname::get()
                .unwrap_or("My Computer".into())
                .to_string_lossy()
                .into(),
            id: "extensions".into(),
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

        let opt_data_source = query
            .query_strings
            .get("datasource")
            .map(|owned_str| owned_str.as_str());

        let mut hits = Vec::new();
        let extensions_read_lock = self.inner.extensions.read().await;
        let query_lower = query_string.to_lowercase();

        for extension in extensions_read_lock.iter().filter(|ext| ext.enabled) {
            if extension.r#type.contains_sub_items() {
                if let Some(ref commands) = extension.commands {
                    for command in commands.iter().filter(|cmd| cmd.enabled) {
                        if let Some(hit) = extension_to_hit(command, &query_lower, opt_data_source)
                        {
                            hits.push(hit);
                        }
                    }
                }

                if let Some(ref scripts) = extension.scripts {
                    for script in scripts.iter().filter(|script| script.enabled) {
                        if let Some(hit) = extension_to_hit(script, &query_lower, opt_data_source) {
                            hits.push(hit);
                        }
                    }
                }

                if let Some(ref quick_links) = extension.quick_links {
                    for quick_link in quick_links.iter().filter(|link| link.enabled) {
                        if let Some(hit) =
                            extension_to_hit(quick_link, &query_lower, opt_data_source)
                        {
                            hits.push(hit);
                        }
                    }
                }
            } else {
                if let Some(hit) = extension_to_hit(extension, &query_lower, opt_data_source) {
                    hits.push(hit);
                }
            }
        }

        let total_hits = hits.len();

        Ok(QueryResponse {
            source: self.get_type(),
            hits,
            total_hits,
        })
    }
}

fn extension_to_hit(
    extension: &Extension,
    query_lower: &str,
    opt_data_source: Option<&str>,
) -> Option<(Document, f64)> {
    if !extension.searchable() {
        return None;
    }

    let extension_type_string = extension.r#type.to_string();

    if let Some(data_source) = opt_data_source {
        let document_data_source_id = extension_type_string.as_str();

        if document_data_source_id != data_source {
            return None;
        }
    }

    let mut total_score = 0.0;

    // Score based on title match
    // Title is considered more important, so it gets a higher weight.
    if let Some(title_score) =
        calculate_text_similarity(&query_lower, &extension.title.to_lowercase())
    {
        total_score += title_score * 1.0; // Weight for title
    }

    // Score based on alias match if available
    // Alias is considered less important than title, so it gets a lower weight.
    if let Some(alias) = &extension.alias {
        if let Some(alias_score) = calculate_text_similarity(&query_lower, &alias.to_lowercase()) {
            total_score += alias_score * 0.7; // Weight for alias
        }
    }

    // Only include if there's some relevance (score is meaningfully positive)
    if total_score > 0.01 {
        let on_opened = extension.on_opened().unwrap_or_else(|| {
            panic!(
                "extension (id [{}], type [{:?}]) is searchable, and should have a valid on_opened",
                extension.id, extension.r#type
            )
        });
        let url = on_opened.url();

        let document = Document {
            id: extension.id.clone(),
            title: Some(extension.title.clone()),
            icon: Some(extension.icon.clone()),
            on_opened: Some(on_opened),
            url: Some(url),
            category: Some(extension_type_string.clone()),
            source: Some(DataSourceReference {
                id: Some(extension_type_string.clone()),
                name: Some(extension_type_string.clone()),
                icon: None,
                r#type: Some(extension_type_string),
            }),

            ..Default::default()
        };

        Some((document, total_score))
    } else {
        None
    }
}

// Calculates a similarity score between a query and a text, aiming for a [0, 1] range.
// Assumes query and text are already lowercased.
fn calculate_text_similarity(query: &str, text: &str) -> Option<f64> {
    if query.is_empty() || text.is_empty() {
        return None;
    }

    if text == query {
        return Some(1.0); // Perfect match
    }

    let query_len = query.len() as f64;
    let text_len = text.len() as f64;
    let ratio = query_len / text_len;
    let mut score: f64 = 0.0;

    // Case 1: Text starts with the query (prefix match)
    // Score: base 0.5, bonus up to 0.4 for how much of `text` is covered by `query`. Max 0.9.
    if text.starts_with(query) {
        score = score.max(0.5 + 0.4 * ratio);
    }

    // Case 2: Text contains the query (substring match, not necessarily prefix)
    // Score: base 0.3, bonus up to 0.3. Max 0.6.
    // `score.max` ensures that if it's both a prefix and contains, the higher score (prefix) is taken.
    if text.contains(query) {
        score = score.max(0.3 + 0.3 * ratio);
    }

    // Case 3: Fallback for "all query characters exist in text" (order-independent)
    if score < 0.2 {
        if query.chars().all(|c_q| text.contains(c_q)) {
            score = score.max(0.15); // Fixed low score for this weaker match type
        }
    }

    if score > 0.0 {
        // Cap non-perfect matches slightly below 1.0 to make perfect (1.0) distinct.
        Some(score.min(0.95))
    } else {
        None
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    // Helper function for approximate floating point comparison
    fn approx_eq(a: f64, b: f64) -> bool {
        (a - b).abs() < 1e-10
    }

    #[test]
    fn test_empty_strings() {
        assert_eq!(calculate_text_similarity("", "text"), None);
        assert_eq!(calculate_text_similarity("query", ""), None);
        assert_eq!(calculate_text_similarity("", ""), None);
    }

    #[test]
    fn test_perfect_match() {
        assert_eq!(calculate_text_similarity("text", "text"), Some(1.0));
        assert_eq!(calculate_text_similarity("a", "a"), Some(1.0));
    }

    #[test]
    fn test_prefix_match() {
        // For "te" and "text":
        // score = 0.5 + 0.4 * (2/4) = 0.5 + 0.2 = 0.7
        let score = calculate_text_similarity("te", "text").unwrap();
        assert!(approx_eq(score, 0.7));

        // For "tex" and "text":
        // score = 0.5 + 0.4 * (3/4) = 0.5 + 0.3 = 0.8
        let score = calculate_text_similarity("tex", "text").unwrap();
        assert!(approx_eq(score, 0.8));
    }

    #[test]
    fn test_substring_match() {
        // For "ex" and "text":
        // score = 0.3 + 0.3 * (2/4) = 0.3 + 0.15 = 0.45
        let score = calculate_text_similarity("ex", "text").unwrap();
        assert!(approx_eq(score, 0.45));

        // Prefix should score higher than substring
        assert!(
            calculate_text_similarity("te", "text").unwrap()
                > calculate_text_similarity("ex", "text").unwrap()
        );
    }

    #[test]
    fn test_character_presence() {
        // Characters present but not in sequence
        // "tac" in "contact" - not a substring, but all chars exist
        let score = calculate_text_similarity("tac", "contact").unwrap();
        assert!(approx_eq(0.3 + 0.3 * (3.0 / 7.0), score));

        assert!(calculate_text_similarity("ac", "contact").is_some());

        // Should not apply if some characters are missing
        assert_eq!(calculate_text_similarity("xyz", "contact"), None);
    }

    #[test]
    fn test_combined_scenarios() {
        // Test that character presence fallback doesn't override higher scores
        // "tex" is a prefix of "text" with score 0.8
        let score = calculate_text_similarity("tex", "text").unwrap();
        assert!(approx_eq(score, 0.8));

        // Test a case where the characters exist but it's already a substring
        // "act" is a substring of "contact" with score > 0.2, so fallback won't apply
        let expected_score = 0.3 + 0.3 * (3.0 / 7.0);
        let actual_score = calculate_text_similarity("act", "contact").unwrap();
        assert!(approx_eq(actual_score, expected_score));
    }

    #[test]
    fn test_no_similarity() {
        assert_eq!(calculate_text_similarity("xyz", "test"), None);
    }

    #[test]
    fn test_score_capping() {
        // Use a long query that's a prefix of a slightly longer text
        let long_text = "abcdefghijklmnopqrstuvwxyz";
        let long_prefix = "abcdefghijklmnopqrstuvwxy"; // All but last letter

        // Expected score would be 0.5 + 0.4 * (25/26) = 0.5 + 0.385 = 0.885
        let expected_score = 0.5 + 0.4 * (25.0 / 26.0);
        let actual_score = calculate_text_similarity(long_prefix, long_text).unwrap();
        assert!(approx_eq(actual_score, expected_score));

        // Verify that non-perfect matches are capped at 0.95
        assert!(calculate_text_similarity("almost", "almost perfect").unwrap() <= 0.95);
    }
}
