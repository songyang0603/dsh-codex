mod support;

use dsh_codex_approval_protocol_engine::CODEX_APP_SERVER_PROTOCOL_PACKAGE;
use dsh_codex_approval_protocol_engine::CODEX_APP_SERVER_PROTOCOL_TREE;
use dsh_codex_approval_protocol_engine::CODEX_APP_SERVER_PROTOCOL_V2_TREE;
use dsh_codex_approval_protocol_engine::CODEX_APP_SERVER_PROTOCOL_VERSION;
use dsh_codex_approval_protocol_engine::CODEX_CARGO_LOCK_BLOB;
use dsh_codex_approval_protocol_engine::CODEX_COMMIT;
use dsh_codex_approval_protocol_engine::COMMAND_APPROVAL_ITEM_BLOB;
use dsh_codex_approval_protocol_engine::COMMAND_APPROVAL_PERMISSIONS_BLOB;
use dsh_codex_approval_protocol_engine::PARSE_REQUEST_METHOD;
use dsh_codex_approval_protocol_engine::PARSE_RESPONSE_METHOD;
use serde_json::Value;
use serde_json::json;
use std::time::Duration;
use support::Sidecar;
use support::assert_accepted;
use support::assert_rejected;
use support::assert_rpc_error;
use support::assert_success;

fn minimal_request(started_at_ms: &str) -> String {
    format!(
        r#"{{"threadId":"thread-1","turnId":"turn-1","itemId":"item-1","startedAtMs":{started_at_ms}}}"#
    )
}

fn canonical_value(result: &Value) -> Value {
    serde_json::from_str(
        result["canonicalJson"]
            .as_str()
            .expect("accepted result has canonical JSON"),
    )
    .expect("canonical JSON is valid")
}

fn integer_lexeme<'a>(result: &'a Value, pointer: &str) -> &'a str {
    result["integerLexemes"]
        .as_array()
        .expect("integer lexemes is an array")
        .iter()
        .find(|entry| entry["pointer"] == pointer)
        .and_then(|entry| entry["decimalLexeme"].as_str())
        .unwrap_or_else(|| panic!("missing integer pointer {pointer:?}: {result}"))
}

#[test]
fn hello_reports_protocol_upstream_identity_and_target_width() {
    let mut sidecar = Sidecar::spawn();
    let response = sidecar.request("hello", json!({}));
    let hello = assert_success(&response);

    assert_eq!(hello["protocolVersion"], 1);
    assert_eq!(hello["engineVersion"], env!("CARGO_PKG_VERSION"));
    assert_eq!(hello["codexCommit"], CODEX_COMMIT);
    assert_eq!(
        hello["codexAppServerProtocolPackage"],
        CODEX_APP_SERVER_PROTOCOL_PACKAGE
    );
    assert_eq!(
        hello["codexAppServerProtocolVersion"],
        CODEX_APP_SERVER_PROTOCOL_VERSION
    );
    assert_eq!(
        hello["codexAppServerProtocolTree"],
        CODEX_APP_SERVER_PROTOCOL_TREE
    );
    assert_eq!(
        hello["codexAppServerProtocolV2Tree"],
        CODEX_APP_SERVER_PROTOCOL_V2_TREE
    );
    assert_eq!(hello["commandApprovalItemBlob"], COMMAND_APPROVAL_ITEM_BLOB);
    assert_eq!(
        hello["commandApprovalPermissionsBlob"],
        COMMAND_APPROVAL_PERMISSIONS_BLOB
    );
    assert_eq!(hello["codexCargoLockBlob"], CODEX_CARGO_LOCK_BLOB);
    assert_eq!(hello["os"], std::env::consts::OS);
    assert_eq!(hello["arch"], std::env::consts::ARCH);
    assert_eq!(hello["pointerWidth"], usize::BITS);
    assert_eq!(
        hello["methods"],
        json!([PARSE_REQUEST_METHOD, PARSE_RESPONSE_METHOD])
    );
}

#[test]
fn i64_max_is_lossless_and_i64_overflow_is_rejected_without_killing_process() {
    let mut sidecar = Sidecar::spawn();
    let maximum = i64::MAX.to_string();
    let accepted_response = sidecar.parse(PARSE_REQUEST_METHOD, &minimal_request(&maximum));
    let accepted = assert_accepted(&accepted_response);
    assert_eq!(integer_lexeme(accepted, "/startedAtMs"), maximum);
    assert!(
        accepted["canonicalJson"]
            .as_str()
            .expect("canonical JSON")
            .contains(&maximum)
    );

    let overflow = (i64::MAX as u128 + 1).to_string();
    let rejected_response = sidecar.parse(PARSE_REQUEST_METHOD, &minimal_request(&overflow));
    assert_rejected(&rejected_response, "schema_rejected");

    let alive = sidecar.request("hello", json!({}));
    assert_eq!(assert_success(&alive)["protocolVersion"], 1);
}

#[test]
fn usize_max_is_lossless_and_platform_usize_overflow_is_rejected() {
    let mut sidecar = Sidecar::spawn();
    let maximum = usize::MAX.to_string();
    let raw = format!(
        r#"{{
            "threadId":"thread-1",
            "turnId":"turn-1",
            "itemId":"item-1",
            "startedAtMs":1,
            "additionalPermissions":{{
                "network":null,
                "fileSystem":{{
                    "read":null,
                    "write":null,
                    "globScanMaxDepth":{maximum}
                }}
            }}
        }}"#
    );
    let accepted_response = sidecar.parse(PARSE_REQUEST_METHOD, &raw);
    let accepted = assert_accepted(&accepted_response);
    assert_eq!(
        integer_lexeme(
            accepted,
            "/additionalPermissions/fileSystem/globScanMaxDepth"
        ),
        maximum
    );

    let overflow = (usize::MAX as u128 + 1).to_string();
    let overflow_raw = raw.replace(&format!(":{maximum}"), &format!(":{overflow}"));
    let rejected_response = sidecar.parse(PARSE_REQUEST_METHOD, &overflow_raw);
    assert_rejected(&rejected_response, "schema_rejected");
}

#[test]
fn pinned_serde_ignores_unknown_fields_and_canonicalization_drops_them() {
    let mut sidecar = Sidecar::spawn();
    let raw = r#"{
        "threadId":"thread-1",
        "turnId":"turn-1",
        "itemId":"item-1",
        "startedAtMs":1,
        "futureField":{"must":"be ignored"},
        "additionalPermissions":{
            "nestedFuture":true
        }
    }"#;
    let response = sidecar.parse(PARSE_REQUEST_METHOD, raw);
    let result = assert_accepted(&response);
    let canonical = canonical_value(result);
    assert!(canonical.get("futureField").is_none());
    assert!(
        canonical["additionalPermissions"]
            .get("nestedFuture")
            .is_none()
    );
    assert!(canonical["additionalPermissions"]["network"].is_null());
    assert!(canonical["additionalPermissions"]["fileSystem"].is_null());
}

#[test]
fn legacy_project_root_alias_is_accepted_and_canonicalized() {
    let mut sidecar = Sidecar::spawn();
    let raw = r#"{
        "threadId":"thread-1",
        "turnId":"turn-1",
        "itemId":"item-1",
        "startedAtMs":1,
        "additionalPermissions":{
            "network":null,
            "fileSystem":{
                "read":null,
                "write":null,
                "entries":[{
                    "path":{
                        "type":"special",
                        "value":{"kind":"current_working_directory"}
                    },
                    "access":"read"
                }]
            }
        }
    }"#;
    let response = sidecar.parse(PARSE_REQUEST_METHOD, raw);
    let canonical = canonical_value(assert_accepted(&response));
    assert_eq!(
        canonical["additionalPermissions"]["fileSystem"]["entries"][0]["path"]["value"],
        json!({ "kind": "project_roots", "subpath": null })
    );
}

#[test]
fn omitted_and_null_options_follow_pinned_canonical_serde() {
    let mut sidecar = Sidecar::spawn();
    let omitted_response = sidecar.parse(PARSE_REQUEST_METHOD, &minimal_request("1"));
    let omitted = canonical_value(assert_accepted(&omitted_response));
    assert!(omitted["environmentId"].is_null());
    assert!(omitted.get("approvalId").is_none());
    assert!(omitted.get("reason").is_none());
    assert!(omitted.get("availableDecisions").is_none());

    let explicit_null = r#"{
        "threadId":"thread-1",
        "turnId":"turn-1",
        "itemId":"item-1",
        "startedAtMs":1,
        "approvalId":null,
        "environmentId":null,
        "reason":null,
        "additionalPermissions":null,
        "availableDecisions":null
    }"#;
    let null_response = sidecar.parse(PARSE_REQUEST_METHOD, explicit_null);
    let canonical = canonical_value(assert_accepted(&null_response));
    assert!(canonical["environmentId"].is_null());
    assert!(canonical.get("approvalId").is_none());
    assert!(canonical.get("reason").is_none());
    assert!(canonical.get("additionalPermissions").is_none());
    assert!(canonical.get("availableDecisions").is_none());
}

#[test]
fn all_pinned_command_response_variants_round_trip() {
    let mut sidecar = Sidecar::spawn();
    let variants = [
        r#"{"decision":"accept"}"#,
        r#"{"decision":"acceptForSession"}"#,
        r#"{"decision":{"acceptWithExecpolicyAmendment":{"execpolicy_amendment":["git","status"]}}}"#,
        r#"{"decision":{"applyNetworkPolicyAmendment":{"network_policy_amendment":{"host":"example.com","action":"allow"}}}}"#,
        r#"{"decision":{"applyNetworkPolicyAmendment":{"network_policy_amendment":{"host":"example.com","action":"deny"}}}}"#,
        r#"{"decision":"decline"}"#,
        r#"{"decision":"cancel"}"#,
    ];

    for raw in variants {
        let response = sidecar.parse(PARSE_RESPONSE_METHOD, raw);
        let result = assert_accepted(&response);
        let canonical = canonical_value(result);
        assert!(canonical.get("decision").is_some(), "{canonical}");
    }
}

#[test]
fn malformed_subject_and_protocol_fail_closed_with_stable_classes() {
    let mut sidecar = Sidecar::spawn();

    let invalid_json = sidecar.parse(PARSE_REQUEST_METHOD, "{");
    let invalid_json_result = assert_rejected(&invalid_json, "invalid_json");
    assert!(invalid_json_result["error"]["line"].is_number());
    assert!(invalid_json_result["error"]["column"].is_number());

    let invalid_schema = sidecar.parse(PARSE_RESPONSE_METHOD, r#"{"decision":"future"}"#);
    assert_rejected(&invalid_schema, "schema_rejected");

    sidecar.send_line("{this is not json");
    let malformed_rpc = sidecar.read_response();
    assert!(malformed_rpc["id"].is_null());
    assert_rpc_error(&malformed_rpc, "invalid_request");

    sidecar.send_json(&json!({
        "protocolVersion": 999,
        "id": "wrong-version",
        "method": "hello",
        "params": {}
    }));
    let mismatch = sidecar.read_response();
    assert_eq!(mismatch["id"], "wrong-version");
    assert_rpc_error(&mismatch, "protocol_mismatch");

    let bad_params = sidecar.request(PARSE_REQUEST_METHOD, json!({ "rawJson": 1 }));
    assert_rpc_error(&bad_params, "invalid_params");

    sidecar.send_json(&json!({
        "protocolVersion": 1,
        "id": "extra-field",
        "method": "hello",
        "params": {},
        "unexpected": true
    }));
    let strict_envelope = sidecar.read_response();
    assert!(strict_envelope["id"].is_null());
    assert_rpc_error(&strict_envelope, "invalid_request");

    let unknown = sidecar.request("future_method", json!({}));
    assert_rpc_error(&unknown, "method_not_found");

    let alive = sidecar.request("hello", json!({}));
    assert_eq!(assert_success(&alive)["protocolVersion"], 1);
}

#[test]
fn shutdown_acknowledges_then_exits_cleanly() {
    let mut sidecar = Sidecar::spawn();
    let response = sidecar.request("shutdown", json!({}));
    assert_eq!(assert_success(&response), &json!({ "shutdown": true }));
    let status = sidecar.wait_for_exit(Duration::from_secs(2));
    assert!(status.success(), "shutdown exit status was {status}");
}
