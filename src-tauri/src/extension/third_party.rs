use super::Extension;
use crate::common::error::SearchError;
use crate::common::search::QueryResponse;
use crate::common::search::QuerySource;
use crate::common::search::SearchQuery;
use crate::common::traits::SearchSource;
use async_trait::async_trait;
use std::sync::Arc;
use std::sync::OnceLock;
use tokio::sync::RwLock;

/// All the third-party extensions will be registered as one search source.
///
/// Since some `#[tauri::command]`s need to access it, we store it in a global
/// static variable as well.
#[derive(Debug, Clone)]
pub(super) struct ThirdPartyExtensionsSearchSource {
    inner: Arc<RwLock<ThirdPartyExtensionsSearchSourceInner>>,
}

impl ThirdPartyExtensionsSearchSource {
    pub(super) fn new(extensions: Vec<Extension>) -> Self {
        Self {
            inner: ThirdPartyExtensionsSearchSourceInner { extensions },
        }
    }

    pub(super) fn enable_extension(extension_id: &str) {
        todo!()
    }

    pub(super) fn disable_extension(extension_id: &str) {
        todo!()
    }

    pub(super) fn set_extension_alias(extension_id: &str, alias: &str) {
        todo!()
    }

    pub(super) fn _extension_alias(extension_id: &str, alias: &str) {
        todo!()
    }
}

pub(super) static THIRD_PARTY_EXTENSIONS_SEARCH_SOURCE: OnceLock<ThirdPartyExtensionsSearchSource> =
    OnceLock::new();

#[derive(Debug)]
struct ThirdPartyExtensionsSearchSourceInner {
    extensions: Vec<Extension>,
}

#[async_trait]
impl SearchSource for ThirdPartyExtensionsSearchSource {
    fn get_type(&self) -> QuerySource {
        todo!()
    }

    async fn search(&self, query: SearchQuery) -> Result<QueryResponse, SearchError> {
        todo!()
    }
}
