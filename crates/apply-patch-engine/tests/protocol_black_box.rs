mod support;

use codex_utils_path_uri::PathUri;
use dsh_codex_apply_patch_engine::CODEX_APPLY_PATCH_PACKAGE;
use dsh_codex_apply_patch_engine::CODEX_APPLY_PATCH_TREE;
use dsh_codex_apply_patch_engine::CODEX_COMMIT;
use serde_json::json;
use std::time::Duration;
use support::Sidecar;
use support::assert_rpc_error;
use support::assert_success;

fn cwd_uri(path: &std::path::Path) -> String {
    PathUri::from_host_native_path(path)
        .expect("temporary path is absolute")
        .to_string()
}

#[test]
fn hello_declares_exact_upstream_and_unsandboxed_engine_boundary() {
    let mut sidecar = Sidecar::spawn();
    let hello = sidecar.request("hello", json!({}));
    let hello = assert_success(&hello);
    assert_eq!(hello["protocolVersion"], 1);
    assert_eq!(hello["codexCommit"], CODEX_COMMIT);
    assert_eq!(hello["codexApplyPatchPackage"], CODEX_APPLY_PATCH_PACKAGE);
    assert_eq!(hello["codexApplyPatchTree"], CODEX_APPLY_PATCH_TREE);
    assert_eq!(hello["filesystem"], "LocalFileSystem::unsandboxed");
    assert_eq!(hello["sandbox"], "none");
    assert!(
        hello["scope"]
            .as_str()
            .unwrap()
            .contains("semantic engine only")
    );
}

#[test]
fn parse_and_stream_parse_preserve_upstream_shapes() {
    let mut sidecar = Sidecar::spawn();
    let patch = "*** Begin Patch\n*** Environment ID: remote-a\n*** Update File: a.txt\n@@ function x\n-old\n+new\n*** End Patch";
    let response = sidecar.request("parse", json!({ "patch": patch }));
    let parsed = assert_success(&response);
    assert_eq!(parsed["accepted"], true);
    assert_eq!(parsed["environmentId"], "remote-a");
    assert_eq!(parsed["hunks"][0]["kind"], "UpdateFile");
    assert_eq!(
        parsed["hunks"][0]["chunks"][0]["changeContext"],
        "function x"
    );

    let response = sidecar.request(
        "stream_parse",
        json!({ "chunks": ["*** Begin Patch\n*** Add File: a.txt\n+one", "\n*** End Patch"] }),
    );
    let streamed = assert_success(&response);
    assert_eq!(streamed["accepted"], true);
    assert_eq!(streamed["chunkResults"].as_array().unwrap().len(), 2);
    assert_eq!(streamed["hunks"][0]["contents"], "one\n");
}

#[test]
fn verify_patch_sorts_preview_without_changing_patch_order() {
    let temp = tempfile::tempdir().unwrap();
    let mut sidecar = Sidecar::spawn();
    let patch = "*** Begin Patch\n*** Add File: z.txt\n+z\n*** Add File: a.txt\n+a\n*** End Patch";
    let response = sidecar.request(
        "verify_patch",
        json!({
            "patch": patch,
            "cwd": cwd_uri(temp.path()),
            "mode": "normalize_to_lf"
        }),
    );
    let verified = assert_success(&response);
    assert_eq!(verified["classification"], "body");
    assert!(
        verified["action"]["changes"][0]["path"]
            .as_str()
            .unwrap()
            .ends_with("/a.txt")
    );
    assert!(
        verified["action"]["changes"][1]["path"]
            .as_str()
            .unwrap()
            .ends_with("/z.txt")
    );
}

#[test]
fn verify_invocation_preserves_implicit_and_not_apply_patch_classification() {
    let temp = tempfile::tempdir().unwrap();
    let mut sidecar = Sidecar::spawn();
    let patch = "*** Begin Patch\n*** Add File: a.txt\n+a\n*** End Patch";
    let response = sidecar.request(
        "verify_invocation",
        json!({
            "argv": [patch],
            "cwd": cwd_uri(temp.path()),
            "mode": "normalize_to_lf"
        }),
    );
    let implicit = assert_success(&response);
    assert_eq!(implicit["classification"], "correctness_error");
    assert_eq!(implicit["error"]["variant"], "ImplicitInvocation");

    let response = sidecar.request(
        "verify_invocation",
        json!({
            "argv": ["git", "status"],
            "cwd": cwd_uri(temp.path()),
            "mode": "normalize_to_lf"
        }),
    );
    assert_eq!(
        assert_success(&response)["classification"],
        "not_apply_patch"
    );
}

#[test]
fn apply_patch_retains_ordered_delta_and_committed_prefix_on_failure() {
    let temp = tempfile::tempdir().unwrap();
    let mut sidecar = Sidecar::spawn();
    let patch = "*** Begin Patch\n*** Add File: first.txt\n+committed\n*** Delete File: missing.txt\n*** End Patch";
    let response = sidecar.request(
        "apply_patch",
        json!({
            "patch": patch,
            "cwd": cwd_uri(temp.path()),
            "mode": "normalize_to_lf"
        }),
    );
    let applied = assert_success(&response);
    assert_eq!(applied["success"], false);
    // Upstream marks the aggregate inexact when the later delete target cannot
    // be observed, while still returning the definitely committed Add prefix.
    assert_eq!(applied["delta"]["exact"], false);
    assert_eq!(applied["delta"]["changes"].as_array().unwrap().len(), 1);
    assert_eq!(applied["delta"]["changes"][0]["kind"], "Add");
    assert_eq!(
        std::fs::read_to_string(temp.path().join("first.txt")).unwrap(),
        "committed\n"
    );
    assert_eq!(applied["error"]["variant"], "IoError");
    assert!(applied["stderr"].as_str().unwrap().contains("missing.txt"));
}

#[test]
fn preserve_line_endings_mode_reuses_upstream_crlf_semantics() {
    let temp = tempfile::tempdir().unwrap();
    let path = temp.path().join("crlf.txt");
    std::fs::write(&path, b"first\r\nold\r\n").unwrap();
    let mut sidecar = Sidecar::spawn();
    let patch = "*** Begin Patch\n*** Update File: crlf.txt\n@@\n-old\n+new\n*** End Patch";
    let response = sidecar.request(
        "apply_patch",
        json!({
            "patch": patch,
            "cwd": cwd_uri(temp.path()),
            "mode": "preserve_line_endings"
        }),
    );
    let applied = assert_success(&response);
    assert_eq!(applied["success"], true);
    assert_eq!(applied["delta"]["exact"], true);
    assert_eq!(applied["delta"]["changes"][0]["kind"], "Update");
    assert_eq!(std::fs::read(path).unwrap(), b"first\r\nnew\r\n");
}

#[test]
fn rpc_errors_do_not_kill_process_and_shutdown_is_clean() {
    let mut sidecar = Sidecar::spawn();
    sidecar.send_line("{not-json}");
    assert_rpc_error(&sidecar.read_response(), "invalid_request");

    let invalid = sidecar.request(
        "verify_patch",
        json!({ "patch": "x", "cwd": "not-a-uri", "mode": "normalize_to_lf" }),
    );
    assert_rpc_error(&invalid, "invalid_params");
    assert_eq!(
        assert_success(&sidecar.request("hello", json!({})))["protocolVersion"],
        1
    );

    let shutdown = sidecar.request("shutdown", json!({}));
    assert_eq!(assert_success(&shutdown)["shutdown"], true);
    assert!(sidecar.wait_for_exit(Duration::from_secs(2)).success());
}
