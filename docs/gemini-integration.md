# Onyx Gemini BYOK Entegrasyon Kılavuzu

Bu belge Onyx’in Gemini entegrasyonunun nasıl çalıştığını, hangi verilerin gönderildiğini, agent araçlarının hangi koşullarda yürütüldüğünü ve entegrasyonun nasıl test edileceğini açıklar.

## Tasarım hedefi

Onyx Gemini entegrasyonu **BYOK** ve **local-first** prensipleriyle tasarlanmıştır. Kullanıcı kendi Google Gemini API key’ini sağlar. Onyx bu key’i workspace JSON dosyalarına, Git repository’sine, React state’ine, audit log’a veya frontend’e yazmaz. Key yalnızca Rust command sınırında alınır ve işletim sisteminin credential store’unda tutulur.

Gemini erişimi frontend’den doğrudan yapılmaz. `components/gemini-assistant.tsx` yalnızca kullanıcı arayüzü, context hazırlama ve tool approval akışını yürütür. `lib/local-files.ts` Tauri runtime’da `invoke` wrapper’ı sağlar. Gerçek HTTPS çağrısı ve keychain erişimi `src-tauri/src/lib.rs` içinde gerçekleşir.

## Keychain sözleşmesi

Gemini key şu sabit credential kimliğiyle saklanır:

| Alan | Değer |
|---|---|
| Service | `onyx` |
| User | `gemini-api-key` |
| Değer | Kullanıcının Gemini API key’i |

`save_gemini_api_key` command’ı boş veya whitespace-only key’i reddeder. `get_gemini_key_status` yalnızca `{ configured: boolean }` döndürür; key değerini döndürmez. `delete_gemini_api_key` credential store’daki kaydı siler. Keyring backend erişilemezse uygulama secret’ı `settings.json` içine yazmaz ve düz metin fallback kullanmaz.

Platform backend’i işletim sistemi tarafından sağlanır. Linux’ta Secret Service sağlayıcısı, macOS’ta Keychain, Windows’ta Credential Manager kullanılır. Headless veya kilitli Linux session’larında keyring erişimi bulunmayabilir; bu durumda önce masaüstü credential service’i etkinleştirilmelidir.

## Gemini request akışı

1. Kullanıcı Settings ekranında model, temperature, max output token ve timeout ayarlarını belirler.
2. Kullanıcı API key’i girer ve **Save key** ile keychain’e kaydeder.
3. **Test connection** işlevi kısa bir stateless interaction gönderir; key hiçbir zaman UI’a geri dönmez.
4. Kullanıcı Agent paneline bir görev yazar.
5. Frontend aktif request, response ve collection bağlamını `maskSecrets` policy’sine göre redacted hale getirir.
6. Rust `gemini_interaction` command’ı keychain’den key’i okur ve Gemini Interactions API’ye native HTTPS çağrısı yapar.
7. Gemini text response veya function/tool call döndürür.
8. Tool call, frontend allowlist ve risk policy katmanında sınıflandırılır.
9. Read-only tool’lar doğrudan çalıştırılabilir. Network veya filesystem yan etkisi olan tool’lar approval kartına düşer.
10. Kullanıcı onay verirse tool çalışır; sonuç redacted biçimde interaction loop’a geri beslenir.
11. Maksimum loop adımı aşıldığında agent güvenli biçimde durur. **Clear conversation** interaction bağlamını temizler.

Gemini çağrılarında varsayılan stateless davranış korunur. `store=false` ile uzak interaction saklama kapalıdır. `previous_interaction_id` yalnızca aktif oturumun devamı için kullanılır ve kullanıcı oturumu temizlediğinde bırakılır.

## Agent tool allowlist

Model doğrudan işletim sistemi komutu çalıştıramaz, arbitrary dosya yolu okuyamaz, unrestricted network request gönderemez ve Tauri command’larını kendi başına çağıramaz. Model yalnızca aşağıdaki uygulama araçlarını önerebilir:

| Tool | Girdi | Risk | Yürütme |
|---|---|---|---|
| `inspect_current_request` | Aktif request | Read-only | Otomatik |
| `analyze_response` | Aktif response | Read-only | Otomatik |
| `send_current_request` | Aktif request | Network side effect | Approval |
| `save_current_request` | Aktif request | Filesystem side effect | Approval |

Bilinmeyen tool adları approval kartına gönderilmeden doğrudan reddedilir ve audit log’a `failed` kararıyla yazılır. Tool argümanları uygulama tarafından normalize edilir; model output’u doğrudan filesystem path veya raw command olarak yürütülmez.

## Agent policy

Settings panelindeki policy, default olarak `suggest` değerini kullanır. Bu modda agent read-only analiz yapabilir; side-effect tool’lar kullanıcı onayı olmadan yürütülmez. `confirm` ve `autonomous` seçenekleri yalnızca açıkça seçildiğinde etkinleşir; uygulama yine de güvenlik açısından network ve filesystem çağrılarını approval akışından geçirebilir.

| Policy | Davranış |
|---|---|
| `suggest` | Read-only analiz otomatik; side-effect tool’lar approval ister. Önerilen varsayılan. |
| `confirm` | Tool çağrıları için daha görünür onay akışı kullanılır. |
| `autonomous` | Kullanıcı daha az onay görür; riskli tool’lar yine allowlist ve hard safety sınırları içindedir. |

Uygulama policy değerini modelin talimatı olarak değil, frontend yürütme kuralı olarak ele alır. Bu ayrım, prompt injection veya modelin yanlış yönlendirmesi durumunda kritik işlemlerin doğrudan çalıştırılmasını engeller.

## Context redaction

`maskSecrets` etkin olduğunda header değerleri şu sınıflarda maskelenir: `authorization`, `proxy-authorization`, `cookie`, `set-cookie`, `x-api-key`, `x-auth-token`, `password`, `secret` ve `token`. Maskelenen değer `[REDACTED]` olarak gönderilir.

`includeBodyContext` varsayılan olarak kapalıdır. Kapalıyken body Gemini’ye `[REDACTED OR OMITTED]` placeholder’ı ile gider. Bu ayar açılırsa request body model context’ine dahil edilebilir; kullanıcı bu seçimin Git veya API secret güvenliği açısından etkisini bilerek kullanmalıdır.

Agent audit kaydı yalnızca tool adı, risk, karar, timestamp, sonuç özeti ve hata özetini saklar. API key, raw body, masked header value ve Gemini raw response içindeki secret’lar audit kaydına yazılmaz. Audit dosyası app-data altında tutulur ve 200 kayıtla sınırlandırılır.

## Ayarlar ve kullanım

Tauri desktop uygulamasını açın ve sidebar’daki **Settings** düğmesine basın. Gemini key’i password alanına girin, **Save key** ile kaydedin ve **Test connection** ile doğrulayın. Key status `Configured` olarak görünür; key değeri hiçbir zaman tekrar gösterilmez.

Model adı yapılandırılabilir bırakılmıştır. Google hesabınızın erişebildiği model adını girin. Model listesi veya API erişimi Google tarafında değişebileceği için Onyx tek bir model adına bağımlı değildir. Temperature, max output tokens ve timeout değerlerini kullanım senaryonuza göre ayarlayın.

Header’daki **Agent** düğmesi veya `Ctrl/⌘ + Shift + G` kısayolu Agent panelini açar. Örnek istekler:

```text
Aktif request’in güvenlik açısından riskli header’larını özetle.

Bu response içindeki başarısız alanları açıkla.

Bu request için cURL komutu üret ve gerekli header’ları listele.

Aktif request’i staging environment’a göre kontrol et; gönderme.
```

Agent network request göndermeyi veya request kaydetmeyi önerirse approval kartı görünür. Kartta tool adı, risk sınıfı ve kısa argüman özeti gösterilir. **Approve once** yalnızca o çağrıyı yürütür; **Reject** çağrıyı iptal eder ve audit log’a yazar.

## Hata davranışı

Key yapılandırılmamışsa agent isteği gönderilmeden önce kullanıcıya Settings yönlendirmesi yapılır. Keyring okunamazsa key düz metin olarak kaydedilmez. Gemini endpoint’i hata döndürürse Rust command HTTP status ve redacted hata mesajı döndürür; API key response veya error gövdesine eklenmez.

Request input, model adı, interaction id, timeout, temperature ve token limitleri Rust tarafında doğrulanır. Model adı boş, control character içeren veya aşırı uzun ise reddedilir. Input 1 MiB, system instruction 200 KiB, tool declaration 32 tool ve 256 KiB serialized declaration sınırlarına tabidir. Timeout 100 ms–120 saniye aralığına clamp edilir.

## Test kapsamı

Gemini entegrasyonunda aşağıdaki kontroller çalıştırılır:

```bash
pnpm lint
pnpm exec tsc --noEmit
pnpm build
cargo fmt --manifest-path src-tauri/Cargo.toml -- --check
cargo test --manifest-path src-tauri/Cargo.toml
cargo check --manifest-path src-tauri/Cargo.toml
cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets --all-features -- -D warnings
pnpm tauri build
```

Rust testleri path security, HTTP URL scheme, timeout clamp, Gemini input validation ve local TCP HTTP response sözleşmesini kapsar. Keychain integration testleri platform credential store’unun varlığına bağlı olduğundan CI ortamında secret değerleriyle test edilmez; command davranışı key’i frontend’e döndürmeme sözleşmesiyle korunur.

## Kaynaklar

- [Gemini Function calling](https://ai.google.dev/gemini-api/docs/function-calling)
- [Gemini Interactions API](https://ai.google.dev/gemini-api/docs/interactions-overview)
- [Gemini Models API](https://ai.google.dev/api/models)
- [Rust keyring](https://docs.rs/keyring/latest/keyring/)
