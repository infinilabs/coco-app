/// Helper function to get the system language.
///
/// We cannot return `enum Lang` here because Coco has limited language support
/// but the OS supports many more languages.
#[cfg(feature = "use_pizza_engine")]
pub(crate) fn get_system_lang() -> String {
    use sys_locale::get_locale;

    // fall back to English (general) when we cannot get the locale
    //
    // We replace '-' with '_' in applications-rs, to make the locales match,
    // we need to do this here as well.
    get_locale().unwrap_or("en".into()).replace('-', "_")
}
