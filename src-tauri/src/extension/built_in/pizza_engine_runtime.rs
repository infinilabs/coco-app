//! We use Pizza Engine to index applications and local files. The engine will be
//! run in the thread/runtime defined in this file.
//!
//! # Why such a thread/runtime is needed
//!
//! Generally, Tokio async runtime requires all the async tasks running on it to be
//! `Send` and `Sync`, but the async tasks created by Pizza Engine are not,
//! which forces us to create a dedicated thread/runtime to execute them.

use std::any::Any;
use std::collections::hash_map::Entry;
use std::collections::HashMap;
use std::sync::OnceLock;

pub(crate) trait SearchSourceState {
    #[cfg_attr(not(feature = "use_pizza_engine"), allow(unused))]
    fn as_mut_any(&mut self) -> &mut dyn Any;
}

#[async_trait::async_trait(?Send)]
pub(crate) trait Task: Send + Sync {
    fn search_source_id(&self) -> &'static str;

    async fn exec(&mut self, state: &mut Option<Box<dyn SearchSourceState>>);
}

pub(crate) static RUNTIME_TX: OnceLock<tokio::sync::mpsc::UnboundedSender<Box<dyn Task>>> =
    OnceLock::new();

pub(crate) fn start_pizza_engine_runtime() {
    std::thread::spawn(|| {
        let rt = tokio::runtime::Runtime::new().unwrap();

        let main = async {
            let mut states: HashMap<String, Option<Box<dyn SearchSourceState>>> = HashMap::new();

            let (tx, mut rx) = tokio::sync::mpsc::unbounded_channel();
            RUNTIME_TX.set(tx).unwrap();

            while let Some(mut task) = rx.recv().await {
                let opt_search_source_state = match states.entry(task.search_source_id().into()) {
                    Entry::Occupied(o) => o.into_mut(),
                    Entry::Vacant(v) => v.insert(None),
                };
                task.exec(opt_search_source_state).await;
            }
        };

        rt.block_on(main);
    });
}
