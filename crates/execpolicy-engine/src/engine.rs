use crate::host_config::LoadHostConfigStackParams;
use crate::host_config::load_host_config_stack_policy;
use crate::runtime::RuntimePolicyInput;
use crate::runtime::RuntimePolicyOutput;
use crate::runtime::evaluate_runtime_policy;
use codex_execpolicy::Decision;
use codex_execpolicy::MatchOptions;
use codex_execpolicy::NetworkRuleProtocol;
use codex_execpolicy::Policy;
use codex_execpolicy::PolicyParser;
use codex_execpolicy::RuleMatch;
use codex_execpolicy::blocking_append_allow_prefix_rule;
use codex_execpolicy::blocking_append_network_rule;
use serde::Deserialize;
use serde::Serialize;
use serde_json::Value;
use serde_json::json;
use std::fs;
use std::path::PathBuf;
use thiserror::Error;

pub const PROTOCOL_VERSION: u32 = 3;
pub const CODEX_COMMIT: &str = "086396f7f60347b74c82784d5dfaf4fb2d3bda12";
pub const EXECPOLICY_TREE: &str = "e06e0b4ad718af8a74055a33b1536b25fb9d4a87";
pub const SHELL_COMMAND_TREE: &str = "3f5da93a61be77795d3fc5bb3d6e44a9dec1d106";
pub const CONFIG_TREE: &str = "d3f4925b575b128dd1f0f74a5babcdb1efce0219";
pub const EXEC_SERVER_TREE: &str = "51751785508060e633f0e0472fa0d2572787b36a";
pub const UTILS_CLI_TREE: &str = "5d9c72fcadefb9a1c95e38c4726d25c5b8d195ee";
pub const UTILS_HOME_DIR_TREE: &str = "c2d10a4f4844c2a517584ee623a0b8aa4ceb44f5";
pub const CARGO_LOCK_BLOB: &str = "a8c2addc02055be48c345b65760a7a1b96cfbf28";
pub const CORE_EXEC_POLICY_BLOB: &str = "5de05937533a2653a700b4ec40cda09578761f50";
pub const CORE_EXEC_POLICY_DIR_TREE: &str = "b313a3ba1b113f08e3c1686272162910dad76540";

#[derive(Debug, Error)]
pub enum EngineError {
    #[error("invalid params: {0}")]
    InvalidParams(String),
    #[error("failed to read rules file {path}: {source}")]
    ReadRules {
        path: PathBuf,
        source: std::io::Error,
    },
    #[error("failed to read rules files from {dir}: {source}")]
    ReadRulesDirectory {
        dir: PathBuf,
        source: std::io::Error,
    },
    #[error("invalid config layer stack: {0}")]
    InvalidConfigStack(String),
    #[error("invalid requirements exec policy: {0}")]
    InvalidRequirementsPolicy(String),
    #[error("failed to load Codex host configuration: {0}")]
    LoadHostConfig(#[source] std::io::Error),
    #[error("failed to parse rules source {identifier}: {source}")]
    ParseRules {
        identifier: String,
        source: Box<codex_execpolicy::Error>,
    },
    #[error("failed to update rules file {path}: {source}")]
    AppendRule {
        path: PathBuf,
        source: codex_execpolicy::AmendError,
    },
    #[error("failed to join blocking rules update task: {0}")]
    JoinBlockingTask(#[source] tokio::task::JoinError),
    #[error("failed to update in-memory policy: {0}")]
    UpdatePolicy(#[from] codex_execpolicy::Error),
    #[error("canonical host policy is not open; call open_host_policy first")]
    CanonicalHostPolicyNotOpen,
}

impl EngineError {
    pub fn code(&self) -> &'static str {
        match self {
            Self::InvalidParams(_) => "invalid_params",
            Self::ReadRules { .. } => "read_rules_failed",
            Self::ReadRulesDirectory { .. } => "read_rules_directory_failed",
            Self::InvalidConfigStack(_) => "invalid_config_stack",
            Self::InvalidRequirementsPolicy(_) => "invalid_requirements_policy",
            Self::LoadHostConfig(_) => "host_config_load_failed",
            Self::ParseRules { .. } => "parse_rules_failed",
            Self::AppendRule { .. } => "append_rule_failed",
            Self::JoinBlockingTask(_) => "join_blocking_task_failed",
            Self::UpdatePolicy(_) => "update_policy_failed",
            Self::CanonicalHostPolicyNotOpen => "canonical_host_policy_not_open",
        }
    }

    pub fn data(&self) -> Option<Value> {
        match self {
            Self::ParseRules { source, .. } => source.location().map(|location| {
                json!({
                    "path": location.path,
                    "range": {
                        "start": {
                            "line": location.range.start.line,
                            "column": location.range.start.column,
                        },
                        "end": {
                            "line": location.range.end.line,
                            "column": location.range.end.column,
                        },
                    },
                })
            }),
            _ => None,
        }
    }
}

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RuleSource {
    pub identifier: String,
    pub content: String,
}

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LoadParams {
    #[serde(default)]
    pub sources: Vec<RuleSource>,
    #[serde(default)]
    pub paths: Vec<PathBuf>,
}

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CheckTokensParams {
    pub commands: Vec<Vec<String>>,
    #[serde(default)]
    pub fallback_decision: Option<Decision>,
    #[serde(default)]
    pub resolve_host_executables: bool,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CheckTokensOutput {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub decision: Option<Decision>,
    pub matched_rules: Vec<RuleMatch>,
}

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AppendPrefixParams {
    pub prefix: Vec<String>,
}

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AppendNetworkParams {
    pub host: String,
    pub protocol: String,
    pub decision: Decision,
    #[serde(default)]
    pub justification: Option<String>,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct HelloOutput {
    pub protocol_version: u32,
    pub engine_version: &'static str,
    pub codex_commit: &'static str,
    pub execpolicy_tree: &'static str,
    pub shell_command_tree: &'static str,
    pub config_tree: &'static str,
    pub exec_server_tree: &'static str,
    pub utils_cli_tree: &'static str,
    pub utils_home_dir_tree: &'static str,
    pub cargo_lock_blob: &'static str,
    pub core_exec_policy_blob: &'static str,
    pub core_exec_policy_dir_tree: &'static str,
    pub os: &'static str,
    pub arch: &'static str,
}

pub struct Engine {
    policy: Policy,
    loaded_sources: usize,
    canonical_codex_home: Option<PathBuf>,
}

impl Default for Engine {
    fn default() -> Self {
        Self {
            policy: Policy::empty(),
            loaded_sources: 0,
            canonical_codex_home: None,
        }
    }
}

impl Engine {
    pub fn hello(&self) -> HelloOutput {
        HelloOutput {
            protocol_version: PROTOCOL_VERSION,
            engine_version: env!("CARGO_PKG_VERSION"),
            codex_commit: CODEX_COMMIT,
            execpolicy_tree: EXECPOLICY_TREE,
            shell_command_tree: SHELL_COMMAND_TREE,
            config_tree: CONFIG_TREE,
            exec_server_tree: EXEC_SERVER_TREE,
            utils_cli_tree: UTILS_CLI_TREE,
            utils_home_dir_tree: UTILS_HOME_DIR_TREE,
            cargo_lock_blob: CARGO_LOCK_BLOB,
            core_exec_policy_blob: CORE_EXEC_POLICY_BLOB,
            core_exec_policy_dir_tree: CORE_EXEC_POLICY_DIR_TREE,
            os: std::env::consts::OS,
            arch: std::env::consts::ARCH,
        }
    }

    pub fn diagnostics(&self) -> Value {
        json!({
            "hello": self.hello(),
            "loadedSources": self.loaded_sources,
            "allowedPrefixes": self.policy.get_allowed_prefixes(),
            "networkRules": self.policy.network_rules().len(),
            "hostExecutables": self.policy.host_executables().len(),
        })
    }

    pub fn load(&mut self, params: LoadParams) -> Result<Value, EngineError> {
        let mut sources = params.sources;
        for path in params.paths {
            let content = fs::read_to_string(&path).map_err(|source| EngineError::ReadRules {
                path: path.clone(),
                source,
            })?;
            sources.push(RuleSource {
                identifier: path.to_string_lossy().into_owned(),
                content,
            });
        }

        let mut parser = PolicyParser::new();
        for source in &sources {
            parser
                .parse(&source.identifier, &source.content)
                .map_err(|error| EngineError::ParseRules {
                    identifier: source.identifier.clone(),
                    source: Box::new(error),
                })?;
        }

        self.policy = parser.build();
        self.loaded_sources = sources.len();
        self.canonical_codex_home = None;
        Ok(json!({
            "loadedSources": self.loaded_sources,
            "allowedPrefixes": self.policy.get_allowed_prefixes(),
        }))
    }

    pub async fn load_config_stack(
        &mut self,
        params: LoadConfigStackParams,
    ) -> Result<Value, EngineError> {
        let loaded = load_config_stack_policy(params).await?;
        self.loaded_sources = loaded.policy_paths.len();
        self.policy = loaded.policy;
        self.canonical_codex_home = None;
        Ok(json!({
            "loadedSources": self.loaded_sources,
            "loadedFiles": loaded.policy_paths,
            "allowedPrefixes": self.policy.get_allowed_prefixes(),
            "warning": loaded.warning,
            "stack": loaded.stack,
            "discoveredRuleFiles": loaded.discovered_rule_files,
            "requirements": loaded.requirements,
        }))
    }

    pub async fn load_host_config_stack(
        &mut self,
        params: LoadHostConfigStackParams,
    ) -> Result<Value, EngineError> {
        let host = load_host_config_stack_policy(params, false).await?;
        self.loaded_sources = host.loaded.policy_paths.len();
        self.policy = host.loaded.policy;
        self.canonical_codex_home = None;
        Ok(json!({
            "loadedSources": self.loaded_sources,
            "loadedFiles": host.loaded.policy_paths,
            "allowedPrefixes": self.policy.get_allowed_prefixes(),
            "warning": host.loaded.warning,
            "stack": host.loaded.stack,
            "discoveredRuleFiles": host.loaded.discovered_rule_files,
            "requirements": host.loaded.requirements,
            "discovery": host.discovery,
        }))
    }

    pub async fn open_host_policy(
        &mut self,
        params: LoadHostConfigStackParams,
    ) -> Result<Value, EngineError> {
        let host = load_host_config_stack_policy(params, true).await?;
        self.loaded_sources = host.loaded.policy_paths.len();
        self.policy = host.loaded.policy;
        self.canonical_codex_home = Some(host.codex_home);
        Ok(json!({
            "loadedSources": self.loaded_sources,
            "loadedFiles": host.loaded.policy_paths,
            "allowedPrefixes": self.policy.get_allowed_prefixes(),
            "warning": host.loaded.warning,
            "stack": host.loaded.stack,
            "discoveredRuleFiles": host.loaded.discovered_rule_files,
            "requirements": host.loaded.requirements,
            "discovery": host.discovery,
        }))
    }

    pub fn check_tokens(
        &self,
        params: CheckTokensParams,
    ) -> Result<CheckTokensOutput, EngineError> {
        if params.commands.is_empty() || params.commands.iter().any(Vec::is_empty) {
            return Err(EngineError::InvalidParams(
                "commands must contain at least one non-empty argv".to_string(),
            ));
        }

        let options = MatchOptions {
            resolve_host_executables: params.resolve_host_executables,
        };
        let fallback = params.fallback_decision;
        let mut matched_rules = Vec::new();
        for command in params.commands {
            let command_matches = match fallback {
                Some(decision) => {
                    let fallback = |_command: &[String]| decision;
                    self.policy.matches_for_command_with_options(
                        &command,
                        Some(&fallback),
                        &options,
                    )
                }
                None => self
                    .policy
                    .matches_for_command_with_options(&command, None, &options),
            };
            matched_rules.extend(command_matches);
        }
        let decision = matched_rules.iter().map(RuleMatch::decision).max();
        Ok(CheckTokensOutput {
            decision,
            matched_rules,
        })
    }

    pub fn check_runtime(
        &self,
        params: RuntimePolicyInput,
    ) -> Result<RuntimePolicyOutput, EngineError> {
        params.validate().map_err(EngineError::InvalidParams)?;
        Ok(evaluate_runtime_policy(&self.policy, &params))
    }

    pub fn compile_network_domains(&self) -> Value {
        let (allowed, denied) = self.policy.compiled_network_domains();
        json!({ "allowed": allowed, "denied": denied })
    }

    pub async fn append_prefix(
        &mut self,
        params: AppendPrefixParams,
    ) -> Result<Value, EngineError> {
        let policy_path = self.canonical_policy_path()?;
        let prefix = params.prefix;
        let update_path = policy_path.clone();
        let update_prefix = prefix.clone();
        tokio::task::spawn_blocking(move || {
            blocking_append_allow_prefix_rule(&update_path, &update_prefix)
        })
        .await
        .map_err(EngineError::JoinBlockingTask)?
        .map_err(|source| EngineError::AppendRule {
            path: policy_path.clone(),
            source,
        })?;

        let options = MatchOptions {
            resolve_host_executables: true,
        };
        let existing =
            self.policy
                .check_multiple_with_options([&prefix], &|_| Decision::Forbidden, &options);
        let already_allowed = existing.decision == Decision::Allow
            && existing.matched_rules.iter().any(|rule_match| {
                matches!(rule_match, RuleMatch::PrefixRuleMatch { .. })
                    && rule_match.decision() == Decision::Allow
            });
        if !already_allowed {
            let mut updated_policy = self.policy.clone();
            updated_policy.add_prefix_rule(&prefix, Decision::Allow)?;
            self.policy = updated_policy;
        }
        Ok(json!({
            "policyPath": policy_path,
            "changedInMemory": !already_allowed,
        }))
    }

    pub async fn append_network(
        &mut self,
        params: AppendNetworkParams,
    ) -> Result<Value, EngineError> {
        let policy_path = self.canonical_policy_path()?;
        let protocol = NetworkRuleProtocol::parse(&params.protocol)?;
        let update_path = policy_path.clone();
        let update_host = params.host.clone();
        let update_justification = params.justification.clone();
        let decision = params.decision;
        tokio::task::spawn_blocking(move || {
            blocking_append_network_rule(
                &update_path,
                &update_host,
                protocol,
                decision,
                update_justification.as_deref(),
            )
        })
        .await
        .map_err(EngineError::JoinBlockingTask)?
        .map_err(|source| EngineError::AppendRule {
            path: policy_path.clone(),
            source,
        })?;
        let mut updated_policy = self.policy.clone();
        updated_policy.add_network_rule(
            &params.host,
            protocol,
            params.decision,
            params.justification,
        )?;
        self.policy = updated_policy;
        Ok(json!({ "updated": true, "policyPath": policy_path }))
    }

    fn canonical_policy_path(&self) -> Result<PathBuf, EngineError> {
        self.canonical_codex_home
            .as_ref()
            .map(|home| home.join("rules").join("default.rules"))
            .ok_or(EngineError::CanonicalHostPolicyNotOpen)
    }
}
use crate::config_stack::LoadConfigStackParams;
use crate::config_stack::load_config_stack_policy;
