use serde_json::Value;
use serde_json::json;
use std::io::BufRead;
use std::io::BufReader;
use std::io::Write;
use std::process::Child;
use std::process::ChildStdin;
use std::process::ChildStdout;
use std::process::Command;
use std::process::Stdio;
use std::thread;
use std::time::Duration;
use std::time::Instant;

const PROTOCOL_VERSION: u64 = 1;

pub struct Sidecar {
    child: Child,
    stdin: ChildStdin,
    stdout: BufReader<ChildStdout>,
    next_id: u64,
}

impl Sidecar {
    pub fn spawn() -> Self {
        let mut child = Command::new(env!("CARGO_BIN_EXE_dsh-codex-approval-protocol-engine"))
            .stdin(Stdio::piped())
            .stdout(Stdio::piped())
            .stderr(Stdio::inherit())
            .spawn()
            .expect("spawn compiled approval-protocol sidecar");
        let stdin = child.stdin.take().expect("sidecar stdin is piped");
        let stdout = BufReader::new(child.stdout.take().expect("sidecar stdout is piped"));
        Self {
            child,
            stdin,
            stdout,
            next_id: 1,
        }
    }

    pub fn request(&mut self, method: &str, params: Value) -> Value {
        let id = self.next_id;
        self.next_id += 1;
        self.send_json(&json!({
            "protocolVersion": PROTOCOL_VERSION,
            "id": id,
            "method": method,
            "params": params,
        }));
        let response = self.read_response();
        assert_eq!(response["protocolVersion"], PROTOCOL_VERSION);
        assert_eq!(response["id"], id);
        response
    }

    pub fn parse(&mut self, method: &str, raw_json: &str) -> Value {
        self.request(method, json!({ "rawJson": raw_json }))
    }

    pub fn send_json(&mut self, value: &Value) {
        serde_json::to_writer(&mut self.stdin, value).expect("serialize sidecar request");
        self.stdin.write_all(b"\n").expect("terminate request line");
        self.stdin.flush().expect("flush sidecar request");
    }

    pub fn send_line(&mut self, line: &str) {
        self.stdin
            .write_all(line.as_bytes())
            .expect("write raw sidecar request");
        self.stdin.write_all(b"\n").expect("terminate request line");
        self.stdin.flush().expect("flush sidecar request");
    }

    pub fn read_response(&mut self) -> Value {
        let mut line = String::new();
        let read = self
            .stdout
            .read_line(&mut line)
            .expect("read sidecar response");
        assert_ne!(read, 0, "sidecar exited before producing a response");
        serde_json::from_str(&line).expect("sidecar response is one JSON object per line")
    }

    pub fn wait_for_exit(&mut self, timeout: Duration) -> std::process::ExitStatus {
        let deadline = Instant::now() + timeout;
        loop {
            if let Some(status) = self.child.try_wait().expect("poll sidecar process") {
                return status;
            }
            assert!(
                Instant::now() < deadline,
                "sidecar did not exit within {timeout:?}"
            );
            thread::sleep(Duration::from_millis(10));
        }
    }
}

impl Drop for Sidecar {
    fn drop(&mut self) {
        if self.child.try_wait().ok().flatten().is_none() {
            let _ = self.child.kill();
            let _ = self.child.wait();
        }
    }
}

pub fn assert_success(response: &Value) -> &Value {
    assert!(
        response.get("error").is_none(),
        "unexpected sidecar error: {response}"
    );
    response
        .get("result")
        .expect("successful response contains result")
}

pub fn assert_rpc_error<'a>(response: &'a Value, code: &str) -> &'a Value {
    assert!(
        response.get("result").is_none(),
        "error response must not contain result: {response}"
    );
    let error = response
        .get("error")
        .expect("error response contains error body");
    assert_eq!(error["code"], code);
    assert!(
        error["message"]
            .as_str()
            .is_some_and(|message| !message.is_empty()),
        "error response contains a non-empty message: {response}"
    );
    error
}

pub fn assert_accepted(response: &Value) -> &Value {
    let result = assert_success(response);
    assert_eq!(result["accepted"], true, "payload was rejected: {result}");
    assert!(result["canonicalJson"].is_string());
    assert!(result["integerLexemes"].is_array());
    assert!(result["error"].is_null());
    result
}

pub fn assert_rejected<'a>(response: &'a Value, code: &str) -> &'a Value {
    let result = assert_success(response);
    assert_eq!(result["accepted"], false);
    assert!(result["canonicalJson"].is_null());
    assert_eq!(result["integerLexemes"], json!([]));
    assert_eq!(result["error"]["code"], code);
    assert!(
        result["error"]["message"]
            .as_str()
            .is_some_and(|message| !message.is_empty())
    );
    result
}
