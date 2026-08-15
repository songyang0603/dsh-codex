mod config_stack;
mod engine;
mod host_config;
mod runtime;

use anyhow::Context as _;
use anyhow::Result;
use config_stack::LoadConfigStackParams;
use engine::AppendNetworkParams;
use engine::AppendPrefixParams;
use engine::Engine;
use engine::EngineError;
use engine::PROTOCOL_VERSION;
use host_config::LoadHostConfigStackParams;
use runtime::RuntimePolicyInput;
use serde::Deserialize;
use serde::Serialize;
use serde_json::Value;
use serde_json::json;
use std::io::BufRead;
use std::io::Write;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct Request {
    protocol_version: u32,
    id: Value,
    method: String,
    #[serde(default)]
    params: Value,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct ErrorBody {
    code: String,
    message: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    data: Option<Value>,
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

enum Dispatch {
    Continue(Value),
    Shutdown(Value),
}

#[tokio::main]
async fn main() -> Result<()> {
    let stdin = std::io::stdin();
    let mut stdout = std::io::BufWriter::new(std::io::stdout().lock());
    let mut engine = Engine::default();

    for line in stdin.lock().lines() {
        let line = line.context("failed to read stdin")?;
        if line.trim().is_empty() {
            continue;
        }

        let parsed = serde_json::from_str::<Request>(&line);
        let (response, shutdown) = match parsed {
            Ok(request) => handle_request(&mut engine, request).await,
            Err(error) => (
                Response {
                    protocol_version: PROTOCOL_VERSION,
                    id: Value::Null,
                    result: None,
                    error: Some(ErrorBody {
                        code: "invalid_request".to_string(),
                        message: error.to_string(),
                        data: None,
                    }),
                },
                false,
            ),
        };

        serde_json::to_writer(&mut stdout, &response).context("failed to encode response")?;
        stdout.write_all(b"\n")?;
        stdout.flush()?;
        if shutdown {
            break;
        }
    }
    Ok(())
}

async fn handle_request(engine: &mut Engine, request: Request) -> (Response, bool) {
    let id = request.id;
    if request.protocol_version != PROTOCOL_VERSION {
        return (
            error_response(
                id,
                "protocol_mismatch",
                format!(
                    "expected protocol version {PROTOCOL_VERSION}, got {}",
                    request.protocol_version
                ),
                None,
            ),
            false,
        );
    }

    let result = dispatch(engine, &request.method, request.params).await;
    match result {
        Ok(Dispatch::Continue(value)) => (success_response(id, value), false),
        Ok(Dispatch::Shutdown(value)) => (success_response(id, value), true),
        Err(error) => (
            error_response(id, error.code(), error.to_string(), error.data()),
            false,
        ),
    }
}

async fn dispatch(
    engine: &mut Engine,
    method: &str,
    params: Value,
) -> Result<Dispatch, EngineError> {
    let value = match method {
        "hello" => serde_json::to_value(engine.hello()).expect("hello is serializable"),
        "diagnostics" => engine.diagnostics(),
        "load" => engine.load(decode_params(params)?)?,
        "load_config_stack" => {
            engine
                .load_config_stack(decode_params::<LoadConfigStackParams>(params)?)
                .await?
        }
        "load_host_config_stack" => {
            engine
                .load_host_config_stack(decode_params::<LoadHostConfigStackParams>(params)?)
                .await?
        }
        "open_host_policy" => {
            engine
                .open_host_policy(decode_params::<LoadHostConfigStackParams>(params)?)
                .await?
        }
        "check_tokens" => serde_json::to_value(engine.check_tokens(decode_params(params)?)?)
            .expect("check output is serializable"),
        "check_exec_approval_requirement" => serde_json::to_value(
            engine.check_runtime(decode_params::<RuntimePolicyInput>(params)?)?,
        )
        .expect("runtime output is serializable"),
        "compile_network_domains" => engine.compile_network_domains(),
        "append_prefix_amendment" => {
            engine
                .append_prefix(decode_params::<AppendPrefixParams>(params)?)
                .await?
        }
        "append_network_amendment" => {
            engine
                .append_network(decode_params::<AppendNetworkParams>(params)?)
                .await?
        }
        "shutdown" => return Ok(Dispatch::Shutdown(json!({ "shutdown": true }))),
        other => {
            return Err(EngineError::InvalidParams(format!(
                "unknown method {other:?}"
            )));
        }
    };
    Ok(Dispatch::Continue(value))
}

fn decode_params<T: for<'de> Deserialize<'de>>(value: Value) -> Result<T, EngineError> {
    serde_json::from_value(value).map_err(|error| EngineError::InvalidParams(error.to_string()))
}

fn success_response(id: Value, result: Value) -> Response {
    Response {
        protocol_version: PROTOCOL_VERSION,
        id,
        result: Some(result),
        error: None,
    }
}

fn error_response(
    id: Value,
    code: impl Into<String>,
    message: impl Into<String>,
    data: Option<Value>,
) -> Response {
    Response {
        protocol_version: PROTOCOL_VERSION,
        id,
        result: None,
        error: Some(ErrorBody {
            code: code.into(),
            message: message.into(),
            data,
        }),
    }
}
