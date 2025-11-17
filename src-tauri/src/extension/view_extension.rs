//! View extension-related stuff

use actix_files::Files;
use actix_web::{App, HttpServer, dev::ServerHandle};
use std::path::Path;
use tokio::sync::Mutex;

static FILE_SERVER_HANDLE: Mutex<Option<ServerHandle>> = Mutex::const_new(None);

/// Start a static HTTP file server serving the directory specified by `path`.
/// Return the URL of the server.
pub(crate) async fn serve_files_in(path: &Path) -> String {
    const ADDR: &str = "127.0.0.1";

    let mut guard = FILE_SERVER_HANDLE.lock().await;
    if let Some(prev_server_handle) = guard.take() {
        prev_server_handle.stop(true).await;
    }

    let path = path.to_path_buf();
    let http_server =
        HttpServer::new(move || App::new().service(Files::new("/", &path).show_files_listing()))
            // Set port to 0 and let OS assign a port to us
            .bind((ADDR, 0))
            .unwrap();

    let assigned_port = http_server.addrs()[0].port();

    let server = http_server.disable_signals().workers(1).run();

    let new_handle = server.handle();

    tokio::spawn(server);

    *guard = Some(new_handle);

    format!("http://{}:{}", ADDR, assigned_port)
}
