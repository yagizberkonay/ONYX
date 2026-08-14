# Onyx Final QA Report

## Uygulanan özellikler

Bu güncellemede açılış akışına 460×260 px boyutlu, çerçevesiz, yeniden boyutlandırılamayan, ortalanmış ve taskbar’dan gizlenen splash penceresi eklendi. Splash asset’i `public/splash-screen.html` olarak bundle’a dahil edilir; Rust setup timer’ı 3 saniye sonra splash’i kapatıp `main` penceresini görünür ve odaklanmış hale getirir.

Bu sürümde yumuşak ve modern monochrome UI token’ları, onboarding welcome state, request tabs, `Ctrl/⌘+P` quick-open, aranabilir/collapsible JSON response tree, OpenAPI 3/Swagger 2/Postman v2 importu, collection test runner, `plain`/`secret` environment metadata’sı ve maskeli secret görünümü, native response timeline, ayrıca pre-request/post-response script sandbox’ı tamamlandı.

Gelişmiş timeline görünümü üç teşhis kartı sunar: **Dispatch** içinde request aggregate ve varsa DNS/connect/TLS/wait aşamaları, **Transfer** içinde response download, **Payload** içinde toplam süre, body length, content type ve truncation durumu gösterilir. Proportional bar chart ve status tone’ları hızlı karşılaştırma sağlar; native backend ayrı DNS/connect/TLS ölçümü üretmediğinde arayüz bu değerleri uydurmaz ve aggregate olarak sunar. Kartlar anlamlı `aria-label` ve progressbar nitelikleri taşır.

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

## Uygulamaya özel etkileşim doğrulaması

Workspace’in browser varsayılan context menu davranışı `onContextMenu` katmanında engellendi. Input ve textarea üzerinde Copy, Cut, Paste ve Select all; diğer alanlarda Send request, Save request, Duplicate request, Copy as cURL ve New request aksiyonlarını sunan Onyx context menu doğrulandı.

Browser Notification API kullanılmadı. Başarı, uyarı ve hata durumları `aria-live` destekli, otomatik kapanan ve manuel dismiss edilebilen Onyx toast stack ile gösterilir. Toast katmanı Tauri WebView içindeki uygulama arayüzüne aittir; işletim sistemi veya browser notification izni gerektirmez.

Frontend ve native doğrulama sonuçları:

| Kontrol | Sonuç |
|---|---|
| `pnpm lint` | Passed |
| `pnpm exec tsc --noEmit` | Passed |
| `pnpm build` | Passed |
| Rust fmt/test/check/clippy | Passed — 6 tests |
| `pnpm tauri build` | Passed — 3 Linux bundles regenerated |
| Native runtime smoke test | Passed — production binary geçerli `smoke-notebook.onyx` yolu ile sanal ekranda 10 saniye crash olmadan çalıştı; beklenen timeout ile kapatıldı |

Sanal ekran smoke testindeki yalnızca DRI3 ve AT-SPI uyarıları test ortamının grafik/erişilebilirlik servislerine aittir; uygulama crash olmadı.

## UX modernization doğrulaması

Ana workspace, command center ve environment pill içeren daha taranabilir bir IDE shell’e geçirildi. Request tabs, welcome state, hızlı aksiyonlar, response surface ve editor yüzeyleri yumuşak monochrome kart diliyle düzenlendi. Settings modalı General, Editor, Notifications, Agent ve About kategorilerine ayrıldı; tema, density, sidebar genişliği, tab/workspace restoration, font size, tab size, word wrap, toast görünürlüğü, request completion, error alerts ve reduce-motion tercihleri eklendi. Status bar görünürlüğü ve editor font/wrap seçenekleri gerçek render davranışına bağlıdır.

`/splash` preview route’u ile `public/splash-screen.html` aynı premium kompozisyonu kullanır: centered O/ mark, subtle orbit, restrained graphite surface, progress line ve native workspace status. Browser preview ve Tauri static asset render kontrolleri başarılıdır. `UX_PREVIEW_NOTES.md` görsel doğrulama notlarını içerir.

Son UI değişiklikleri sonrası tekrar doğrulama:

| Kontrol | Sonuç |
|---|---|
| `pnpm exec tsc --noEmit` | Passed |
| `pnpm lint` | Passed |
| `pnpm build` | Passed |
| `cargo +stable fmt --check` | Passed |
| `cargo +stable test` | Passed — 6 tests |
| `cargo +stable check` | Passed |
| `cargo +stable clippy --all-targets --all-features -- -D warnings` | Passed |
| `pnpm tauri build` | Passed — 3 Linux bundles regenerated |

## Onyx differentiator verification

- Git Review Mode, Request Time Machine, Privacy-first Agent, enhanced response timeline, and API Notebook are integrated into the workspace.
- `.onyx` documents use a validated `onyx.document` magic/version envelope and are not accepted by the ordinary collection importer.
- The Tauri bundle registers the `.onyx` extension as an Onyx Document file association.
- Native opening validates an absolute path, `.onyx` extension, regular-file status, UTF-8 content, and a 2 MiB size limit before passing the document to the frontend.
- Linux launch arguments are forwarded after the splash-to-main transition through the `onyx-open-file` event.
- The Debian desktop entry declares `MimeType=application/vnd.onyx.document`, while the native smoke test confirms a valid `.onyx` launch argument does not crash the production binary.
- Browser preview confirmed the Notebook modal, current-request block capture, successful Save `.onyx` confirmation, and the local-only document safety notice.
- Browser preview confirmed the command palette entries `Open Onyx notebook (.onyx)`, `Create API notebook (.onyx)`, `Review collection changes`, and `Open Request Time Machine`.
- Agent request-body sharing is disabled by default and can be enabled explicitly in Agent Settings; secret masking remains independent and active by default.
- Final frontend, Rust, and Tauri production checks passed after these changes.


## Çoklu sağlayıcı Onyx Agent doğrulaması

Onyx Agent artık Rust native transport katmanı üzerinden **ChatGPT/OpenAI, Claude, Gemini, Manus, Kimi ve Groq** sağlayıcılarına bağlanır. OpenAI, Kimi ve Groq OpenAI-compatible Chat Completions akışını; Claude Anthropic Messages akışını; Gemini Interactions API akışını; Manus ise task oluşturma ve polling akışını kullanır. Frontend sağlayıcılara doğrudan istek göndermez.

| Kontrol | Sonuç |
|---|---|
| Sağlayıcı kimlikleri | Passed — 6 provider allowlist ve provider-aware keychain kayıtları |
| API key saklama | Passed — OS credential store; workspace/settings/`.onyx`/audit log içine secret yazılmaz |
| Birleşik Agent command | Passed — `execute_agent_interaction` provider dispatch ve normalize yanıt sözleşmesi |
| Legacy Gemini uyumluluğu | Passed — eski Gemini wrapper ve tip alias’ları korunuyor |
| Agent Settings sadeleştirme | Passed — Provider, Model, API key, Save/Test/Remove temel akışı; teknik alanlar Advanced altında |
| Güvenlik varsayılanları | Passed — secret masking açık, request body sharing kapalı, network/filesystem tool’ları onay korumalı |
| Frontend kalite kapıları | Passed — lint, TypeScript ve static production build |
| Rust kalite kapıları | Passed — fmt, 6 test, check ve warnings-as-errors Clippy |

Gerçek sağlayıcı API anahtarları bu doğrulama ortamında kullanılmadı. Bu nedenle canlı provider yanıtı iddiasında bulunulmaz; provider endpoint, authentication, payload normalization, keychain ve error-path davranışları kaynak sözleşmesi ve derleme/test kapılarıyla doğrulandı. Kullanıcı kendi anahtarını **Settings → Agent → Provider → API key → Test** akışından ekleyerek canlı bağlantıyı doğrulayabilir. Güncel kullanım kılavuzu [`docs/ai-providers.md`](docs/ai-providers.md), Gemini migration notu ise [`docs/gemini-integration.md`](docs/gemini-integration.md) dosyasındadır.

## Çoklu provider sonrası kalite kapıları

| Kapı | Sonuç |
|---|---|
| `pnpm lint` | Passed |
| `pnpm exec tsc --noEmit` | Passed |
| `pnpm build` | Passed — 3 static routes |
| `cargo +stable fmt --check` | Passed |
| `cargo +stable test` | Passed — 6 tests |
| `cargo +stable check` | Passed |
| `cargo +stable clippy --all-targets --all-features -- -D warnings` | Passed |
