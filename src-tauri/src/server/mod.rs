//! This file contains Rust APIs related to Coco Server management.

use futures::FutureExt;
use futures::StreamExt;
use futures::TryFutureExt;
use reqwest::Client;
use serde::Serialize;
use std::sync::LazyLock;
use tauri::Runtime;
use tauri_plugin_store::StoreExt;

pub mod servers;
pub mod auth;
// pub mod health;
pub mod datasource;
pub mod connector;
pub mod search;
pub mod profile;
pub mod http_client;

