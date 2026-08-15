mod support;

use codex_execpolicy::Decision;
use codex_execpolicy::MatchOptions;
use codex_execpolicy::Policy;
use codex_execpolicy::PolicyParser;
use codex_execpolicy::RuleMatch;
use serde::Deserialize;
use serde_json::Map;
use serde_json::Value;
use serde_json::json;
use support::Sidecar;
use support::assert_success;

const POLICY_SOURCE: &str = include_str!("../../../conformance/execpolicy/fixtures/policy.star");
const CASES_SOURCE: &str =
    include_str!("../../../conformance/execpolicy/fixtures/check-token-cases.json");
const CRATE_MANIFEST: &str = include_str!("../Cargo.toml");
const CODEX_COMMIT: &str = "086396f7f60347b74c82784d5dfaf4fb2d3bda12";

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct Fixture {
    schema_version: u32,
    policy_identifier: String,
    cases: Vec<CheckCase>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct CheckCase {
    name: String,
    commands: Vec<Vec<String>>,
    #[serde(default)]
    fallback_decision: Option<Decision>,
    #[serde(default)]
    resolve_host_executables: bool,
}

fn parse_upstream_policy(identifier: &str) -> Policy {
    let mut parser = PolicyParser::new();
    parser
        .parse(identifier, POLICY_SOURCE)
        .expect("conformance fixture parses in pinned upstream codex_execpolicy");
    parser.build()
}

fn upstream_check(policy: &Policy, case: &CheckCase) -> Value {
    let options = MatchOptions {
        resolve_host_executables: case.resolve_host_executables,
    };
    let mut matched_rules = Vec::<RuleMatch>::new();
    for command in &case.commands {
        let command_matches = match case.fallback_decision {
            Some(decision) => {
                let fallback = |_command: &[String]| decision;
                policy.matches_for_command_with_options(command, Some(&fallback), &options)
            }
            None => policy.matches_for_command_with_options(command, None, &options),
        };
        matched_rules.extend(command_matches);
    }

    let decision = matched_rules.iter().map(RuleMatch::decision).max();
    let mut result = Map::new();
    if let Some(decision) = decision {
        result.insert(
            "decision".to_string(),
            serde_json::to_value(decision).expect("upstream decision serializes"),
        );
    }
    result.insert(
        "matchedRules".to_string(),
        serde_json::to_value(matched_rules).expect("upstream rule matches serialize"),
    );
    Value::Object(result)
}

#[test]
fn upstream_dependencies_are_pinned_to_the_declared_codex_commit() {
    for dependency in [
        "codex-config",
        "codex-exec-server",
        "codex-execpolicy",
        "codex-shell-command",
        "codex-utils-absolute-path",
        "codex-utils-cli",
        "codex-utils-home-dir",
    ] {
        let declaration = format!(
            r#"{dependency} = {{ git = "https://github.com/openai/codex", rev = "{CODEX_COMMIT}" }}"#
        );
        assert!(
            CRATE_MANIFEST.contains(&declaration),
            "{dependency} must use the exact declared upstream Git revision"
        );
    }
}

#[test]
fn sidecar_check_tokens_matches_the_pinned_upstream_engine_for_all_fixtures() {
    let fixture: Fixture = serde_json::from_str(CASES_SOURCE).expect("valid case fixture JSON");
    assert_eq!(fixture.schema_version, 1, "unsupported fixture schema");
    assert!(!fixture.cases.is_empty(), "fixture must contain cases");

    let upstream_policy = parse_upstream_policy(&fixture.policy_identifier);
    let mut sidecar = Sidecar::spawn();
    let load_response = sidecar.request(
        "load",
        json!({
            "sources": [{
                "identifier": fixture.policy_identifier,
                "content": POLICY_SOURCE,
            }]
        }),
    );
    assert_eq!(assert_success(&load_response)["loadedSources"], 1);

    for case in &fixture.cases {
        let mut params = json!({
            "commands": case.commands,
            "resolveHostExecutables": case.resolve_host_executables,
        });
        if let Some(fallback_decision) = case.fallback_decision {
            params["fallbackDecision"] =
                serde_json::to_value(fallback_decision).expect("fallback decision serializes");
        }

        let response = sidecar.request("check_tokens", params);
        let actual = assert_success(&response);
        let expected = upstream_check(&upstream_policy, case);
        assert_eq!(
            actual, &expected,
            "sidecar diverged from pinned codex_execpolicy for case {:?}",
            case.name
        );
    }
}

#[test]
fn sidecar_compiled_network_domains_match_the_pinned_upstream_engine() {
    let fixture: Fixture = serde_json::from_str(CASES_SOURCE).expect("valid case fixture JSON");
    let upstream_policy = parse_upstream_policy(&fixture.policy_identifier);
    let (allowed, denied) = upstream_policy.compiled_network_domains();
    let expected = json!({ "allowed": allowed, "denied": denied });

    let mut sidecar = Sidecar::spawn();
    let load_response = sidecar.request(
        "load",
        json!({
            "sources": [{
                "identifier": fixture.policy_identifier,
                "content": POLICY_SOURCE,
            }]
        }),
    );
    assert_success(&load_response);

    let response = sidecar.request("compile_network_domains", json!({}));
    assert_eq!(
        assert_success(&response),
        &expected,
        "network compilation diverged from pinned codex_execpolicy"
    );
}
