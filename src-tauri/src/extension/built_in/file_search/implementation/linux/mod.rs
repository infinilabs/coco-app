mod gnome;
mod kde;

use super::super::config::FileSearchConfig;
use crate::common::document::Document;
use crate::util::LinuxDesktopEnvironment;
use crate::util::get_linux_desktop_environment;

/// Dispatch to implementations powered by different backends.
pub(crate) async fn hits(
    query_string: &str,
    from: usize,
    size: usize,
    config: &FileSearchConfig,
) -> Result<Vec<(Document, f64)>, String> {
    let de = get_linux_desktop_environment();
    match de {
        Some(LinuxDesktopEnvironment::Gnome) => gnome::hits(query_string, from, size, config).await,
        Some(LinuxDesktopEnvironment::Kde) => kde::hits(query_string, from, size, config).await,
        Some(LinuxDesktopEnvironment::Unsupported {
            xdg_current_desktop: _,
        }) => {
            return Err("file search is not supported on this desktop environment".into());
        }
        None => {
            return Err("could not determine Linux desktop environment".into());
        }
    }
}
