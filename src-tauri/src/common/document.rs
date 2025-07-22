use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use tauri::AppHandle;
use tauri::Runtime;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RichLabel {
    pub label: Option<String>,
    pub key: Option<String>,
    pub icon: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DataSourceReference {
    pub r#type: Option<String>,
    pub name: Option<String>,
    pub id: Option<String>,
    pub icon: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UserInfo {
    pub avatar: Option<String>,
    pub username: Option<String>,
    pub userid: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EditorInfo {
    pub user: UserInfo,
    pub timestamp: Option<String>,
}

/// Defines the action that would be performed when a document gets opened.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub(crate) enum OnOpened {
    /// Launch the application
    Application { app_path: String },
    /// Open the URL.
    Document { url: String },
    /// Spawn a child process to run the `CommandAction`.
    Command {
        action: crate::extension::CommandAction,
    },
}

impl OnOpened {
    pub(crate) fn url(&self) -> String {
        match self {
            Self::Application { app_path } => app_path.clone(),
            Self::Document { url } => url.clone(),
            Self::Command { action } => {
                const WHITESPACE: &str = " ";
                let mut ret = action.exec.clone();
                ret.push_str(WHITESPACE);
                if let Some(ref args) = action.args {
                    ret.push_str(args.join(WHITESPACE).as_str());
                }

                ret
            }
        }
    }
}

#[tauri::command]
pub(crate) async fn open<R: Runtime>(
    tauri_app_handle: AppHandle<R>,
    on_opened: OnOpened,
) -> Result<(), String> {
    log::debug!("open({})", on_opened.url());

    use crate::util::open as homemade_tauri_shell_open;
    use std::process::Command;

    match on_opened {
        OnOpened::Application { app_path } => {
            homemade_tauri_shell_open(tauri_app_handle.clone(), app_path).await?
        }
        OnOpened::Document { url } => {
            homemade_tauri_shell_open(tauri_app_handle.clone(), url).await?
        }
        OnOpened::Command { action } => {
            let mut cmd = Command::new(action.exec);
            if let Some(args) = action.args {
                cmd.args(args);
            }
            let output = cmd.output().map_err(|e| e.to_string())?;
            // Sometimes, we wanna see the result in logs even though it doesn't fail.
            log::debug!(
                "executing open(Command) result, exit code: [{}], stdout: [{}], stderr: [{}]",
                output.status,
                String::from_utf8_lossy(&output.stdout),
                String::from_utf8_lossy(&output.stderr)
            );
            if !output.status.success() {
                log::warn!(
                    "executing open(Command) failed, exit code: [{}], stdout: [{}], stderr: [{}]",
                    output.status,
                    String::from_utf8_lossy(&output.stdout),
                    String::from_utf8_lossy(&output.stderr)
                );

                return Err(format!(
                    "Command failed, stderr [{}]",
                    String::from_utf8_lossy(&output.stderr)
                ));
            }
        }
    }

    Ok(())
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct Document {
    pub id: String,
    pub created: Option<String>,
    pub updated: Option<String>,
    pub source: Option<DataSourceReference>,
    pub r#type: Option<String>,
    pub category: Option<String>,
    pub subcategory: Option<String>,
    pub categories: Option<Vec<String>>,
    pub rich_categories: Option<Vec<RichLabel>>,
    pub title: Option<String>,
    pub summary: Option<String>,
    pub lang: Option<String>,
    pub content: Option<String>,
    pub icon: Option<String>,
    pub thumbnail: Option<String>,
    pub cover: Option<String>,
    pub tags: Option<Vec<String>>,
    /// What will happen if we open this document.
    pub on_opened: Option<OnOpened>,
    pub url: Option<String>,
    pub size: Option<i64>,
    pub metadata: Option<HashMap<String, serde_json::Value>>,
    pub payload: Option<HashMap<String, serde_json::Value>>,
    pub owner: Option<UserInfo>,
    pub last_updated_by: Option<EditorInfo>,
}
