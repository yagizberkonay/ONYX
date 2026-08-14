# AI Provider Integration Research

Research basis for the Onyx multi-provider agent integration.

## Official sources and confirmed facts

| Provider | Official source | Confirmed integration contract |
|---|---|---|
| OpenAI / ChatGPT | https://developers.openai.com/api/reference/overview/ | Direct REST API; standard application requests use a Bearer API key. The official reference recommends the Responses API for direct model requests and tool use, while `POST /v1/chat/completions` remains a documented compatible surface. API keys must stay secret and should not be exposed in client-side code. |
| Anthropic / Claude | https://platform.claude.com/docs/en/api/overview | Direct REST API base is `https://api.anthropic.com`; Messages API is `POST /v1/messages`. Requests require `x-api-key` or bearer authorization, `anthropic-version`, and JSON content type. |
| Google Gemini | https://ai.google.dev/gemini-api/docs | The Interactions API is recommended for the latest models and agents. REST example: `POST https://generativelanguage.googleapis.com/v1beta/interactions` with `x-goog-api-key`. |
| Moonshot / Kimi | https://platform.kimi.ai/docs/overview | Kimi API is OpenAI-compatible. Global endpoint uses `https://api.moonshot.ai/v1/chat/completions` with Bearer API key. Current docs recommend `kimi-k3`; tool calls and multimodal input are supported. |
| Groq | https://console.groq.com/docs/api-reference | Groq provides an OpenAI-compatible API. The official API reference and quickstart document chat completion access with an API key; the standard base is `https://api.groq.com/openai/v1`. |
| Manus | https://open.manus.ai/docs/v2/introduction | Manus exposes a separate agent-task REST API rather than a normal chat-completions model endpoint. The API supports programmatic task creation and management; task-style integration must be represented separately from synchronous model chat. |

## Architecture implications

Onyx should keep all provider credentials in the operating-system credential store and never serialize them into workspace JSON, `.onyx` documents, audit logs, or frontend state. The Rust layer should own outbound network calls and expose one normalized response contract to the frontend.

OpenAI, Kimi, and Groq can share an OpenAI-compatible transport with provider-specific base URLs and model identifiers. Claude requires its own Messages payload and headers. Gemini should use the Interactions payload and `x-goog-api-key`. Manus should be a task-mode provider with asynchronous task creation/status handling rather than being forced into the synchronous chat contract.

The user-facing settings should therefore ask for only Provider, Model, API key, and optional endpoint override. Advanced headers, organization/project identifiers, temperature, token limits, and provider-specific reasoning controls should remain behind an Advanced section. Existing request-body sharing, secret masking, tool approval, and redacted audit behavior must remain enabled by default.

## References

1. [OpenAI API Overview](https://developers.openai.com/api/reference/overview/)
2. [Claude API Overview](https://platform.claude.com/docs/en/api/overview)
3. [Gemini API Documentation](https://ai.google.dev/gemini-api/docs)
4. [Kimi API Quickstart](https://platform.kimi.ai/docs/overview)
5. [Groq API Reference](https://console.groq.com/docs/api-reference)
6. [Manus API Introduction](https://open.manus.ai/docs/v2/introduction)
