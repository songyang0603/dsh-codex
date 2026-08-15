use codex_app_server_protocol::CommandExecutionRequestApprovalParams;
use codex_app_server_protocol::CommandExecutionRequestApprovalResponse;
use serde::Deserialize;
use serde::Serialize;
use serde::de::DeserializeOwned;
use serde_json::Value;
use serde_json::json;
use std::io::BufRead;
use std::io::Write;

pub const PROTOCOL_VERSION: u32 = 1;
pub const CODEX_COMMIT: &str = "086396f7f60347b74c82784d5dfaf4fb2d3bda12";
pub const CODEX_REPOSITORY: &str = "https://github.com/openai/codex";
pub const CODEX_APP_SERVER_PROTOCOL_PACKAGE: &str = "codex-app-server-protocol";
pub const CODEX_APP_SERVER_PROTOCOL_VERSION: &str = "0.0.0";
pub const CODEX_APP_SERVER_PROTOCOL_TREE: &str = "1120727af584eecf578cdd6a5c63d3a9146167c8";
pub const CODEX_APP_SERVER_PROTOCOL_V2_TREE: &str = "079e6cf5d2adbe98f3d3fd6fa3fbc2acb9b0b252";
pub const COMMAND_APPROVAL_ITEM_BLOB: &str = "dcfe928508e8eef1af3b3f05c739860e75c0d607";
pub const COMMAND_APPROVAL_PERMISSIONS_BLOB: &str = "9360934aa4c92e907a905926b490463cdd66a163";
pub const CODEX_CARGO_LOCK_BLOB: &str = "a8c2addc02055be48c345b65760a7a1b96cfbf28";

pub const PARSE_REQUEST_METHOD: &str = "parse_command_execution_request_approval";
pub const PARSE_RESPONSE_METHOD: &str = "parse_command_execution_request_approval_response";

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct Request {
    protocol_version: u32,
    id: Value,
    method: String,
    params: Value,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct RawJsonParams {
    raw_json: String,
}

#[derive(Debug, Deserialize)]
#[serde(deny_unknown_fields)]
struct EmptyParams {}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct ErrorBody {
    code: &'static str,
    message: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct Response {
    protocol_version: u32,
    id: Value,
    #[serde(skip_serializing_if = "Option::is_none")]
    result: Option<Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    error: Option<ErrorBody>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct Hello {
    protocol_version: u32,
    engine_version: &'static str,
    codex_repository: &'static str,
    codex_commit: &'static str,
    codex_app_server_protocol_package: &'static str,
    codex_app_server_protocol_version: &'static str,
    codex_app_server_protocol_tree: &'static str,
    codex_app_server_protocol_v2_tree: &'static str,
    command_approval_item_blob: &'static str,
    command_approval_permissions_blob: &'static str,
    codex_cargo_lock_blob: &'static str,
    os: &'static str,
    arch: &'static str,
    pointer_width: u32,
    methods: [&'static str; 2],
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct IntegerLexeme {
    pointer: String,
    decimal_lexeme: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct SubjectError {
    code: &'static str,
    message: String,
    line: usize,
    column: usize,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct ParseResult {
    accepted: bool,
    canonical_json: Option<String>,
    integer_lexemes: Vec<IntegerLexeme>,
    error: Option<SubjectError>,
}

enum Dispatch {
    Continue(Value),
    Shutdown(Value),
}

#[derive(Debug)]
struct RpcFault {
    code: &'static str,
    message: String,
}

impl RpcFault {
    fn new(code: &'static str, message: impl Into<String>) -> Self {
        Self {
            code,
            message: message.into(),
        }
    }
}

pub fn run<R: BufRead, W: Write>(mut input: R, mut output: W) -> std::io::Result<()> {
    loop {
        let mut bytes = Vec::new();
        let read = input.read_until(b'\n', &mut bytes)?;
        if read == 0 {
            return Ok(());
        }
        while matches!(bytes.last(), Some(b'\n' | b'\r')) {
            bytes.pop();
        }
        if bytes.iter().all(u8::is_ascii_whitespace) {
            continue;
        }

        let (response, shutdown) = match std::str::from_utf8(&bytes) {
            Ok(line) => handle_line(line),
            Err(error) => (
                error_response(
                    Value::Null,
                    "invalid_request",
                    format!("request line is not valid UTF-8: {error}"),
                ),
                false,
            ),
        };

        serde_json::to_writer(&mut output, &response).map_err(std::io::Error::other)?;
        output.write_all(b"\n")?;
        output.flush()?;
        if shutdown {
            return Ok(());
        }
    }
}

fn handle_line(line: &str) -> (Response, bool) {
    let request = match serde_json::from_str::<Request>(line) {
        Ok(request) => request,
        Err(error) => {
            return (
                error_response(Value::Null, "invalid_request", error.to_string()),
                false,
            );
        }
    };
    handle_request(request)
}

fn handle_request(request: Request) -> (Response, bool) {
    let id = request.id;
    if !matches!(id, Value::Null | Value::String(_) | Value::Number(_)) {
        return (
            error_response(
                Value::Null,
                "invalid_request",
                "id must be a string, number, or null",
            ),
            false,
        );
    }
    if request.protocol_version != PROTOCOL_VERSION {
        return (
            error_response(
                id,
                "protocol_mismatch",
                format!(
                    "expected protocol version {PROTOCOL_VERSION}, got {}",
                    request.protocol_version
                ),
            ),
            false,
        );
    }

    match dispatch(&request.method, request.params) {
        Ok(Dispatch::Continue(result)) => (success_response(id, result), false),
        Ok(Dispatch::Shutdown(result)) => (success_response(id, result), true),
        Err(error) => (error_response(id, error.code, error.message), false),
    }
}

fn dispatch(method: &str, params: Value) -> Result<Dispatch, RpcFault> {
    let result = match method {
        "hello" => {
            decode_empty_params(params)?;
            serde_json::to_value(hello()).map_err(internal_serialization_fault)?
        }
        PARSE_REQUEST_METHOD => {
            let params = decode_raw_json_params(params)?;
            serde_json::to_value(parse_typed::<CommandExecutionRequestApprovalParams>(
                &params.raw_json,
            )?)
            .map_err(internal_serialization_fault)?
        }
        PARSE_RESPONSE_METHOD => {
            let params = decode_raw_json_params(params)?;
            serde_json::to_value(parse_typed::<CommandExecutionRequestApprovalResponse>(
                &params.raw_json,
            )?)
            .map_err(internal_serialization_fault)?
        }
        "shutdown" => {
            decode_empty_params(params)?;
            return Ok(Dispatch::Shutdown(json!({ "shutdown": true })));
        }
        _ => {
            return Err(RpcFault::new(
                "method_not_found",
                format!("unknown method {method:?}"),
            ));
        }
    };
    Ok(Dispatch::Continue(result))
}

fn hello() -> Hello {
    Hello {
        protocol_version: PROTOCOL_VERSION,
        engine_version: env!("CARGO_PKG_VERSION"),
        codex_repository: CODEX_REPOSITORY,
        codex_commit: CODEX_COMMIT,
        codex_app_server_protocol_package: CODEX_APP_SERVER_PROTOCOL_PACKAGE,
        codex_app_server_protocol_version: CODEX_APP_SERVER_PROTOCOL_VERSION,
        codex_app_server_protocol_tree: CODEX_APP_SERVER_PROTOCOL_TREE,
        codex_app_server_protocol_v2_tree: CODEX_APP_SERVER_PROTOCOL_V2_TREE,
        command_approval_item_blob: COMMAND_APPROVAL_ITEM_BLOB,
        command_approval_permissions_blob: COMMAND_APPROVAL_PERMISSIONS_BLOB,
        codex_cargo_lock_blob: CODEX_CARGO_LOCK_BLOB,
        os: std::env::consts::OS,
        arch: std::env::consts::ARCH,
        pointer_width: usize::BITS,
        methods: [PARSE_REQUEST_METHOD, PARSE_RESPONSE_METHOD],
    }
}

fn decode_empty_params(params: Value) -> Result<EmptyParams, RpcFault> {
    serde_json::from_value(params)
        .map_err(|error| RpcFault::new("invalid_params", error.to_string()))
}

fn decode_raw_json_params(params: Value) -> Result<RawJsonParams, RpcFault> {
    serde_json::from_value(params)
        .map_err(|error| RpcFault::new("invalid_params", error.to_string()))
}

fn parse_typed<T>(raw_json: &str) -> Result<ParseResult, RpcFault>
where
    T: DeserializeOwned + Serialize,
{
    let parsed = match serde_json::from_str::<T>(raw_json) {
        Ok(parsed) => parsed,
        Err(error) => {
            let code = match error.classify() {
                serde_json::error::Category::Data => "schema_rejected",
                serde_json::error::Category::Syntax | serde_json::error::Category::Eof => {
                    "invalid_json"
                }
                serde_json::error::Category::Io => "parser_io_error",
            };
            return Ok(ParseResult {
                accepted: false,
                canonical_json: None,
                integer_lexemes: Vec::new(),
                error: Some(SubjectError {
                    code,
                    message: error.to_string(),
                    line: error.line(),
                    column: error.column(),
                }),
            });
        }
    };

    let canonical_value = serde_json::to_value(parsed).map_err(internal_serialization_fault)?;
    let canonical_json =
        serde_json::to_string(&canonical_value).map_err(internal_serialization_fault)?;
    let mut integer_lexemes = Vec::new();
    collect_integer_lexemes(&canonical_value, "", &mut integer_lexemes);
    Ok(ParseResult {
        accepted: true,
        canonical_json: Some(canonical_json),
        integer_lexemes,
        error: None,
    })
}

fn collect_integer_lexemes(value: &Value, pointer: &str, output: &mut Vec<IntegerLexeme>) {
    match value {
        Value::Number(number) if number.is_i64() || number.is_u64() => {
            output.push(IntegerLexeme {
                pointer: pointer.to_string(),
                decimal_lexeme: number.to_string(),
            });
        }
        Value::Array(values) => {
            for (index, value) in values.iter().enumerate() {
                collect_integer_lexemes(value, &format!("{pointer}/{index}"), output);
            }
        }
        Value::Object(values) => {
            for (key, value) in values {
                let escaped = key.replace('~', "~0").replace('/', "~1");
                collect_integer_lexemes(value, &format!("{pointer}/{escaped}"), output);
            }
        }
        _ => {}
    }
}

fn internal_serialization_fault(error: serde_json::Error) -> RpcFault {
    RpcFault::new("internal_error", error.to_string())
}

fn success_response(id: Value, result: Value) -> Response {
    Response {
        protocol_version: PROTOCOL_VERSION,
        id,
        result: Some(result),
        error: None,
    }
}

fn error_response(id: Value, code: &'static str, message: impl Into<String>) -> Response {
    Response {
        protocol_version: PROTOCOL_VERSION,
        id,
        result: None,
        error: Some(ErrorBody {
            code,
            message: message.into(),
        }),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn integer_pointer_escaping_follows_rfc_6901() {
        let value = json!({ "a/b": { "m~n": [7] } });
        let mut integers = Vec::new();
        collect_integer_lexemes(&value, "", &mut integers);
        assert_eq!(integers.len(), 1);
        assert_eq!(integers[0].pointer, "/a~1b/m~0n/0");
        assert_eq!(integers[0].decimal_lexeme, "7");
    }
}
