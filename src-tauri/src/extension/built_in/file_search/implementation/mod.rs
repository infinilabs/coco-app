#[cfg(target_os = "macos")]
mod macos;
#[cfg(target_os = "windows")]
mod windows;

// `hits()` function is platform-specific, export the corresponding impl.
#[cfg(target_os = "macos")]
pub(crate) use macos::hits;
#[cfg(target_os = "windows")]
pub(crate) use windows::hits;
