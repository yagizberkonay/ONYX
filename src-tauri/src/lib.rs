use std::fs;
use std::path::{Component, Path, PathBuf};
use std::time::{Duration, Instant};

use keyring::Entry;
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Manager};

const MAX_RESPONSE_BYTES: usize = 5 * 1024 * 1024;
const MAX_GEMINI_RESPONSE_BYTES: usize = 2 * 1024 * 1024;
const GEMINI_API_URL: &str = "https://generativelanguage.googleapis.com/v1beta/interactions";
const GEMINI_KEYRING_SERVICE: &str = "com.onyx.api";
const GEMINI_KEYRING_USER: &str = "gemini-api-key";
const DEFAULT_TIMEOUT_MS: u64 = 30_000;
const MAX_TIMEOUT_MS: u64 = 120_000;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct FileSnapshot {
    path: String,
    content: String,
    exists: bool,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct HeaderEntry {
    name: String,
    value: String,
    enabled: bool,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct NativeHttpRequest {
    method: String,
    url: String,
    headers: Vec<HeaderEntry>,
    body: String,
    timeout_ms: u64,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct WorkspaceInfo {
    root: String,
    exists: bool,
    is_git_repository: bool,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct ResponseTiming {
    total_ms: u128,
    request_ms: u128,
    download_ms: u128,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct NativeHttpResponse {
    status: u16,
    status_text: String,
    url: String,
    headers: Vec<HeaderEntry>,
    body: String,
    response_time_ms: u128,
    content_type: Option<String>,
    truncated: bool,
    timing: ResponseTiming,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct GeminiInteractionRequest {
    model: String,
    input: String,
    system_instruction: Option<String>,
    temperature: Option<f64>,
    max_output_tokens: Option<u32>,
    previous_interaction_id: Option<String>,
    tools: Option<Vec<serde_json::Value>>,
    timeout_ms: Option<u64>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct GeminiToolCall {
    id: Option<String>,
    name: String,
    arguments: serde_json::Value,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct GeminiInteractionResponse {
    interaction_id: Option<String>,
    status: Option<String>,
    text: String,
    tool_calls: Vec<GeminiToolCall>,
    total_tokens: Option<u64>,
    raw: serde_json::Value,
    response_time_ms: u128,
}

fn gemini_keyring_entry() -> Result<Entry, String> {
    Entry::new(GEMINI_KEYRING_SERVICE, GEMINI_KEYRING_USER)
        .map_err(|error| format!("Could not access the operating system credential store: {error}"))
}

fn is_missing_keyring_entry(error: &keyring::Error) -> bool {
    error.to_string().to_ascii_lowercase().contains("no entry")
}

fn get_gemini_api_key() -> Result<String, String> {
    let entry = gemini_keyring_entry()?;
    match entry.get_password() {
        Ok(value) if !value.trim().is_empty() => Ok(value),
        Ok(_) => Err("Gemini API key is empty. Configure it in Settings.".to_string()),
        Err(error) if is_missing_keyring_entry(&error) => {
            Err("Gemini API key is not configured. Add it in Settings.".to_string())
        }
        Err(error) => Err(format!(
            "Could not read the Gemini API key securely: {error}"
        )),
    }
}

fn validate_gemini_request(request: &GeminiInteractionRequest) -> Result<(), String> {
    let model = request.model.trim();
    if model.is_empty() || model.len() > 128 || model.chars().any(char::is_control) {
        return Err("Gemini model name is invalid.".to_string());
    }
    if request.input.trim().is_empty() || request.input.len() > 1_000_000 {
        return Err("Gemini input must be non-empty and no larger than 1 MB.".to_string());
    }
    if let Some(instruction) = &request.system_instruction {
        if instruction.len() > 200_000 {
            return Err("Gemini system instruction is too large.".to_string());
        }
    }
    if let Some(id) = &request.previous_interaction_id {
        if id.len() > 256 || id.chars().any(char::is_control) {
            return Err("Gemini interaction ID is invalid.".to_string());
        }
    }
    if let Some(temperature) = request.temperature {
        if !temperature.is_finite() || !(0.0..=2.0).contains(&temperature) {
            return Err("Gemini temperature must be between 0 and 2.".to_string());
        }
    }
    if let Some(max_output_tokens) = request.max_output_tokens {
        if !(1..=65_536).contains(&max_output_tokens) {
            return Err("Gemini max output tokens must be between 1 and 65536.".to_string());
        }
    }
    if let Some(tools) = &request.tools {
        if tools.len() > 32 {
            return Err("Gemini tool declarations are limited to 32 tools.".to_string());
        }
        let serialized = serde_json::to_vec(tools)
            .map_err(|error| format!("Could not serialize Gemini tools: {error}"))?;
        if serialized.len() > 256 * 1024 {
            return Err("Gemini tool declarations are too large.".to_string());
        }
    }

    Ok(())
}

fn collect_gemini_tool_calls(value: &serde_json::Value, calls: &mut Vec<GeminiToolCall>) {
    match value {
        serde_json::Value::Object(object) => {
            let step_type = object
                .get("type")
                .and_then(serde_json::Value::as_str)
                .unwrap_or("");
            if step_type.contains("function_call") || step_type.contains("tool_call") {
                let function = object.get("function").unwrap_or(value);
                let name = function
                    .get("name")
                    .and_then(serde_json::Value::as_str)
                    .unwrap_or("unknown_tool")
                    .to_string();
                let arguments = function
                    .get("arguments")
                    .cloned()
                    .unwrap_or_else(|| serde_json::json!({}));
                calls.push(GeminiToolCall {
                    id: object
                        .get("id")
                        .and_then(serde_json::Value::as_str)
                        .map(ToOwned::to_owned),
                    name,
                    arguments,
                });
            }
            for child in object.values() {
                collect_gemini_tool_calls(child, calls);
            }
        }
        serde_json::Value::Array(values) => {
            for child in values {
                collect_gemini_tool_calls(child, calls);
            }
        }
        _ => {}
    }
}

fn collect_gemini_text(value: &serde_json::Value, output: &mut Vec<String>) {
    match value {
        serde_json::Value::Object(object) => {
            if object.get("type").and_then(serde_json::Value::as_str) == Some("text") {
                if let Some(text) = object.get("text").and_then(serde_json::Value::as_str) {
                    output.push(text.to_string());
                }
            }
            for child in object.values() {
                collect_gemini_text(child, output);
            }
        }
        serde_json::Value::Array(values) => {
            for child in values {
                collect_gemini_text(child, output);
            }
        }
        _ => {}
    }
}

#[tauri::command]
fn get_gemini_key_status() -> Result<bool, String> {
    let entry = gemini_keyring_entry()?;
    match entry.get_password() {
        Ok(value) => Ok(!value.trim().is_empty()),
        Err(error) if is_missing_keyring_entry(&error) => Ok(false),
        Err(error) => Err(format!("Could not read the Gemini API key status: {error}")),
    }
}

#[tauri::command]
fn set_gemini_api_key(api_key: String) -> Result<(), String> {
    let normalized_key = api_key.trim();
    if normalized_key.is_empty() {
        return Err("Gemini API key cannot be empty.".to_string());
    }
    if normalized_key.len() > 512 {
        return Err("Gemini API key is longer than the supported limit.".to_string());
    }

    gemini_keyring_entry()?
        .set_password(normalized_key)
        .map_err(|error| format!("Could not store the Gemini API key securely: {error}"))
}

#[tauri::command]
fn delete_gemini_api_key() -> Result<(), String> {
    let entry = gemini_keyring_entry()?;
    match entry.delete_credential() {
        Ok(()) => Ok(()),
        Err(error) if is_missing_keyring_entry(&error) => Ok(()),
        Err(error) => Err(format!("Could not remove the Gemini API key: {error}")),
    }
}

fn validate_relative_path(relative_path: &str) -> Result<(), String> {
    let requested_path = Path::new(relative_path);
    let is_safe_relative_path = !relative_path.trim().is_empty()
        && requested_path
            .components()
            .all(|component| matches!(component, Component::Normal(_)));

    if !is_safe_relative_path {
        return Err(
            "Only non-empty relative paths without '.' or '..' segments are allowed.".to_string(),
        );
    }

    Ok(())
}

fn app_data_file(app: &AppHandle, relative_path: &str) -> Result<PathBuf, String> {
    validate_relative_path(relative_path)?;
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|error| format!("Could not resolve the Onyx app data directory: {error}"))?;

    Ok(app_data_dir.join(relative_path))
}

fn workspace_file(
    app: &AppHandle,
    workspace_root: Option<&str>,
    relative_path: &str,
    create_parent: bool,
) -> Result<PathBuf, String> {
    validate_relative_path(relative_path)?;

    let root = match workspace_root {
        Some(root) if !root.trim().is_empty() => {
            let path = PathBuf::from(root);
            if !path.is_absolute() {
                return Err("Workspace root must be an absolute path.".to_string());
            }
            path
        }
        _ => app
            .path()
            .app_data_dir()
            .map_err(|error| format!("Could not resolve the Onyx app data directory: {error}"))?,
    };

    if create_parent {
        fs::create_dir_all(&root).map_err(|error| {
            format!(
                "Could not create workspace root {}: {error}",
                root.display()
            )
        })?;
    }

    let canonical_root = fs::canonicalize(&root).map_err(|error| {
        format!(
            "Could not access workspace root {}: {error}",
            root.display()
        )
    })?;
    let candidate = canonical_root.join(relative_path);

    if let Some(parent) = candidate.parent() {
        if create_parent {
            fs::create_dir_all(parent)
                .map_err(|error| format!("Could not create {}: {error}", parent.display()))?;
        }

        if parent.exists() {
            let canonical_parent = fs::canonicalize(parent)
                .map_err(|error| format!("Could not access {}: {error}", parent.display()))?;
            if !canonical_parent.starts_with(&canonical_root) {
                return Err("Workspace path escapes the selected workspace root.".to_string());
            }
        }
    }

    if candidate.exists() {
        let canonical_candidate = fs::canonicalize(&candidate)
            .map_err(|error| format!("Could not access {}: {error}", candidate.display()))?;
        if !canonical_candidate.starts_with(&canonical_root) {
            return Err("Workspace path escapes the selected workspace root.".to_string());
        }
    }

    Ok(candidate)
}

fn read_file(path: &Path, relative_path: String) -> Result<FileSnapshot, String> {
    match fs::read_to_string(path) {
        Ok(content) => Ok(FileSnapshot {
            path: relative_path,
            content,
            exists: true,
        }),
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => Ok(FileSnapshot {
            path: relative_path,
            content: String::new(),
            exists: false,
        }),
        Err(error) => Err(format!("Could not read {}: {error}", path.display())),
    }
}

fn write_file(path: &Path, relative_path: String, content: String) -> Result<FileSnapshot, String> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)
            .map_err(|error| format!("Could not create {}: {error}", parent.display()))?;
    }

    fs::write(path, content.as_bytes())
        .map_err(|error| format!("Could not write {}: {error}", path.display()))?;

    Ok(FileSnapshot {
        path: relative_path,
        content,
        exists: true,
    })
}

#[tauri::command]
fn read_local_file(app: AppHandle, relative_path: String) -> Result<FileSnapshot, String> {
    let path = app_data_file(&app, &relative_path)?;
    read_file(&path, relative_path)
}

#[tauri::command]
fn write_local_file(
    app: AppHandle,
    relative_path: String,
    content: String,
) -> Result<FileSnapshot, String> {
    let path = app_data_file(&app, &relative_path)?;
    write_file(&path, relative_path, content)
}

#[tauri::command]
fn read_workspace_file(
    app: AppHandle,
    workspace_root: Option<String>,
    relative_path: String,
) -> Result<FileSnapshot, String> {
    let path = workspace_file(&app, workspace_root.as_deref(), &relative_path, false)?;
    read_file(&path, relative_path)
}

#[tauri::command]
fn write_workspace_file(
    app: AppHandle,
    workspace_root: Option<String>,
    relative_path: String,
    content: String,
) -> Result<FileSnapshot, String> {
    let path = workspace_file(&app, workspace_root.as_deref(), &relative_path, true)?;
    write_file(&path, relative_path, content)
}

fn validate_http_url(url: &str) -> Result<reqwest::Url, String> {
    let parsed =
        reqwest::Url::parse(url).map_err(|error| format!("Invalid request URL: {error}"))?;
    if !matches!(parsed.scheme(), "http" | "https") {
        return Err("Only http:// and https:// request URLs are allowed.".to_string());
    }
    Ok(parsed)
}

fn allowed_timeout(timeout_ms: u64) -> Duration {
    Duration::from_millis(timeout_ms.clamp(100, MAX_TIMEOUT_MS))
}

#[tauri::command]
fn inspect_workspace(
    app: AppHandle,
    workspace_root: Option<String>,
) -> Result<WorkspaceInfo, String> {
    let root = match workspace_root {
        Some(root) if !root.trim().is_empty() => {
            let path = PathBuf::from(root);
            if !path.is_absolute() {
                return Err("Workspace root must be an absolute path.".to_string());
            }
            path
        }
        _ => app
            .path()
            .app_data_dir()
            .map_err(|error| format!("Could not resolve the Onyx app data directory: {error}"))?,
    };

    Ok(WorkspaceInfo {
        root: root.to_string_lossy().to_string(),
        exists: root.exists(),
        is_git_repository: root.join(".git").exists(),
    })
}

#[tauri::command]
async fn execute_http_request(request: NativeHttpRequest) -> Result<NativeHttpResponse, String> {
    let url = validate_http_url(&request.url)?;
    let method = request
        .method
        .parse::<reqwest::Method>()
        .map_err(|error| format!("Invalid HTTP method: {error}"))?;
    let timeout = if request.timeout_ms == 0 {
        Duration::from_millis(DEFAULT_TIMEOUT_MS)
    } else {
        allowed_timeout(request.timeout_ms)
    };

    let client = reqwest::Client::builder()
        .timeout(timeout)
        .user_agent("Onyx/0.1")
        .build()
        .map_err(|error| format!("Could not create HTTP client: {error}"))?;

    let mut builder = client.request(method.clone(), url.clone());
    for header in request.headers.iter().filter(|header| header.enabled) {
        if header.name.trim().is_empty() {
            continue;
        }

        let name = reqwest::header::HeaderName::from_bytes(header.name.trim().as_bytes())
            .map_err(|error| format!("Invalid header name '{}': {error}", header.name))?;
        let value = reqwest::header::HeaderValue::from_str(header.value.trim())
            .map_err(|error| format!("Invalid value for header '{}': {error}", header.name))?;
        builder = builder.header(name, value);
    }

    if !matches!(method, reqwest::Method::GET | reqwest::Method::HEAD)
        && !request.body.trim().is_empty()
    {
        builder = builder.body(request.body);
    }

    let started_at = Instant::now();
    let response = builder
        .send()
        .await
        .map_err(|error| format!("HTTP request failed: {error}"))?;
    let request_ms = started_at.elapsed().as_millis();
    let status = response.status();
    let status_text = status.canonical_reason().unwrap_or("").to_string();
    let response_url = response.url().to_string();
    let content_type = response
        .headers()
        .get(reqwest::header::CONTENT_TYPE)
        .and_then(|value| value.to_str().ok())
        .map(ToOwned::to_owned);
    let response_headers = response
        .headers()
        .iter()
        .map(|(name, value)| HeaderEntry {
            name: name.to_string(),
            value: value.to_str().unwrap_or("<binary>").to_string(),
            enabled: true,
        })
        .collect::<Vec<_>>();

    let bytes = response
        .bytes()
        .await
        .map_err(|error| format!("Could not read HTTP response: {error}"))?;
    let truncated = bytes.len() > MAX_RESPONSE_BYTES;
    let body_bytes = if truncated {
        &bytes[..MAX_RESPONSE_BYTES]
    } else {
        &bytes[..]
    };
    let total_ms = started_at.elapsed().as_millis();
    Ok(NativeHttpResponse {
        status: status.as_u16(),
        status_text,
        url: response_url,
        headers: response_headers,
        body: String::from_utf8_lossy(body_bytes).to_string(),
        response_time_ms: total_ms,
        content_type,
        truncated,
        timing: ResponseTiming {
            total_ms,
            request_ms,
            download_ms: total_ms.saturating_sub(request_ms),
        },
    })
}

#[tauri::command]
async fn execute_gemini_interaction(
    request: GeminiInteractionRequest,
) -> Result<GeminiInteractionResponse, String> {
    validate_gemini_request(&request)?;
    let api_key = get_gemini_api_key()?;
    let timeout = allowed_timeout(request.timeout_ms.unwrap_or(DEFAULT_TIMEOUT_MS));

    let mut payload = serde_json::json!({
        "model": request.model.trim(),
        "input": request.input,
        "store": false,
    });
    if let Some(system_instruction) = request.system_instruction {
        payload["system_instruction"] = serde_json::Value::String(system_instruction);
    }
    if let Some(previous_interaction_id) = request.previous_interaction_id {
        payload["previous_interaction_id"] = serde_json::Value::String(previous_interaction_id);
    }
    if let Some(tools) = request.tools {
        payload["tools"] = serde_json::Value::Array(tools);
    }
    let mut generation_config = serde_json::Map::new();
    if let Some(temperature) = request.temperature {
        generation_config.insert("temperature".to_string(), serde_json::json!(temperature));
    }
    if let Some(max_output_tokens) = request.max_output_tokens {
        generation_config.insert(
            "max_output_tokens".to_string(),
            serde_json::json!(max_output_tokens),
        );
    }
    if !generation_config.is_empty() {
        payload["generation_config"] = serde_json::Value::Object(generation_config);
    }

    let client = reqwest::Client::builder()
        .timeout(timeout)
        .user_agent("Onyx/0.1 GeminiAgent")
        .build()
        .map_err(|error| format!("Could not create Gemini HTTP client: {error}"))?;
    let started_at = Instant::now();
    let response = client
        .post(GEMINI_API_URL)
        .header("x-goog-api-key", api_key)
        .header(reqwest::header::CONTENT_TYPE, "application/json")
        .json(&payload)
        .send()
        .await
        .map_err(|error| format!("Gemini request failed: {error}"))?;

    let status = response.status();
    let body = response
        .bytes()
        .await
        .map_err(|error| format!("Could not read Gemini response: {error}"))?;
    if body.len() > MAX_GEMINI_RESPONSE_BYTES {
        return Err("Gemini response exceeded the 2 MiB safety limit.".to_string());
    }
    let body_text = String::from_utf8_lossy(&body).to_string();
    let raw: serde_json::Value = serde_json::from_slice(&body).map_err(|error| {
        format!(
            "Gemini returned invalid JSON (HTTP {}): {error}",
            status.as_u16()
        )
    })?;
    if !status.is_success() {
        let message = raw
            .get("error")
            .and_then(|error| error.get("message"))
            .and_then(serde_json::Value::as_str)
            .unwrap_or(body_text.as_str());
        return Err(format!(
            "Gemini request failed with HTTP {}: {message}",
            status.as_u16()
        ));
    }

    let mut text_parts = Vec::new();
    collect_gemini_text(&raw, &mut text_parts);
    let mut tool_calls = Vec::new();
    collect_gemini_tool_calls(&raw, &mut tool_calls);
    let total_tokens = raw
        .get("usage")
        .and_then(|usage| usage.get("total_tokens"))
        .and_then(serde_json::Value::as_u64);

    Ok(GeminiInteractionResponse {
        interaction_id: raw
            .get("id")
            .and_then(serde_json::Value::as_str)
            .map(ToOwned::to_owned),
        status: raw
            .get("status")
            .and_then(serde_json::Value::as_str)
            .map(ToOwned::to_owned),
        text: text_parts.join("\n"),
        tool_calls,
        total_tokens,
        raw,
        response_time_ms: started_at.elapsed().as_millis(),
    })
}

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }

            let app_handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                tokio::time::sleep(Duration::from_secs(3)).await;
                if let Some(splash) = app_handle.get_webview_window("splash") {
                    let _ = splash.close();
                }
                if let Some(main_window) = app_handle.get_webview_window("main") {
                    let _ = main_window.show();
                    let _ = main_window.set_focus();
                }
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            read_local_file,
            write_local_file,
            read_workspace_file,
            write_workspace_file,
            inspect_workspace,
            execute_http_request,
            get_gemini_key_status,
            set_gemini_api_key,
            delete_gemini_api_key,
            execute_gemini_interaction
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[cfg(test)]
mod tests {
    use super::{
        allowed_timeout, execute_http_request, validate_gemini_request, validate_http_url,
        validate_relative_path, GeminiInteractionRequest, HeaderEntry, NativeHttpRequest,
        MAX_TIMEOUT_MS,
    };
    use std::time::Duration;
    use tokio::io::{AsyncReadExt, AsyncWriteExt};
    use tokio::net::TcpListener;

    #[test]
    fn accepts_nested_relative_paths() {
        assert!(validate_relative_path("collections/workspace.json").is_ok());
    }

    #[test]
    fn rejects_empty_absolute_and_traversal_paths() {
        for path in [
            "",
            "/tmp/onyx.json",
            "../onyx.json",
            "requests/../workspace.json",
            "./workspace.json",
        ] {
            assert!(
                validate_relative_path(path).is_err(),
                "path should be rejected: {path}"
            );
        }
    }

    #[test]
    fn accepts_only_http_schemes() {
        assert!(validate_http_url("https://example.com/api").is_ok());
        assert!(validate_http_url("file:///tmp/secret").is_err());
        assert!(validate_http_url("not-a-url").is_err());
    }

    #[test]
    fn clamps_request_timeout() {
        assert_eq!(allowed_timeout(0), Duration::from_millis(100));
        assert_eq!(allowed_timeout(500), Duration::from_millis(500));
        assert_eq!(
            allowed_timeout(MAX_TIMEOUT_MS * 2),
            Duration::from_millis(MAX_TIMEOUT_MS)
        );
    }

    #[test]
    fn validates_gemini_request_limits() {
        let valid = GeminiInteractionRequest {
            model: "gemini-2.5-flash".to_string(),
            input: "Inspect the current request".to_string(),
            system_instruction: Some("Keep secrets redacted.".to_string()),
            temperature: Some(0.2),
            max_output_tokens: Some(1024),
            previous_interaction_id: None,
            tools: None,
            timeout_ms: Some(30_000),
        };
        assert!(validate_gemini_request(&valid).is_ok());

        let mut invalid_temperature = valid;
        invalid_temperature.temperature = Some(2.1);
        assert!(validate_gemini_request(&invalid_temperature).is_err());

        let mut invalid_model = invalid_temperature;
        invalid_model.temperature = Some(0.2);
        invalid_model.model = "\n".to_string();
        assert!(validate_gemini_request(&invalid_model).is_err());

        let mut invalid_input = invalid_model;
        invalid_input.model = "gemini-2.5-flash".to_string();
        invalid_input.input = "   ".to_string();
        assert!(validate_gemini_request(&invalid_input).is_err());
    }

    #[tokio::test]
    async fn executes_native_http_request_against_local_server() {
        let listener = TcpListener::bind(("127.0.0.1", 0)).await.unwrap();
        let address = listener.local_addr().unwrap();
        let server = tokio::spawn(async move {
            let (mut socket, _) = listener.accept().await.unwrap();
            let mut request_bytes = [0_u8; 4096];
            let _ = socket.read(&mut request_bytes).await.unwrap();
            let response = concat!(
                "HTTP/1.1 200 OK\r\n",
                "Content-Type: application/json\r\n",
                "X-Onyx-Test: passed\r\n",
                "Connection: close\r\n",
                "\r\n",
                "{\"ok\":true}"
            );
            socket.write_all(response.as_bytes()).await.unwrap();
        });

        let response = execute_http_request(NativeHttpRequest {
            method: "GET".to_string(),
            url: format!("http://{address}/health"),
            headers: vec![HeaderEntry {
                name: "X-Onyx-Client".to_string(),
                value: "test".to_string(),
                enabled: true,
            }],
            body: String::new(),
            timeout_ms: 1_000,
        })
        .await
        .unwrap();

        assert_eq!(response.status, 200);
        assert_eq!(response.content_type.as_deref(), Some("application/json"));
        assert_eq!(response.body, "{\"ok\":true}");
        assert!(!response.truncated);
        assert!(response
            .headers
            .iter()
            .any(|header| header.name.eq_ignore_ascii_case("x-onyx-test")
                && header.value == "passed"));

        server.await.unwrap();
    }
}
