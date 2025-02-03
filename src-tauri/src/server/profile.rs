use std::collections::HashMap;
use futures::stream::FuturesUnordered;
use futures::StreamExt;
use reqwest::StatusCode;
use tauri::{AppHandle, Runtime};
use serde_json::Map as JsonMap;
use serde_json::Value as Json;
use crate::common::profile::UserProfile;
use crate::server::servers::{get_server_by_id, get_server_token};
use crate::util;

fn profile_url(endpoint: &str) -> String {
    format!("{endpoint}/account/profile")
}


#[tauri::command]
pub async fn get_user_profiles<R: Runtime>(
    app_handle: AppHandle<R>,
    server_id : String,
) -> Result<UserProfile, String> {

    let server=get_server_by_id(server_id.as_str());
    if let Some(s)=server{

        let token = get_server_token(server_id.as_str());

        if let Some(t)=token{
            let response = util::http::HTTP_CLIENT
                .get(profile_url(&s.endpoint))
                .header("X-API-TOKEN", t.access_token.clone())
                .send()
                .await
                .expect("Failed to send request to the server");

            if response.status() == StatusCode::OK {
                if let Some(content_length) = response.content_length() {
                    if content_length > 0 {
                        let profile: UserProfile = response.json().await.expect("invalid response");
                        return Ok(profile);
                    }
                }
            }
        }
    }

    //     let response = util::http::HTTP_CLIENT
    //         .get(profile_url(&s.endpoint))
    //         .header("X-API-TOKEN", code.clone())
    //         .send()
    //         .await
    //         .expect("Failed to send request to the server");
    //
    //     if response.status() == StatusCode::OK {
    //         if let Some(content_length) = response.content_length() {
    //             if content_length > 0 {
    //                 let token_result: Result<RequestAccessTokenResponse, _> = response.json().await;
    //                 match token_result {
    //                     Ok(token) => {
    //
    //                         //save the server's token,
    //                         let access_token=ServerAccessToken::new(server_id.clone(),token.access_token.clone(),token.expire_at);
    //                         dbg!(&server_id,&request_id,&code,&token);
    //                         save_access_token(server_id, access_token);
    //
    //                         // update server's user profile
    // }


    // let coco_server_endpoints = _list_coco_server_endpoints(&app_handle).await?;
    // let tokens = get_coco_server_tokens(&app_handle);
    //
    // let mut futures = FuturesUnordered::new();
    // for coco_server_endpoint in coco_server_endpoints {
    //     if let Some(token) = get_coco_server_token(&tokens, &coco_server_endpoint) {
    //         let request_future = HTTP_CLIENT
    //             .get(profile_url(&coco_server_endpoint))
    //             .header("X-API-TOKEN", token)
    //             .send();
    //         futures
    //             .push(request_future.map(|request_result| (coco_server_endpoint, request_result)));
    //     }
    // }
    //
    // let mut profiles = HashMap::new();
    //
    // while let Some((endpoint, res_response)) = futures.next().await {
    //     match res_response {
    //         Ok(response) => {
    //             let profile: Json = response.json().await.expect("invalid response");
    //             assert!(profiles.insert(endpoint, profile).is_none());
    //         }
    //         Err(_) => { /* do nothing */ }
    //     };
    // }

    // Ok(profiles)

    // Ok()
    Err("Server or profile was not found".to_string())
}
