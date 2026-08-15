use super::*;

use codex_app_server_protocol::CommandExecutionApprovalDecision as AppDecision;
use codex_app_server_protocol::CommandExecutionRequestApprovalParams as AppRequestParams;
use codex_app_server_protocol::CommandExecutionRequestApprovalResponse as AppResponse;
use codex_app_server_protocol::NetworkPolicyRuleAction as AppNetworkPolicyRuleAction;
use codex_protocol::approvals::ExecPolicyAmendment;
use codex_protocol::approvals::NetworkApprovalContext;
use codex_protocol::approvals::NetworkApprovalProtocol;
use codex_protocol::approvals::NetworkPolicyAmendment;
use codex_protocol::approvals::NetworkPolicyRuleAction;
use codex_protocol::models::AdditionalPermissionProfile;
use codex_protocol::protocol::ExecApprovalRequestEvent;
use codex_protocol::protocol::ReviewDecision;
use codex_utils_absolute_path::AbsolutePathBuf;
use serde::Deserialize;
use serde_json::Value;
use serde_json::json;
use std::collections::HashSet;
use std::fs;
use std::path::PathBuf;
use std::sync::Arc;
use std::sync::atomic::AtomicBool;
use std::sync::atomic::Ordering;
use tokio::sync::oneshot;

const CODEX_COMMIT: &str = "086396f7f60347b74c82784d5dfaf4fb2d3bda12";
const PROTOCOL_APPROVALS_BLOB: &str = "44dc8d7d7c9728a69e0b153dc1e43e248aaab9bc";
const SANDBOXING_BLOB: &str = "2d20334f6446b2273128e6ed54e8001e28e37a76";
const SESSION_HANDLERS_BLOB: &str = "a928090cc82eae3368030172e36b938c9422d5c3";
const SESSION_CONSTRUCTOR_BLOB: &str = "84829d90f112ab4717abeaa16877379c3ca0a117";
const APP_SERVER_ITEM_BLOB: &str = "dcfe928508e8eef1af3b3f05c739860e75c0d607";
const APP_SERVER_BESPOKE_BLOB: &str = "32c222668614aa17b8496712c24b061d76bcc2b5";

#[derive(Debug, Deserialize)]
#[serde(tag = "operation")]
enum CorpusCase {
    #[serde(rename = "decisions")]
    Decisions {
        #[serde(rename = "schemaVersion")]
        schema_version: u64,
        id: String,
        input: DecisionInput,
    },
    #[serde(rename = "requestWire")]
    RequestWire {
        #[serde(rename = "schemaVersion")]
        schema_version: u64,
        id: String,
        params: Value,
        comparison: Option<RequestWireComparison>,
        #[serde(rename = "requiresPointerWidth")]
        requires_pointer_width: Option<u32>,
    },
    #[serde(rename = "responseWire")]
    ResponseWire {
        #[serde(rename = "schemaVersion")]
        schema_version: u64,
        id: String,
        offered: Vec<AppDecision>,
        response: Value,
    },
    #[serde(rename = "cache")]
    Cache {
        #[serde(rename = "schemaVersion")]
        schema_version: u64,
        id: String,
        sessions: Vec<CacheSession>,
    },
    #[serde(rename = "persistence")]
    Persistence {
        #[serde(rename = "schemaVersion")]
        schema_version: u64,
        id: String,
        mode: PersistenceMode,
        amendment: Vec<String>,
    },
    #[serde(rename = "decisionFromCore")]
    DecisionFromCore {
        #[serde(rename = "schemaVersion")]
        schema_version: u64,
        id: String,
        #[serde(rename = "reviewDecision")]
        review_decision: Value,
    },
    #[serde(rename = "responseToCore")]
    ResponseToCore {
        #[serde(rename = "schemaVersion")]
        schema_version: u64,
        id: String,
        response: Value,
    },
}

impl CorpusCase {
    fn schema_version(&self) -> u64 {
        match self {
            Self::Decisions { schema_version, .. }
            | Self::RequestWire { schema_version, .. }
            | Self::ResponseWire { schema_version, .. }
            | Self::Cache { schema_version, .. }
            | Self::Persistence { schema_version, .. }
            | Self::DecisionFromCore { schema_version, .. }
            | Self::ResponseToCore { schema_version, .. } => *schema_version,
        }
    }

    fn id(&self) -> &str {
        match self {
            Self::Decisions { id, .. }
            | Self::RequestWire { id, .. }
            | Self::ResponseWire { id, .. }
            | Self::Cache { id, .. }
            | Self::Persistence { id, .. }
            | Self::DecisionFromCore { id, .. }
            | Self::ResponseToCore { id, .. } => id,
        }
    }
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct DecisionInput {
    explicit_available_decisions: Option<Vec<AppDecision>>,
    network_approval_context: Option<InputNetworkContext>,
    proposed_execpolicy_amendment: Option<Vec<String>>,
    proposed_network_policy_amendments: Option<Vec<InputNetworkAmendment>>,
    additional_permissions: Option<Value>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct InputNetworkContext {
    host: String,
    protocol: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct InputNetworkAmendment {
    host: String,
    action: String,
}

#[derive(Debug, Deserialize)]
#[serde(deny_unknown_fields)]
struct CacheSession {
    steps: Vec<CacheStep>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct CacheStep {
    keys: Vec<String>,
    fetch_decision: AppDecision,
}

#[derive(Clone, Copy, Debug, Deserialize, Eq, PartialEq)]
#[serde(rename_all = "snake_case")]
enum PersistenceMode {
    Success,
    Failure,
}

#[derive(Clone, Copy, Debug, Default, Deserialize)]
#[serde(rename_all = "camelCase")]
enum RequestWireComparison {
    #[default]
    Canonical,
    AcceptanceOnly,
}

fn app_to_core(decision: AppDecision) -> anyhow::Result<ReviewDecision> {
    Ok(match decision {
        AppDecision::Accept => ReviewDecision::Approved,
        AppDecision::AcceptForSession => ReviewDecision::ApprovedForSession,
        AppDecision::AcceptWithExecpolicyAmendment {
            execpolicy_amendment,
        } => ReviewDecision::ApprovedExecpolicyAmendment {
            proposed_execpolicy_amendment: serde_json::from_value(serde_json::to_value(
                execpolicy_amendment,
            )?)?,
        },
        AppDecision::ApplyNetworkPolicyAmendment {
            network_policy_amendment,
        } => ReviewDecision::NetworkPolicyAmendment {
            network_policy_amendment: serde_json::from_value(serde_json::to_value(
                network_policy_amendment,
            )?)?,
        },
        AppDecision::Decline => ReviewDecision::denied("approval conformance decline"),
        AppDecision::Cancel => ReviewDecision::Abort,
    })
}

fn core_to_value(decision: ReviewDecision) -> anyhow::Result<Value> {
    Ok(serde_json::to_value(AppDecision::from(decision))?)
}

fn network_protocol(value: &str) -> anyhow::Result<NetworkApprovalProtocol> {
    match value {
        "http" => Ok(NetworkApprovalProtocol::Http),
        "https" => Ok(NetworkApprovalProtocol::Https),
        "socks5Tcp" => Ok(NetworkApprovalProtocol::Socks5Tcp),
        "socks5Udp" => Ok(NetworkApprovalProtocol::Socks5Udp),
        other => anyhow::bail!("unsupported network protocol in corpus: {other}"),
    }
}

fn network_action(value: &str) -> anyhow::Result<NetworkPolicyRuleAction> {
    match value {
        "allow" => Ok(NetworkPolicyRuleAction::Allow),
        "deny" => Ok(NetworkPolicyRuleAction::Deny),
        other => anyhow::bail!("unsupported network action in corpus: {other}"),
    }
}

fn run_decisions(input: DecisionInput) -> anyhow::Result<Value> {
    let network_context = input
        .network_approval_context
        .map(|context| -> anyhow::Result<NetworkApprovalContext> {
            Ok(NetworkApprovalContext {
                host: context.host,
                protocol: network_protocol(&context.protocol)?,
            })
        })
        .transpose()?;
    let exec_amendment = input
        .proposed_execpolicy_amendment
        .map(ExecPolicyAmendment::new);
    let network_amendments = input
        .proposed_network_policy_amendments
        .map(|amendments| {
            amendments
                .into_iter()
                .map(|amendment| {
                    Ok(NetworkPolicyAmendment {
                        host: amendment.host,
                        action: network_action(&amendment.action)?,
                    })
                })
                .collect::<anyhow::Result<Vec<_>>>()
        })
        .transpose()?;
    let additional_permissions = input
        .additional_permissions
        .map(|_| AdditionalPermissionProfile::default());
    let explicit = input
        .explicit_available_decisions
        .map(|decisions| {
            decisions
                .into_iter()
                .map(app_to_core)
                .collect::<anyhow::Result<Vec<_>>>()
        })
        .transpose()?;

    let event = ExecApprovalRequestEvent {
        call_id: "approval-conformance".to_string(),
        plugin_id: None,
        script_path: None,
        approval_id: None,
        turn_id: "turn-conformance".to_string(),
        environment_id: None,
        started_at_ms: 0,
        command: vec!["true".to_string()],
        cwd: AbsolutePathBuf::try_from(std::env::current_dir()?)?,
        reason: None,
        network_approval_context: network_context,
        proposed_execpolicy_amendment: exec_amendment,
        proposed_network_policy_amendments: network_amendments,
        additional_permissions,
        available_decisions: explicit,
        parsed_cmd: Vec::new(),
    };
    let decisions = event
        .effective_available_decisions()
        .into_iter()
        .map(core_to_value)
        .collect::<anyhow::Result<Vec<_>>>()?;
    Ok(json!({ "availableDecisions": decisions }))
}

fn run_request_wire(
    params: Value,
    comparison: RequestWireComparison,
    requires_pointer_width: Option<u32>,
) -> Value {
    let pointer_width = usize::BITS;
    let comparison_name = match comparison {
        RequestWireComparison::Canonical => "canonical",
        RequestWireComparison::AcceptanceOnly => "acceptanceOnly",
    };
    if requires_pointer_width.is_some_and(|required| required != pointer_width) {
        return json!({
            "skipped": true,
            "skipReason": "pointer_width_mismatch",
            "pointerWidth": pointer_width,
            "comparison": comparison_name,
        });
    }
    match serde_json::from_value::<AppRequestParams>(params) {
        Ok(parsed) => match comparison {
            RequestWireComparison::Canonical => json!({
                "accepted": true,
                "canonical": serde_json::to_value(parsed).expect("serialize parsed request"),
                "pointerWidth": pointer_width,
                "comparison": comparison_name,
            }),
            RequestWireComparison::AcceptanceOnly => json!({
                "accepted": true,
                "pointerWidth": pointer_width,
                "comparison": comparison_name,
            }),
        },
        Err(_) => match comparison {
            RequestWireComparison::Canonical => json!({
                "accepted": false,
                "canonical": Value::Null,
                "pointerWidth": pointer_width,
                "comparison": comparison_name,
            }),
            RequestWireComparison::AcceptanceOnly => json!({
                "accepted": false,
                "pointerWidth": pointer_width,
                "comparison": comparison_name,
            }),
        },
    }
}

fn run_response_wire(_offered: Vec<AppDecision>, response: Value) -> Value {
    match serde_json::from_value::<AppResponse>(response) {
        Ok(parsed) => {
            let decision = serde_json::to_value(&parsed.decision).expect("serialize decision");
            json!({
                "accepted": true,
                "decision": decision,
            })
        }
        Err(_) => json!({
            "accepted": false,
            "decision": Value::Null,
        }),
    }
}

fn run_decision_from_core(review_decision: Value) -> anyhow::Result<Value> {
    let core: ReviewDecision = serde_json::from_value(review_decision)?;
    Ok(json!({
        "decision": serde_json::to_value(AppDecision::from(core))?,
    }))
}

fn normalized_core_decision(decision: ReviewDecision) -> Value {
    match decision {
        ReviewDecision::Approved => json!("approved"),
        ReviewDecision::ApprovedExecpolicyAmendment {
            proposed_execpolicy_amendment,
        } => json!({
            "approved_execpolicy_amendment": {
                "proposed_execpolicy_amendment": proposed_execpolicy_amendment.command(),
            }
        }),
        ReviewDecision::ApprovedForSession => json!("approved_for_session"),
        ReviewDecision::ApprovedMcpPolicyAmendment => json!("approved_mcp_policy_amendment"),
        ReviewDecision::NetworkPolicyAmendment {
            network_policy_amendment,
        } => json!({
            "network_policy_amendment": {
                "network_policy_amendment": network_policy_amendment,
            }
        }),
        ReviewDecision::Denied { rejection } => json!({
            "denied": { "rejection": rejection }
        }),
        ReviewDecision::TimedOut => json!("timed_out"),
        ReviewDecision::Abort => json!("abort"),
    }
}

// The pinned app-server keeps this conversion inside a private async handler.
// This source-model is intentionally the exact success and deserialization-
// failure match at bespoke_event_handling.rs lines 1983-2029; the blob identity
// above makes any source drift fail closed.
fn run_response_to_core(response: Value) -> Value {
    let (decision, completion_status) = match serde_json::from_value::<AppResponse>(response) {
        Ok(response) => match response.decision {
            AppDecision::Accept => (ReviewDecision::Approved, Value::Null),
            AppDecision::AcceptForSession => (ReviewDecision::ApprovedForSession, Value::Null),
            AppDecision::AcceptWithExecpolicyAmendment {
                execpolicy_amendment,
            } => (
                ReviewDecision::ApprovedExecpolicyAmendment {
                    proposed_execpolicy_amendment: execpolicy_amendment.into_core(),
                },
                Value::Null,
            ),
            AppDecision::ApplyNetworkPolicyAmendment {
                network_policy_amendment,
            } => {
                let completion_status = match network_policy_amendment.action {
                    AppNetworkPolicyRuleAction::Allow => Value::Null,
                    AppNetworkPolicyRuleAction::Deny => json!("declined"),
                };
                (
                    ReviewDecision::NetworkPolicyAmendment {
                        network_policy_amendment: network_policy_amendment.into_core(),
                    },
                    completion_status,
                )
            }
            AppDecision::Decline => (
                ReviewDecision::denied("rejected by user"),
                json!("declined"),
            ),
            AppDecision::Cancel => (ReviewDecision::Abort, json!("declined")),
        },
        Err(_) => (
            ReviewDecision::denied("approval request failed"),
            json!("failed"),
        ),
    };
    json!({
        "reviewDecision": normalized_core_decision(decision),
        "completionStatus": completion_status,
    })
}

async fn run_cache(sessions: Vec<CacheSession>) -> anyhow::Result<Value> {
    let mut session_results = Vec::with_capacity(sessions.len());
    for cache_session in sessions {
        let (session, _turn_context) = make_session_and_context().await;
        let mut step_results = Vec::with_capacity(cache_session.steps.len());
        for step in cache_session.steps {
            if step.keys.iter().any(String::is_empty) {
                anyhow::bail!("cache keys must be non-empty strings");
            }
            let fetched = Arc::new(AtomicBool::new(false));
            let fetched_in_callback = Arc::clone(&fetched);
            let fetch_decision = app_to_core(step.fetch_decision)?;
            let decision = crate::tools::sandboxing::with_cached_approval(
                &session.services,
                "approval_conformance",
                step.keys,
                move || async move {
                    fetched_in_callback.store(true, Ordering::SeqCst);
                    fetch_decision
                },
            )
            .await;
            step_results.push(json!({
                "decision": core_to_value(decision)?,
                "fetchCalled": fetched.load(Ordering::SeqCst),
            }));
        }
        session_results.push(json!({ "steps": step_results }));
    }
    Ok(json!({ "sessions": session_results }))
}

async fn install_pending_approval(
    session: &Session,
    approval_id: &str,
) -> oneshot::Receiver<ReviewDecision> {
    let (sender, receiver) = oneshot::channel();
    let mut active = session.active_turn.lock().await;
    let active = active.get_or_insert_with(ActiveTurn::default);
    let previous = active
        .turn_state
        .lock()
        .await
        .insert_pending_approval(approval_id.to_string(), sender);
    assert!(
        previous.is_none(),
        "approval id unexpectedly already pending"
    );
    receiver
}

fn warning_count(receiver: &async_channel::Receiver<Event>) -> usize {
    let mut count = 0;
    while let Ok(event) = receiver.try_recv() {
        if let EventMsg::Warning(warning) = event.msg
            && warning
                .message
                .starts_with("Failed to apply execpolicy amendment:")
        {
            count += 1;
        }
    }
    count
}

async fn run_persistence(mode: PersistenceMode, amendment: Vec<String>) -> anyhow::Result<Value> {
    anyhow::ensure!(
        !amendment.is_empty(),
        "persistence amendment must not be empty"
    );
    let (session, _turn_context, event_receiver) = make_session_and_context_with_rx().await;
    while event_receiver.try_recv().is_ok() {}

    let mut failure_root = None;
    let policy_path = if mode == PersistenceMode::Failure {
        let root = tempfile::tempdir()?;
        let blocker = root.path().join("codex-home-is-a-file");
        fs::write(&blocker, "not a directory")?;
        session.state.lock().await.session_configuration.codex_home =
            AbsolutePathBuf::try_from(blocker.clone())?;
        failure_root = Some(root);
        blocker.join("rules").join("default.rules")
    } else {
        let codex_home = session
            .state
            .lock()
            .await
            .session_configuration
            .codex_home()
            .clone();
        fs::create_dir_all(codex_home.as_path())?;
        codex_home.join("rules").join("default.rules").to_path_buf()
    };

    let approval_id = format!("persistence-{mode:?}");
    let released = install_pending_approval(&session, &approval_id).await;
    let decision = ReviewDecision::ApprovedExecpolicyAmendment {
        proposed_execpolicy_amendment: ExecPolicyAmendment::new(amendment.clone()),
    };
    let handler_session = Arc::clone(&session);
    let handler_id = approval_id.clone();
    let handler = tokio::spawn(async move {
        crate::session::handlers::exec_approval(&handler_session, handler_id, None, decision).await;
    });

    let released_decision = released.await?;
    let warnings_before_release_observation = warning_count(&event_receiver);
    let policy_contents = fs::read_to_string(&policy_path).unwrap_or_default();
    let exact_tokens_present = amendment
        .iter()
        .all(|token| policy_contents.contains(&serde_json::to_string(token).unwrap()));
    let persisted_before_release = policy_contents.contains("prefix_rule") && exact_tokens_present;
    handler.await?;
    let warnings_after_handler = warning_count(&event_receiver);
    let warning_count = warnings_before_release_observation + warnings_after_handler;
    drop(failure_root);

    let failure = mode == PersistenceMode::Failure;
    let released_despite_failure = failure
        && matches!(
            &released_decision,
            ReviewDecision::ApprovedExecpolicyAmendment { .. }
        );
    let released_decision_value = core_to_value(released_decision)?;
    let persistence_outcome = if persisted_before_release {
        "persisted"
    } else if warning_count == 1 {
        "failed"
    } else {
        "not_observed"
    };
    Ok(json!({
        "releasedDecision": released_decision_value,
        "persistenceAttempted": persisted_before_release || warning_count == 1,
        "persistenceOutcome": persistence_outcome,
        "persistedBeforeRelease": persisted_before_release,
        "warningObservedBeforeRelease": warnings_before_release_observation == 1,
        "warningCount": warning_count,
        "releasedDespiteFailure": released_despite_failure,
    }))
}

fn identity() -> Value {
    json!({
        "codexCommit": CODEX_COMMIT,
        "protocolApprovalsBlob": PROTOCOL_APPROVALS_BLOB,
        "sandboxingBlob": SANDBOXING_BLOB,
        "sessionHandlersBlob": SESSION_HANDLERS_BLOB,
        "sessionConstructorBlob": SESSION_CONSTRUCTOR_BLOB,
        "appServerItemBlob": APP_SERVER_ITEM_BLOB,
        "appServerBespokeBlob": APP_SERVER_BESPOKE_BLOB,
        "os": std::env::consts::OS,
        "arch": std::env::consts::ARCH,
        "pointerWidth": usize::BITS,
    })
}

#[tokio::test(flavor = "multi_thread", worker_threads = 2)]
#[ignore = "explicit pinned-upstream approval conformance oracle"]
async fn dsh_codex_approval_conformance_oracle() -> anyhow::Result<()> {
    let corpus_path = std::env::var("DSH_CODEX_APPROVAL_ORACLE_CORPUS")?;
    let output_path = std::env::var("DSH_CODEX_APPROVAL_ORACLE_OUTPUT")?;
    let corpus = fs::read_to_string(&corpus_path)?;
    let mut ids = HashSet::new();
    let mut output = String::new();

    for (line_index, raw_line) in corpus.lines().enumerate() {
        if raw_line.trim().is_empty() {
            continue;
        }
        let corpus_case: CorpusCase = serde_json::from_str(raw_line)
            .map_err(|error| anyhow::anyhow!("{}:{}: {error}", corpus_path, line_index + 1))?;
        anyhow::ensure!(
            corpus_case.schema_version() == 1,
            "unsupported schemaVersion"
        );
        anyhow::ensure!(!corpus_case.id().is_empty(), "case id must not be empty");
        anyhow::ensure!(
            ids.insert(corpus_case.id().to_string()),
            "duplicate case id"
        );
        let id = corpus_case.id().to_string();
        let evidence = if matches!(&corpus_case, CorpusCase::ResponseToCore { .. }) {
            "pinned_private_source_model"
        } else {
            "pinned_upstream"
        };
        let result = match corpus_case {
            CorpusCase::Decisions { input, .. } => run_decisions(input)?,
            CorpusCase::RequestWire {
                params,
                comparison,
                requires_pointer_width,
                ..
            } => run_request_wire(
                params,
                comparison.unwrap_or_default(),
                requires_pointer_width,
            ),
            CorpusCase::ResponseWire {
                offered, response, ..
            } => run_response_wire(offered, response),
            CorpusCase::Cache { sessions, .. } => run_cache(sessions).await?,
            CorpusCase::Persistence {
                mode, amendment, ..
            } => run_persistence(mode, amendment).await?,
            CorpusCase::DecisionFromCore {
                review_decision, ..
            } => run_decision_from_core(review_decision)?,
            CorpusCase::ResponseToCore { response, .. } => run_response_to_core(response),
        };
        output.push_str(&serde_json::to_string(&json!({
            "schemaVersion": 1,
            "id": id,
            "evidence": evidence,
            "identity": identity(),
            "result": result,
        }))?);
        output.push('\n');
    }

    anyhow::ensure!(!ids.is_empty(), "corpus contains no cases");
    let output_path = PathBuf::from(output_path);
    if let Some(parent) = output_path.parent() {
        fs::create_dir_all(parent)?;
    }
    fs::write(output_path, output)?;
    Ok(())
}
