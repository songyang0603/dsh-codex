//! Test-only runtime-policy oracle injected into a pristine, pinned Codex checkout.
//!
//! This module is compiled as a child of `codex_core::exec_policy`, so it calls
//! the real crate-private runtime policy implementation. It intentionally has
//! no dependency on dsh-codex or its adapter types.

use super::*;
use codex_protocol::permissions::FileSystemAccessMode;
use codex_protocol::permissions::FileSystemPath;
use codex_protocol::permissions::FileSystemSandboxEntry;
use codex_protocol::permissions::FileSystemSandboxPolicy;
use codex_protocol::permissions::FileSystemSpecialPath;
use codex_protocol::permissions::NetworkSandboxPolicy;
use codex_protocol::protocol::GranularApprovalConfig;
use serde::Deserialize;
use serde::Serialize;
use std::collections::BTreeSet;
use std::error::Error;
use std::fmt::Write as _;
use std::path::PathBuf;

const SCHEMA_VERSION: u32 = 1;
const CODEX_COMMIT: &str = "086396f7f60347b74c82784d5dfaf4fb2d3bda12";
const CORE_EXEC_POLICY_BLOB: &str = "5de05937533a2653a700b4ec40cda09578761f50";
const CORPUS_ENV: &str = "DSH_CODEX_RUNTIME_ORACLE_CORPUS";
const OUTPUT_ENV: &str = "DSH_CODEX_RUNTIME_ORACLE_OUTPUT";

type OracleResult<T> = Result<T, Box<dyn Error + Send + Sync>>;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct CorpusCase {
    schema_version: u32,
    id: String,
    #[serde(default)]
    requires_windows_power_shell: bool,
    policy: PolicySource,
    request: RuntimeRequest,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct PolicySource {
    identifier: String,
    source: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct RuntimeRequest {
    command: Vec<String>,
    approval_policy: ApprovalPolicyInput,
    permission_profile: PermissionProfileInput,
    windows_sandbox_level: WindowsSandboxLevelInput,
    sandbox_permissions: SandboxPermissionsInput,
    #[serde(default)]
    prefix_rule: Option<Vec<String>>,
    #[serde(default)]
    allow_prefix_rules: AllowPrefixRulesInput,
}

#[derive(Clone, Copy, Debug, Deserialize)]
#[serde(
    tag = "kind",
    rename_all = "snake_case",
    rename_all_fields = "camelCase",
    deny_unknown_fields
)]
enum ApprovalPolicyInput {
    UnlessTrusted,
    OnRequest,
    Granular { sandbox_approval: bool, rules: bool },
    Never,
}

impl From<ApprovalPolicyInput> for AskForApproval {
    fn from(value: ApprovalPolicyInput) -> Self {
        match value {
            ApprovalPolicyInput::UnlessTrusted => Self::UnlessTrusted,
            ApprovalPolicyInput::OnRequest => Self::OnRequest,
            ApprovalPolicyInput::Granular {
                sandbox_approval,
                rules,
            } => Self::Granular(GranularApprovalConfig {
                sandbox_approval,
                rules,
                skill_approval: false,
                request_permissions: false,
                mcp_elicitations: false,
            }),
            ApprovalPolicyInput::Never => Self::Never,
        }
    }
}

#[derive(Clone, Copy, Debug, Deserialize)]
#[serde(rename_all = "snake_case")]
enum ManagedFileSystemKindInput {
    Restricted,
    Unrestricted,
}

#[derive(Clone, Copy, Debug, Deserialize)]
#[serde(
    tag = "kind",
    rename_all = "snake_case",
    rename_all_fields = "camelCase",
    deny_unknown_fields
)]
enum PermissionProfileInput {
    Managed {
        file_system: ManagedFileSystemKindInput,
        has_full_disk_write_access: bool,
    },
    Disabled,
    External,
}

impl PermissionProfileInput {
    fn into_upstream(self) -> OracleResult<PermissionProfile> {
        let profile = match self {
            Self::Managed {
                file_system: ManagedFileSystemKindInput::Restricted,
                has_full_disk_write_access: false,
            } => PermissionProfile::read_only(),
            Self::Managed {
                file_system: ManagedFileSystemKindInput::Restricted,
                has_full_disk_write_access: true,
            } => {
                let file_system =
                    FileSystemSandboxPolicy::restricted(vec![FileSystemSandboxEntry {
                        path: FileSystemPath::Special {
                            value: FileSystemSpecialPath::Root,
                        },
                        access: FileSystemAccessMode::Write,
                        missing_path_behavior: None,
                    }]);
                PermissionProfile::from_runtime_permissions(
                    &file_system,
                    NetworkSandboxPolicy::Restricted,
                )
            }
            Self::Managed {
                file_system: ManagedFileSystemKindInput::Unrestricted,
                has_full_disk_write_access: true,
            } => PermissionProfile::from_runtime_permissions(
                &FileSystemSandboxPolicy::unrestricted(),
                NetworkSandboxPolicy::Restricted,
            ),
            Self::Managed {
                file_system: ManagedFileSystemKindInput::Unrestricted,
                has_full_disk_write_access: false,
            } => {
                return Err(
                    "an unrestricted managed filesystem always has full disk write access".into(),
                );
            }
            Self::Disabled => PermissionProfile::Disabled,
            Self::External => PermissionProfile::External {
                network: NetworkSandboxPolicy::Restricted,
            },
        };
        Ok(profile)
    }
}

#[derive(Clone, Copy, Debug, Deserialize)]
#[serde(rename_all = "snake_case")]
enum WindowsSandboxLevelInput {
    Disabled,
    RestrictedToken,
    Elevated,
}

impl From<WindowsSandboxLevelInput> for WindowsSandboxLevel {
    fn from(value: WindowsSandboxLevelInput) -> Self {
        match value {
            WindowsSandboxLevelInput::Disabled => Self::Disabled,
            WindowsSandboxLevelInput::RestrictedToken => Self::RestrictedToken,
            WindowsSandboxLevelInput::Elevated => Self::Elevated,
        }
    }
}

#[derive(Clone, Copy, Debug, Deserialize)]
#[serde(rename_all = "snake_case")]
enum SandboxPermissionsInput {
    UseDefault,
    RequireEscalated,
    WithAdditionalPermissions,
}

impl From<SandboxPermissionsInput> for SandboxPermissions {
    fn from(value: SandboxPermissionsInput) -> Self {
        match value {
            SandboxPermissionsInput::UseDefault => Self::UseDefault,
            SandboxPermissionsInput::RequireEscalated => Self::RequireEscalated,
            SandboxPermissionsInput::WithAdditionalPermissions => Self::WithAdditionalPermissions,
        }
    }
}

#[derive(Clone, Copy, Debug, Default, Deserialize)]
#[serde(rename_all = "snake_case")]
enum AllowPrefixRulesInput {
    #[default]
    Honor,
    IgnoreForCyberModel,
}

impl From<AllowPrefixRulesInput> for AllowPrefixRules {
    fn from(value: AllowPrefixRulesInput) -> Self {
        match value {
            AllowPrefixRulesInput::Honor => Self::Honor,
            AllowPrefixRulesInput::IgnoreForCyberModel => Self::IgnoreForCyberModel,
        }
    }
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct OutputEnvelope {
    schema_version: u32,
    id: String,
    upstream: UpstreamIdentity,
    result: CanonicalResult,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct UpstreamIdentity {
    codex_commit: &'static str,
    core_exec_policy_blob: &'static str,
    os: &'static str,
    arch: &'static str,
}

#[derive(Debug, Serialize)]
struct CanonicalResult {
    requirement: CanonicalRequirement,
}

#[derive(Debug, Serialize)]
#[serde(
    tag = "kind",
    rename_all = "snake_case",
    rename_all_fields = "camelCase"
)]
enum CanonicalRequirement {
    Skip {
        bypass_sandbox: bool,
        #[serde(skip_serializing_if = "Option::is_none")]
        proposed_execpolicy_amendment: Option<CanonicalAmendment>,
    },
    NeedsApproval {
        #[serde(skip_serializing_if = "Option::is_none")]
        reason: Option<String>,
        #[serde(skip_serializing_if = "Option::is_none")]
        proposed_execpolicy_amendment: Option<CanonicalAmendment>,
    },
    Forbidden {
        reason: String,
    },
}

#[derive(Debug, Serialize)]
#[serde(transparent)]
struct CanonicalAmendment(Vec<String>);

impl From<ExecPolicyAmendment> for CanonicalAmendment {
    fn from(value: ExecPolicyAmendment) -> Self {
        Self(value.command)
    }
}

impl From<ExecApprovalRequirement> for CanonicalRequirement {
    fn from(value: ExecApprovalRequirement) -> Self {
        match value {
            ExecApprovalRequirement::Skip {
                bypass_sandbox,
                proposed_execpolicy_amendment,
            } => Self::Skip {
                bypass_sandbox,
                proposed_execpolicy_amendment: proposed_execpolicy_amendment.map(Into::into),
            },
            ExecApprovalRequirement::NeedsApproval {
                reason,
                proposed_execpolicy_amendment,
            } => Self::NeedsApproval {
                reason,
                proposed_execpolicy_amendment: proposed_execpolicy_amendment.map(Into::into),
            },
            ExecApprovalRequirement::Forbidden { reason } => Self::Forbidden { reason },
        }
    }
}

fn required_path(name: &str) -> OracleResult<PathBuf> {
    std::env::var_os(name)
        .map(PathBuf::from)
        .ok_or_else(|| format!("required environment variable {name} is not set").into())
}

fn host_program_path(name: &str) -> String {
    if cfg!(windows) {
        format!(r"C:\usr\bin\{name}.exe")
    } else {
        format!("/usr/bin/{name}")
    }
}

fn alternate_git_path() -> String {
    if cfg!(windows) {
        r"C:\opt\homebrew\bin\git.exe".to_string()
    } else {
        "/opt/homebrew/bin/git".to_string()
    }
}

fn starlark_string(value: &str) -> String {
    value.replace('\\', "\\\\").replace('"', "\\\"")
}

fn expand_platform_placeholders(value: &str) -> String {
    let git = host_program_path("git");
    let cargo = host_program_path("cargo");
    value
        .replace("$HOST_GIT_STARLARK", &starlark_string(&git))
        .replace("$HOST_CARGO_STARLARK", &starlark_string(&cargo))
        .replace("$HOST_ALT_GIT", &alternate_git_path())
        .replace("$HOST_GIT", &git)
        .replace("$HOST_CARGO", &cargo)
}

fn verify_required_windows_powershell(command: &[String]) -> OracleResult<()> {
    #[cfg(windows)]
    {
        let executable = command
            .first()
            .ok_or("a PowerShell-required case has no command executable")?;
        let output = std::process::Command::new(executable)
            .args([
                "-NoLogo",
                "-NoProfile",
                "-Command",
                "Write-Output dsh-codex-oracle-ready",
            ])
            .output()
            .map_err(|error| {
                format!(
                    "required Windows PowerShell executable {executable:?} could not start: {error}"
                )
            })?;
        if !output.status.success() {
            return Err(format!(
                "required Windows PowerShell executable {executable:?} exited with {}",
                output.status
            )
            .into());
        }
    }

    #[cfg(not(windows))]
    {
        let _ = command;
    }

    Ok(())
}

async fn evaluate_case(case: CorpusCase) -> OracleResult<OutputEnvelope> {
    if case.schema_version != SCHEMA_VERSION {
        return Err(format!(
            "case {:?} uses schema version {}, expected {SCHEMA_VERSION}",
            case.id, case.schema_version
        )
        .into());
    }
    if case.id.is_empty() {
        return Err("case id must not be empty".into());
    }
    if case.request.command.is_empty() {
        return Err(format!("case {:?}: command must not be empty", case.id).into());
    }

    let policy_source = expand_platform_placeholders(&case.policy.source);
    let command = case
        .request
        .command
        .iter()
        .map(|token| expand_platform_placeholders(token))
        .collect::<Vec<_>>();
    let prefix_rule = case.request.prefix_rule.as_ref().map(|prefix| {
        prefix
            .iter()
            .map(|token| expand_platform_placeholders(token))
            .collect::<Vec<_>>()
    });
    if case.requires_windows_power_shell {
        verify_required_windows_powershell(&command)?;
    }

    let mut parser = PolicyParser::new();
    parser.parse(&case.policy.identifier, &policy_source)?;
    let manager = ExecPolicyManager::new(Arc::new(parser.build()));
    let permission_profile = case.request.permission_profile.into_upstream()?;
    let requirement = manager
        .create_exec_approval_requirement_for_command(ExecApprovalRequest {
            command: &command,
            approval_policy: case.request.approval_policy.into(),
            permission_profile,
            windows_sandbox_level: case.request.windows_sandbox_level.into(),
            sandbox_permissions: case.request.sandbox_permissions.into(),
            prefix_rule,
            allow_prefix_rules: case.request.allow_prefix_rules.into(),
        })
        .await;

    Ok(OutputEnvelope {
        schema_version: SCHEMA_VERSION,
        id: case.id,
        upstream: UpstreamIdentity {
            codex_commit: CODEX_COMMIT,
            core_exec_policy_blob: CORE_EXEC_POLICY_BLOB,
            os: std::env::consts::OS,
            arch: std::env::consts::ARCH,
        },
        result: CanonicalResult {
            requirement: requirement.into(),
        },
    })
}

async fn run_oracle() -> OracleResult<()> {
    let corpus_path = required_path(CORPUS_ENV)?;
    let output_path = required_path(OUTPUT_ENV)?;
    let corpus = std::fs::read_to_string(&corpus_path)?;
    let mut ids = BTreeSet::new();
    let mut rendered = String::new();
    let mut case_count = 0_usize;

    for (line_index, line) in corpus.lines().enumerate() {
        if line.trim().is_empty() {
            continue;
        }
        let case: CorpusCase = serde_json::from_str(line).map_err(|error| {
            format!(
                "failed to decode {} line {}: {error}",
                corpus_path.display(),
                line_index + 1
            )
        })?;
        if !ids.insert(case.id.clone()) {
            return Err(format!("duplicate corpus id {:?}", case.id).into());
        }
        let output = evaluate_case(case).await?;
        writeln!(&mut rendered, "{}", serde_json::to_string(&output)?)?;
        case_count += 1;
    }

    if case_count == 0 {
        return Err("runtime oracle corpus contains no cases".into());
    }
    if let Some(parent) = output_path.parent() {
        std::fs::create_dir_all(parent)?;
    }
    std::fs::write(output_path, rendered)?;
    Ok(())
}

#[tokio::test]
#[ignore = "test-only external oracle; requires explicit corpus and output paths"]
async fn dsh_codex_runtime_policy_oracle() {
    if let Err(error) = run_oracle().await {
        panic!("dsh-codex upstream runtime oracle failed: {error:#}");
    }
}
