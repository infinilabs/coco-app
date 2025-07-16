fn main() {
    tauri_build::build();

    // If env var `GITHUB_ACTIONS` exists, we are running in CI, set up the `ci`
    // attribute
    if std::env::var("GITHUB_ACTIONS").is_ok() {
        println!("cargo:rustc-cfg=ci");
    }

    // Notify `rustc` of this `cfg` attribute to suppress unknown attribute warnings.
    // 
    // unexpected condition name: `ci`
    println!("cargo::rustc-check-cfg=cfg(ci)");
}
