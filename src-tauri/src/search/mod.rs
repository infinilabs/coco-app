use crate::common::register::SearchSourceRegistry;
use crate::common::search::{FailedRequest, MultiSourceQueryResponse, QuerySource, SearchQuery};
use crate::common::traits::{SearchError, SearchSource};
use futures::stream::FuturesUnordered;
use futures::StreamExt;
use std::collections::HashMap;
use tauri::{AppHandle, Manager, Runtime};

#[tauri::command]
pub async fn query_coco_fusion<R: Runtime>(
    app_handle: AppHandle<R>,
    from: u64,
    size: u64,
    query_strings: HashMap<String, String>,
) -> Result<MultiSourceQueryResponse, SearchError> {
    let search_sources = app_handle.state::<SearchSourceRegistry>();

    let sources_future = search_sources.get_sources(); // Don't await yet
    let mut futures = FuturesUnordered::new();
    let mut sources = HashMap::new();

    let sources_list = sources_future.await; // Now we await

    for query_source in sources_list {
        let query_source_type = query_source.get_type().clone();
        sources.insert(query_source_type.id.clone(), query_source_type);

        let query = SearchQuery::new(from, size, query_strings.clone());
        let query_source_clone = query_source.clone(); // Clone Arc to avoid ownership issues

        futures.push(tokio::spawn(async move {
            query_source_clone.search(query).await
        }));
    }

    let mut docs_collector = crate::server::search::DocumentsSizedCollector::new(size);
    let mut total_hits = 0;
    let mut failed_requests = Vec::new();

    while let Some(result) = futures.next().await {
        match result {
            Ok(Ok(response)) => {
                total_hits += response.total_hits;
                for (doc, score) in response.hits {
                    // dbg!("Found hit:", &doc.title, &score);
                    docs_collector.push(response.source.id.clone(), doc, score);
                }
            }
            Ok(Err(err)) => {
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
            Err(_) => {
                failed_requests.push(FailedRequest {
                    source: QuerySource {
                        r#type: "N/A".into(),
                        name: "N/A".into(),
                        id: "N/A".into(),
                    },
                    status: 0,
                    error: Some("Task panicked".to_string()),
                    reason: None,
                });
            }
        }
    }

    let all_hits = docs_collector.documents_with_sources(&sources);

    // dbg!(&all_hits);

    Ok(MultiSourceQueryResponse {
        failed: failed_requests,
        hits: all_hits,
        total_hits,
    })
}