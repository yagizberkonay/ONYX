# Gemini Entegrasyonu — Uyumluluk Notu

Onyx’in ilk Agent sürümü Gemini’ye özel adlandırmalar kullanıyordu. Güncel sürümde Agent; **ChatGPT/OpenAI, Claude, Gemini, Manus, Kimi ve Groq** sağlayıcılarını ortak, provider bağımsız bir arayüz üzerinden destekler.

Güncel kullanım akışı, endpoint matrisi ve güvenlik sözleşmesi için [`ai-providers.md`](ai-providers.md) dosyası esas alınmalıdır.

## Gemini transport’u

Gemini çağrıları frontend’den yapılmaz. Rust katmanı API key’i işletim sistemi credential store’dan okur, Gemini Interactions API’ye native HTTPS üzerinden `x-goog-api-key` header’ı ile bağlanır ve yanıtı ortak Agent sözleşmesine normalize eder. API key değeri React state’ine, `settings.json` dosyasına, workspace’e, `.onyx` belgesine veya audit log’a yazılmaz.

Gemini seçilse bile Agent’ın privacy ve approval davranışı tüm sağlayıcılarla aynıdır: secret masking açıktır, request body paylaşımı kapalıdır ve network/filesystem etkili tool çağrıları kullanıcı onayından geçer.

## Legacy isimler

Eski kaynaklarda görülebilecek Gemini isimleri geriye dönük uyumluluk alias’larıdır. Yeni geliştirmelerde provider bağımsız adlandırmalar kullanılmalıdır.

| Legacy yüzey | Güncel kullanım |
|---|---|
| `GeminiSettings` | `AgentSettings` |
| `GeminiToolCall` | `AgentToolCall` |
| `GeminiToolDeclaration` | `AgentToolDeclaration` |
| `GeminiInteractionRequest` | `AgentInteractionRequest` |
| `GeminiInteractionResponse` | `AgentInteractionResponse` |
| `executeGeminiInteraction` | `executeAgentInteraction` |

Gerçek Gemini key’lerini otomatik testlere veya Git geçmişine koymayın. Bağlantı doğrulaması Onyx **Settings → Agent → Test** akışından, kullanıcının kendi keychain kaydıyla başlatılmalıdır.

## Resmî kaynaklar

- [Gemini API documentation](https://ai.google.dev/gemini-api/docs)
- [Gemini Interactions API](https://ai.google.dev/gemini-api/docs/interactions-overview)
- [Gemini Function calling](https://ai.google.dev/gemini-api/docs/function-calling)
- [Rust keyring](https://docs.rs/keyring/latest/keyring/)

> Bu dosya yalnızca Gemini migration referansıdır. Çoklu provider Agent’ın güncel kaynağı [`docs/ai-providers.md`](ai-providers.md) dosyasıdır.

*Updated 2026-08-14 after the multi-provider Agent migration.*

**Kısa akış:** Settings → Agent → Gemini seç → model gir → API key kaydet → Test → Agent panelini aç.

Gerçek API key değerleri bu dosyaya veya Git geçmişine yazılmamalıdır.
