use super::*;
use codex_config::ConfigLayerEntry;
use codex_config::ConfigLayerSource;
use codex_config::ConfigLayerStack;
use codex_config::ConfigRequirements;
use codex_config::ConfigRequirementsToml;
use codex_protocol::approvals::ExecPolicyAmendment;
use codex_utils_absolute_path::AbsolutePathBuf;
use serde::Deserialize;
use serde_json::Value;
use serde_json::json;
use std::collections::HashMap;
use std::collections::HashSet;
use std::fs as std_fs;
use std::io::ErrorKind;
use std::path::Path;
use std::sync::Arc;
use tempfile::tempdir;
use toml::Value as TomlValue;

const CODEX_COMMIT: &str = "086396f7f60347b74c82784d5dfaf4fb2d3bda12";
const CONFIG_TREE: &str = "d3f4925b575b128dd1f0f74a5babcdb1efce0219";
const EXECPOLICY_TREE: &str = "e06e0b4ad718af8a74055a33b1536b25fb9d4a87";
const CORE_EXEC_POLICY_BLOB: &str = "5de05937533a2653a700b4ec40cda09578761f50";
const CORE_EXEC_POLICY_DIR_TREE: &str = "b313a3ba1b113f08e3c1686272162910dad76540";
const CARGO_LOCK_BLOB: &str = "a8c2addc02055be48c345b65760a7a1b96cfbf28";

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct CorpusCase {
    schema_version: u32,
    id: String,
    #[serde(default)]
    requires_unix: bool,
    initial: InitialState,
    operations: Vec<Operation>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct InitialState {
    home: InitialHome,
    policy: Option<String>,
    marker: Option<InitialMarker>,
}

#[derive(Debug, Deserialize, Eq, PartialEq)]
#[serde(rename_all = "snake_case")]
enum InitialHome {
    Missing,
    Directory,
}

#[derive(Debug, Deserialize)]
#[serde(tag = "kind", rename_all = "snake_case", deny_unknown_fields)]
enum InitialMarker {
    File { content: String },
    SymlinkLoop,
}

#[derive(Debug, Deserialize)]
#[serde(
    tag = "kind",
    rename_all = "snake_case",
    rename_all_fields = "camelCase",
    deny_unknown_fields
)]
enum Operation {
    Open {
        manager: String,
        #[serde(default)]
        ignore_user_and_project_exec_policy_rules: bool,
    },
    AppendPrefix {
        manager: String,
        prefix: Vec<String>,
    },
    AppendNetwork {
        manager: String,
        host: String,
        protocol: String,
        decision: Decision,
        #[serde(default)]
        justification: Option<String>,
    },
    Inspect {
        manager: String,
    },
    WritePolicy {
        source: String,
    },
    AppendPolicy {
        source: String,
    },
    RemoveHome,
    ReplaceRulesDirWithFile,
}

impl Operation {
    fn kind(&self) -> &'static str {
        match self {
            Self::Open { .. } => "open",
            Self::AppendPrefix { .. } => "append_prefix",
            Self::AppendNetwork { .. } => "append_network",
            Self::Inspect { .. } => "inspect",
            Self::WritePolicy { .. } => "write_policy",
            Self::AppendPolicy { .. } => "append_policy",
            Self::RemoveHome => "remove_home",
            Self::ReplaceRulesDirWithFile => "replace_rules_dir_with_file",
        }
    }

    fn manager(&self) -> Option<&str> {
        match self {
            Self::Open { manager, .. }
            | Self::AppendPrefix { manager, .. }
            | Self::AppendNetwork { manager, .. }
            | Self::Inspect { manager } => Some(manager),
            Self::WritePolicy { .. }
            | Self::AppendPolicy { .. }
            | Self::RemoveHome
            | Self::ReplaceRulesDirWithFile => None,
        }
    }
}

fn parse_corpus(path: &Path) -> anyhow::Result<Vec<CorpusCase>> {
    let contents = std_fs::read_to_string(path)?;
    let normalized = contents.replace("\r\n", "\n");
    let body = normalized.strip_suffix('\n').unwrap_or(&normalized);
    anyhow::ensure!(!body.is_empty(), "corpus is empty");
    let mut cases = Vec::new();
    let mut ids = HashSet::new();
    for (index, line) in body.split('\n').enumerate() {
        anyhow::ensure!(
            !line.trim().is_empty(),
            "blank corpus record at line {}",
            index + 1
        );
        let corpus_case = serde_json::from_str::<CorpusCase>(line).map_err(|error| {
            anyhow::anyhow!("invalid corpus record at line {}: {error}", index + 1)
        })?;
        anyhow::ensure!(corpus_case.schema_version == 1, "unsupported corpus schema");
        anyhow::ensure!(!corpus_case.id.is_empty(), "empty corpus id");
        anyhow::ensure!(ids.insert(corpus_case.id.clone()), "duplicate corpus id");
        anyhow::ensure!(!corpus_case.operations.is_empty(), "case has no operations");
        cases.push(corpus_case);
    }
    Ok(cases)
}

fn initialize_case(home: &Path, initial: &InitialState) -> anyhow::Result<()> {
    if initial.home == InitialHome::Directory {
        std_fs::create_dir_all(home)?;
    }
    if let Some(policy) = initial.policy.as_ref() {
        let policy_path = default_policy_path(home);
        std_fs::create_dir_all(policy_path.parent().expect("policy has parent"))?;
        std_fs::write(policy_path, policy)?;
    }
    match initial.marker.as_ref() {
        Some(InitialMarker::File { content }) => {
            std_fs::write(home.join(".sandbox_migration"), content)?;
        }
        Some(InitialMarker::SymlinkLoop) => {
            #[cfg(unix)]
            std::os::unix::fs::symlink(".sandbox_migration", home.join(".sandbox_migration"))?;
            #[cfg(windows)]
            anyhow::bail!("symlink-loop setup must be skipped on Windows");
        }
        None => {}
    }
    Ok(())
}

fn config_stack(
    home: &Path,
    ignore_user_and_project_rules: bool,
) -> anyhow::Result<ConfigLayerStack> {
    let config_file =
        AbsolutePathBuf::from_absolute_path(home.join(codex_config::CONFIG_TOML_FILE))?;
    let layer = ConfigLayerEntry::new(
        ConfigLayerSource::User {
            file: config_file,
            profile: None,
        },
        TomlValue::Table(Default::default()),
    );
    Ok(ConfigLayerStack::new(
        vec![layer],
        ConfigRequirements::default(),
        ConfigRequirementsToml::default(),
    )?
    .with_user_and_project_exec_policy_rules_ignored(ignore_user_and_project_rules))
}

async fn open_manager(
    home: &Path,
    ignore_user_and_project_rules: bool,
) -> anyhow::Result<(Arc<ExecPolicyManager>, Value)> {
    // This is the exact canonical startup ordering from Session::new: the
    // already-built ConfigLayerStack is followed by best-effort migration,
    // then ExecPolicyManager::load. Test-only projection is the only addition.
    let stack = config_stack(home, ignore_user_and_project_rules)?;
    let migration = if ignore_user_and_project_rules {
        json!({
            "attempted": false,
            "completed": false,
            "warning": false,
            "skippedReason": "user_and_project_exec_policy_rules_ignored",
        })
    } else {
        match codex_execpolicy::prefix_rule_migration(
            home,
            default_policy_path(home).as_path(),
            BANNED_PREFIX_SUGGESTIONS,
        )
        .await
        {
            Ok(()) => json!({
                "attempted": true,
                "completed": true,
                "warning": false,
                "skippedReason": null,
            }),
            Err(_) => json!({
                "attempted": true,
                "completed": false,
                "warning": true,
                "skippedReason": null,
            }),
        }
    };
    let manager = Arc::new(ExecPolicyManager::load(&stack).await?);
    let load_warning = check_execpolicy_for_warnings(&stack)
        .await?
        .map(|warning| match warning {
            ExecPolicyError::ParsePolicy { .. } => "parse_policy",
            ExecPolicyError::ReadDir { .. } | ExecPolicyError::ReadFile { .. } => {
                unreachable!("ExecPolicyManager::load would have returned this error")
            }
        });
    Ok((
        manager,
        json!({
            "status": "ok",
            "migration": migration,
            "loadWarning": load_warning,
        }),
    ))
}

fn policy_state(manager: &ExecPolicyManager) -> Value {
    let policy = manager.current();
    let (allowed, denied) = policy.compiled_network_domains();
    json!({
        "allowedPrefixes": policy.get_allowed_prefixes(),
        "networkRuleCount": policy.network_rules().len(),
        "compiledNetworkDomains": {
            "allowed": allowed,
            "denied": denied,
        },
    })
}

fn node_snapshot(path: &Path) -> anyhow::Result<Value> {
    let metadata = match std_fs::symlink_metadata(path) {
        Ok(metadata) => metadata,
        Err(error) if matches!(error.kind(), ErrorKind::NotFound | ErrorKind::NotADirectory) => {
            return Ok(json!({ "kind": "missing" }));
        }
        Err(error) => return Err(error.into()),
    };
    let file_type = metadata.file_type();
    if file_type.is_symlink() {
        Ok(json!({ "kind": "symlink" }))
    } else if file_type.is_dir() {
        Ok(json!({ "kind": "directory" }))
    } else if file_type.is_file() {
        Ok(json!({
            "kind": "file",
            "content": std_fs::read_to_string(path)?,
        }))
    } else {
        Ok(json!({ "kind": "other" }))
    }
}

fn filesystem_snapshot(home: &Path) -> anyhow::Result<Value> {
    Ok(json!({
        "home": node_snapshot(home)?,
        "rules": node_snapshot(&home.join("rules"))?,
        "policy": node_snapshot(&default_policy_path(home))?,
        "marker": node_snapshot(&home.join(".sandbox_migration"))?,
    }))
}

fn classify_update_error(error: ExecPolicyUpdateError) -> &'static str {
    match error {
        ExecPolicyUpdateError::AppendRule {
            source: codex_execpolicy::AmendError::EmptyPrefix,
            ..
        } => "empty_prefix",
        ExecPolicyUpdateError::AppendRule {
            source: codex_execpolicy::AmendError::CreatePolicyDir { .. },
            ..
        } => "create_policy_dir",
        ExecPolicyUpdateError::AppendRule {
            source: codex_execpolicy::AmendError::OpenPolicyFile { .. },
            ..
        } => "open_policy_file",
        ExecPolicyUpdateError::AppendRule { .. } => "append_rule_failed",
        ExecPolicyUpdateError::JoinBlockingTask { .. } => "join_blocking_task_failed",
        ExecPolicyUpdateError::AddRule { .. } => "update_policy_failed",
    }
}

async fn execute_case(corpus_case: CorpusCase, corpus_sha256: &str) -> anyhow::Result<Value> {
    if corpus_case.requires_unix && cfg!(windows) {
        return Ok(json!({
            "schemaVersion": 1,
            "id": corpus_case.id,
            "corpusSha256": corpus_sha256,
            "source": oracle_source(),
            "result": { "skipped": "requires_unix" },
        }));
    }
    let root = tempdir()?;
    let home = root.path().join("codex-home");
    initialize_case(&home, &corpus_case.initial)?;
    let mut managers = HashMap::<String, Arc<ExecPolicyManager>>::new();
    let mut operation_results = Vec::new();

    for operation in corpus_case.operations {
        let kind = operation.kind();
        let manager_name = operation.manager().map(str::to_string);
        let outcome = match &operation {
            Operation::Open {
                manager,
                ignore_user_and_project_exec_policy_rules,
            } => {
                let (opened, outcome) =
                    open_manager(&home, *ignore_user_and_project_exec_policy_rules).await?;
                managers.insert(manager.clone(), opened);
                outcome
            }
            Operation::AppendPrefix { manager, prefix } => {
                let policy_manager = managers
                    .get(manager)
                    .ok_or_else(|| anyhow::anyhow!("unopened manager {manager}"))?;
                let before = policy_manager.current();
                match policy_manager
                    .append_amendment_and_update(&home, &ExecPolicyAmendment::new(prefix.clone()))
                    .await
                {
                    Ok(()) => {
                        let changed_in_memory = !Arc::ptr_eq(&before, &policy_manager.current());
                        json!({ "status": "ok", "changedInMemory": changed_in_memory })
                    }
                    Err(error) => json!({
                        "status": "error",
                        "errorClass": classify_update_error(error),
                    }),
                }
            }
            Operation::AppendNetwork {
                manager,
                host,
                protocol,
                decision,
                justification,
            } => {
                let policy_manager = managers
                    .get(manager)
                    .ok_or_else(|| anyhow::anyhow!("unopened manager {manager}"))?;
                let protocol = NetworkRuleProtocol::parse(protocol)?;
                match policy_manager
                    .append_network_rule_and_update(
                        &home,
                        host,
                        protocol,
                        *decision,
                        justification.clone(),
                    )
                    .await
                {
                    Ok(()) => json!({ "status": "ok" }),
                    Err(error) => json!({
                        "status": "error",
                        "errorClass": classify_update_error(error),
                    }),
                }
            }
            Operation::Inspect { manager } => {
                anyhow::ensure!(managers.contains_key(manager), "unopened manager {manager}");
                json!({ "status": "ok" })
            }
            Operation::WritePolicy { source } => {
                let policy_path = default_policy_path(&home);
                std_fs::create_dir_all(policy_path.parent().expect("policy has parent"))?;
                std_fs::write(policy_path, source)?;
                json!({ "status": "ok" })
            }
            Operation::AppendPolicy { source } => {
                use std::io::Write as _;
                let policy_path = default_policy_path(&home);
                std_fs::create_dir_all(policy_path.parent().expect("policy has parent"))?;
                let mut file = std_fs::OpenOptions::new()
                    .create(true)
                    .append(true)
                    .open(policy_path)?;
                file.write_all(source.as_bytes())?;
                json!({ "status": "ok" })
            }
            Operation::RemoveHome => {
                match std_fs::remove_dir_all(&home) {
                    Ok(()) => {}
                    Err(error) if error.kind() == ErrorKind::NotFound => {}
                    Err(error) => return Err(error.into()),
                }
                json!({ "status": "ok" })
            }
            Operation::ReplaceRulesDirWithFile => {
                let rules = home.join("rules");
                match std_fs::remove_dir_all(&rules) {
                    Ok(()) => {}
                    Err(error) if error.kind() == ErrorKind::NotFound => {}
                    Err(error) => return Err(error.into()),
                }
                std_fs::write(rules, "not a directory\n")?;
                json!({ "status": "ok" })
            }
        };
        let state = manager_name
            .as_ref()
            .map(|manager| {
                managers
                    .get(manager)
                    .map(|manager| policy_state(manager))
                    .ok_or_else(|| anyhow::anyhow!("unopened manager {manager}"))
            })
            .transpose()?;
        let mut operation_result = json!({
            "kind": kind,
            "outcome": outcome,
            "filesystem": filesystem_snapshot(&home)?,
        });
        if let Some(manager_name) = manager_name {
            operation_result["manager"] = json!(manager_name);
        }
        if let Some(state) = state {
            operation_result["state"] = state;
        }
        operation_results.push(operation_result);
    }

    Ok(json!({
        "schemaVersion": 1,
        "id": corpus_case.id,
        "corpusSha256": corpus_sha256,
        "source": oracle_source(),
        "result": {
            "operations": operation_results,
            "finalFilesystem": filesystem_snapshot(&home)?,
        },
    }))
}

fn oracle_source() -> Value {
    json!({
        "kind": "upstream_oracle",
        "codexCommit": CODEX_COMMIT,
        "configTree": CONFIG_TREE,
        "execpolicyTree": EXECPOLICY_TREE,
        "coreExecPolicyBlob": CORE_EXEC_POLICY_BLOB,
        "coreExecPolicyDirTree": CORE_EXEC_POLICY_DIR_TREE,
        "cargoLockBlob": CARGO_LOCK_BLOB,
        "os": std::env::consts::OS,
        "arch": std::env::consts::ARCH,
    })
}

#[tokio::test]
#[ignore = "run only through the pinned dsh-codex persistence oracle harness"]
async fn dsh_codex_exec_policy_persistence_oracle() -> anyhow::Result<()> {
    let corpus_path = std::env::var_os("DSH_CODEX_PERSISTENCE_ORACLE_CORPUS")
        .ok_or_else(|| anyhow::anyhow!("missing DSH_CODEX_PERSISTENCE_ORACLE_CORPUS"))?;
    let output_path = std::env::var_os("DSH_CODEX_PERSISTENCE_ORACLE_OUTPUT")
        .ok_or_else(|| anyhow::anyhow!("missing DSH_CODEX_PERSISTENCE_ORACLE_OUTPUT"))?;
    let corpus_sha256 = std::env::var("DSH_CODEX_PERSISTENCE_CORPUS_SHA256")?;
    anyhow::ensure!(
        corpus_sha256.len() == 64 && corpus_sha256.bytes().all(|byte| byte.is_ascii_hexdigit()),
        "invalid corpus SHA-256"
    );

    let cases = parse_corpus(Path::new(&corpus_path))?;
    let mut records = Vec::with_capacity(cases.len());
    for corpus_case in cases {
        records.push(execute_case(corpus_case, &corpus_sha256).await?);
    }
    let mut output = records
        .into_iter()
        .map(|record| serde_json::to_string(&record))
        .collect::<Result<Vec<_>, _>>()?
        .join("\n");
    output.push('\n');
    std_fs::write(output_path, output)?;
    Ok(())
}
