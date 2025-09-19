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

    // Bindgen searchapi.h on Windows as the windows create does not provide
    // bindings for it
    cfg_if::cfg_if! {
        if #[cfg(target_os = "windows")] {
            use std::env;
            use std::path::PathBuf;

            let wrapper_header = r#"#include <windows.h>
    #include <searchapi.h>"#;

            let searchapi_bindings = bindgen::Builder::default()
                .header_contents("wrapper.h", wrapper_header)
                .generate()
                .expect("failed to generate bindings for <searchapi.h>");

            let out_path = PathBuf::from(env::var("OUT_DIR").unwrap());
            searchapi_bindings
                .write_to_file(out_path.join("searchapi_bindings.rs"))
                .expect("couldn't write bindings to <OUT_DIR/searchapi_bindings.rs>")

            // Looks like there is no need to link the library that contains the
            // implementation of functions declared in 'searchapi.h' manually as
            // the FFI bindings work (without doing that).
            //
            // This is wield, I do not expect the linker will link it automatically.
        }
    }
}
