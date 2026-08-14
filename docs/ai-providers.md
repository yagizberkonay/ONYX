# Onyx Agent: Çoklu Sağlayıcı Kullanım Kılavuzu

Onyx Agent, seçtiğiniz yapay zekâ sağlayıcısının API'sine masaüstü uygulamasının Rust katmanı üzerinden bağlanır. Desteklenen sağlayıcılar **ChatGPT/OpenAI, Claude, Gemini, Manus, Kimi ve Groq**'dur. Frontend doğrudan sağlayıcıya istek göndermez; API anahtarı işletim sisteminin credential store'unda tutulur ve yalnızca ilgili native command içinde okunur.

> **Güvenlik ilkesi:** API anahtarları `settings.json`, workspace JSON dosyaları, `.onyx` belgeleri, React state'i ve audit log'lara yazılmaz. Onyx yalnızca anahtarın yapılandırılıp yapılandırılmadığını gösterir; anahtarın kendisini geri döndürmez veya ekranda tekrar göstermez.

## Hızlı kurulum

1. Onyx'i açın ve **Settings → Agent** bölümüne gidin.
2. **Provider** listesinden bir sağlayıcı seçin: ChatGPT/OpenAI, Claude, Gemini, Manus, Kimi veya Groq.
3. Sağlayıcının API panelinden aldığınız anahtarı **API key** alanına girin ve **Save key** düğmesine basın.
4. **Model** alanını seçtiğiniz sağlayıcının hesabınızda etkin olan model adıyla doldurun.
5. İsteğe bağlı olarak özel bir **HTTPS endpoint** tanımlayın. Bu alan OpenAI-compatible proxy, self-hosted gateway veya kurum içi API geçidi içindir.
6. **Test connection** ile bağlantıyı doğrulayın.
7. Agent panelini toolbar'daki **Agent** düğmesiyle veya `Ctrl/⌘ + Shift + G` kısayoluyla açın.

## Sağlayıcı matrisi

| Sağlayıcı | Transport | Varsayılan endpoint | Kimlik doğrulama |
|---|---|---|---|
| ChatGPT / OpenAI | OpenAI-compatible Chat Completions | `https://api.openai.com/v1/chat/completions` | `Authorization: Bearer` |
| Claude | Anthropic Messages | `https://api.anthropic.com/v1/messages` | `x-api-key` + `anthropic-version` |
| Gemini | Gemini Interactions | `https://generativelanguage.googleapis.com/v1beta/interactions` | `x-goog-api-key` |
| Manus | Task create + polling | `https://api.manus.ai/v2/task.create` | `x-manus-api-key` |
| Kimi | OpenAI-compatible Chat Completions | `https://api.moonshot.ai/v1/chat/completions` | `Authorization: Bearer` |
| Groq | OpenAI-compatible Chat Completions | `https://api.groq.com/openai/v1/chat/completions` | `Authorization: Bearer` |

OpenAI, Kimi ve Groq için ortak OpenAI-compatible transport kullanılır. Claude ve Gemini sağlayıcıya özgü payload ve header sözleşmelerini kullanır. Manus ise synchronous chat yerine task oluşturma ve polling akışı olarak normalize edilir.

## Ayarların sadeleştirilmiş anlamı

Son kullanıcı için gerekli dört temel ayar **Provider, Model, API key ve Agent mode** alanlarıdır. Temperature, token limiti, timeout ve endpoint override gibi teknik alanlar yalnızca gelişmiş kullanım içindir.

| Ayar | Basit açıklama | Önerilen değer |
|---|---|---|
| Provider | Hangi AI hizmetinin kullanılacağını belirler. | Hesabınızın bulunduğu sağlayıcı |
| Model | Sağlayıcı içinde çalışacak model kimliğidir. | Sağlayıcının güncel hızlı/ekonomik modeli |
| API key | Sağlayıcı hesabınıza ait gizli erişim anahtarıdır. | Keychain'de saklanır; Onyx bunu göstermez. |
| Agent mode | Agent'ın araç kullanırken ne kadar onay isteyeceğini belirler. | **Confirm side effects** |
| Share request body | Request body'nin AI bağlamına dahil edilip edilmeyeceğini belirler. | Kapalı (varsayılan) |

## Agent policy seçenekleri

| Mod | Davranış |
|---|---|
| `suggest` | Read-only analiz otomatik; side-effect araçlar onay ister. Önerilen varsayılan. |
| `confirm` | Tüm araç çağrıları için görünür onay kartı gösterilir. |
| `autonomous` | Kullanıcı daha az onay görür; riskli araçlar yine allowlist ve güvenlik sınırları içindedir. |

## Gizlilik ve redaction

`maskSecrets` etkin olduğunda `authorization`, `x-api-key`, `cookie`, `password`, `secret` ve `token` içeren header değerleri `[REDACTED]` olarak gönderilir. Request body paylaşımı varsayılan olarak kapalıdır; açılırsa body AI bağlamına dahil edilir. Audit log yalnızca araç adı, risk, karar ve sonuç özetini saklar; ham API yanıtı veya secret değerleri yazılmaz.

## Araç allowlist

Model yalnızca aşağıdaki dört uygulama aracını önerebilir:

| Araç | Risk | Yürütme |
|---|---|---|
| `inspect_current_request` | Read-only | Otomatik |
| `analyze_response` | Read-only | Otomatik |
| `send_current_request` | Network side effect | Onay gerekir |
| `save_current_request` | Filesystem side effect | Onay gerekir |

## Hata davranışı

Anahtar yapılandırılmamışsa Agent isteği gönderilmeden önce kullanıcıya Settings yönlendirmesi yapılır. Keyring okunamazsa anahtar düz metin olarak kaydedilmez. Sağlayıcı endpoint'i hata döndürürse Rust command HTTP status ve redacted hata mesajı döndürür; API anahtarı hata gövdesine eklenmez. Timeout 100 ms–120 saniye aralığına clamp edilir. Input 1 MiB, system instruction 200 KiB ve tool declaration 32 araç ile 256 KiB serialized sınırına tabidir.

## Kaynaklar

- [OpenAI API Reference](https://developers.openai.com/api/reference/overview/)
- [Anthropic Claude API](https://platform.claude.com/docs/en/api/overview)
- [Google Gemini API](https://ai.google.dev/gemini-api/docs)
- [Kimi API Quickstart](https://platform.kimi.ai/docs/overview)
- [Groq API Reference](https://console.groq.com/docs/api-reference)
- [Manus API Introduction](https://open.manus.ai/docs/v2/introduction)
