// Uses the public host-discovery surface of OpenAI Codex at commit
// 086396f7f60347b74c82784d5dfaf4fb2d3bda12. No project-root, trust,
// symlink, managed-config, profile, or CLI-override discovery algorithm is
// reimplemented here. Changed for dsh-codex: this module defines a constrained
// JSON protocol boundary and feeds the resulting ConfigLayerStack into the
// execpolicy adapter. See LICENSE, NOTICE, UPSTREAMS.md, and
// THIRD_PARTY_NOTICES.md.

use codex_config::CloudConfigBundle;
use codex_config::CloudConfigBundleLoader;
use codex_config::ConfigLoadOptions;
use codex_config::LoaderOverrides;
use codex_config::NoopThreadConfigLoader;
use codex_config::ProfileV2Name;
use codex_exec_server::LocalFileSystem;
use codex_utils_absolute_path::AbsolutePathBuf;
use codex_utils_cli::CliConfigOverrides;
use serde::Deserialize;
use serde_json::Value;
use serde_json::json;
use std::path::PathBuf;

use crate::config_stack::LoadedConfigStackPolicy;
use crate::config_stack::load_policy_from_stack;
use crate::engine::EngineError;
use crate::runtime::BANNED_PREFIX_SUGGESTIONS;

const DEFAULT_RULES_DIRECTORY: &str = "rules";
const DEFAULT_POLICY_FILENAME: &str = "default.rules";
const HOST_CONFIG_SCHEMA_VERSION: u32 = 1;

#[derive(Clone, Debug, Deserialize)]
#[serde(
    tag = "mode",
    rename_all = "snake_case",
    rename_all_fields = "camelCase"
)]
pub enum HostCodexHomeInput {
    Discover,
    Explicit { path: PathBuf },
}

#[derive(Clone, Debug, Deserialize)]
#[serde(
    tag = "mode",
    rename_all = "snake_case",
    rename_all_fields = "camelCase"
)]
pub enum HostCwdInput {
    Absolute { path: PathBuf },
    CurrentProcess,
}

#[derive(Clone, Debug, Deserialize)]
#[serde(
    tag = "mode",
    rename_all = "snake_case",
    rename_all_fields = "camelCase"
)]
pub enum HostCloudInput {
    NotRequested,
    Snapshot { bundle: Option<CloudConfigBundle> },
}

impl HostCloudInput {
    fn mode(&self) -> &'static str {
        match self {
            Self::NotRequested => "not_requested",
            Self::Snapshot { .. } => "snapshot",
        }
    }

    fn into_loader(self) -> CloudConfigBundleLoader {
        match self {
            Self::NotRequested => CloudConfigBundleLoader::default(),
            Self::Snapshot { bundle } => CloudConfigBundleLoader::new(async move { Ok(bundle) }),
        }
    }
}

#[derive(Clone, Debug, Deserialize)]
#[serde(tag = "mode", rename_all = "snake_case")]
pub enum HostThreadConfigInput {
    None,
}

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LoadHostConfigStackParams {
    pub schema_version: u32,
    pub codex_home: HostCodexHomeInput,
    pub cwd: Option<HostCwdInput>,
    #[serde(default)]
    pub cli_overrides: Vec<String>,
    #[serde(default)]
    pub strict_config: bool,
    #[serde(default)]
    pub profile_v2: Option<String>,
    #[serde(default)]
    pub ignore_user_config: bool,
    #[serde(default)]
    pub ignore_user_and_project_exec_policy_rules: bool,
    pub cloud: HostCloudInput,
    pub thread_config: HostThreadConfigInput,
}

#[derive(Debug)]
pub struct LoadedHostConfigPolicy {
    pub loaded: LoadedConfigStackPolicy,
    pub discovery: Value,
    pub codex_home: PathBuf,
}

pub async fn load_host_config_stack_policy(
    params: LoadHostConfigStackParams,
    canonical_startup: bool,
) -> Result<LoadedHostConfigPolicy, EngineError> {
    if params.schema_version != HOST_CONFIG_SCHEMA_VERSION {
        return Err(EngineError::InvalidParams(format!(
            "expected host config schema version {HOST_CONFIG_SCHEMA_VERSION}, got {}",
            params.schema_version
        )));
    }
    let HostThreadConfigInput::None = params.thread_config;
    let codex_home_mode = match &params.codex_home {
        HostCodexHomeInput::Discover => "discover",
        HostCodexHomeInput::Explicit { .. } => "explicit",
    };
    let codex_home = resolve_codex_home(params.codex_home)?;
    let cwd = resolve_cwd(params.cwd)?;
    let profile = params
        .profile_v2
        .as_deref()
        .map(str::parse::<ProfileV2Name>)
        .transpose()
        .map_err(|error| EngineError::InvalidParams(error.to_string()))?;

    let cli_overrides = CliConfigOverrides {
        raw_overrides: params.cli_overrides,
    }
    .parse_overrides()
    .map_err(EngineError::InvalidParams)?;

    let mut loader_overrides = LoaderOverrides {
        ignore_user_config: params.ignore_user_config,
        ignore_user_and_project_exec_policy_rules: params.ignore_user_and_project_exec_policy_rules,
        ..LoaderOverrides::default()
    };
    if let Some(profile) = profile.as_ref() {
        loader_overrides.user_config_profile = Some(profile.clone());
        loader_overrides.user_config_path = Some(codex_home.join(format!("{profile}.config.toml")));
    }

    let cloud_mode = params.cloud.mode();
    let cloud_config_bundle = params.cloud.into_loader();
    let fs = LocalFileSystem::unsandboxed();
    let stack = codex_config::loader::load_config_layers_state(
        &fs,
        codex_home.as_path(),
        cwd.clone(),
        &cli_overrides,
        ConfigLoadOptions {
            loader_overrides,
            strict_config: params.strict_config,
            cloud_config_bundle,
        },
        &NoopThreadConfigLoader,
    )
    .await
    .map_err(EngineError::LoadHostConfig)?;

    let default_policy_path = codex_home
        .join(DEFAULT_RULES_DIRECTORY)
        .join(DEFAULT_POLICY_FILENAME);
    let startup_migration =
        if canonical_startup && !stack.ignore_user_and_project_exec_policy_rules() {
            match codex_execpolicy::prefix_rule_migration(
                codex_home.as_path(),
                default_policy_path.as_path(),
                BANNED_PREFIX_SUGGESTIONS,
            )
            .await
            {
                Ok(()) => json!({
                    "mode": "canonical_startup",
                    "attempted": true,
                    "completed": true,
                    "warning": null,
                }),
                Err(error) => json!({
                    "mode": "canonical_startup",
                    "attempted": true,
                    "completed": false,
                    "warning": error.to_string(),
                }),
            }
        } else if canonical_startup {
            json!({
                "mode": "canonical_startup",
                "attempted": false,
                "completed": false,
                "skippedReason": "user_and_project_exec_policy_rules_ignored",
                "warning": null,
            })
        } else {
            json!({
                "mode": "not_requested",
                "attempted": false,
                "completed": false,
                "warning": null,
            })
        };
    let discovery = json!({
        "mode": "host",
        "codexHomeMode": codex_home_mode,
        "resolvedCodexHome": codex_home,
        "cwd": cwd,
        "profileV2": profile.as_ref().map(ToString::to_string),
        "cloudMode": cloud_mode,
        "threadConfigMode": "none",
        "strictConfig": params.strict_config,
        "ignoreUserConfig": params.ignore_user_config,
        "ignoreUserAndProjectExecPolicyRules": params
            .ignore_user_and_project_exec_policy_rules,
        "defaultPolicyPath": default_policy_path,
        "startupMigration": startup_migration,
    });
    let loaded = load_policy_from_stack(stack, None).await?;
    Ok(LoadedHostConfigPolicy {
        loaded,
        discovery,
        codex_home: codex_home.as_path().to_path_buf(),
    })
}

fn resolve_codex_home(input: HostCodexHomeInput) -> Result<AbsolutePathBuf, EngineError> {
    match input {
        HostCodexHomeInput::Discover => {
            codex_utils_home_dir::find_codex_home().map_err(EngineError::LoadHostConfig)
        }
        HostCodexHomeInput::Explicit { path } => AbsolutePathBuf::from_absolute_path_checked(path)
            .map_err(|error| {
                EngineError::InvalidParams(format!("codexHome.path must be absolute: {error}"))
            }),
    }
}

fn resolve_cwd(input: Option<HostCwdInput>) -> Result<Option<AbsolutePathBuf>, EngineError> {
    input
        .map(|cwd| match cwd {
            HostCwdInput::Absolute { path } => AbsolutePathBuf::from_absolute_path_checked(path)
                .map_err(|error| {
                    EngineError::InvalidParams(format!("cwd.path must be absolute: {error}"))
                }),
            HostCwdInput::CurrentProcess => {
                AbsolutePathBuf::current_dir().map_err(EngineError::LoadHostConfig)
            }
        })
        .transpose()
}
