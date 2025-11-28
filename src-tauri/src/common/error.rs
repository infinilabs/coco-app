use reqwest::StatusCode;
use serde::{Deserialize, Serializer};
use snafu::prelude::*;

use crate::server::http_client::HttpRequestError;

fn serialize_optional_status_code<S>(
    status_code: &Option<StatusCode>,
    serializer: S,
) -> Result<S::Ok, S::Error>
where
    S: Serializer,
{
    match status_code {
        Some(code) => serializer.serialize_str(&format!("{:?}", code)),
        None => serializer.serialize_none(),
    }
}

#[derive(Debug, Deserialize)]
pub struct ApiErrorCause {
    /// Only the top-level error contains this.
    #[serde(default)]
    pub root_cause: Option<Vec<ApiErrorCause>>,

    #[serde(default)]
    pub r#type: Option<String>,
    #[serde(default)]
    pub reason: Option<String>,

    /// Recursion, [error A] cause by [error B] caused by [error C]
    #[serde(default)]
    pub caused_by: Option<Box<ApiErrorCause>>,
}

#[derive(Debug, Deserialize)]
pub struct ApiError {
    #[serde(default)]
    pub error: Option<ApiErrorCause>,
    #[serde(default)]
    pub status: Option<u16>,
}

#[derive(Debug, Snafu)]
#[snafu(visibility(pub(crate)))]
pub enum SearchError {
    #[snafu(display("HTTP request error"))]
    HttpError { source: HttpRequestError },
    #[snafu(display("failed to decode query response"))]
    ResponseDecodeError { source: serde_json::Error },
    /// The search operation timed out.
    #[snafu(display("search operation timed out"))]
    SearchTimeout,
    #[snafu(display("an internal error occurred: '{}'", error))]
    InternalError { error: String },
}

impl serde::ser::Serialize for SearchError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        todo!("remove this")
    }
}

/// `ReportErrorStyle` controls the error reporting format.
pub(crate) enum ReportErrorStyle {
    /// Report it in one line of message. This is suitable when you write dump
    /// errors to logs.
    ///
    /// ```text
    /// 'failed to installed extension', caused by ['Json parsing error' 'I/O error: file not found']
    /// ```
    SingleLine,
    /// Allow it to span multiple lines.
    ///
    /// ```text
    /// failed to installed extension
    ///   Caused by:
    ///
    /// 0: Json parsing error
    /// 1: I/O error: file not found
    /// ```
    MultipleLines,
}

/// In Rust, a typical Display impl of an Error won't contain it source information[1],
/// so we need a reporter to report the full error message.
///
/// [1]: https://stackoverflow.com/q/62869360/14092446
pub(crate) fn report_error<E: std::error::Error>(e: E, style: ReportErrorStyle) -> String {
    use std::fmt::Write;

    match style {
        ReportErrorStyle::SingleLine => {
            let mut error_msg = format!("'{}'", e);
            if let Some(cause) = e.source() {
                error_msg.push_str(", caused by: [");

                for (i, e) in std::iter::successors(Some(cause), |e| e.source()).enumerate() {
                    if i != 0 {
                        error_msg.push(' ');
                    }
                    write!(&mut error_msg, "'{}'", e).expect("failed to write in-memory string");
                }
                error_msg.push(']');
            }

            error_msg
        }
        ReportErrorStyle::MultipleLines => snafu::Report::from_error(e).to_string(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use snafu::prelude::*;
    use std::io;

    #[derive(Debug, Snafu)]
    enum Error {
        #[snafu(display("I/O Error"))]
        Io { source: io::Error },
        #[snafu(display("Foo"))]
        Foo,
        #[snafu(display("Nested"))]
        Nested { source: ReadError },
    }

    #[derive(Debug, Snafu)]
    enum ReadError {
        #[snafu(display("failed to read config file"))]
        ReadConfig { source: io::Error },
    }

    #[test]
    fn test_report_error_single_line_one_caused_by() {
        let err = Error::Io {
            source: io::Error::new(io::ErrorKind::NotFound, "file Cargo.toml not found"),
        };

        let error_msg = report_error(err, ReportErrorStyle::SingleLine);
        assert_eq!(
            error_msg,
            "'I/O Error', caused by: ['file Cargo.toml not found']"
        );
    }

    #[test]
    fn test_report_error_single_line_multiple_caused_by() {
        let err = Error::Nested {
            source: ReadError::ReadConfig {
                source: io::Error::new(io::ErrorKind::NotFound, "not found"),
            },
        };

        let error_msg = report_error(err, ReportErrorStyle::SingleLine);
        assert_eq!(
            error_msg,
            "'Nested', caused by: ['failed to read config file' 'not found']"
        );
    }

    #[test]
    fn test_report_error_single_line_no_caused_by() {
        let err = Error::Foo;

        let error_msg = report_error(err, ReportErrorStyle::SingleLine);
        assert_eq!(error_msg, "'Foo'");
    }
}
