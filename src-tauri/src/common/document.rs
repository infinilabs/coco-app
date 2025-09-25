#[cfg(target_os = "macos")]
use crate::extension::built_in::window_management::actions::Action;
use crate::extension::{ExtensionPermission, ExtensionSettings};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use tauri::{AppHandle, Emitter};

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

/// Defines the action that would be performed when a [document](Document) gets opened.
///
/// "Document" is a uniform type that the backend uses to send the search results
/// back to the frontend.  Since Coco can search many sources, "Document" can
/// represent different things, application, web page, local file, extensions, and
/// so on.  Each has its own specific open action.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub(crate) enum OnOpened {
    /// Launch the application
    Application { app_path: String },
    /// Open the URL.
    Document { url: String },
    /// Perform this WM action.
    #[cfg(target_os = "macos")]
    WindowManagementAction { action: Action },
    /// The document is an extension.
    Extension(ExtensionOnOpened),
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub(crate) struct ExtensionOnOpened {
    /// Different types of extensions have different open behaviors.
    pub(crate) ty: ExtensionOnOpenedType,
    /// Extensions settings.  Some could affect open action.
    ///
    /// Optional because not all extensions have their settings.
    pub(crate) settings: Option<ExtensionSettings>,
    /// Permission needed by this extension.
    ///
    /// We do permission check when opening this permission. Currently, we only
    /// do this to View extensions.
    pub(crate) permission: Option<ExtensionPermission>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub(crate) enum ExtensionOnOpenedType {
    /// Spawn a child process to run the `CommandAction`.
    Command {
        action: crate::extension::CommandAction,
    },
    /// Open the `link`.
    //
    // NOTE that this variant has the same definition as `struct Quicklink`, but we
    // cannot use it directly, its `link` field should be deserialized/serialized
    // from/to a string, but we need a JSON object here.
    //
    // See also the comments in `struct Quicklink`.
    Quicklink {
        link: crate::extension::QuicklinkLink,
        open_with: Option<String>,
    },
    View {
        /// Path to the HTML file that coco will load and render.
        ///
        /// It should be an absolute path or Tauri cannot open it.
        page: String,
    },
}

impl OnOpened {
    pub(crate) fn url(&self) -> String {
        match self {
            Self::Application { app_path } => app_path.clone(),
            Self::Document { url } => url.clone(),
            #[cfg(target_os = "macos")]
            Self::WindowManagementAction { action: _ } => {
                // We don't have URL for this
                String::from("N/A")
            }
            Self::Extension(ext_on_opened) => {
                match &ext_on_opened.ty {
                    ExtensionOnOpenedType::Command { action } => {
                        const WHITESPACE: &str = " ";
                        let mut ret = action.exec.clone();
                        ret.push_str(WHITESPACE);
                        if let Some(ref args) = action.args {
                            ret.push_str(args.join(WHITESPACE).as_str());
                        }

                        ret
                    }
                    // Currently, our URL is static and does not support dynamic parameters.
                    // The URL of a quicklink is nearly useless without such dynamic user
                    // inputs, so until we have dynamic URL support, we just use "N/A".
                    ExtensionOnOpenedType::Quicklink { .. } => String::from("N/A"),
                    ExtensionOnOpenedType::View { page: _ } => {
                        // We currently don't have URL for this kind of extension.
                        String::from("N/A")
                    }
                }
            }
        }
    }
}

#[tauri::command]
pub(crate) async fn open(
    tauri_app_handle: AppHandle,
    on_opened: OnOpened,
    extra_args: Option<HashMap<String, String>>,
) -> Result<(), String> {
    use crate::util::open as homemade_tauri_shell_open;
    use std::process::Command;

    match on_opened {
        OnOpened::Application { app_path } => {
            log::debug!("open application [{}]", app_path);

            homemade_tauri_shell_open(tauri_app_handle.clone(), app_path).await?
        }
        OnOpened::Document { url } => {
            log::debug!("open document [{}]", url);

            homemade_tauri_shell_open(tauri_app_handle.clone(), url).await?
        }
        #[cfg(target_os = "macos")]
        OnOpened::WindowManagementAction { action } => {
            log::debug!("perform Window Management action [{:?}]", action);

            crate::extension::built_in::window_management::perform_action_on_main_thread(
                &tauri_app_handle,
                action,
            )?;
        }
        OnOpened::Extension(ext_on_opened) => {
            // Apply the settings that would affect open behavior
            if let Some(settings) = ext_on_opened.settings {
                if let Some(should_hide) = settings.hide_before_open {
                    if should_hide {
                        crate::hide_coco(tauri_app_handle.clone()).await;
                    }
                }
            }
            let permission = ext_on_opened.permission;

            match ext_on_opened.ty {
                ExtensionOnOpenedType::Command { action } => {
                    log::debug!("open (execute) command [{:?}]", action);

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
                ExtensionOnOpenedType::Quicklink {
                    link,
                    open_with: opt_open_with,
                } => {
                    let url = link.concatenate_url(&extra_args);

                    log::debug!("open quicklink [{}] with [{:?}]", url, opt_open_with);

                    cfg_if::cfg_if! {
                        // The `open_with` functionality is only supported on macOS, provided
                        // by the `open -a` command.
                        if #[cfg(target_os = "macos")] {
                            let mut cmd = Command::new("open");
                            if let Some(ref open_with) = opt_open_with {
                                cmd.arg("-a");
                                cmd.arg(open_with.as_str());
                            }
                            cmd.arg(&url);

                            let output = cmd.output().map_err(|e| format!("failed to spawn [open] due to error [{}]", e))?;

                            if !output.status.success() {
                              return Err(format!(
                                "failed to open with app {:?}: {}",
                                opt_open_with,
                                String::from_utf8_lossy(&output.stderr)
                              ));
                            }
                        } else {
                            homemade_tauri_shell_open(tauri_app_handle.clone(), url).await?
                        }
                    }
                }
                ExtensionOnOpenedType::View { page } => {
                    /*
                     * Emit an event to let the frontend code open this extension.
                     *
                     * Payload `page_and_permission` contains the information needed
                     * to do that.
                     *
                     * See "src/pages/main/index.tsx" for more info.
                     */
                    use serde_json::Value as Json;
                    use serde_json::to_value;

                    let page_and_permission: [Json; 2] =
                        [Json::String(page), to_value(permission).unwrap()];
                    tauri_app_handle
                        .emit("open_view_extension", page_and_permission)
                        .unwrap();
                }
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
