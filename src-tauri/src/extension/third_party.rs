use super::alter_extension_json_file;
use super::Extension;
use crate::common::document::Document;
use crate::common::error::SearchError;
use crate::common::search::QueryResponse;
use crate::common::search::QuerySource;
use crate::common::search::SearchQuery;
use crate::common::traits::SearchSource;
use async_trait::async_trait;
use function_name::named;
use std::sync::Arc;
use std::sync::OnceLock;
use tokio::sync::RwLock;

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
        let mut extensions_write_lock = self.inner.extensions.write().await;
        let opt_index = extensions_write_lock
            .iter()
            .position(|ext| ext.id == extension_id);

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
        if extension.enabled {
            log::warn!(
                "{} invoked with an extension that is already enabled [{}]",
                function_name!(),
                extension_id
            );
            return Ok(());
        }

        let update_extension = |ext: &mut Extension| {
            ext.enabled = true;
        };

        update_extension(extension);
        alter_extension_json_file(extension_id, update_extension)?;

        Ok(())
    }

    #[named]
    pub(super) async fn disable_extension(&self, extension_id: &str) -> Result<(), String> {
        let mut extensions_write_lock = self.inner.extensions.write().await;
        let opt_index = extensions_write_lock
            .iter()
            .position(|ext| ext.id == extension_id);

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
        if !extension.enabled {
            log::warn!(
                "{} invoked with an extension that is already enabled [{}]",
                function_name!(),
                extension_id
            );
            return Ok(());
        }

        let update_extension = |ext: &mut Extension| {
            ext.enabled = true;
        };

        update_extension(extension);
        alter_extension_json_file(extension_id, update_extension)?;

        Ok(())
    }

    #[named]
    pub(super) async fn set_extension_alias(
        &self,
        extension_id: &str,
        alias: &str,
    ) -> Result<(), String> {
        let mut extensions_write_lock = self.inner.extensions.write().await;
        let opt_index = extensions_write_lock
            .iter()
            .position(|ext| ext.id == extension_id);

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

        let update_extension = |ext: &mut Extension| {
            ext.alias = Some(alias.into());
        };

        update_extension(extension);
        alter_extension_json_file(extension_id, update_extension)?;

        Ok(())
    }

    pub(super) async fn register_extension_hotkey(
        &self,
        extension_id: &str,
        hotkey: &str,
    ) -> Result<(), String> {
        todo!()
    }

    pub(super) async fn unregister_extension_hotkey(
        &self,
        extension_id: &str,
    ) -> Result<(), String> {
        todo!()
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
            r#type: "third_party_extensions".into(),
            id: "third_party_extensions".into(),
            name: "third_party_extensions".into(),
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

        let mut hits = Vec::new();
        let extensions_read_lock = self.inner.extensions.read().await;
        let query_lower = query_string.to_lowercase();

        for extension in extensions_read_lock.iter().filter(|ext| ext.enabled) {
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
                if let Some(alias_score) =
                    calculate_text_similarity(&query_lower, &alias.to_lowercase())
                {
                    total_score += alias_score * 0.7; // Weight for alias
                }
            }

            // Only include if there's some relevance (score is meaningfully positive)
            if total_score > 0.01 {
                let document = Document {
                    id: extension.id.clone(),
                    title: Some(extension.title.clone()),
                    icon: Some(extension.icon.clone()),
                    ..Default::default()
                };

                hits.push((document, total_score));
            }
        }

        // Sort by score descending
        hits.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap_or(std::cmp::Ordering::Equal));

        let total_hits = hits.len();

        Ok(QueryResponse {
            source: self.get_type(),
            hits,
            total_hits,
        })
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
    // Applied only if other scores are low and query is not too short, to avoid noise.
    if score < 0.2 && query_len > 2.0 {
        // query_len > 2 to avoid for 1 or 2 char queries.
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
        assert!(calculate_text_similarity("te", "text").unwrap() > 
               calculate_text_similarity("ex", "text").unwrap());
    }
    
    #[test]
    fn test_character_presence() {
        // Characters present but not in sequence
        // "tac" in "contact" - not a substring, but all chars exist
        let score = calculate_text_similarity("tac", "contact").unwrap();
        assert!(approx_eq(score, 0.15));
        
        // Should not apply for queries of length <= 2
        assert_eq!(calculate_text_similarity("ac", "contact"), None);
        
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
        let expected_score = 0.5 + 0.4 * (25.0/26.0);
        let actual_score = calculate_text_similarity(long_prefix, long_text).unwrap();
        assert!(approx_eq(actual_score, expected_score));
        
        // Verify that non-perfect matches are capped at 0.95
        assert!(calculate_text_similarity("almost", "almost perfect").unwrap() <= 0.95);
    }
}