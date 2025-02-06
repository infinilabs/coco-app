use crate::common::search::{FailedRequest, MultiSourceQueryResponse, QueryHits, QueryResponse, QuerySource, SearchQuery};
use crate::common::traits::{SearchError, SearchSource};
use crate::server::search::CocoSearchSource;
use crate::server::servers::{get_servers_as_hashmap, COCO_SERVERS};
use futures::stream::FuturesUnordered;
use futures::StreamExt;
use reqwest::Client;
use std::collections::HashMap;
use tauri::{AppHandle, Runtime};

#[tauri::command]
pub async fn query_coco_fusion<R: Runtime>(
    app_handle: AppHandle<R>,
    from: u64,
    size: u64,
    query_strings: HashMap<String, String>,
) -> Result<MultiSourceQueryResponse, String> {

    // println!(
    //     "DBG: query_coco_fusion, from: {} size: {} query_strings {:?}",
    //     query.from, query.size, query.query_strings
    // );

    // Get the servers as a hashmap (you need to make sure this function returns a HashMap of Server objects)
    let coco_servers = get_servers_as_hashmap();

    let mut futures = FuturesUnordered::new();
    let mut sources=HashMap::new();

    // Loop through each CocoSearchSource server and spawn async search tasks
    for (_, server) in &coco_servers {
        sources.insert(server.id.clone(), QuerySource {
            r#type: Some(COCO_SERVERS.into()),
            name: Some(server.name.clone()),
            id: Some(server.id.clone()),
        });
        let query = SearchQuery::new(from, size, query_strings.clone());

        // Instantiate CocoSearchSource for each server
        let coco_search_source = CocoSearchSource::new(server.clone(), Client::new());

        // Push the search operation into the futures set
        futures.push(async move {
            // Perform the search operation for each server using its `search` method
            let result = coco_search_source.search(query.clone()).await;

            match result {
                Ok(response) => {
                    let total_hits = response.total_hits;
                    let hits = response.hits;

                    // Return a success response for this server
                    Ok(QueryResponse {
                        source: QuerySource {
                            r#type: Some(server.name.clone()),
                            name: Some(server.name.clone()),
                            id: Some(server.id.clone()),
                        },
                        hits,
                        total_hits,
                    })
                }
                Err(_) => {
                    // Handle any failure that occurs during the search
                    Err(SearchError::HttpError("Failed to query server".into()))
                }
            }
        });
    }

    // Collect all results or errors from the futures
    let mut docs_collector = crate::server::search::DocumentsSizedCollector::new(size);

    let mut total_hits = 0;
    let mut failed_requests = Vec::new();

    while let Some(result) = futures.next().await {
        match result {
            Ok(response) => {
                total_hits += response.total_hits;
                for (doc, score) in response.hits {
                    docs_collector.push(response.source.id.clone(), doc, score);
                }
            }
            Err(err) => {
                failed_requests.push(FailedRequest {
                    source: QuerySource {
                        r#type: Some("N/A".into()),
                        name: Some("N/A".into()),
                        id: None,
                    },
                    status: 0,
                    error: Some(err.to_string()),
                    reason: None,
                });
            }
        }
    }

    let all_hits = docs_collector.documents_with_sources(&sources);
    Ok(MultiSourceQueryResponse {
        failed: failed_requests,
        hits: all_hits,
        total_hits,
    })
}

// #[tauri::command]
// pub async fn query_coco_servers<R: Runtime>(
//     app_handle: AppHandle<R>,
//     from: u64,
//     size: u64,
//     query_strings: HashMap<String, String>,
// ) -> Result<QueryResponse, ()> {
//     println!(
//         "DBG: query_coco_servers, from: {} size: {} query_strings {:?}",
//         from, size, query_strings
//     );
//
//     let coco_servers = get_servers_as_hashmap();
//     let mut futures = FuturesUnordered::new();
//     let size_for_each_request = (from + size).to_string();
//
//     for (_, server) in &coco_servers {
//         let url = HttpClient::join_url(&server.endpoint, "/query/_search");
//         let client = HTTP_CLIENT.lock().await; // Acquire the lock on HTTP_CLIENT
//         let mut request_builder = client.request(Method::GET, url);
//
//         if !server.public {
//             if let Some(token) = get_server_token(&server.id).map(|t| t.access_token) {
//                 request_builder = request_builder.header("X-API-TOKEN", token);
//             }
//         }
//         let query_strings_cloned = query_strings.clone(); // Clone for each iteration
//
//         let from = from.to_string();
//         let size = size_for_each_request.clone();
//         let future = async move {
//             let response = request_builder
//                 .query(&[("from", from.as_str()), ("size", size.as_str())])
//                 .query(&query_strings_cloned) // Use cloned instance
//                 .send()
//                 .await;
//             (server.id.clone(), response)
//         };
//
//         futures.push(future);
//     }
//
//     let mut total_hits = 0;
//     let mut failed_requests:Vec<FailedRequest> = Vec::new();
//     let mut docs_collector = crate::server::search::DocumentsSizedCollector::new(size);
//
//     // Helper function to create failed request
//     fn create_failed_request(server_id: &str, coco_servers: &HashMap<String,Server>, error: &str, status: u16) -> FailedRequest {
//         FailedRequest {
//             source: QuerySource {
//                 r#type: Some(crate::server::search::COCO_SERVERS.into()),
//                 name: Some(coco_servers.get(server_id).map(|s| s.name.clone()).unwrap_or_default()),
//                 id: Some(server_id.to_string()),
//             },
//             status,
//             error: Some(error.to_string()),
//             reason: None,
//         }
//     }
//
//     // Iterate over the stream of futures
//     while let Some((server_id, res_response)) = futures.next().await {
//         match res_response {
//             Ok(response) => {
//                 let status_code = response.status().as_u16();
//
//                 // Check if the status code indicates a successful request (2xx)
//                 if status_code >= 200 && status_code < 400 {
//                     // Parse the response only if the status code is success
//                     match parse_search_results_with_score(response).await {
//                         Ok(documents) => {
//                             total_hits += documents.len();  // No need for `&` here, as `len` is `usize`
//                             for (doc, score) in documents {
//                                 let score = score.unwrap_or(0.0) as f64;
//                                 docs_collector.push(server_id.clone(), doc, score);
//                             }
//                         }
//                         Err(err) => {
//                             failed_requests.push(create_failed_request(
//                                 &server_id, &coco_servers, &err.to_string(), status_code,
//                             ));
//                         }
//                     }
//                 } else {
//                     // If status code is not successful, log the failure
//                     failed_requests.push(create_failed_request(
//                         &server_id, &coco_servers, "Unsuccessful response", status_code,
//                     ));
//                 }
//             }
//             Err(err) => {
//                 // Handle the error from the future itself
//                 failed_requests.push(create_failed_request(
//                     &server_id, &coco_servers, &err.to_string(), 0,
//                 ));
//             }
//         }
//     }
//
//     let docs = docs_collector.documents_by_server_id(&coco_servers);
//
//     // dbg!(&total_hits);
//     // dbg!(&failed_requests);
//     // dbg!(&docs);
//
//     let query_response = QueryResponse {
//         failed: failed_requests,
//         hits: docs,
//         total_hits,
//     };
//
//     //print to json
//     // println!("{}", serde_json::to_string_pretty(&query_response).unwrap());
//
//     Ok(query_response)
// }
