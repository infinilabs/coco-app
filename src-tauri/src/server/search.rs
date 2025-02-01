use std::collections::HashMap;
use futures::stream::FuturesUnordered;
use ordered_float::OrderedFloat;
use serde::Serialize;
use tauri::{AppHandle, Runtime};
use serde_json::Map as JsonMap;
use serde_json::Value as Json;
fn search_url(endpoint: &str) -> String {
    format!("{endpoint}/query/_search")
}


struct DocumentsSizedCollector {
    size: u64,
    /// Documents and socres
    ///
    /// Sorted by score, in descending order.
    docs: Vec<(JsonMap<String, Json>, OrderedFloat<f64>)>,
}

impl DocumentsSizedCollector {
    fn new(size: u64) -> Self {
        // there will be size + 1 documents in docs at max
        let docs = Vec::with_capacity((size + 1).try_into().expect("overflow"));

        Self { size, docs }
    }

    fn push(&mut self, item: JsonMap<String, Json>, score: f64) {
        let score = OrderedFloat(score);
        let insert_idx = match self.docs.binary_search_by(|(_doc, s)| score.cmp(s)) {
            Ok(idx) => idx,
            Err(idx) => idx,
        };

        self.docs.insert(insert_idx, (item, score));

        // cast usize to u64 is safe
        if self.docs.len() as u64 > self.size {
            self.docs.truncate(self.size.try_into().expect(
                "self.size < a number of type usize, it can be expressed using usize, we are safe",
            ));
        }
    }

    fn documents(self) -> impl ExactSizeIterator<Item = JsonMap<String, Json>> {
        self.docs.into_iter().map(|(doc, _score)| doc)
    }
}

#[derive(Debug, Serialize)]
pub struct QueryResponse {
    failed_coco_servers: Vec<String>,
    documents: Vec<JsonMap<String, Json>>,
    total_hits: u64,
}


fn get_name(provider_info: &JsonMap<String, Json>) -> &str {
    provider_info
        .get("name")
        .expect("provider info does not have a [name] field")
        .as_str()
        .expect("field [name] should be a string")
}

fn get_public(provider_info: &JsonMap<String, Json>) -> bool {
    provider_info
        .get("public")
        .expect("provider info does not have a [public] field")
        .as_bool()
        .expect("field [public] should be a string")
}


#[tauri::command]
pub async fn query_coco_servers<R: Runtime>(
    app_handle: AppHandle<R>,
    from: u64,
    size: u64,
    query_strings: HashMap<String, String>,
) -> Result<QueryResponse, ()> {
    println!(
        "DBG: query_coco_servers, from: {} size: {} query_strings {:?}",
        from, size, query_strings
    );

    // let coco_servers = _list_coco_servers(&app_handle).await?;
    // let tokens = get_coco_server_tokens(&app_handle);
    //
    // let mut futures = FuturesUnordered::new();
    //
    // let from_for_each_request = "0";
    // let size_for_each_request = from + size;
    // let size_for_each_request_str = size_for_each_request.to_string();
    // for server in coco_servers {
    //     let endpoint = get_endpoint(&server).to_string();
    //     let public = get_public(&server);
    //     let name = get_name(&server).to_string();
    //
    //     let mut request_builder = HTTP_CLIENT.get(search_url(&endpoint));
    //     if !public {
    //         let Some(token) = get_coco_server_token(&tokens, &endpoint) else {
    //             // skip non-public servers with no token
    //             continue;
    //         };
    //         request_builder = request_builder.header("X-API-TOKEN", token);
    //     }
    //     let future = request_builder
    //         .query(&[
    //             ("from", from_for_each_request),
    //             ("size", size_for_each_request_str.as_str()),
    //         ])
    //         .query(&query_strings)
    //         .send();
    //
    //     futures.push(future.map(|request_result| (name, request_result)));
    // }
    //
    // let mut total_hits = 0;
    // let mut failed_coco_servers = Vec::new();
    // let mut docs_collector = DocumentsSizedCollector::new(size_for_each_request);
    //
    // while let Some((name, res_response)) = futures.next().await {
    //     match res_response {
    //         Ok(response) => {
    //             let mut body: JsonMap<String, Json> =
    //                 response.json().await.expect("invalid response");
    //             let mut hits = match body
    //                 .remove("hits")
    //                 .expect("invalid response, field [hits] not found")
    //             {
    //                 Json::Object(map) => map,
    //                 _ => panic!("field [hits] is not an object"),
    //             };
    //             let hits_total_value = hits
    //                 .get("total")
    //                 .expect("invalid response, field [hits.total] not found")
    //                 .get("value")
    //                 .expect("invalid response, field [hits.total.value] not found")
    //                 .as_u64()
    //                 .expect("invalid response, field [hits.total.value] is not an integer");
    //             total_hits += hits_total_value;
    //
    //             let hits_hits = match hits
    //                 .remove("hits")
    //                 .expect("invalid response, field [hits.hits] not found")
    //             {
    //                 Json::Array(vec) => vec,
    //                 _ => panic!("invalid response, field [hits.hits] is not an array"),
    //             };
    //
    //             for hit in hits_hits {
    //                 let mut hit = match hit {
    //                     Json::Object(map) => map,
    //                     _ => panic!("invalid response, returned hit is not an object"),
    //                 };
    //
    //                 let score = hit
    //                     .get("_score")
    //                     .expect("invalid response, returned hit does not have a [_score] field")
    //                     .as_f64()
    //                     .expect("invalid response, field [_score] is not a floating number");
    //
    //                 let source = match hit
    //                     .remove("_source")
    //                     .expect("invalid response, returned hit does not have a [_source] field")
    //                 {
    //                     Json::Object(map) => map,
    //                     _ => panic!("invalid response, field [_source] is not an object"),
    //                 };
    //
    //                 docs_collector.push(source, score);
    //             }
    //         }
    //         Err(_) => failed_coco_servers.push(name),
    //     }
    // }
    //
    // let documents = docs_collector.documents().collect();
    //
    // Ok(QueryResponse {
    //     failed_coco_servers,
    //     total_hits,
    //     documents,
    // })

    Ok()
}



#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_docs_collector() {
        let mut collector = DocumentsSizedCollector::new(3);

        for i in 0..10 {
            collector.push(JsonMap::new(), i as f64);
        }

        assert_eq!(collector.docs.len(), 3);
        assert!(collector
            .docs
            .into_iter()
            .map(|(_doc, score)| score)
            .eq(vec![
                OrderedFloat(9.0),
                OrderedFloat(8.0),
                OrderedFloat(7.0)
            ]));
    }
}
