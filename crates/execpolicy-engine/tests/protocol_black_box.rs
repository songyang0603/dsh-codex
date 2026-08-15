mod support;

use serde_json::Value;
use serde_json::json;
use std::time::Duration;
use support::Sidecar;
use support::assert_error;
use support::assert_success;

const CODEX_COMMIT: &str = "086396f7f60347b74c82784d5dfaf4fb2d3bda12";
const EXECPOLICY_TREE: &str = "e06e0b4ad718af8a74055a33b1536b25fb9d4a87";
const SHELL_COMMAND_TREE: &str = "3f5da93a61be77795d3fc5bb3d6e44a9dec1d106";
const CONFIG_TREE: &str = "d3f4925b575b128dd1f0f74a5babcdb1efce0219";
const EXEC_SERVER_TREE: &str = "51751785508060e633f0e0472fa0d2572787b36a";
const UTILS_CLI_TREE: &str = "5d9c72fcadefb9a1c95e38c4726d25c5b8d195ee";
const UTILS_HOME_DIR_TREE: &str = "c2d10a4f4844c2a517584ee623a0b8aa4ceb44f5";
const CARGO_LOCK_BLOB: &str = "a8c2addc02055be48c345b65760a7a1b96cfbf28";
const CORE_EXEC_POLICY_BLOB: &str = "5de05937533a2653a700b4ec40cda09578761f50";
const CORE_EXEC_POLICY_DIR_TREE: &str = "b313a3ba1b113f08e3c1686272162910dad76540";
const POLICY_IDENTIFIER: &str = "conformance/execpolicy/fixtures/policy.star";
const POLICY_SOURCE: &str = include_str!("../../../conformance/execpolicy/fixtures/policy.star");

fn load_fixture(sidecar: &mut Sidecar) -> Value {
    sidecar.request(
        "load",
        json!({
            "sources": [{
                "identifier": POLICY_IDENTIFIER,
                "content": POLICY_SOURCE,
            }],
            "paths": [],
        }),
    )
}

fn runtime_params(command: &[&str], approval_policy: Value) -> Value {
    json!({
        "command": command,
        "approvalPolicy": approval_policy,
        "permissionProfile": {
            "kind": "managed",
            "fileSystem": "restricted",
            "hasFullDiskWriteAccess": false
        },
        "windowsSandboxLevel": "disabled",
        "sandboxPermissions": "use_default",
        "allowPrefixRules": "honor"
    })
}

#[test]
fn hello_reports_the_exact_protocol_and_pinned_upstream_objects() {
    let mut sidecar = Sidecar::spawn();

    let response = sidecar.request("hello", json!({}));
    let hello = assert_success(&response);
    assert_eq!(hello["protocolVersion"], 3);
    assert_eq!(hello["engineVersion"], env!("CARGO_PKG_VERSION"));
    assert_eq!(hello["codexCommit"], CODEX_COMMIT);
    assert_eq!(hello["execpolicyTree"], EXECPOLICY_TREE);
    assert_eq!(hello["shellCommandTree"], SHELL_COMMAND_TREE);
    assert_eq!(hello["configTree"], CONFIG_TREE);
    assert_eq!(hello["execServerTree"], EXEC_SERVER_TREE);
    assert_eq!(hello["utilsCliTree"], UTILS_CLI_TREE);
    assert_eq!(hello["utilsHomeDirTree"], UTILS_HOME_DIR_TREE);
    assert_eq!(hello["cargoLockBlob"], CARGO_LOCK_BLOB);
    assert_eq!(hello["coreExecPolicyBlob"], CORE_EXEC_POLICY_BLOB);
    assert_eq!(hello["coreExecPolicyDirTree"], CORE_EXEC_POLICY_DIR_TREE);
    assert_eq!(hello["os"], std::env::consts::OS);
    assert_eq!(hello["arch"], std::env::consts::ARCH);

    let diagnostics_response = sidecar.request("diagnostics", json!({}));
    let diagnostics = assert_success(&diagnostics_response);
    assert_eq!(diagnostics["loadedSources"], 0);
    assert_eq!(diagnostics["hello"], *hello);
}

#[test]
fn load_check_tokens_and_runtime_policy_work_over_the_real_process_boundary() {
    let mut sidecar = Sidecar::spawn();

    let load_response = load_fixture(&mut sidecar);
    let loaded = assert_success(&load_response);
    assert_eq!(loaded["loadedSources"], 1);
    assert_eq!(
        loaded["allowedPrefixes"],
        json!([["git"]]),
        "only allow decisions are advertised as allowed prefixes"
    );

    let allow_response = sidecar.request(
        "check_tokens",
        json!({
            "commands": [["git", "status"]],
            "resolveHostExecutables": false
        }),
    );
    let allow = assert_success(&allow_response);
    assert_eq!(allow["decision"], "allow");
    assert_eq!(
        allow["matchedRules"][0]["prefixRuleMatch"]["matchedPrefix"],
        json!(["git"])
    );
    assert_eq!(
        allow["matchedRules"][0]["prefixRuleMatch"]["decision"],
        "allow"
    );

    let strict_response = sidecar.request(
        "check_tokens",
        json!({
            "commands": [["git", "status"], ["rm", "-rf", "build"]],
            "fallbackDecision": "prompt",
            "resolveHostExecutables": false
        }),
    );
    let strict = assert_success(&strict_response);
    assert_eq!(strict["decision"], "forbidden");
    assert_eq!(strict["matchedRules"].as_array().map(Vec::len), Some(2));

    let runtime_allow_response = sidecar.request(
        "check_exec_approval_requirement",
        runtime_params(
            &["bash", "-lc", "git status"],
            json!({ "kind": "on_request" }),
        ),
    );
    let runtime_allow = assert_success(&runtime_allow_response);
    assert_eq!(runtime_allow["requirement"]["kind"], "skip");
    assert_eq!(runtime_allow["requirement"]["bypassSandbox"], true);
    assert_eq!(runtime_allow["evaluation"]["decision"], "allow");
    assert_eq!(runtime_allow["loweredCommands"], json!([["git", "status"]]));
    assert_eq!(runtime_allow["usedComplexParsing"], false);

    let runtime_rejected_prompt_response = sidecar.request(
        "check_exec_approval_requirement",
        runtime_params(&["cargo", "publish"], json!({ "kind": "never" })),
    );
    let runtime_rejected_prompt = assert_success(&runtime_rejected_prompt_response);
    assert_eq!(runtime_rejected_prompt["requirement"]["kind"], "forbidden");
    assert_eq!(
        runtime_rejected_prompt["requirement"]["reason"],
        "approval required by policy, but AskForApproval is set to Never"
    );

    let runtime_compound_response = sidecar.request(
        "check_exec_approval_requirement",
        runtime_params(
            &["bash", "-lc", "git status && rm -rf build"],
            json!({ "kind": "on_request" }),
        ),
    );
    let runtime_compound = assert_success(&runtime_compound_response);
    assert_eq!(runtime_compound["requirement"]["kind"], "forbidden");
    assert_eq!(
        runtime_compound["loweredCommands"],
        json!([["git", "status"], ["rm", "-rf", "build"]])
    );
}

#[test]
fn malformed_and_unsupported_requests_are_structured_errors_and_do_not_kill_the_sidecar() {
    let mut sidecar = Sidecar::spawn();

    sidecar.send_line("{this is not json");
    let malformed = sidecar.read_response();
    assert_eq!(malformed["protocolVersion"], 3);
    assert!(malformed["id"].is_null());
    assert_error(&malformed, "invalid_request");

    sidecar.send_json(&json!({
        "protocolVersion": 999,
        "id": "wrong-version",
        "method": "hello",
        "params": {}
    }));
    let mismatch = sidecar.read_response();
    assert_eq!(mismatch["id"], "wrong-version");
    let mismatch_error = assert_error(&mismatch, "protocol_mismatch");
    assert!(
        mismatch_error["message"]
            .as_str()
            .unwrap()
            .contains("expected protocol version 3")
    );

    let unknown = sidecar.request("method_that_does_not_exist", json!({}));
    let unknown_error = assert_error(&unknown, "invalid_params");
    assert!(
        unknown_error["message"]
            .as_str()
            .unwrap()
            .contains("unknown method")
    );

    let invalid_params = sidecar.request("check_tokens", json!({ "commands": [] }));
    let params_error = assert_error(&invalid_params, "invalid_params");
    assert!(
        params_error["message"]
            .as_str()
            .unwrap()
            .contains("commands must contain")
    );

    let empty_runtime_command = sidecar.request(
        "check_exec_approval_requirement",
        runtime_params(&[], json!({ "kind": "on_request" })),
    );
    let empty_command_error = assert_error(&empty_runtime_command, "invalid_params");
    assert!(
        empty_command_error["message"]
            .as_str()
            .unwrap()
            .contains("command must contain")
    );

    let mut unreachable_profile =
        runtime_params(&["git", "status"], json!({ "kind": "on_request" }));
    unreachable_profile["permissionProfile"]["fileSystem"] = json!("unrestricted");
    let unreachable_runtime_state =
        sidecar.request("check_exec_approval_requirement", unreachable_profile);
    let unreachable_state_error = assert_error(&unreachable_runtime_state, "invalid_params");
    assert!(
        unreachable_state_error["message"]
            .as_str()
            .unwrap()
            .contains("unrestricted managed filesystem")
    );

    let still_alive = sidecar.request("hello", json!({}));
    assert_eq!(assert_success(&still_alive)["protocolVersion"], 3);
}

#[test]
fn shutdown_acknowledges_then_exits_cleanly() {
    let mut sidecar = Sidecar::spawn();

    let response = sidecar.request("shutdown", json!({}));
    assert_eq!(assert_success(&response), &json!({ "shutdown": true }));
    let status = sidecar.wait_for_exit(Duration::from_secs(2));
    assert!(status.success(), "shutdown exit status was {status}");
}
