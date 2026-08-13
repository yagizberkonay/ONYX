# Onyx

**Onyx**, modern geliştiriciler için tasarlanmış hızlı, yerel-öncelikli ve Git-native bir masaüstü API istemcisidir. Uygulama; API collection’larını, environment tanımlarını, request geçmişini, agent audit kayıtlarını ve uygulama ayarlarını bulut veritabanına göndermek yerine düz metin dosyaları olarak saklar. Gemini entegrasyonu kullanıldığında API anahtarı workspace JSON’larına yazılmaz; işletim sisteminin credential store/keychain altyapısında tutulur.

Onyx’in masaüstü kabuğu **Tauri v2**, arayüzü **Next.js App Router**, **React**, **TypeScript** ve **Tailwind CSS v4**, sistem entegrasyonu ise **Rust** ile oluşturulmuştur. Next.js statik export üretir; Tauri bu çıktıyı native WebView içinde çalıştırır. Bu yaklaşım Electron kullanmadan daha küçük bir native kabuk, CORS’suz ağ erişimi ve güvenli command sınırı sağlar.[1] [2]

> **Proje durumu:** Onyx çalışan, yerel-öncelikli bir API istemcisidir. Tauri açılışında profesyonel, çerçevesiz ve ortalanmış 3 saniyelik splash screen gösterilir; ardından ana workspace penceresi açılır. Native HTTP yürütme, Git workspace seçimi, kalıcı collection/environment/history dosyaları, secret-aware environment metadata’sı, request sekmeleri, quick-open, JSON response tree, OpenAPI/Postman importu, collection test runner, response timeline, pre/post script sandbox, keyboard-first command palette, import/export, Gemini BYOK assistant, keychain saklama, allowlist tool execution, kullanıcı onayı ve redacted audit log akışları hazırdır.

## Özellikler

Onyx’in ana çalışma yüzeyi, kod editörlerini andıran siyah-beyaz bir arayüz sunar. Sol panel collection, history, environment ve workspace root alanlarını; merkez panel request editor’ü; alt panel response body ve header görünümünü; Agent paneli ise Gemini tabanlı analiz ve kontrollü aksiyon akışını taşır. Gereksiz renkler, gradient’ler ve dekoratif gölgeler kullanılmaz.

| Özellik | Açıklama |
|---|---|
| Native HTTP | HTTP ve HTTPS istekleri Rust `reqwest` katmanı üzerinden gönderilir; browser CORS kısıtlamaları request yolundan çıkarılır. |
| Git-native workspace | Native folder picker ile workspace seçilir. Collection, environment ve history dosyaları seçilen repository içinde tutulur. |
| Collection yönetimi | Request seçme, yeni request oluşturma, kaydetme, silme, duplicate etme, filtreleme ve JSON import/export akışları bulunur. |
| Environment substitution | URL, header ve body içinde `{{variable}}` biçimindeki değişkenler seçili environment değerleriyle çözülür. |
| History | Request execution kayıtları yerel `history.json` dosyasına yazılır ve response görünümüne geri alınabilir. |
| cURL export | Aktif request, etkin header ve body bilgileriyle shell’e yapıştırılabilir cURL komutuna dönüştürülür. |
| Command palette ve quick-open | Command palette ile workspace, import/export, test runner ve görünüm aksiyonları; `Ctrl/⌘+P` quick-open ile request arama ve sekmeye alma işlemleri yürütülür. |
| Gemini BYOK | Kullanıcının kendi Gemini API anahtarı Rust keychain katmanında saklanır; frontend’e veya Git workspace’e yazılmaz. |
| Gemini Agent | Request, response, collection ve environment bağlamını redacted biçimde analiz eder; sınırlı tool loop ile sonuçları modele geri besler. |
| Tool allowlist | Agent yalnızca uygulama tarafından tanımlanan read-only, request ve filesystem araçlarını görebilir; doğrudan OS veya shell erişimi yoktur. |
| Risk bazlı onay | Read-only analizler otomatik yürütülebilir. Network request ve dosya yazma gibi yan etkiler varsayılan olarak kullanıcı onayı ister. |
| Audit log | Tool önerisi, risk, kullanıcı kararı, sonuç ve hata redacted olarak app-data altında en fazla 200 kayıtla tutulur. |
| Keychain ayarları | API key kaydetme, key status görüntüleme, key silme ve Test connection akışları bulunur. Key değeri hiçbir zaman geri döndürülmez. |
| Güvenli dosya erişimi | Relative path doğrulaması, workspace root sınırı, path traversal koruması ve mutlak yol reddi uygulanır. |
| Response tree ve timeline | JSON response’ları aranabilir, açılıp kapanabilir tree görünümünde; native request/download süreleri ise Timeline sekmesinde gösterilir. | 
| Secret-aware environments | Değişkenler `plain` veya `secret` metadata’sı taşıyabilir; secret key’ler düzenleme dışında maskelenir ve Gemini bağlamında redacted tutulur. |
| OpenAPI/Postman import | OpenAPI 3, Swagger 2 ve Postman Collection v2 JSON belgelerinden yerel Onyx request collection’ı oluşturulur. |
| Collection test runner | Collection request’leri sırayla çalıştırılır; status ve response body contains/equality assertion’ları sonuç satırlarında gösterilir. |
| Script sandbox | Request öncesi ve response sonrası kısa JavaScript hook’ları local kısıtlı API ile çalışır; network, DOM, storage ve dinamik global erişimleri reddedilir. |
| Response korumaları | Request timeout varsayılan olarak 30 saniyedir ve 100 ms–120 saniye aralığına sınırlandırılır; response gövdesi 5 MiB ile sınırlandırılır. |
| Splash screen | Uygulama açılışında 460×260 px, çerçevesiz, sabit ve ortalanmış splash penceresi 3 saniye görünür; ana pencere sonrasında gösterilir. |
| Offline-friendly frontend | Google font veya cloud database bağımlılığı yoktur. Browser geliştirme modunda localStorage fallback’i bulunur; native HTTP ve keychain Tauri runtime’a aittir. |

## Teknoloji ve mimari

Tauri’nin resmi Next.js entegrasyonunda önerilen statik export modeli kullanılır. `next.config.ts` içinde `output: "export"` ayarlanır ve Tauri `frontendDist` olarak `../out` klasörünü kullanır. Bu, Next.js App Router’ın masaüstü bundle’a derlenmiş statik dosyalar olarak dahil edilmesini sağlar.[1] [2]

| Katman | Teknoloji | Sorumluluk |
|---|---|---|
| Desktop shell | Tauri v2 | Pencere, native WebView, command bridge ve bundle üretimi |
| Frontend | Next.js 16 App Router, React 19, TypeScript | Workspace UI, state, keyboard interaction ve persistence orchestration |
| Styling | Tailwind CSS v4 | Siyah, beyaz ve gri token’lardan oluşan monokrom tasarım sistemi |
| Native backend | Rust 2021 | Dosya sistemi, path security, native HTTP, keychain ve Gemini command’ları |
| HTTP | `reqwest` 0.13 + Rustls | CORS’suz HTTP/HTTPS request yürütme ve TLS |
| Gemini client | Rust native HTTPS + Gemini Interactions API | BYOK agent çağrısı, stateless interaction ve tool call parsing |
| Secret storage | `keyring` 4.x | Linux Secret Service, macOS Keychain ve Windows Credential Manager entegrasyonu |
| Folder picker | `tauri-plugin-dialog` | Kullanıcı tarafından seçilen Git workspace klasörünün native olarak alınması |

Frontend ile Rust arasındaki sınır `lib/local-files.ts` ve `src-tauri/src/lib.rs` üzerinden tanımlanmıştır. Frontend doğrudan Node.js veya browser filesystem API’sine güvenmez; Tauri runtime’da `invoke` ile Rust command’larını çağırır. Browser preview modunda aynı sözleşme localStorage ve prompt fallback’i üzerinden korunur. Gemini API çağrısı da frontend’den doğrudan yapılmaz; API anahtarı keychain’den yalnızca Rust command içinde okunur.

## Proje yapısı

```text
onyx/
├── app/
│   ├── globals.css                 # Monokrom Tailwind tema ve global stiller
│   ├── layout.tsx                  # App Router root layout ve metadata
│   ├── page.tsx                    # Onyx workspace giriş noktası
│   └── splash/page.tsx             # Browser preview splash route’u
├── public/
│   └── splash-screen.html          # Tauri’nin çerçevesiz native splash asset’i
├── components/
│   ├── onyx-workspace.tsx          # Sidebar, tabs, editor, response ve persistence
│   ├── json-tree-viewer.tsx        # Aranabilir ve collapsible JSON response tree
│   ├── collection-test-runner.tsx  # Collection assertions ve test sonuçları
│   ├── response-timeline.tsx       # Native response timing görünümü
│   ├── quick-open.tsx              # Keyboard-first request switcher
│   └── gemini-assistant.tsx        # Gemini paneli, tool loop ve approval UI
├── lib/
│   ├── local-files.ts              # Tauri invoke, keychain ve Gemini wrapper’ları
│   ├── openapi.ts                  # OpenAPI/Swagger/Postman import normalizer’ı
│   ├── scripts.ts                  # Kısıtlı pre/post script runner
│   └── onyx-types.ts               # Collection, environment, response ve agent tipleri
├── docs/
│   ├── gemini-integration-research.md
│   └── gemini-integration.md       # BYOK ve agent kullanım kılavuzu
├── src-tauri/
│   ├── capabilities/default.json
│   ├── src/lib.rs                  # Rust commands, keychain, Gemini ve HTTP
│   ├── src/main.rs
│   ├── Cargo.toml
│   └── tauri.conf.json
├── next.config.ts
├── postcss.config.mjs
├── package.json
└── README.md
```

## Yerel veri modeli

Onyx uygulama ayarlarını ve agent audit log’unu işletim sisteminin Tauri app-data dizininde, Git-native verileri ise seçilen workspace root altında saklar. Workspace seçilmezse collection, environment ve history dosyaları app-data dizininde tutulur. Dosyalar insan tarafından okunabilir ve özel bir veritabanı formatına bağlı değildir.

| Dosya | Konum | İçerik |
|---|---|---|
| `settings.json` | Tauri app-data | Son workspace, aktif environment, workspace geçmişi ve Gemini model/policy ayarları; API key içermez |
| `agent-audit.json` | Tauri app-data | Redacted agent tool kararları ve sonuçları; en fazla 200 kayıt |
| `collection.json` | Seçilen workspace root | Collection metadata’sı ve request kayıtları |
| `environments.json` | Seçilen workspace root | Environment listesi, aktif environment, key/value değişkenleri ve `plain`/`secret` metadata’sı |
| `history.json` | Seçilen workspace root | Son 100 local request execution kaydı |
| `workspace.json` | Eski sürümler için okunabilir fallback | İlk MVP’nin collection benzeri kaydı; migration fallback’i olarak okunur |
| OS credential store | İşletim sistemi | Gemini API key; değeri JSON, frontend state veya audit log’a yazılmaz |

`collection.json`, `environments.json` ve `history.json` Git’e eklenebilir. Secret değerlerin workspace dosyalarına yazılmasını önlemek için environment değerleri bilinçli olarak keychain’e taşınmaz; kullanıcı hassas environment dosyalarını `.gitignore` ile hariç tutmalıdır. Gemini API key için doğru yer işletim sistemi credential store’dur.

### Örnek collection kaydı

```json
{
  "version": 1,
  "name": "Onyx Workspace",
  "requests": [
    {
      "id": "request-list-users",
      "name": "List users",
      "method": "GET",
      "url": "{{baseUrl}}/users",
      "headers": [
        {
          "name": "Accept",
          "value": "application/json",
          "enabled": true
        }
      ],
      "body": "",
      "folder": "Users"
    }
  ]
}
```

## Native HTTP davranışı

Request editor’deki `Send` aksiyonu aktif method, çözümlenmiş URL, etkin header’lar, body ve timeout değerlerini Rust’a gönderir. Rust yalnızca `http` ve `https` şemalarını kabul eder; `file://`, `javascript:` veya bilinmeyen şemalar reddedilir. Header alanları parse edilerek geçersiz isim veya değerlerin request’e girmesi önlenir. Native request katmanı browser CORS politikalarına tabi değildir.

HTTP client her execution için oluşturulur, `Onyx/0.1` user-agent’i kullanır ve timeout değerini güvenli aralıkta tutar. Response status, status text, final URL, response headers, content type, body, elapsed time, request/download timing ve truncation bilgisi frontend’e JSON olarak döndürülür. Rust katmanındaki ölçüm request’in gönderilmesinden response body’nin okunmasının tamamlanmasına kadar geçen süreyi ayırır; platforma göre DNS/connect/TLS alt adımları reqwest aggregate request süresi içinde temsil edilir. Büyük response’lar ilk 5 MiB ile sınırlandırılır ve UI’da `truncated` durumu gösterilir.

## Gemini BYOK ve Agent

Gemini entegrasyonu **Bring Your Own Key** modelini kullanır. Kullanıcı Gemini API key’i Settings modalındaki password alanına girer. Uygulama bu değeri yalnızca Rust `save_gemini_api_key` command’ına gönderir ve işletim sistemi credential store’una `service=onyx`, `user=gemini-api-key` kimliğiyle kaydeder. Key’in düz metin değeri hiçbir zaman React state’inde kalıcı tutulmaz, `settings.json` içine yazılmaz, Git workspace’e yazılmaz, audit log’a girmez ve Rust command sonucu olarak frontend’e geri döndürülmez.

Rust, Gemini Interactions API’ye native HTTPS üzerinden `x-goog-api-key` header’ıyla erişir. Varsayılan stateless davranışta `store=false` kullanılır. Agent conversation loop’unda Gemini’nin döndürdüğü interaction ID yalnızca aktif oturum içinde taşınır; kullanıcı **Clear conversation** ile bu bağlamı sıfırlayabilir. Model adı, temperature, max output token, timeout, system instruction ve tool kullanımı Settings üzerinden yapılandırılabilir.

> **API anahtarını kullanıcı sağlar.** Onyx hiçbir Gemini key içermez, key üretmez ve key’i kullanıcı adına yönetmez. Google AI Studio’dan alınan kendi key’inizi uygulamanın Settings ekranına girmeniz gerekir. Gemini kullanım ücretleri ve kota koşulları Google hesabınıza aittir.

### Agent bağlamı ve secret masking

Agent’a yalnızca aktif request, response, collection ve environment bağlamının gerekli bölümü gönderilir. `maskSecrets` varsayılan olarak açıktır. `Authorization`, `Proxy-Authorization`, `Cookie`, `Set-Cookie`, `X-Api-Key`, `X-Auth-Token`, password, secret ve token adlarını taşıyan header değerleri `[REDACTED]` olarak gönderilir. Request body varsayılan olarak `[REDACTED OR OMITTED]` olarak tutulur; kullanıcı Settings üzerinden body context paylaşımını açabilir.

Agent doğrudan filesystem, shell, process, browser veya unrestricted network erişimine sahip değildir. Gemini yalnızca Onyx’in function declaration allowlist’ini görür; gerçek tool çalıştırma kararı frontend policy katmanında verilir.

| Tool | Risk | Varsayılan davranış |
|---|---|---|
| `inspect_current_request` | Read-only | Otomatik |
| `analyze_response` | Read-only | Otomatik |
| `inspect_collection` / `inspect_environment` | Read-only; secret maskeli | Reserved; unknown calls are rejected |
| `send_current_request` | Network side effect | Kullanıcı onayı gerekir |
| `save_current_request` | Filesystem side effect | Kullanıcı onayı gerekir |

Agent loop tek çağrıyla sınırsız değildir. Tool sonuçları interaction ID ile sınırlı bir loop içinde Gemini’ye geri beslenir; bilinmeyen tool adı allowlist dışında açıkça reddedilir. Kullanıcı onayları `approved`, `rejected` veya `pending` olarak redacted audit log’a yazılır. Audit kaydı tool adı, risk, karar, sonuç özeti, hata özeti ve timestamp taşır; request body, API key ve secret değerleri kaydetmez.

### Gemini kullanımı

1. Onyx’i Tauri masaüstü runtime’ında açın.
2. Sidebar’dan **Settings** ekranını açın.
3. Gemini API key’i password alanına girip **Save key** düğmesine basın.
4. **Test connection** ile key ve model erişimini kontrol edin.
5. Model, temperature, timeout ve agent policy değerlerini ayarlayın.
6. Header’daki **Agent** düğmesine veya `Ctrl/⌘ + Shift + G` kısayoluna basın.
7. Agent’a mevcut request’i analiz etmesini, cURL üretmesini veya response’u açıklamasını söyleyin.
8. Request gönderme veya dosyaya yazma gibi yan etkilerde çıkan approval kartını inceleyip **Approve once** veya **Reject** seçin.
9. Settings içindeki redacted audit panelinden agent kararlarını inceleyin.

Browser preview’de Gemini çağrısı, keychain ve native dialog kullanılamaz. Gerçek entegrasyon için `pnpm tauri:dev` veya production bundle gerekir.

## Keyboard-first kullanım

Onyx’in temel akışları klavye ile yürütülebilir. Uygulama açıldığında splash penceresi kullanıcı etkileşimine kapalıdır; 3 saniyelik geçiş tamamlandığında ana pencere otomatik olarak görünür ve odaklanır. Kısayollar işletim sistemine göre `Ctrl` veya `⌘` modifier’ını destekler.

| Kısayol | İşlem |
|---|---|
| `Ctrl/⌘ + K` | URL alanına odaklanır |
| `Ctrl/⌘ + B` | Sidebar’ı açar veya kapatır |
| `Ctrl/⌘ + S` | Aktif request’i kaydeder |
| `Ctrl/⌘ + Enter` | Aktif request’i gönderir |
| `Ctrl/⌘ + Shift + G` | Gemini Agent panelini açar veya kapatır |
| `Ctrl/⌘ + P` | Request quick-open aramasını açar |
| `Escape` | Command palette’i, quick-open’u veya açık agent yüzeyini kapatır |
| URL alanında `Enter` | Request’i gönderir |

Command palette üzerinden `New request`, `Choose Git workspace folder`, `Open collection`, `Open request history`, `Open environments`, `Export collection.json`, `Import collection.json`, `Import OpenAPI or Postman JSON`, `Run collection tests`, `Quick open request`, `Copy current request as cURL`, `Duplicate current request` ve agent yüzeyleri çalıştırılabilir.

## Kurulum

Onyx geliştirmek için Node.js, pnpm, Rust stable toolchain ve Tauri’nin Linux sistem bağımlılıkları gerekir. Rust manifest’i Rust 1.77.2 veya daha yeni sürümü tanımlar. Tauri’nin Linux ortamında WebKitGTK ve GTK bağımlılıkları gerekir; işletim sistemine göre resmi Tauri prerequisites dokümanındaki paketler kurulmalıdır.[3]

Repository’yi aldıktan sonra frontend bağımlılıklarını kurun:

```bash
pnpm install
```

Browser tabanlı frontend geliştirme preview’si için:

```bash
pnpm dev
```

Bu mod native Rust command’ları yerine localStorage ve prompt fallback’lerini kullanır. Gerçek Tauri davranışını test etmek için:

```bash
pnpm tauri:dev
```

### Gemini önkoşulları

Gemini kullanmak için Google AI Studio’dan hesabınıza ait bir Gemini API key alın. Key’i yalnızca Onyx Settings ekranına girin. Key’in terminal geçmişine, Git repository’sine veya chat mesajlarına yazılması önerilmez.

Linux’ta keyring backend’i Secret Service sağlayıcısına bağlıdır. Masaüstü oturumunda Secret Service erişilebilir değilse Onyx key’i kaydetmeyi reddeder; uygulama bunu düz metin `settings.json` fallback’ine dönüştürmez. Böyle bir durumda keyring sağlayıcısını etkinleştirip uygulamayı yeniden başlatın.

## Build ve release

Statik Next.js build’i `out/` klasörüne üretmek için:

```bash
pnpm build
```

Tauri production bundle’larını üretmek için:

```bash
pnpm tauri:build
```

Linux ortamında başarılı production build sonrasında bundle dosyaları aşağıdaki konumlarda oluşur:

```text
src-tauri/target/release/bundle/deb/Onyx_0.1.0_amd64.deb
src-tauri/target/release/bundle/rpm/Onyx-0.1.0-1.x86_64.rpm
src-tauri/target/release/bundle/appimage/Onyx_0.1.0_amd64.AppImage
```

Windows ve macOS release’leri ilgili platformların Tauri build ortamlarında üretilmelidir. Tauri bundle formatları ve platform gereksinimleri resmi dokümantasyonda açıklanır.[4]

## Kalite kontrolleri

Kaynak değişikliklerinden sonra aşağıdaki komutların çalıştırılması önerilir:

```bash
pnpm lint
pnpm exec tsc --noEmit
pnpm build
cargo +stable fmt --manifest-path src-tauri/Cargo.toml -- --check
cargo +stable test --manifest-path src-tauri/Cargo.toml
cargo +stable check --manifest-path src-tauri/Cargo.toml
cargo +stable clippy --manifest-path src-tauri/Cargo.toml --all-targets --all-features -- -D warnings
pnpm tauri build
```

Rust testleri path traversal, boş/mutlak path, HTTP URL şeması, timeout clamp, Gemini request validation ve local TCP HTTP response sözleşmesini kapsar. Browser runtime doğrulaması workspace, Agent toggle, Settings action, request editor, response paneli ve keyboard shortcut görünürlüğünü kontrol eder. Native keychain ve Gemini çağrıları için Tauri desktop runtime gereklidir.

## Güvenlik modeli

Onyx’in dosya erişimi iki ayrı scope üzerinden yürür. App-data dosyaları Tauri’nin uygulama veri dizinine bağlanır. Git workspace dosyaları ise kullanıcı tarafından native dialog ile seçilen absolute root altında erişilir. Her iki durumda da yalnızca güvenli relative path kabul edilir; boş path, absolute path, `.` ve `..` component’leri reddedilir. Workspace path’i canonicalize edilir ve hedef dosyanın seçilmiş root dışına çıkması engellenir.

Native HTTP katmanı yalnızca HTTP/HTTPS URL’lerini kabul eder. Header alanları parse edilerek geçersiz isim veya değerlerin request’e girmesi önlenir. Response boyutu ve timeout sınırları, yanlış yapılandırılmış veya kötü niyetli endpoint’lerin masaüstü uygulamasını sınırsız şekilde meşgul etmesini azaltır.

Gemini command’ı yalnızca keyring’den key okuyabilir; frontend’e key döndürmez. API key, request body, masked header ve tool sonuçlarındaki secret’lar audit log’a yazılmaz. Agent’ın filesystem veya network access’i model tarafından doğrudan kullanılamaz; her çağrı uygulama allowlist’i ve policy katmanından geçer. Kullanıcı onayı gerektiren aksiyonlar onaysız otomatik çalıştırılmaz.

> Onyx bir secret manager değildir. Gemini API key işletim sistemi credential store’unda korunur; fakat API key dışındaki environment secret değerleri workspace JSON dosyalarına yazılabilir. Hassas environment dosyalarını `.gitignore` ile hariç tutun ve repository’ye credential commit etmeyin.

## Bilinen kapsam sınırları

Bu sürüm günlük REST/HTTP geliştirme akışını ve kontrollü Gemini destekli request analizini hedefleyen sağlam bir temel sunar. Aşağıdaki ileri entegrasyonlar henüz ürün kapsamına dahil değildir: GraphQL schema explorer, WebSocket/SSE client, OAuth browser flow, cookie jar yönetimi, proxy profile yönetimi, certificate pinning, code generation, team sync ve conflict-aware multi-user collaboration.

Gemini agent kullanımı da Google Gemini API’nin model erişimi, kota, fiyatlandırma ve bölgesel kullanılabilirlik koşullarına bağlıdır. Onyx key üretmez, Google hesabına erişmez ve Gemini faturalandırmasını yönetmez. API key veya model erişim hataları Google AI Studio/API tarafında çözülmelidir.

## Lisans

Proje şu anda `package.json` veya `Cargo.toml` içinde bir açık kaynak lisansı tanımlamamaktadır. Dağıtıma açılmadan önce ürün sahibi tarafından uygun bir lisans seçilmeli ve repository köküne `LICENSE` dosyası eklenmelidir.

## Kaynaklar

[1]: https://v2.tauri.app/start/frontend/nextjs/ "Tauri v2 — Next.js frontend"
[2]: https://nextjs.org/docs/app/guides/static-exports "Next.js — Static Exports"
[3]: https://v2.tauri.app/start/prerequisites/ "Tauri v2 — Prerequisites"
[4]: https://v2.tauri.app/distribute/ "Tauri v2 — Distribute"
[5]: https://tailwindcss.com/docs/installation/using-postcss "Tailwind CSS — Using PostCSS"
[6]: https://docs.rs/reqwest/latest/reqwest/ "reqwest — Rust HTTP Client"
[7]: https://ai.google.dev/gemini-api/docs/function-calling "Gemini API — Function calling"
[8]: https://ai.google.dev/gemini-api/docs/interactions-overview "Gemini API — Interactions API"
[9]: https://docs.rs/keyring/latest/keyring/ "keyring — Rust credential store"
