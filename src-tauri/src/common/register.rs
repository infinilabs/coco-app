use crate::common::traits::SearchSource;
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::RwLock;

// Define a shared registry for search sources
#[derive(Default)]
pub struct SearchSourceRegistry {
    sources: RwLock<HashMap<String, Arc<dyn SearchSource>>>, // Store trait objects
}

impl SearchSourceRegistry {
    pub async fn register_source<T: SearchSource + 'static>(&self, source: T) {
        let mut sources = self.sources.write().await;
        let source_id = source.get_type().id.clone();
        sources.insert(source_id, Arc::new(source));
    }

    #[allow(dead_code)]
    pub async fn clear(&self) {
        let mut sources = self.sources.write().await;
        sources.clear();
    }

    pub async fn remove_source(&self, id: &str) {
        let mut sources = self.sources.write().await;
        sources.remove(id);
    }

    #[allow(dead_code)]
    pub async fn get_source(&self, id: &str) -> Option<Arc<dyn SearchSource>> {
        let sources = self.sources.read().await;
        sources.get(id).cloned()
    }
    pub async fn get_sources(&self) -> Vec<Arc<dyn SearchSource>> {
        let sources = self.sources.read().await;
        sources.values().cloned().collect() // Returns Vec<Arc<dyn SearchSource>>
    }
}
