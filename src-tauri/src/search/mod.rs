use crate::common::error::SearchError;
use crate::common::register::SearchSourceRegistry;
use crate::common::search::{
    FailedRequest, MultiSourceQueryResponse, QueryHits, QueryResponse, QuerySource, SearchQuery,
};
use crate::common::traits::SearchSource;
use crate::server::servers::logout_coco_server;
use crate::server::servers::mark_server_as_offline;
use function_name::named;
use futures::StreamExt;
use futures::stream::FuturesUnordered;
use reqwest::StatusCode;
use std::cmp::Reverse;
use std::collections::HashMap;
use std::collections::HashSet;
use std::future::Future;
use std::sync::Arc;
use tauri::{AppHandle, Manager};
use tokio::time::error::Elapsed;
use tokio::time::{Duration, timeout};

/// Helper function to return the Future used for querying querysources.
///
/// It is a workaround for the limitations:
///
/// 1. 2 async blocks have different types in Rust's type system even though
///    they are literally same
/// 2. `futures::stream::FuturesUnordered` needs the `Futures` pushed to it to
///    have only 1 type
///
/// Putting the async block in a function to unify the types.
fn same_type_futures(
    query_source: QuerySource,
    query_source_trait_object: Arc<dyn SearchSource>,
    timeout_duration: Duration,
    search_query: SearchQuery,
    tauri_app_handle: AppHandle,
) -> impl Future<
    Output = (
        QuerySource,
        Result<Result<QueryResponse, SearchError>, Elapsed>,
    ),
> + 'static {
    async move {
        (
            // Store `query_source` as part of future for debugging purposes.
            query_source,
            timeout(timeout_duration, async {
                query_source_trait_object
                    .search(tauri_app_handle.clone(), search_query)
                    .await
            })
            .await,
        )
    }
}

#[named]
#[tauri::command]
pub async fn query_coco_fusion(
    app_handle: AppHandle,
    from: u64,
    size: u64,
    query_strings: HashMap<String, String>,
    query_timeout: u64,
) -> Result<MultiSourceQueryResponse, SearchError> {
    let query_keyword = query_strings
        .get("query")
        .unwrap_or(&"".to_string())
        .clone();

    let opt_query_source_id = query_strings.get("querysource");

    let search_sources = app_handle.state::<SearchSourceRegistry>();

    let sources_future = search_sources.get_sources();
    let mut futures = FuturesUnordered::new();

    let mut sources_list = sources_future.await;
    let sources_list_len = sources_list.len();

    // Time limit for each query
    let timeout_duration = Duration::from_millis(query_timeout);

    log::debug!(
        "{}() invoked with parameters: from: [{}], size: [{}], query_strings: [{:?}], timeout: [{:?}]",
        function_name!(),
        from,
        size,
        query_strings,
        timeout_duration
    );

    log::debug!(
        "will query querysources {:?}",
        sources_list
            .iter()
            .map(|search_source| search_source.get_type().id.clone())
            .collect::<Vec<String>>()
    );

    let search_query = SearchQuery::new(from, size, query_strings.clone());

    if let Some(query_source_id) = opt_query_source_id {
        // If this query source ID is specified, we only query this query source.
        log::debug!(
            "parameter [querysource={}] specified, will only query this querysource",
            query_source_id
        );

        let opt_query_source_trait_object_index = sources_list
            .iter()
            .position(|query_source| &query_source.get_type().id == query_source_id);

        let Some(query_source_trait_object_index) = opt_query_source_trait_object_index else {
            // It is possible (an edge case) that the frontend invokes `query_coco_fusion()` with a
            // datasource that does not exist in the source list:
            //
            // 1. Search applications
            // 2. Navigate to the application sub page
            // 3. Disable the application extension in settings
            // 4. hide the search window
            // 5. Re-open the search window and search for something
            //
            // The application search source is not in the source list because the extension
            // has been disabled, but the last search is indeed invoked with parameter
            // `datasource=application`.
            return Ok(MultiSourceQueryResponse {
                failed: Vec::new(),
                hits: Vec::new(),
                total_hits: 0,
            });
        };

        let query_source_trait_object = sources_list.remove(query_source_trait_object_index);
        let query_source = query_source_trait_object.get_type();

        futures.push(same_type_futures(
            query_source,
            query_source_trait_object,
            timeout_duration,
            search_query,
            app_handle.clone(),
        ));
    } else {
        for query_source_trait_object in sources_list {
            let query_source = query_source_trait_object.get_type().clone();
            futures.push(same_type_futures(
                query_source,
                query_source_trait_object,
                timeout_duration,
                search_query.clone(),
                app_handle.clone(),
            ));
        }
    }

    let mut total_hits = 0;
    let mut need_rerank = true; //TODO set default to false when boost supported in Pizza
    let mut failed_requests = Vec::new();
    let mut all_hits: Vec<(String, QueryHits, f64)> = Vec::new();
    let mut hits_per_source: HashMap<String, Vec<(QueryHits, f64)>> = HashMap::new();

    if sources_list_len > 1 {
        need_rerank = true; // If we have more than one source, we need to rerank the hits
    }

    while let Some((query_source, timeout_result)) = futures.next().await {
        match timeout_result {
            // Ignore the `_timeout` variable as it won't provide any useful debugging information.
            Err(_timeout) => {
                log::warn!(
                    "searching query source [{}] timed out, skip this request",
                    query_source.id
                );
                // failed_requests.push(FailedRequest {
                //     source: query_source,
                //     status: 0,
                //     error: Some("querying timed out".into()),
                //     reason: None,
                // });
            }
            Ok(query_result) => match query_result {
                Ok(response) => {
                    total_hits += response.total_hits;
                    let source_id = response.source.id.clone();

                    for (doc, score) in response.hits {
                        log::debug!("doc: {}, {:?}, {}", doc.id, doc.title, score);

                        let query_hit = QueryHits {
                            source: Some(response.source.clone()),
                            score,
                            document: doc,
                        };

                        all_hits.push((source_id.clone(), query_hit.clone(), score));

                        hits_per_source
                            .entry(source_id.clone())
                            .or_insert_with(Vec::new)
                            .push((query_hit, score));
                    }
                }
                Err(search_error) => {
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
                                    logout_coco_server(app_handle.clone(), query_source.id.clone()).await.unwrap_or_else(|e| {
                                        panic!(
                                          "the search request to Coco server [id {}, name {}] failed with status code {}, the login token is invalid, we are trying to log out, but failed with error [{}]", 
                                          query_source.id, query_source.name, StatusCode::UNAUTHORIZED, e
                                        );
                                    })
                                } else {
                                    // This Coco server is unavailable
                                    mark_server_as_offline(app_handle.clone(), &query_source.id)
                                        .await;
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
            },
        }
    }

    // Sort hits within each source by score (descending)
    for hits in hits_per_source.values_mut() {
        hits.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap_or(std::cmp::Ordering::Greater));
    }

    let total_sources = hits_per_source.len();
    let max_hits_per_source = if total_sources > 0 {
        size as usize / total_sources
    } else {
        size as usize
    };

    let mut final_hits = Vec::new();
    let mut seen_docs = HashSet::new(); // To track documents we've already added

    // Distribute hits fairly across sources
    for (_source_id, hits) in &mut hits_per_source {
        let take_count = hits.len().min(max_hits_per_source);
        for (doc, score) in hits.drain(0..take_count) {
            if !seen_docs.contains(&doc.document.id) {
                seen_docs.insert(doc.document.id.clone());
                log::debug!(
                    "collect doc: {}, {:?}, {}",
                    doc.document.id,
                    doc.document.title,
                    score
                );
                final_hits.push(doc);
            }
        }
    }

    log::debug!("final hits: {:?}", final_hits.len());

    let mut unique_sources = HashSet::new();
    for hit in &final_hits {
        if let Some(source) = &hit.source {
            if source.id != crate::extension::built_in::calculator::DATA_SOURCE_ID {
                unique_sources.insert(&source.id);
            }
        }
    }

    log::debug!(
        "Multiple sources found: {:?}, no rerank needed",
        unique_sources
    );

    if unique_sources.len() < 1 {
        need_rerank = false; // If we have hits from multiple sources, we don't need to rerank
    }

    if need_rerank && final_hits.len() > 1 {
        // Precollect (index, title)
        let titles_to_score: Vec<(usize, &str)> = final_hits
            .iter()
            .enumerate()
            .filter_map(|(idx, hit)| {
                let source = hit.source.as_ref()?;
                let title = hit.document.title.as_deref()?;

                if source.id != crate::extension::built_in::calculator::DATA_SOURCE_ID {
                    Some((idx, title))
                } else {
                    None
                }
            })
            .collect();

        // Score them
        let scored_hits = boosted_levenshtein_rerank(query_keyword.as_str(), titles_to_score);

        // Sort descending by score
        let mut scored_hits = scored_hits;
        scored_hits.sort_by_key(|&(_, score)| Reverse((score * 1000.0) as u64));

        // Apply new scores to final_hits
        for (idx, score) in scored_hits.into_iter().take(size as usize) {
            final_hits[idx].score = score;
        }
    } else if final_hits.len() < size as usize {
        // If we still need more hits, take the highest-scoring remaining ones

        let remaining_needed = size as usize - final_hits.len();

        // Sort all hits by score descending, removing duplicates by document ID
        all_hits.sort_by(|a, b| b.2.partial_cmp(&a.2).unwrap_or(std::cmp::Ordering::Equal));

        let extra_hits = all_hits
            .into_iter()
            .filter(|(source_id, _, _)| hits_per_source.contains_key(source_id)) // Only take from known sources
            .filter_map(|(_, doc, _)| {
                if !seen_docs.contains(&doc.document.id) {
                    seen_docs.insert(doc.document.id.clone());
                    Some(doc)
                } else {
                    None
                }
            })
            .take(remaining_needed)
            .collect::<Vec<_>>();

        final_hits.extend(extra_hits);
    }

    // **Sort final hits by score descending**
    final_hits.sort_by(|a, b| {
        b.score
            .partial_cmp(&a.score)
            .unwrap_or(std::cmp::Ordering::Equal)
    });

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

fn boosted_levenshtein_rerank(query: &str, titles: Vec<(usize, &str)>) -> Vec<(usize, f64)> {
    use strsim::levenshtein;

    let query_lower = query.to_lowercase();

    titles
        .into_iter()
        .map(|(idx, title)| {
            let mut score = 0.0;

            if title.contains(query) {
                score += 0.4;
            } else if title.to_lowercase().contains(&query_lower) {
                score += 0.2;
            }

            let dist = levenshtein(&query_lower, &title.to_lowercase());
            let max_len = query_lower.len().max(title.len());
            if max_len > 0 {
                score += (1.0 - (dist as f64 / max_len as f64)) as f32;
            }

            (idx, score.min(1.0) as f64)
        })
        .collect()
}
