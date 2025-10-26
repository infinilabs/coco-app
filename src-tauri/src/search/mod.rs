use crate::common::error::SearchError;
use crate::common::register::SearchSourceRegistry;
use crate::common::search::{
    FailedRequest, MultiSourceQueryResponse, QueryHits, QuerySource, SearchQuery,
};
use crate::common::traits::SearchSource;
use crate::extension::LOCAL_QUERY_SOURCE_TYPE;
use crate::server::servers::logout_coco_server;
use crate::server::servers::mark_server_as_offline;
use function_name::named;
use futures::StreamExt;
use futures::stream::FuturesUnordered;
use reqwest::StatusCode;
use std::collections::HashMap;
use std::sync::Arc;
use tauri::{AppHandle, Manager};
use tokio::time::{Duration, timeout};
#[named]
#[tauri::command]
pub async fn query_coco_fusion(
    tauri_app_handle: AppHandle,
    from: u64,
    size: u64,
    query_strings: HashMap<String, String>,
    query_timeout: u64,
) -> Result<MultiSourceQueryResponse, SearchError> {
    let opt_query_source_id = query_strings.get("querysource");
    let search_sources = tauri_app_handle.state::<SearchSourceRegistry>();
    let query_source_list = search_sources.get_sources().await;
    let timeout_duration = Duration::from_millis(query_timeout);
    let search_query = SearchQuery::new(from, size, query_strings.clone());

    log::debug!(
        "{}() invoked with parameters: from: [{}], size: [{}], query_strings: [{:?}], timeout: [{:?}]",
        function_name!(),
        from,
        size,
        query_strings,
        timeout_duration
    );

    // Dispatch to different `query_coco_fusion_xxx()` functions.
    if let Some(query_source_id) = opt_query_source_id {
        query_coco_fusion_single_query_source(
            tauri_app_handle,
            query_source_list,
            query_source_id.clone(),
            timeout_duration,
            search_query,
        )
        .await
    } else {
        query_coco_fusion_multi_query_sources(
            tauri_app_handle,
            query_source_list,
            timeout_duration,
            search_query,
        )
        .await
    }
}

/// Query only 1 query source.
///
/// The logic here is much simpler than `query_coco_fusion_multi_query_sources()`
/// as we don't need to re-rank due to fact that this does not involve multiple
/// query sources.
async fn query_coco_fusion_single_query_source(
    tauri_app_handle: AppHandle,
    mut query_source_list: Vec<Arc<dyn SearchSource>>,
    id_of_query_source_to_query: String,
    timeout_duration: Duration,
    search_query: SearchQuery,
) -> Result<MultiSourceQueryResponse, SearchError> {
    // If this query source ID is specified, we only query this query source.
    log::debug!(
        "parameter [querysource={}] specified, will only query this query source",
        id_of_query_source_to_query
    );

    let opt_query_source_trait_object_index = query_source_list
        .iter()
        .position(|query_source| query_source.get_type().id == id_of_query_source_to_query);

    let Some(query_source_trait_object_index) = opt_query_source_trait_object_index else {
        // It is possible (an edge case) that the frontend invokes `query_coco_fusion()`
        // with a querysource that does not exist in the source list:
        //
        // 1. Search applications
        // 2. Navigate to the application sub page
        // 3. Disable the application extension in settings, which removes this
        //    query source from the list
        // 4. hide the search window
        // 5. Re-open the search window, you will still be in the sub page, type to search
        //    something
        //
        // The application query source is not in the source list because the extension
        // was disabled and thus removed from the query sources, but the last
        // search is indeed invoked with parameter `querysource=application`.
        return Ok(MultiSourceQueryResponse {
            failed: Vec::new(),
            hits: Vec::new(),
            total_hits: 0,
        });
    };

    let query_source_trait_object = query_source_list.remove(query_source_trait_object_index);
    let query_source = query_source_trait_object.get_type();
    let search_fut = query_source_trait_object.search(tauri_app_handle.clone(), search_query);
    let timeout_result = timeout(timeout_duration, search_fut).await;

    let mut failed_requests: Vec<FailedRequest> = Vec::new();
    let mut hits = Vec::new();
    let mut total_hits = 0;

    match timeout_result {
        // Ignore the `_timeout` variable as it won't provide any useful debugging information.
        Err(_timeout) => {
            log::warn!(
                "searching query source [{}] timed out, skip this request",
                query_source.id
            );
        }
        Ok(query_result) => match query_result {
            Ok(response) => {
                total_hits = response.total_hits;

                for (document, score) in response.hits {
                    log::debug!(
                        "document from query source [{}]: ID [{}], title [{:?}], score [{}]",
                        response.source.id,
                        document.id,
                        document.title,
                        score
                    );

                    let query_hit = QueryHits {
                        source: Some(response.source.clone()),
                        score,
                        document,
                    };

                    hits.push(query_hit);
                }
            }
            Err(search_error) => {
                query_coco_fusion_handle_failed_request(
                    tauri_app_handle.clone(),
                    &mut failed_requests,
                    query_source,
                    search_error,
                )
                .await;
            }
        },
    }

    Ok(MultiSourceQueryResponse {
        failed: failed_requests,
        hits,
        total_hits,
    })
}

async fn query_coco_fusion_multi_query_sources(
    tauri_app_handle: AppHandle,
    query_source_trait_object_list: Vec<Arc<dyn SearchSource>>,
    timeout_duration: Duration,
    search_query: SearchQuery,
) -> Result<MultiSourceQueryResponse, SearchError> {
    log::debug!(
        "will query query sources {:?}",
        query_source_trait_object_list
            .iter()
            .map(|search_source| search_source.get_type().id.clone())
            .collect::<Vec<String>>()
    );

    let query_keyword = search_query
        .query_strings
        .get("query")
        .unwrap_or(&"".to_string())
        .clone();
    let size = search_query.size;

    let mut futures = FuturesUnordered::new();

    for query_source_trait_object in query_source_trait_object_list {
        let query_source = query_source_trait_object.get_type().clone();
        let tauri_app_handle_clone = tauri_app_handle.clone();
        let search_query_clone = search_query.clone();

        futures.push(async move {
            (
                // Store `query_source` as part of future for debugging purposes.
                query_source,
                timeout(timeout_duration, async {
                    query_source_trait_object
                        .search(tauri_app_handle_clone, search_query_clone)
                        .await
                })
                .await,
            )
        });
    }

    let mut total_hits = 0;
    let mut failed_requests = Vec::new();
    let mut all_hits_grouped_by_query_source: HashMap<QuerySource, Vec<QueryHits>> = HashMap::new();

    while let Some((query_source, timeout_result)) = futures.next().await {
        match timeout_result {
            // Ignore the `_timeout` variable as it won't provide any useful debugging information.
            Err(_timeout) => {
                log::warn!(
                    "searching query source [{}] timed out, skip this request",
                    query_source.id
                );
            }
            Ok(query_result) => match query_result {
                Ok(response) => {
                    total_hits += response.total_hits;

                    for (document, score) in response.hits {
                        log::debug!(
                            "document from query source [{}]: ID [{}], title [{:?}], score [{}]",
                            response.source.id,
                            document.id,
                            document.title,
                            score
                        );

                        let query_hit = QueryHits {
                            source: Some(response.source.clone()),
                            score,
                            document,
                        };

                        all_hits_grouped_by_query_source
                            .entry(query_source.clone())
                            .or_insert_with(Vec::new)
                            .push(query_hit);
                    }
                }
                Err(search_error) => {
                    query_coco_fusion_handle_failed_request(
                        tauri_app_handle.clone(),
                        &mut failed_requests,
                        query_source,
                        search_error,
                    )
                    .await;
                }
            },
        }
    }

    let n_sources = all_hits_grouped_by_query_source.len();

    if n_sources == 0 {
        return Ok(MultiSourceQueryResponse {
            failed: Vec::new(),
            hits: Vec::new(),
            total_hits: 0,
        });
    }

    /*
     * Apply settings: local query source weight
     */
    let local_query_source_weight: f64 = 2.0;
    // Scores remain unchanged if it is 1.0
    if local_query_source_weight != 1.0 {
        for (query_source, hits) in all_hits_grouped_by_query_source.iter_mut() {
            if query_source.r#type == LOCAL_QUERY_SOURCE_TYPE {
                hits.iter_mut().for_each(|hit| hit.score = hit.score * local_query_source_weight);
            }
        }
    }


    /*
     * Sort hits within each source by score (descending) in case data sources
     * do not sort them
     */
    for hits in all_hits_grouped_by_query_source.values_mut() {
        hits.sort_by(|a, b| {
            b.score
                .partial_cmp(&a.score)
                .unwrap_or(std::cmp::Ordering::Greater)
        });
    }

    /*
     * Collect hits evenly across sources, to ensure:
     *
     * 1. All sources have hits returned
     * 2. Query sources with many hits won't dominate
     */
    let mut final_hits_grouped_by_source_id: HashMap<String, Vec<QueryHits>> = HashMap::new();
    let mut pruned: HashMap<&str, &[QueryHits]> = HashMap::new();

    // Include at least 2 hits from each query source
    let max_hits_per_source = (size as usize / n_sources).max(2);
    for (query_source, hits) in all_hits_grouped_by_query_source.iter() {
        let hits_taken = if hits.len() > max_hits_per_source {
            pruned.insert(&query_source.id, &hits[max_hits_per_source..]);
            hits[0..max_hits_per_source].to_vec()
        } else {
            hits.clone()
        };

        final_hits_grouped_by_source_id.insert(query_source.id.clone(), hits_taken);
    }

    let final_hits_len = final_hits_grouped_by_source_id
        .iter()
        .fold(0, |acc: usize, (_source_id, hits)| acc + hits.len());
    let pruned_len = pruned
        .iter()
        .fold(0, |acc: usize, (_source_id, hits)| acc + hits.len());

    /*
     * If we still need more hits, take the highest-scoring from `pruned`
     *
     * `pruned` contains sorted arrays, we scan it in a way similar to
     * how n-way-merge-sort extracts the element with the greatest value.
     */
    if final_hits_len < size as usize {
        let n_need = size as usize - final_hits_len;
        let n_have = pruned_len;
        let n_take = n_have.min(n_need);

        for _ in 0..n_take {
            let mut highest_score_hit: Option<(&str, &QueryHits)> = None;
            for (source_id, sorted_hits) in pruned.iter_mut() {
                if sorted_hits.is_empty() {
                    continue;
                }

                let hit = &sorted_hits[0];

                let have_higher_score_hit = match highest_score_hit {
                    Some((_, current_highest_score_hit)) => {
                        hit.score > current_highest_score_hit.score
                    }
                    None => true,
                };

                if have_higher_score_hit {
                    highest_score_hit = Some((*source_id, hit));

                    // Advance sorted_hits by 1 element, if have
                    if sorted_hits.len() == 1 {
                        *sorted_hits = &[];
                    } else {
                        *sorted_hits = &sorted_hits[1..];
                    }
                }
            }

            let (source_id, hit) = highest_score_hit.expect("`pruned` should contain at least `n_take` elements so `highest_score_hit` should be set");

            final_hits_grouped_by_source_id
                .get_mut(source_id)
                .expect("all the source_ids stored in `pruned` come from `final_hits_grouped_by_source_id`, so it should exist")
                .push(hit.clone());
        }
    }

    /*
     * Re-rank the final hits
     */
    if n_sources > 1 {
        boosted_levenshtein_rerank(&query_keyword, &mut final_hits_grouped_by_source_id);
    }

    let mut final_hits = Vec::new();
    for (_source_id, hits) in final_hits_grouped_by_source_id {
        final_hits.extend(hits);
    }

    // **Sort final hits by score descending**
    final_hits.sort_by(|a, b| {
        b.score
            .partial_cmp(&a.score)
            .unwrap_or(std::cmp::Ordering::Equal)
    });

    // Truncate `final_hits` in case it contains more than `size` hits
    final_hits.truncate(size as usize);

    if final_hits.len() < 5 {
        //TODO: Add a recommendation system to suggest more sources
        log::info!(
            "Less than 5 hits found, consider using recommendation to find more suggestions."
        );
        //local: recent history, local extensions
        //remote: ai agents, quick links, other tasks, managed by server
    }

    Ok(MultiSourceQueryResponse {
        failed: failed_requests,
        hits: final_hits,
        total_hits,
    })
}

use std::collections::HashSet;
use strsim::levenshtein;

fn boosted_levenshtein_rerank(
    query: &str,
    all_hits_grouped_by_source_id: &mut HashMap<String, Vec<QueryHits>>,
) {
    let query_lower = query.to_lowercase();

    for (source_id, hits) in all_hits_grouped_by_source_id.iter_mut() {
        // Skip special sources like calculator
        if source_id == crate::extension::built_in::calculator::DATA_SOURCE_ID {
            continue;
        }

        for hit in hits.iter_mut() {
            let document_title = hit.document.title.as_deref().unwrap_or("");
            let document_title_lowercase = document_title.to_lowercase();

            let new_score = {
                let mut score = 0.0;

                // --- Exact or substring boost ---
                if document_title.contains(query) {
                    score += 0.4;
                } else if document_title_lowercase.contains(&query_lower) {
                    score += 0.2;
                }

                // --- Levenshtein distance (character similarity) ---
                let dist = levenshtein(&query_lower, &document_title_lowercase);
                let max_len = query_lower.len().max(document_title.len());
                let levenshtein_score = if max_len > 0 {
                    (1.0 - (dist as f64 / max_len as f64)) as f32
                } else {
                    0.0
                };

                // --- Jaccard similarity (token overlap) ---
                let jaccard_score = jaccard_similarity(&query_lower, &document_title_lowercase);

                // --- Combine scores (weights adjustable) ---
                // Levenshtein emphasizes surface similarity
                // Jaccard emphasizes term overlap (semantic hint)
                let hybrid_score = 0.7 * levenshtein_score + 0.3 * jaccard_score;

                // --- Apply hybrid score ---
                score += hybrid_score;

                // --- Limit score range ---
                score.min(1.0) as f64
            };

            hit.score = new_score;
        }
    }
}

/// Compute token-based Jaccard similarity
fn jaccard_similarity(a: &str, b: &str) -> f32 {
    let a_tokens: HashSet<_> = tokenize(a).into_iter().collect();
    let b_tokens: HashSet<_> = tokenize(b).into_iter().collect();

    if a_tokens.is_empty() || b_tokens.is_empty() {
        return 0.0;
    }

    let intersection = a_tokens.intersection(&b_tokens).count() as f32;
    let union = a_tokens.union(&b_tokens).count() as f32;

    intersection / union
}

/// Basic tokenizer (case-insensitive, alphanumeric words only)
fn tokenize(text: &str) -> Vec<String> {
    text.to_lowercase()
        .split(|c: char| !c.is_alphanumeric())
        .filter(|s| !s.is_empty())
        .map(|s| s.to_string())
        .collect()
}

/// Helper function to handle a failed request.
///
/// Extracted as a function because `query_coco_fusion_single_query_source()` and
/// `query_coco_fusion_multi_query_sources()` share the same error handling logic.
async fn query_coco_fusion_handle_failed_request(
    tauri_app_handle: AppHandle,
    failed_requests: &mut Vec<FailedRequest>,
    query_source: QuerySource,
    search_error: SearchError,
) {
    log::error!(
        "searching query source [{}] failed, error [{}]",
        query_source.id,
        search_error
    );

    let mut status_code_num: u16 = 0;

    if let SearchError::HttpError {
        status_code: opt_status_code,
        msg: _,
    } = search_error
    {
        if let Some(status_code) = opt_status_code {
            status_code_num = status_code.as_u16();
            if status_code != StatusCode::OK {
                if status_code == StatusCode::UNAUTHORIZED {
                    // This Coco server is unavailable. In addition to marking it as
                    // unavailable, we need to log out because the status code is 401.
                    logout_coco_server(tauri_app_handle.clone(), query_source.id.to_string()).await.unwrap_or_else(|e| {
                        panic!(
                          "the search request to Coco server [id {}, name {}] failed with status code {}, the login token is invalid, we are trying to log out, but failed with error [{}]", 
                          query_source.id, query_source.name, StatusCode::UNAUTHORIZED, e
                        );
                    })
                } else {
                    // This Coco server is unavailable
                    mark_server_as_offline(tauri_app_handle.clone(), &query_source.id).await;
                }
            }
        }
    }

    failed_requests.push(FailedRequest {
        source: query_source,
        status: status_code_num,
        error: Some(search_error.to_string()),
        reason: None,
    });
}
