use std::sync::LazyLock;
use reqwest::Client;

pub static HTTP_CLIENT: LazyLock<Client> = LazyLock::new(|| Client::new());