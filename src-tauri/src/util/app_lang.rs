//! Configuration entry App language is persisted in the frontend code, but we
//! need to access it on the backend.
//!
//! So we duplicate it here **in the MEMORY** and expose a setter method to the
//! frontend so that the value can be updated and stay update-to-date.

use tokio::sync::RwLock;

#[derive(Debug, Clone, Copy, PartialEq)]
#[allow(non_camel_case_types)]
pub(crate) enum Lang {
    en_US,
    zh_CN,
}

impl std::fmt::Display for Lang {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Lang::en_US => write!(f, "en_US"),
            Lang::zh_CN => write!(f, "zh_CN"),
        }
    }
}

/// Frontend code uses "en" and "zh" to represent the Application language.
///
/// This impl is not meant to be used as a parser for locale strings such as
/// "en_US" or "zh_CN".
impl std::str::FromStr for Lang {
    type Err = String;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s {
            "en" => Ok(Lang::en_US),
            "zh" => Ok(Lang::zh_CN),
            _ => Err(format!("Invalid language: {}", s)),
        }
    }
}

/// Cache the language config in memory.
static APP_LANG: RwLock<Option<Lang>> = RwLock::const_new(None);

/// Update the in-memory cached `APP_LANG` config.
#[tauri::command]
pub(crate) async fn update_app_lang(lang: String) {
    let app_lang = lang.parse::<Lang>().unwrap_or_else(|e| {
        panic!(
            "invalid argument [{}], could not parse it to [struct Lang], parsing error [{}]",
            lang, e
        )
    });

    let mut write_guard = APP_LANG.write().await;
    *write_guard = Some(app_lang);
}

/// Helper getter method to handle the `None` case.
pub(crate) async fn get_app_lang() -> Lang {
    let opt_lang = *APP_LANG.read().await;
    opt_lang.expect(
        "frontend code did not invoke [backend_setup()] to set the APP_LANG",
    )
}
