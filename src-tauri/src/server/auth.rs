use std::fmt::format;
use reqwest::StatusCode;
use tauri::{AppHandle, Runtime};
use crate::common::auth::RequestAccessTokenResponse;
use crate::common::server::{Server, ServerAccessToken};
use crate::server::profile::get_user_profiles;
use crate::server::servers::{get_server_by_id, load_or_insert_default_server, persist_servers, save_access_token, save_server};
use crate::util;

fn request_access_token_url(endpoint: &str,request_id :&str) -> String {
    format!("{endpoint}/auth/request_access_token?request_id={request_id}")
}


#[tauri::command]
pub async fn handle_sso_callback<R: Runtime>(
    app_handle: AppHandle<R>,
    server_id: String, // Rename field
    request_id: String, // Rename field
    code: String,
) -> Result<(), String> {

    let server=get_server_by_id(server_id.as_str());

    if let Some(s)=server{
        let url=request_access_token_url(&s.endpoint,&request_id);
        let response = util::http::HTTP_CLIENT
            .get(url.clone())
                        .header("X-API-TOKEN", code.clone())
            .send()
            .await
            .expect("Failed to send request to the server");

        if response.status() == StatusCode::OK {
            if let Some(content_length) = response.content_length() {
                if content_length > 0 {
                    let token_result: Result<RequestAccessTokenResponse, _> = response.json().await;
                    match token_result {
                        Ok(token) => {

                            //save the server's token,
                            let access_token=ServerAccessToken::new(server_id.clone(),token.access_token.clone(),token.expire_at);
                            dbg!(&server_id,&request_id,&code,&token);
                            save_access_token(server_id.clone(), access_token);

                            // update server's user profile
                            let profile =get_user_profiles(app_handle.clone(),server_id.clone()).await;
                            dbg!(&profile);
                            match profile {
                                Ok(p) => {
                                    let mut s = s.clone();
                                    s.profile = Some(p);
                                    s.available = true;
                                    save_server(&s);
                                    persist_servers(&app_handle)?;
                                }
                                Err(e) => {
                                    return Err(format!("Failed to get user profile: {}", e));
                                }
                            }

                            Ok(())
                        }
                        Err(e) => {
                            Err(format!("Failed to deserialize the response: {}", e))
                        }
                    }
                } else {
                    Err("Received empty response body.".to_string())
                }
            } else {
                Err("Could not determine the content length.".to_string())
            }
        } else {
            Err(format!("Request failed with status: {}, {}, {:?}",url,code, response))
        }
    } else {
        Err(format!("Server not found: {}, {}, {}", server_id, request_id, code))
    }
}