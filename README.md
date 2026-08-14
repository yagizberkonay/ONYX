# Onyx

**Onyx**, modern geliştiriciler için tasarlanmış hızlı, yerel-öncelikli ve Git-native bir masaüstü API istemcisidir. Uygulama; API collection’larını, environment tanımlarını, request geçmişini, agent audit kayıtlarını ve uygulama ayarlarını bulut veritabanına göndermek yerine düz metin dosyaları olarak saklar. AI Agent entegrasyonu kullanıldığında sağlayıcı API anahtarları workspace JSON’larına yazılmaz; işletim sisteminin credential store/keychain altyapısında tutulur.

Onyx’in masaüstü kabuğu **Tauri v2**, arayüzü **Next.js App Router**, **React**, **TypeScript** ve **Tailwind CSS v4**, sistem entegrasyonu ise **Rust** ile oluşturulmuştur. Next.js statik export üretir; Tauri bu çıktıyı native WebView içinde çalıştırır. Bu yaklaşım Electron kullanmadan daha küçük bir native kabuk, CORS’suz ağ erişimi ve güvenli command sınırı sağlar.[1] [2]

> **Proje durumu:** Onyx çalışan, yerel-öncelikli bir API istemcisidir. Tauri açılışında profesyonel, çerçevesiz ve ortalanmış 3 saniyelik splash screen gösterilir; ardından ana workspace penceresi açılır. Native HTTP yürütme, Git workspace seçimi, kalıcı collection/environment/history dosyaları, secret-aware environment metadata’sı, request sekmeleri, quick-open, JSON response tree, OpenAPI/Postman importu, collection test runner, response timeline, pre/post script sandbox, keyboard-first command palette, import/export, çoklu sağlayıcılı AI Agent, keychain saklama, allowlist tool execution, kullanıcı onayı ve redacted audit log akışları hazırdır. Agent; ChatGPT/OpenAI, Claude, Gemini, Manus, Kimi ve Groq API’lerine Rust üzerinden doğrudan bağlanabilir.

## Özellikler

Onyx’in ana çalışma yüzeyi, kod editörlerini andıran siyah-beyaz bir arayüz sunar. Sol panel collection, history, environment ve workspace root alanlarını; merkez panel request editor’ü; alt panel response body ve header görünümünü; Agent paneli ise seçilen AI sağlayıcısıyla çalışan analiz ve kontrollü aksiyon akışını taşır. Gereksiz renkler, gradient’ler ve dekoratif gölgeler kullanılmaz.

| Özellik | Açıklama |
|---|---|
| Native HTTP | HTTP ve HTTPS istekleri Rust `reqwest` katmanı üzerinden gönderilir; browser CORS kısıtlamaları request yolundan çıkarılır. |
| Git-native workspace | Native folder picker ile workspace seçilir. Collection, environment ve history dosyaları seçilen repository içinde tutulur. |
| Collection yönetimi | Request seçme, yeni request oluşturma, kaydetme, silme, duplicate etme, filtreleme ve JSON import/export akışları bulunur. |
| Environment substitution | URL, header ve body içinde `{{variable}}` biçimindeki değişkenler seçili environment değerleriyle çözülür. |
| History | Request execution kayıtları yerel `history.json` dosyasına yazılır ve response görünümüne geri alınabilir. |
| cURL export | Aktif request, etkin header ve body bilgileriyle shell’e yapıştırılabilir cURL komutuna dönüştürülür. |
| Command palette ve quick-open | Command palette ile workspace, import/export, test runner ve görünüm aksiyonları; `Ctrl/⌘+P` quick-open ile request arama ve sekmeye alma işlemleri yürütülür. |
| Çoklu sağlayıcı BYOK | ChatGPT/OpenAI, Claude, Gemini, Manus, Kimi ve Groq API anahtarları Rust keychain katmanında saklanır; frontend’e veya Git workspace’e yazılmaz. |
| Onyx Agent | Request, response, collection ve environment bağlamını redacted biçimde analiz eder; seçilen sağlayıcıyla sınırlı tool loop üzerinden sonuçları modele geri besler. Manus task tabanlı, diğer sağlayıcılar model yanıtı tabanlı ortak bir sözleşmeye normalize edilir. |
| Tool allowlist | Agent yalnızca uygulama tarafından tanımlanan read-only, request ve filesystem araçlarını görebilir; doğrudan OS veya shell erişimi yoktur. |
| Risk bazlı onay | Read-only analizler otomatik yürütülebilir. Network request ve dosya yazma gibi yan etkiler varsayılan olarak kullanıcı onayı ister. |
| Audit log | Tool önerisi, risk, kullanıcı kararı, sonuç ve hata redacted olarak app-data altında en fazla 200 kayıtla tutulur. |
| Keychain ayarları | API key kaydetme, key status görüntüleme, key silme ve Test connection akışları bulunur. Key değeri hiçbir zaman geri döndürülmez. |
| Güvenli dosya erişimi | Relative path doğrulaması, workspace root sınırı, path traversal koruması ve mutlak yol reddi uygulanır. |
| Response tree ve timeline | JSON response’ları aranabilir, açılıp kapanabilir tree görünümünde; Timeline sekmesi native request aggregate, response transfer, toplam süre, status, content type, payload uzunluğu ve truncation durumunu Request Diagnostics kartında gösterir. DNS/connect/TLS ayrı ölçülmüyorsa arayüz bunu aggregate olarak açıkça belirtir. | 
| Secret-aware environments | Değişkenler `plain` veya `secret` metadata’sı taşıyabilir; secret key’ler düzenleme dışında maskelenir ve Agent bağlamında redacted tutulur. |
| OpenAPI/Postman import | OpenAPI 3, Swagger 2 ve Postman Collection v2 JSON belgelerinden yerel Onyx request collection’ı oluşturulur. |
| Collection test runner | Collection request’leri sırayla çalıştırılır; status ve response body contains/equality assertion’ları sonuç satırlarında gösterilir. |
| Script sandbox | Request öncesi ve response sonrası kısa JavaScript hook’ları local kısıtlı API ile çalışır; network, DOM, storage ve dinamik global erişimleri reddedilir. |
| Response korumaları | Request timeout varsayılan olarak 30 saniyedir ve 100 ms–120 saniye aralığına sınırlandırılır; response gövdesi 5 MiB ile sınırlandırılır. |
| Splash screen | Uygulama açılışında 460×260 px, çerçevesiz, sabit ve ortalanmış premium splash penceresi 3 saniye görünür; ana pencere sonrasında gösterilir. |
| IDE-style workspace | VS Code, Postman ve JetBrains IDE’lerinden ilham alan command center, request tabs, hızlı erişim aksiyonları, yoğunluk seçenekleri ve taranabilir üç yüzeyli editör düzeni sunar. |
| Categorized Settings | General, Editor, Notifications, Agent ve About kategorileri; tema, density, sidebar genişliği, word wrap, font size, startup davranışı, toast görünürlüğü ve reduce-motion tercihlerini kapsar. |
| Git Review Mode | Workspace baseline ile working tree request değişikliklerini alan bazlı, insan tarafından okunabilir diff olarak gösterir; review yereldir ve baseline geri alma aksiyonu sunar. |
| Request Time Machine | History kayıtlarında çözümlenmiş URL, header, body, environment, response ve timeline snapshot’larını saklar; geçmiş request’i güncel workspace’e replay eder. |
| Privacy-first Agent | Request body paylaşımı varsayılan olarak kapalıdır; açık olsa bile secret masking, approval policy ve redacted audit log korunur. Bu tercih Agent Settings içinden açıkça yönetilir. |
| API Notebook | Request, response, timeline, diff ve markdown bloklarını tek bir yerel runbook içinde toplar. |
| `.onyx` document | Yalnızca Onyx tarafından açılan, magic/version doğrulamalı JSON envelope; normal collection JSON import akışına karışmaz ve `.onyx` uzantısıyla kaydedilir. |
| Offline-friendly frontend | Google font veya cloud database bağımlılığı yoktur. Browser geliştirme modunda localStorage fallback’i bulunur; native HTTP ve keychain Tauri runtime’a aittir. |

## Teknoloji ve mimari

Tauri’nin resmi Next.js entegrasyonunda önerilen statik export modeli kullanılır. `next.config.ts` içinde `output: "export"` ayarlanır ve Tauri `frontendDist` olarak `../out` klasörünü kullanır. Bu, Next.js App Router’ın masaüstü bundle’a derlenmiş statik dosyalar olarak dahil edilmesini sağlar.[1] [2]

| Katman | Teknoloji | Sorumluluk |
|---|---|---|
| Desktop shell | Tauri v2 | Pencere, native WebView, command bridge ve bundle üretimi |
| Frontend | Next.js 16 App Router, React 19, TypeScript | Workspace UI, state, keyboard interaction ve persistence orchestration |
| Styling | Tailwind CSS v4 | Siyah, beyaz ve gri token’lardan oluşan monokrom tasarım sistemi |
| Native backend | Rust 2021 | Dosya sistemi, path security, native HTTP, keychain ve çoklu sağlayıcı Agent command’ları |
| HTTP | `reqwest` 0.13 + Rustls | CORS’suz HTTP/HTTPS request yürütme ve TLS |
| AI providers | Rust native HTTPS | OpenAI-compatible Chat Completions (ChatGPT/Kimi/Groq), Anthropic Messages (Claude), Gemini Interactions, Manus task create/poll |
| Agent contract | Normalize edilmiş Rust/TypeScript sözleşmesi | Provider bağımsız text, tool calls, token ve interaction metadata’sı |
| Secret storage | `keyring` 4.x | Linux Secret Service, macOS Keychain ve Windows Credential Manager entegrasyonu |
| Folder picker | `tauri-plugin-dialog` | Kullanıcı tarafından seçilen Git workspace klasörünün native olarak alınması |

Frontend ile Rust arasındaki sınır `lib/local-files.ts` ve `src-tauri/src/lib.rs` üzerinden tanımlanmıştır. Frontend doğrudan Node.js veya browser filesystem API’sine güvenmez; Tauri runtime’da `invoke` ile Rust command’larını çağırır. Browser preview modunda aynı sözleşme localStorage ve prompt fallback’i üzerinden korunur. AI API çağrıları frontend’den doğrudan yapılmaz; seçilen sağlayıcının API anahtarı keychain’den yalnızca Rust command içinde okunur. Böylece CORS, key sızıntısı ve workspace’e secret yazılması engellenir.

## Proje yapısı

```text
onyx/
├── app/
│   ├── globals.css                 # Monokrom tema, density/theme varyantları ve global stiller
│   ├── layout.tsx                  # App Router root layout ve metadata
│   ├── page.tsx                    # Onyx workspace giriş noktası
│   └── splash/page.tsx             # Browser preview splash route’u
├── public/
│   └── splash-screen.html          # Tauri’nin çerçevesiz native splash asset’i
├── components/
│   ├── onyx-workspace.tsx          # Sidebar, tabs, editor, response ve persistence
│   ├── app-context-menu.tsx        # WebView varsayılanı yerine Onyx context menu
│   ├── app-toast-stack.tsx         # Uygulama içi toast bildirimleri
│   ├── json-tree-viewer.tsx        # Aranabilir ve collapsible JSON response tree
│   ├── collection-test-runner.tsx  # Collection assertions ve test sonuçları
│   ├── response-timeline.tsx       # Request Diagnostics ve native response timing görünümü
│   ├── quick-open.tsx              # Keyboard-first request switcher
│   └── onyx-agent.tsx              # Provider bağımsız Agent paneli, tool loop ve approval UI
├── lib/
│   ├── local-files.ts              # Tauri invoke, keychain ve provider wrapper’ları
│   ├── openapi.ts                  # OpenAPI/Swagger/Postman import normalizer’ı
│   ├── scripts.ts                  # Kısıtlı pre/post script runner
│   └── onyx-types.ts               # Collection, environment, response ve agent tipleri
├── docs/
│   ├── gemini-integration-research.md
│   ├── gemini-integration.md       # Eski Gemini akışı için geriye dönük teknik not
│   └── ai-providers.md             # Çoklu provider Agent kullanım ve güvenlik kılavuzu
├── src-tauri/
│   ├── capabilities/default.json
│   ├── src/lib.rs                  # Rust commands, keychain, çoklu provider Agent ve HTTP
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
| `settings.json` | Tauri app-data | Son workspace, aktif environment, workspace geçmişi ve Agent provider/model/policy ayarları; API key içermez |
| `agent-audit.json` | Tauri app-data | Redacted agent tool kararları ve sonuçları; en fazla 200 kayıt |
| `collection.json` | Seçilen workspace root | Collection metadata’sı ve request kayıtları |
| `environments.json` | Seçilen workspace root | Environment listesi, aktif environment, key/value değişkenleri ve `plain`/`secret` metadata’sı |
| `history.json` | Seçilen workspace root | Son 100 local request execution kaydı |
| `workspace.json` | Eski sürümler için okunabilir fallback | İlk MVP’nin collection benzeri kaydı; migration fallback’i olarak okunur |
| `*.onyx` | Seçilen workspace root | Onyx Notebook, Review veya Snapshot envelope’u; request/response/timeline/diff/markdown blokları ve kaynak metadata’sı içerir |
| OS credential store | İşletim sistemi | Seçilen provider’ların API key’leri; değerleri JSON, frontend state veya audit log’a yazılmaz |

`collection.json`, `environments.json`, `history.json` ve review/runbook amacıyla oluşturulan `*.onyx` dosyaları Git’e eklenebilir. `.onyx` dosyaları düz metin JSON tabanlı olsa da yalnızca Onyx document magic ve version sözleşmesini sağlayan belgeler olarak açılır; normal collection importer tarafından kabul edilmez. Secret değerlerin workspace dosyalarına yazılmasını önlemek için environment değerleri bilinçli olarak keychain’e taşınmaz; kullanıcı hassas environment dosyalarını `.gitignore` ile hariç tutmalıdır. Tüm AI provider API key’leri için doğru yer işletim sistemi credential store’udur.

### `.onyx` notebook kaydı

`.onyx` dosyaları Onyx’in yerel API notebook ve review zarfıdır. Uygulama `format: "onyx.document"` ve `version: 1` alanlarını doğrulamadan belgeyi açmaz. Böylece rastgele JSON dosyaları collection veya notebook olarak yanlışlıkla yorumlanmaz.

```json
{
  "format": "onyx.document",
  "version": 1,
  "documentType": "notebook",
  "title": "Users API runbook",
  "description": "Local request and response notes",
  "createdAt": "2026-08-14T10:00:00.000Z",
  "updatedAt": "2026-08-14T10:00:00.000Z",
  "blocks": [
    { "id": "block-1", "type": "markdown", "content": "Check pagination before release." },
    { "id": "block-2", "type": "request", "requestId": "list-users" },
    { "id": "block-3", "type": "timeline", "snapshotId": "history-123" }
  ],
  "snapshots": [],
  "review": { "sourceLabel": "main", "targetLabel": "working tree", "changes": [] }
}
```

Bu dosyalar uygulama içinde command palette’ten **Open Onyx notebook (.onyx)** komutuyla açılır veya **Create API notebook (.onyx)** aksiyonuyla oluşturulur. Linux production bundle’ı `.onyx` uzantısını Onyx ile ilişkilendirir; dosyaya çift tıklandığında Tauri native lifecycle dosya yolunu alır, belgeyi doğrular ve ana pencere açıldıktan sonra notebook olarak gösterir. Notebook içinden request, response ve markdown blokları eklenebilir; Save `.onyx` işlemi belgeyi seçili workspace’e yerel olarak kaydeder.

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

## Çoklu sağlayıcılı Onyx Agent

Onyx Agent, **Bring Your Own Key** modeliyle ChatGPT/OpenAI, Claude, Gemini, Manus, Kimi ve Groq API’lerine doğrudan bağlanır. Kullanıcı Settings → Agent ekranından provider, model ve API key seçer. Uygulama seçilen provider’ın key’ini yalnızca Rust keychain command’ına gönderir; key işletim sistemi credential store’unda tutulur ve `settings.json`, Git workspace, `.onyx` belgesi, audit log veya frontend’e yazılmaz.

Sağlayıcı transport’ları native Rust katmanında ayrıştırılmıştır: OpenAI, Kimi ve Groq OpenAI-compatible Chat Completions; Claude Anthropic Messages; Gemini Interactions; Manus ise task create/poll akışını kullanır. Frontend provider-independent `executeAgentInteraction` sözleşmesini kullanır; provider-specific endpoint, authentication header ve response parse işlemleri Rust içinde kalır.

| Sağlayıcı | Native transport | Varsayılan authentication |
|---|---|---|
| ChatGPT / OpenAI | OpenAI-compatible Chat Completions | `Authorization: Bearer` |
| Claude | Anthropic Messages | `x-api-key` + `anthropic-version` |
| Gemini | Gemini Interactions | `x-goog-api-key` |
| Manus | Task create + polling | `x-manus-api-key` |
| Kimi | OpenAI-compatible Chat Completions | `Authorization: Bearer` |
| Groq | OpenAI-compatible Chat Completions | `Authorization: Bearer` |

> **API anahtarını kullanıcı sağlar.** Onyx hiçbir provider key’i içermez, üretmez veya kullanıcı adına yönetmez. Provider hesabı, model erişimi, kota ve ücret koşulları ilgili sağlayıcıya aittir.

### Agent bağlamı, privacy ve approval

Agent’a yalnızca aktif request, response, collection ve environment bağlamının gerekli bölümü gönderilir. `maskSecrets` varsayılan olarak açıktır. `Authorization`, `Proxy-Authorization`, `Cookie`, `Set-Cookie`, `X-Api-Key`, `X-Auth-Token`, password, secret ve token adlarını taşıyan değerler `[REDACTED]` olarak gönderilir. Request body varsayılan olarak `[REDACTED OR OMITTED]` tutulur; kullanıcı Settings üzerinden body context paylaşımını açıkça etkinleştirebilir.

Agent doğrudan filesystem, shell, process, browser veya unrestricted network erişimine sahip değildir. Tüm provider’lar aynı Onyx tool allowlist’ini kullanır; gerçek tool yürütme kararı frontend policy katmanında verilir.

| Tool | Risk | Varsayılan davranış |
|---|---|---|
| `inspect_current_request` | Read-only | Otomatik |
| `analyze_response` | Read-only | Otomatik |
| `send_current_request` | Network side effect | Kullanıcı onayı gerekir |
| `save_current_request` | Filesystem side effect | Kullanıcı onayı gerekir |

Agent loop sınırlı adım sayısına sahiptir. Bilinmeyen tool adları reddedilir. Kullanıcı onayları `approved`, `rejected` veya `pending` olarak redacted audit log’a yazılır; API key, request body ve secret değerleri kaydedilmez.

### Kullanım

1. Onyx’i Tauri masaüstü runtime’ında açın ve **Settings → Agent** ekranına gidin.
2. Provider listesinden ChatGPT/OpenAI, Claude, Gemini, Manus, Kimi veya Groq seçin.
3. Model adını sağlayıcı hesabınızda erişilebilir olan modelle eşleştirin.
4. API key’i girip **Save key** düğmesine basın; keychain durumunun yapılandırıldığını kontrol edin.
5. **Test** düğmesiyle seçilen provider ve model için kısa bağlantı kontrolü çalıştırın.
6. Günlük kullanım için **Confirm side effects** modunu, **Mask secrets** seçeneğini açık ve **Share request body** seçeneğini kapalı tutun.
7. Header’daki **Agent** düğmesine veya `Ctrl/⌘ + Shift + G` kısayoluna basın.
8. Request analizi, response açıklaması veya cURL önerisi isteyin. Request gönderme ya da dosyaya yazma gibi yan etkilerde approval kartını inceleyin.

Provider, model, key ve policy ayarları sade Agent panelinde görünür; endpoint override, temperature, token limiti ve timeout **Advanced connection settings** altında tutulur. Ayrıntılı sağlayıcı matrisi ve güvenlik sözleşmesi için [`docs/ai-providers.md`](docs/ai-providers.md) dosyasına bakın. Gerçek provider bağlantısı keychain ve native HTTP gerektirdiği için `pnpm tauri:dev` veya production bundle ile çalıştırılmalıdır; browser preview provider çağrısı yapmaz.

## Keyboard-first kullanım

Onyx’in temel akışları klavye ile yürütülebilir. Uygulama açıldığında splash penceresi kullanıcı etkileşimine kapalıdır; 3 saniyelik geçiş tamamlandığında ana pencere otomatik olarak görünür ve odaklanır. Kısayollar işletim sistemine göre `Ctrl` veya `⌘` modifier’ını destekler.

| Kısayol | İşlem |
|---|---|
| `Ctrl/⌘ + K` | URL alanına odaklanır |
| `Ctrl/⌘ + B` | Sidebar’ı açar veya kapatır |
| `Ctrl/⌘ + S` | Aktif request’i kaydeder |
| `Ctrl/⌘ + Enter` | Aktif request’i gönderir |
| `Ctrl/⌘ + Shift + G` | Onyx Agent panelini açar veya kapatır |
| `Ctrl/⌘ + P` | Request quick-open aramasını açar |
| `Escape` | Command palette’i, quick-open’u veya açık agent yüzeyini kapatır |
| URL alanında `Enter` | Request’i gönderir |

Command palette üzerinden `New request`, `Choose Git workspace folder`, `Open collection`, `Open request history`, `Open environments`, `Export collection.json`, `Import collection.json`, `Import OpenAPI or Postman JSON`, `Run collection tests`, `Quick open request`, `Copy current request as cURL`, `Duplicate current request` ve agent yüzeyleri çalıştırılabilir.

## Uygulamaya özel etkileşimler

Onyx, uygulama yüzeyinde browser’ın varsayılan sağ tık menüsünü veya browser `Notification` API’sini kullanmaz. Workspace üzerinde sağ tıklandığında Onyx’in monochrome context menu’sü açılır. Bir input veya textarea üzerinde açıldığında clipboard işlemleri; diğer alanlarda ise request komutları gösterilir.

| Context menu işlemi | Davranış |
|---|---|
| `Copy`, `Cut`, `Paste`, `Select all` | Aktif input/textarea selection’ı üzerinde çalışır. |
| `Send request` | Aktif request’i native Rust HTTP katmanına gönderir. |
| `Save request` | Aktif request’i collection dosyasına kaydeder. |
| `Duplicate request` | Request’i yeni bir sekme olarak çoğaltır. |
| `Copy as cURL` | Aktif request’in cURL karşılığını clipboard’a kopyalar. |
| `New request` | Yeni boş request ve sekme oluşturur. |

Başarılı işlemler, uyarılar ve hatalar sağ altta Onyx’e özel, geçici toast bildirimleriyle gösterilir. Toast’lar `aria-live` üzerinden erişilebilir durumdadır; `Escape`, dışarı tıklama veya sağ tık menüsünün dışına tıklama menüyü kapatır. Bu davranışlar tarayıcı sekmesinde değil, Tauri masaüstü runtime’ındaki Onyx arayüz katmanında çalışır.

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

---

**Yazar:** Manus AI  
**Ürün:** Onyx 0.1.0  
**Mimari:** Tauri v2 · Next.js · React · TypeScript · Tailwind CSS · Rust · Gemini BYOK
