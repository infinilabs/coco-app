use crate::common::error::SearchError;
use crate::common::register::SearchSourceRegistry;
use crate::common::search::{
    FailedRequest, MultiSourceQueryResponse, QueryHits, QuerySource, SearchQuery,
};
use futures::stream::FuturesUnordered;
use futures::StreamExt;
use std::cmp::Reverse;
use std::collections::HashMap;
use std::collections::HashSet;
use strsim::jaro_winkler;
use tauri::{AppHandle, Manager, Runtime};
use tokio::time::{timeout, Duration};

#[tauri::command]
pub async fn query_coco_fusion<R: Runtime>(
    app_handle: AppHandle<R>,
    from: u64,
    size: u64,
    query_strings: HashMap<String, String>,
    query_timeout: u64,
) -> Result<MultiSourceQueryResponse, SearchError> {
    let query_keyword = query_strings.get("query").unwrap_or(&"".to_string()).clone();

    let query_source_to_search = query_strings.get("querysource");

    let search_sources = app_handle.state::<SearchSourceRegistry>();

    let sources_future = search_sources.get_sources();
    let mut futures = FuturesUnordered::new();
    let mut sources = HashMap::new();

    let sources_list = sources_future.await;

    // Time limit for each query
    let timeout_duration = Duration::from_millis(query_timeout);

    log::debug!(
        "query_coco_fusion: {:?}, timeout: {:?}",
        query_strings,
        timeout_duration
    );

    // Push all queries into futures
    for query_source in &sources_list {
        let query_source_type = query_source.get_type().clone();

        if let Some(query_source_to_search) = query_source_to_search {
            // We should not search this data source
            if &query_source_type.id != query_source_to_search {
                continue;
            }
        }

        sources.insert(query_source_type.id.clone(), query_source_type);

        let query = SearchQuery::new(from, size, query_strings.clone());
        let query_source_clone = query_source.clone(); // Clone Arc to avoid ownership issues

        futures.push(tokio::spawn(async move {
            // Timeout each query execution
            timeout(timeout_duration, async {
                query_source_clone.search(query).await
            })
                .await
        }));
    }

    let mut total_hits = 0;
    let mut need_rerank = true; //TODO set default to false when boost supported in Pizza
    let mut failed_requests = Vec::new();
    let mut all_hits: Vec<(String, QueryHits, f64)> = Vec::new();
    let mut hits_per_source: HashMap<String, Vec<(QueryHits, f64)>> = HashMap::new();

    if sources_list.len() > 1 {
        need_rerank = true; // If we have more than one source, we need to rerank the hits
    }

    while let Some(result) = futures.next().await {
        match result {
            Ok(Ok(Ok(response))) => {
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
            Ok(Ok(Err(err))) => {
                log::error!("{}", err);
                failed_requests.push(FailedRequest {
                    source: QuerySource {
                        r#type: "N/A".into(),
                        name: "N/A".into(),
                        id: "N/A".into(),
                    },
                    status: 0,
                    error: Some(err.to_string()),
                    reason: None,
                });
            }
            Ok(Err(err)) => {
                log::error!("{}", err);
            }
            // Timeout reached, skip this request
            _ => {
                log::debug!("timeout reached, skip this request");
            }
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

    if need_rerank && final_hits.len() > 1 {
        // Compute similarity scores directly with index references
        let mut scored_hits: Vec<(usize, f64)> = final_hits
            .iter()
            .enumerate()
            .map(|(idx, hit)| {
                let title = hit.document.title.as_deref().unwrap_or("");
                let base_score = char_jaccard_similarity(title, query_keyword.as_str());

                let mut score = base_score;

                if title.contains(query_keyword.as_str()) {
                    score += 0.3;
                }

                (idx, score)
            })
            .collect();

        // Sort descending by score
        scored_hits.sort_by_key(|&(_, score)| Reverse((score * 1000.0) as u64));

        // Apply scores to the original final_hits
        for (idx, score) in scored_hits.into_iter().take(size as usize) {
            final_hits[idx].score = score;
        }
    } else if final_hits.len() < size as usize {     // If we still need more hits, take the highest-scoring remaining ones

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

fn char_jaccard_similarity(a: &str, b: &str) -> f64 {
    use std::collections::HashSet;

    let set_a: HashSet<char> = a.chars().filter(|c| !c.is_whitespace()).collect();
    let set_b: HashSet<char> = b.chars().filter(|c| !c.is_whitespace()).collect();

    let intersection: usize = set_a.intersection(&set_b).count();
    let union: usize = set_a.union(&set_b).count();

    if union == 0 {
        return 0.0;
    }

    intersection as f64 / union as f64
}