
#[derive(Debug, Clone, PartialEq, Copy)]
pub(crate) enum FileType {
    Folder,
    JPEGImage,
    PNGImage,
    PDFDocument,
    PlainTextDocument,
    MicrosoftWordDocument,
    MicrosoftExcelSpreadsheet,
    AudioFile,
    VideoFile,
    CHeaderFile,
    TOMLDocument,
    RustScript,
    CSourceCode,
    MarkdownDocument,
    TerminalSettings,
    ZipArchive,
    Dmg,
    Html,
    Json,
    Xml,
    Yaml,
    Css,
    Vue,
    React,
    Sql,
    Csv,
    Javascript,
    Typescript,
    Python,
    Java,
    Golang,
    Ruby,
    Php,
    Sass,
    Sketch,
    AdobeAi,
    AdobePsd,
    AdobePr,
    AdobeAu,
    AdobeAe,
    AdobeLr,
    AdobeXd,
    AdobeFl,
    AdobeId,
    Svg,
    Epub,
    Unknown,
}


async fn get_file_type(path: &str) -> FileType {
    let path = camino::Utf8Path::new(path);

    // stat() is more precise than file extension, use it if possible.
    if path.is_dir() {
        return FileType::Folder;
    }

    let Some(ext) = path.extension() else {
        return FileType::Unknown;
    };

    let ext = ext.to_lowercase();
    match ext.as_str() {
        "pdf" => FileType::PDFDocument,
        "txt" | "text" => FileType::PlainTextDocument,
        "doc" | "docx" => FileType::MicrosoftWordDocument,
        "xls" | "xlsx" => FileType::MicrosoftExcelSpreadsheet,
        "jpg" | "jpeg" => FileType::JPEGImage,
        "png" => FileType::PNGImage,
        "mp3" | "wav" | "flac" | "aac" | "ogg" | "m4a" => FileType::AudioFile,
        "mp4" | "avi" | "mov" | "mkv" | "wmv" | "flv" | "webm" => FileType::VideoFile,
        "h" | "hpp" => FileType::CHeaderFile,
        "c" | "cpp" | "cc" | "cxx" => FileType::CSourceCode,
        "toml" => FileType::TOMLDocument,
        "rs" => FileType::RustScript,
        "md" | "markdown" => FileType::MarkdownDocument,
        "terminal" => FileType::TerminalSettings,
        "zip" | "rar" | "7z" | "tar" | "gz" | "bz2" => FileType::ZipArchive,
        "dmg" => FileType::Dmg,
        "html" | "htm" => FileType::Html,
        "json" => FileType::Json,
        "xml" => FileType::Xml,
        "yaml" | "yml" => FileType::Yaml,
        "css" => FileType::Css,
        "vue" => FileType::Vue,
        "jsx" | "tsx" => FileType::React,
        "sql" => FileType::Sql,
        "csv" => FileType::Csv,
        "js" | "mjs" => FileType::Javascript,
        "ts" => FileType::Typescript,
        "py" | "pyw" => FileType::Python,
        "java" => FileType::Java,
        "go" => FileType::Golang,
        "rb" => FileType::Ruby,
        "php" => FileType::Php,
        "sass" | "scss" => FileType::Sass,
        "sketch" => FileType::Sketch,
        "ai" => FileType::AdobeAi,
        "psd" => FileType::AdobePsd,
        "prproj" => FileType::AdobePr,
        "aup" | "aup3" => FileType::AdobeAu,
        "aep" => FileType::AdobeAe,
        "lrcat" => FileType::AdobeLr,
        "xd" => FileType::AdobeXd,
        "fla" => FileType::AdobeFl,
        "indd" => FileType::AdobeId,
        "svg" => FileType::Svg,
        "epub" => FileType::Epub,
        _ => FileType::Unknown,
    }
}


fn type_to_icon(ty: FileType) -> &'static str {
    match ty {
        FileType::Folder => "font_file_folder",
        FileType::JPEGImage => "font_file_image",
        FileType::PNGImage => "font_file_image",
        FileType::PDFDocument => "font_file_document_pdf",
        FileType::PlainTextDocument => "font_file_txt",
        FileType::MicrosoftWordDocument => "font_file_document_word",
        FileType::MicrosoftExcelSpreadsheet => "font_file_spreadsheet_excel",
        FileType::AudioFile => "font_file_audio",
        FileType::VideoFile => "font_file_video",
        FileType::CHeaderFile => "font_file_csource",
        FileType::TOMLDocument => "font_file_toml",
        FileType::RustScript => "font_file_rustscript1",
        FileType::CSourceCode => "font_file_csource",
        FileType::MarkdownDocument => "font_file_markdown",
        FileType::TerminalSettings => "font_file_terminal1",
        FileType::ZipArchive => "font_file_zip",
        FileType::Dmg => "font_file_dmg",
        FileType::Html => "font_file_html",
        FileType::Json => "font_file_json",
        FileType::Xml => "font_file_xml",
        FileType::Yaml => "font_file_yaml",
        FileType::Css => "font_file_css",
        FileType::Vue => "font_file_vue",
        FileType::React => "font_file_react",
        FileType::Sql => "font_file_sql",
        FileType::Csv => "font_file_csv",
        FileType::Javascript => "font_file_javascript",
        FileType::Typescript => "font_file_typescript",
        FileType::Python => "font_file_python",
        FileType::Java => "font_file_java",
        FileType::Golang => "font_file_golang",
        FileType::Ruby => "font_file_ruby",
        FileType::Php => "font_file_php",
        FileType::Sass => "font_file_sass",
        FileType::Sketch => "font_file_sketch",
        FileType::AdobeAi => "font_file_adobe_ai",
        FileType::AdobePsd => "font_file_adobe_psd",
        FileType::AdobePr => "font_file_adobe_pr",
        FileType::AdobeAu => "font_file_adobe_au",
        FileType::AdobeAe => "font_file_adobe_ae",
        FileType::AdobeLr => "font_file_adobe_lr",
        FileType::AdobeXd => "font_file_adobe_xd",
        FileType::AdobeFl => "font_file_adobe_fl",
        FileType::AdobeId => "font_file_adobe_id",
        FileType::Svg => "font_file_svg",
        FileType::Epub => "font_file_epub",
        FileType::Unknown => "font_file_unknown",
    }
}


#[tauri::command]
pub(crate) async fn get_file_icon(path: String) -> &'static str {
    let ty = get_file_type(path.as_str()).await;
    type_to_icon(ty)
}