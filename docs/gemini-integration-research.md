# Gemini BYOK Entegrasyon Araştırması

**Araştırma tarihi:** 13 Ağustos 2026

## Resmi Gemini API bulguları

Google Gemini dokümantasyonu, yeni model ve agent özellikleri için Interactions API’yi öneriyor. REST çağrıları `https://generativelanguage.googleapis.com/v1beta/interactions` endpoint’ine yapılabiliyor ve API anahtarı `x-goog-api-key` header’ı ile gönderiliyor. `model`, `input`, `tools` ve isteğe bağlı `stream` alanları destekleniyor.

Function calling akışı dört aşamalı: uygulama function declaration’larını modele gönderir; model function call ve yapılandırılmış argümanlar üretir; uygulama allowlist içindeki aracı çalıştırır; sonuç tekrar modele veya kullanıcıya sunulur. Bu nedenle Onyx modelin doğrudan filesystem veya network erişimi almasına izin vermemeli, yalnızca uygulamanın tanımladığı araçları yürütmelidir.

Gemini Models endpoint’i `GET https://generativelanguage.googleapis.com/v1beta/models` olarak belgelenmiştir ve kullanılabilir modeller ile desteklenen yetenekleri listeler. Onyx model adını yapılandırılabilir tutmalı, varsayılan modeli sabit bir sözleşme gibi gömmemeli ve model listesi alınamazsa kullanıcı tarafından girilen model adını kabul etmelidir.

Multi-turn conversations için Interactions API `previous_interaction_id` destekler; ancak local-first ve privacy-first davranış için Onyx’in varsayılanı konuşma geçmişini keychain veya Git workspace’e göndermemek, stateless/local history kullanmak ve kullanıcıya açık bir paylaşım kontrolü sunmak olmalıdır.

## Keychain bulguları

`keyring` Rust crate’i platformlar arası secret erişimi sağlar ve macOS, Windows ve Unix tabanlı sistemlerde native credential store’lara bağlanabilir. Onyx API anahtarını `service=onyx` ve `user=gemini-api-key` gibi sabit bir credential kimliğiyle saklamalı; JSON workspace dosyalarına veya Git’e yazmamalıdır. Keyring erişilemezse uygulama anahtarın düz metin olarak kaydedilmesini varsayılan olarak reddetmeli ve açık bir session-only fallback sunmalıdır.

## Uygulama kararları

| Alan | Karar |
|---|---|
| API çağrısı | Rust backend üzerinden native HTTPS; frontend’den doğrudan Gemini çağrısı yok. |
| Kimlik | `x-goog-api-key` header’ı; API key frontend state’inde kalıcı tutulmaz. |
| Varsayılan model | Yapılandırılabilir; UI kullanıcıya model adı girişi ve model listesi yenileme sunar. |
| Tool erişimi | Sabit allowlist; model yalnızca tool declaration görebilir, doğrudan OS erişimi alamaz. |
| Read-only araçlar | Request/collection/environment/response analizleri otomatik olabilir. |
| Side-effect araçları | Request gönderme, dosyaya yazma, collection silme/değiştirme varsayılan olarak onay gerektirir. |
| Audit | Tool önerisi, kullanıcı kararı, sonuç ve hata redacted audit log’a yazılır; API key ve secret değerler maskelenir. |
| Gizlilik | Gemini’ye yalnızca gerekli ve redacted context gönderilir; headers/body secret masking ayarı bulunur. |

## Kaynaklar

1. Google AI for Developers — Function calling with the Gemini API: https://ai.google.dev/gemini-api/docs/function-calling
2. Google AI for Developers — Getting started with the Interactions API: https://ai.google.dev/gemini-api/docs/get-started
3. Google AI for Developers — Models API reference: https://ai.google.dev/api/models
4. docs.rs — keyring 4.1.6: https://docs.rs/keyring/latest/keyring/

## Interactions API ayrıntıları

Interactions API 2026-08-11 tarihinde güncellenen resmi dokümana göre yeni Gemini modelleri ve agent iş akışları için önerilen arayüzdür. `store=false` isteği stateless davranış sağlar ve Onyx’in local-first gizlilik varsayılanıyla uyumludur; `store=true` ise Gemini tarafında interaction saklayabilir. Onyx varsayılan olarak `store=false` kullanmalıdır.

Dokümantasyonda `system_instruction`, `tools`, `generation_config` ve `previous_interaction_id` interaction-scoped alanlar olarak açıklanır. Tool declaration yalnızca modelin çağrı önermesini sağlar; tool sonucunu uygulama yürütür. Onyx bu yüzden tool çağrısını doğrudan gerçekleştirmeden önce allowlist ve kullanıcı onayı uygulamalıdır.

Interactions API REST örneği: `POST https://generativelanguage.googleapis.com/v1beta/interactions`, `x-goog-api-key` header’ı ve `Content-Type: application/json`. Resmi örneklerde `gemini-3.6-flash` gösterilir; Onyx model adını kullanıcı tarafından yapılandırılabilir tutacaktır.

Kaynak: https://ai.google.dev/gemini-api/docs/interactions-overview
