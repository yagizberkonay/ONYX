# Tauri dialog implementation reference

Official sources consulted:

- https://v2.tauri.app/plugin/dialog/
- https://v2.tauri.app/reference/javascript/dialog/

Relevant implementation facts from the official Tauri v2 documentation:

- Install the plugin with the project package manager and `cargo add tauri-plugin-dialog`.
- The JavaScript API is imported from `@tauri-apps/plugin-dialog`.
- `open({ directory: true, multiple: false, title })` opens a native directory selector and returns a selected path or null.
- The default dialog permission enables the dialog plugin commands; Onyx adds `dialog:default` to its desktop capability manifest.
- The dialog plugin supports Windows, Linux and macOS directory selection. Android and iOS do not support the folder picker.
- The plugin requires Rust 1.77.2 or newer, which matches the Onyx toolchain.
