use super::EXTENSION_ID;
use crate::common::document::{DataSourceReference, Document};
use crate::common::{
    error::SearchError,
    search::{QueryResponse, QuerySource, SearchQuery},
    traits::SearchSource,
};
use crate::extension::built_in::{get_built_in_extension_directory, load_extension_from_json_file};
use crate::extension::{ExtensionType, LOCAL_QUERY_SOURCE_TYPE, calculate_text_similarity};
use async_trait::async_trait;
use hostname;
use tauri::AppHandle;

/// A search source to allow users to search WM actions.
pub(crate) struct WindowManagementSearchSource;

#[async_trait]
impl SearchSource for WindowManagementSearchSource {
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

    async fn search(
        &self,
        tauri_app_handle: AppHandle,
        query: SearchQuery,
    ) -> Result<QueryResponse, SearchError> {
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
        let query_string_lowercase = query_string.to_lowercase();

        let extension = load_extension_from_json_file(
            &get_built_in_extension_directory(&tauri_app_handle),
            super::EXTENSION_ID,
        )
        .map_err(SearchError::InternalError)?;
        let commands = extension.commands.expect("this extension has commands");

        let mut hits: Vec<(Document, f64)> = Vec::new();

        // We know they are all commands
        let command_type_string = ExtensionType::Command.to_string();
        for command in commands.iter().filter(|ext| ext.enabled) {
            let score = {
                let mut score = 0_f64;

                if let Some(name_score) =
                    calculate_text_similarity(&query_string_lowercase, &command.name.to_lowercase())
                {
                    score += name_score;
                }

                if let Some(ref alias) = command.alias {
                    if let Some(alias_score) =
                        calculate_text_similarity(&query_string_lowercase, &alias.to_lowercase())
                    {
                        score += alias_score;
                    }
                }

                score
            };

            if score > 0.0 {
                let on_opened = super::on_opened::on_opened(&command.id);
                let url = on_opened.url();

                let document = Document {
                    id: command.id.clone(),
                    title: Some(command.name.clone()),
                    icon: Some("TODO".into()),
                    on_opened: Some(on_opened),
                    url: Some(url),
                    category: Some(command_type_string.clone()),
                    source: Some(DataSourceReference {
                        id: Some(command_type_string.clone()),
                        name: Some(command_type_string.clone()),
                        icon: None,
                        r#type: Some(command_type_string.clone()),
                    }),

                    ..Default::default()
                };

                hits.push((document, score));
            }
        }

        hits.sort_by(|(_, score_a), (_, score_b)| {
            score_a
                .partial_cmp(&score_b)
                .expect("expect no NAN/INFINITY/...")
        });

        let total_hits = hits.len();
        let from_size_applied = hits.into_iter().skip(from).take(size).collect();

        Ok(QueryResponse {
            source: self.get_type(),
            hits: from_size_applied,
            total_hits,
        })
    }
}
