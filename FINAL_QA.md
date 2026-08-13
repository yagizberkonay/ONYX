# Onyx Final QA Report

## Uygulanan özellikler

Bu güncellemede açılış akışına 460×260 px boyutlu, çerçevesiz, yeniden boyutlandırılamayan, ortalanmış ve taskbar’dan gizlenen splash penceresi eklendi. Splash asset’i `public/splash-screen.html` olarak bundle’a dahil edilir; Rust setup timer’ı 3 saniye sonra splash’i kapatıp `main` penceresini görünür ve odaklanmış hale getirir.

Bu sürümde yumuşak ve modern monochrome UI token’ları, onboarding welcome state, request tabs, `Ctrl/⌘+P` quick-open, aranabilir/collapsible JSON response tree, OpenAPI 3/Swagger 2/Postman v2 importu, collection test runner, `plain`/`secret` environment metadata’sı ve maskeli secret görünümü, native response timeline, ayrıca pre-request/post-response script sandbox’ı tamamlandı.

Rust native HTTP response modeli `timing.totalMs`, `timing.requestMs` ve `timing.downloadMs` alanlarını üretir. Script sandbox 50 KB sınırı uygular ve network, DOM, storage, dynamic import/eval ve process erişimlerini reddeder.

## Kalite kapıları

| Kapı | Sonuç |
|---|---|
| `pnpm lint` | Passed |
| `pnpm exec tsc --noEmit` | Passed |
| `pnpm build` | Passed |
| `cargo +stable fmt --manifest-path src-tauri/Cargo.toml -- --check` | Passed |
| `cargo +stable test --manifest-path src-tauri/Cargo.toml` | Passed — 6 tests |
| `cargo +stable check --manifest-path src-tauri/Cargo.toml` | Passed |
| `cargo +stable clippy --manifest-path src-tauri/Cargo.toml --all-targets --all-features -- -D warnings` | Passed |
| `pnpm tauri build` | Passed — 3 Linux bundles; splash/main window configuration validated |

## Paketler

- `src-tauri/target/release/bundle/deb/Onyx_0.1.0_amd64.deb`
- `src-tauri/target/release/bundle/rpm/Onyx-0.1.0-1.x86_64.rpm`
- `src-tauri/target/release/bundle/appimage/Onyx_0.1.0_amd64.AppImage`

## Not

Cargo lockfile, Rust 1.77.2 manifest minimum sürümünü korurken güncel stable toolchain ile doğrulandı. API key OS credential store’da tutulur; environment secret değerleri ise workspace JSON’a yazılabildiğinden hassas environment dosyalarının Git’ten `.gitignore` ile hariç tutulması gerekir.
