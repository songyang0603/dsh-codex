// Adapted from OpenAI Codex at commit
// 086396f7f60347b74c82784d5dfaf4fb2d3bda12, primarily
// codex-rs/core/src/exec_policy.rs. Config stack construction, effective
// config/origins, requirements composition, normalization, and provenance call
// the pinned codex-config public API directly. Changed for dsh-codex: this
// module defines a versioned JSON projection and returns structured provenance
// over the sidecar protocol. See LICENSE, NOTICE, UPSTREAMS.md, and
// THIRD_PARTY_NOTICES.md.

use codex_config::ConfigLayerEntry;
use codex_config::ConfigLayerSource;
use codex_config::ConfigLayerStack;
use codex_config::ConfigRequirements;
use codex_config::ConfigRequirementsWithSources;
use codex_config::RequirementSource;
use codex_config::RequirementsLayerEntry;
use codex_config::compose_requirements;
use codex_execpolicy::Policy;
use codex_execpolicy::PolicyParser;
use codex_utils_absolute_path::AbsolutePathBuf;
use serde::Deserialize;
use serde::Serialize;
use serde_json::Value;
use serde_json::json;
use std::collections::BTreeMap;
use std::io::ErrorKind;
use std::path::Path;
use std::path::PathBuf;
use tokio::fs;

use crate::engine::EngineError;

const RULES_DIR_NAME: &str = "rules";
const RULE_EXTENSION: &str = "rules";

fn empty_object() -> Value {
    json!({})
}

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ConfigLayerInput {
    pub source: ConfigLayerSourceInput,
    #[serde(default = "empty_object")]
    pub config: Value,
    #[serde(default)]
    pub disabled_reason: Option<String>,
}

/// A lossless projection of every ConfigLayerSource variant at the pinned
/// Codex revision. Layers must be supplied from low to high precedence, just
/// like ConfigLayerStack::new.
#[derive(Clone, Debug, Deserialize)]
#[serde(
    tag = "kind",
    rename_all = "snake_case",
    rename_all_fields = "camelCase"
)]
pub enum ConfigLayerSourceInput {
    PackagedDefaults {
        file: PathBuf,
    },
    Mdm {
        domain: String,
        key: String,
    },
    System {
        file: PathBuf,
    },
    EnterpriseManaged {
        id: String,
        name: String,
    },
    User {
        file: PathBuf,
        #[serde(default)]
        profile: Option<String>,
    },
    Project {
        dot_codex_folder: PathBuf,
    },
    SessionFlags,
    LegacyManagedConfigTomlFromFile {
        file: PathBuf,
    },
    LegacyManagedConfigTomlFromMdm,
}

#[derive(Clone, Debug, Deserialize)]
#[serde(
    tag = "kind",
    rename_all = "snake_case",
    rename_all_fields = "camelCase"
)]
pub enum RequirementSourceInput {
    Unknown,
    MdmManagedPreferences { domain: String, key: String },
    EnterpriseManaged { id: String, name: String },
    SystemRequirementsToml { file: PathBuf },
    LegacyManagedConfigTomlFromFile { file: PathBuf },
    LegacyManagedConfigTomlFromMdm,
}

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RequirementsLayerInput {
    pub source: RequirementSourceInput,
    pub toml: String,
    #[serde(default)]
    pub base_dir: Option<PathBuf>,
}

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LoadConfigStackParams {
    pub layers: Vec<ConfigLayerInput>,
    #[serde(default)]
    pub requirements_layers: Vec<RequirementsLayerInput>,
    #[serde(default)]
    pub ignore_user_and_project_exec_policy_rules: bool,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PolicyLoadWarning {
    pub kind: &'static str,
    pub path: String,
    pub message: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub location: Option<PolicyLoadWarningLocation>,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PolicyLoadWarningLocation {
    pub path: String,
    pub start_line: usize,
    pub start_column: usize,
    pub end_line: usize,
    pub end_column: usize,
}

#[derive(Debug)]
pub struct LoadedConfigStackPolicy {
    pub policy: Policy,
    pub policy_paths: Vec<PathBuf>,
    pub warning: Option<PolicyLoadWarning>,
    pub stack: Value,
    pub discovered_rule_files: Value,
    pub requirements: Value,
}

impl ConfigLayerSourceInput {
    fn into_upstream(self) -> Result<ConfigLayerSource, EngineError> {
        Ok(match self {
            Self::PackagedDefaults { file } => ConfigLayerSource::PackagedDefaults {
                file: absolute(file, "packaged defaults file")?,
            },
            Self::Mdm { domain, key } => ConfigLayerSource::Mdm { domain, key },
            Self::System { file } => ConfigLayerSource::System {
                file: absolute(file, "system config file")?,
            },
            Self::EnterpriseManaged { id, name } => {
                ConfigLayerSource::EnterpriseManaged { id, name }
            }
            Self::User { file, profile } => ConfigLayerSource::User {
                file: absolute(file, "user config file")?,
                profile,
            },
            Self::Project { dot_codex_folder } => ConfigLayerSource::Project {
                dot_codex_folder: absolute(dot_codex_folder, "project .codex folder")?,
            },
            Self::SessionFlags => ConfigLayerSource::SessionFlags,
            Self::LegacyManagedConfigTomlFromFile { file } => {
                ConfigLayerSource::LegacyManagedConfigTomlFromFile {
                    file: absolute(file, "legacy managed config file")?,
                }
            }
            Self::LegacyManagedConfigTomlFromMdm => {
                ConfigLayerSource::LegacyManagedConfigTomlFromMdm
            }
        })
    }
}

impl RequirementSourceInput {
    fn into_upstream(self) -> Result<RequirementSource, EngineError> {
        Ok(match self {
            Self::Unknown => RequirementSource::Unknown,
            Self::MdmManagedPreferences { domain, key } => {
                RequirementSource::MdmManagedPreferences { domain, key }
            }
            Self::EnterpriseManaged { id, name } => {
                RequirementSource::EnterpriseManaged { id, name }
            }
            Self::SystemRequirementsToml { file } => RequirementSource::SystemRequirementsToml {
                file: absolute(file, "system requirements file")?,
            },
            Self::LegacyManagedConfigTomlFromFile { file } => {
                RequirementSource::LegacyManagedConfigTomlFromFile {
                    file: absolute(file, "legacy managed requirements file")?,
                }
            }
            Self::LegacyManagedConfigTomlFromMdm => {
                RequirementSource::LegacyManagedConfigTomlFromMdm
            }
        })
    }
}

fn absolute(path: PathBuf, label: &str) -> Result<AbsolutePathBuf, EngineError> {
    AbsolutePathBuf::from_absolute_path_checked(path)
        .map_err(|error| EngineError::InvalidConfigStack(format!("invalid {label}: {error}")))
}

fn build_stack(
    params: LoadConfigStackParams,
) -> Result<(ConfigLayerStack, Vec<RequirementSource>), EngineError> {
    let layers = params
        .layers
        .into_iter()
        .map(|layer| {
            let source = layer.source.into_upstream()?;
            let config = serde_json::from_value::<codex_config::TomlValue>(layer.config)
                .map_err(|error| EngineError::InvalidConfigStack(error.to_string()))?;
            Ok(match layer.disabled_reason {
                Some(reason) => ConfigLayerEntry::new_disabled(source, config, reason),
                None => ConfigLayerEntry::new(source, config),
            })
        })
        .collect::<Result<Vec<_>, EngineError>>()?;

    let mut requirement_sources = Vec::new();
    let requirement_layers = params
        .requirements_layers
        .into_iter()
        .map(|layer| {
            let source = layer.source.into_upstream()?;
            requirement_sources.push(source.clone());
            let entry = RequirementsLayerEntry::from_toml(source, layer.toml);
            match layer.base_dir {
                Some(base_dir) => {
                    Ok(entry.with_base_dir(absolute(base_dir, "requirements base directory")?))
                }
                None => Ok(entry),
            }
        })
        .collect::<Result<Vec<_>, EngineError>>()?;
    let with_sources = compose_requirements(requirement_layers)
        .map_err(|error| EngineError::InvalidRequirementsPolicy(error.to_string()))?
        .unwrap_or_else(ConfigRequirementsWithSources::default);
    let requirements_toml = with_sources.clone().into_toml();
    let requirements = ConfigRequirements::try_from(with_sources)
        .map_err(|error| EngineError::InvalidRequirementsPolicy(error.to_string()))?;
    let stack = ConfigLayerStack::new(layers, requirements, requirements_toml)
        .map_err(|error| EngineError::InvalidConfigStack(error.to_string()))?
        .with_user_and_project_exec_policy_rules_ignored(
            params.ignore_user_and_project_exec_policy_rules,
        );
    Ok((stack, requirement_sources))
}

pub async fn load_config_stack_policy(
    params: LoadConfigStackParams,
) -> Result<LoadedConfigStackPolicy, EngineError> {
    let (stack, requirement_sources) = build_stack(params)?;
    load_policy_from_stack(stack, Some(&requirement_sources)).await
}

pub(crate) async fn load_policy_from_stack(
    stack: ConfigLayerStack,
    requirement_sources: Option<&[RequirementSource]>,
) -> Result<LoadedConfigStackPolicy, EngineError> {
    let policy_paths = discover_policy_paths(&stack).await?;
    let requirements_fallback = stack
        .requirements()
        .exec_policy
        .as_deref()
        .map_or_else(Policy::empty, |policy| policy.as_ref().clone());
    let load_result = load_policy(&policy_paths, &stack).await;
    let (policy, warning) = match load_result {
        Ok(policy) => (policy, None),
        Err(EngineError::ParseRules { identifier, source }) => {
            let location = source.location().map(|location| PolicyLoadWarningLocation {
                path: location.path,
                start_line: location.range.start.line,
                start_column: location.range.start.column,
                end_line: location.range.end.line,
                end_column: location.range.end.column,
            });
            (
                requirements_fallback,
                Some(PolicyLoadWarning {
                    kind: "parse_policy",
                    path: identifier,
                    message: source.to_string(),
                    location,
                }),
            )
        }
        Err(error) => return Err(error),
    };

    let origins = stack
        .origins()
        .into_iter()
        .map(|(key, metadata)| (key, layer_source_json(&metadata.name)))
        .collect::<BTreeMap<_, _>>();
    let stack_json = json!({
        "allLayersLowToHigh": stack
            .all_layers_low_to_high()
            .map(|layer| json!({
                "source": layer_source_json(&layer.name),
                "disabledReason": layer.disabled_reason,
            }))
            .collect::<Vec<_>>(),
        "enabledLayersLowToHigh": stack
            .layers_low_to_high()
            .map(|layer| layer_source_json(&layer.name))
            .collect::<Vec<_>>(),
        "effectiveConfig": stack.effective_config(),
        "origins": origins,
        "ignoreUserAndProjectExecPolicyRules": stack
            .ignore_user_and_project_exec_policy_rules(),
        "startupWarnings": stack.startup_warnings(),
    });
    let discovered_rule_files = discover_rule_files_json(&stack).await?;
    let input_sources = requirement_sources.map(|sources| {
        sources
            .iter()
            .map(requirement_source_json)
            .collect::<Vec<_>>()
    });
    let requirements_json = json!({
        "inputSourcesLowToHigh": input_sources,
        "execPolicySource": stack
            .requirements()
            .exec_policy_source()
            .map(requirement_source_json),
        "rawRulesPresent": stack.requirements_toml().rules.is_some(),
        "normalizedRulesPresent": stack.requirements().exec_policy.is_some(),
    });

    Ok(LoadedConfigStackPolicy {
        policy,
        policy_paths,
        warning,
        stack: stack_json,
        discovered_rule_files,
        requirements: requirements_json,
    })
}

async fn load_policy(
    policy_paths: &[PathBuf],
    stack: &ConfigLayerStack,
) -> Result<Policy, EngineError> {
    let mut parser = PolicyParser::new();
    for policy_path in policy_paths {
        let contents =
            fs::read_to_string(policy_path)
                .await
                .map_err(|source| EngineError::ReadRules {
                    path: policy_path.clone(),
                    source,
                })?;
        let identifier = policy_path.to_string_lossy().to_string();
        parser
            .parse(&identifier, &contents)
            .map_err(|source| EngineError::ParseRules {
                identifier,
                source: Box::new(source),
            })?;
    }
    let policy = parser.build();
    Ok(stack
        .requirements()
        .exec_policy
        .as_deref()
        .map_or(policy.clone(), |requirements| {
            policy.merge_overlay(requirements.as_ref())
        }))
}

async fn discover_policy_paths(stack: &ConfigLayerStack) -> Result<Vec<PathBuf>, EngineError> {
    let mut policy_paths = Vec::new();
    for layer in stack.layers_low_to_high() {
        if stack.ignore_user_and_project_exec_policy_rules()
            && matches!(
                layer.name,
                ConfigLayerSource::User { .. } | ConfigLayerSource::Project { .. }
            )
        {
            continue;
        }
        if let Some(config_folder) = layer.config_folder() {
            policy_paths.extend(collect_policy_files(config_folder.join(RULES_DIR_NAME)).await?);
        }
    }
    Ok(policy_paths)
}

async fn collect_policy_files(dir: impl AsRef<Path>) -> Result<Vec<PathBuf>, EngineError> {
    let dir = dir.as_ref();
    let mut read_dir = match fs::read_dir(dir).await {
        Ok(read_dir) => read_dir,
        Err(error) if error.kind() == ErrorKind::NotFound => return Ok(Vec::new()),
        Err(source) => {
            return Err(EngineError::ReadRulesDirectory {
                dir: dir.to_path_buf(),
                source,
            });
        }
    };

    let mut policy_paths = Vec::new();
    while let Some(entry) =
        read_dir
            .next_entry()
            .await
            .map_err(|source| EngineError::ReadRulesDirectory {
                dir: dir.to_path_buf(),
                source,
            })?
    {
        let path = entry.path();
        let file_type =
            entry
                .file_type()
                .await
                .map_err(|source| EngineError::ReadRulesDirectory {
                    dir: dir.to_path_buf(),
                    source,
                })?;
        if path
            .extension()
            .and_then(|extension| extension.to_str())
            .is_some_and(|extension| extension == RULE_EXTENSION)
            && file_type.is_file()
        {
            policy_paths.push(path);
        }
    }
    policy_paths.sort();
    Ok(policy_paths)
}

async fn discover_rule_files_json(stack: &ConfigLayerStack) -> Result<Value, EngineError> {
    let mut by_folder = Vec::new();
    for layer in stack.all_layers_low_to_high() {
        let ignored = stack.ignore_user_and_project_exec_policy_rules()
            && matches!(
                layer.name,
                ConfigLayerSource::User { .. } | ConfigLayerSource::Project { .. }
            );
        // Codex discovers every materialized layer's files for diagnostics,
        // even when that layer is disabled or ignored by exec-policy. Those
        // flags control loading, not the observable file inventory.
        let files = match layer.config_folder() {
            Some(folder) => collect_policy_files(folder.join(RULES_DIR_NAME)).await?,
            None => Vec::new(),
        };
        by_folder.push(json!({
            "source": layer_source_json(&layer.name),
            "files": files,
            "enabled": !layer.is_disabled(),
            "ignoredByExecPolicy": ignored,
        }));
    }
    Ok(json!(by_folder))
}

fn layer_source_json(source: &ConfigLayerSource) -> Value {
    match source {
        ConfigLayerSource::PackagedDefaults { file } => {
            json!({ "kind": "packaged_defaults", "file": file })
        }
        ConfigLayerSource::Mdm { domain, key } => {
            json!({ "kind": "mdm", "domain": domain, "key": key })
        }
        ConfigLayerSource::System { file } => json!({ "kind": "system", "file": file }),
        ConfigLayerSource::EnterpriseManaged { id, name } => {
            json!({ "kind": "enterprise_managed", "id": id, "name": name })
        }
        ConfigLayerSource::User { file, profile } => {
            json!({ "kind": "user", "file": file, "profile": profile })
        }
        ConfigLayerSource::Project { dot_codex_folder } => {
            json!({ "kind": "project", "dotCodexFolder": dot_codex_folder })
        }
        ConfigLayerSource::SessionFlags => json!({ "kind": "session_flags" }),
        ConfigLayerSource::LegacyManagedConfigTomlFromFile { file } => {
            json!({ "kind": "legacy_managed_config_toml_from_file", "file": file })
        }
        ConfigLayerSource::LegacyManagedConfigTomlFromMdm => {
            json!({ "kind": "legacy_managed_config_toml_from_mdm" })
        }
    }
}

fn requirement_source_json(source: &RequirementSource) -> Value {
    match source {
        RequirementSource::Unknown => json!({ "kind": "unknown" }),
        RequirementSource::MdmManagedPreferences { domain, key } => {
            json!({ "kind": "mdm_managed_preferences", "domain": domain, "key": key })
        }
        RequirementSource::Composite { sources } => json!({
            "kind": "composite",
            "sources": sources.iter().map(requirement_source_json).collect::<Vec<_>>(),
        }),
        RequirementSource::EnterpriseManaged { id, name } => {
            json!({ "kind": "enterprise_managed", "id": id, "name": name })
        }
        RequirementSource::SystemRequirementsToml { file } => {
            json!({ "kind": "system_requirements_toml", "file": file })
        }
        RequirementSource::LegacyManagedConfigTomlFromFile { file } => {
            json!({ "kind": "legacy_managed_config_toml_from_file", "file": file })
        }
        RequirementSource::LegacyManagedConfigTomlFromMdm => {
            json!({ "kind": "legacy_managed_config_toml_from_mdm" })
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use codex_execpolicy::Decision;
    use codex_execpolicy::MatchOptions;
    use std::fs as std_fs;
    use tempfile::TempDir;

    fn layer(source: ConfigLayerSourceInput) -> ConfigLayerInput {
        ConfigLayerInput {
            source,
            config: empty_object(),
            disabled_reason: None,
        }
    }

    fn system_layer(folder: &Path) -> ConfigLayerInput {
        layer(ConfigLayerSourceInput::System {
            file: folder.join("config.toml"),
        })
    }

    fn user_layer(folder: &Path) -> ConfigLayerInput {
        layer(ConfigLayerSourceInput::User {
            file: folder.join("config.toml"),
            profile: None,
        })
    }

    fn project_layer(folder: &Path) -> ConfigLayerInput {
        layer(ConfigLayerSourceInput::Project {
            dot_codex_folder: folder.to_path_buf(),
        })
    }

    fn write_rule(folder: &Path, file: &str, contents: &str) {
        let rules = folder.join(RULES_DIR_NAME);
        std_fs::create_dir_all(&rules).expect("create rules directory");
        std_fs::write(rules.join(file), contents).expect("write rule");
    }

    fn check(policy: &Policy, command: &[&str]) -> Decision {
        let command = command
            .iter()
            .map(|token| (*token).to_string())
            .collect::<Vec<_>>();
        policy
            .check_with_options(
                &command,
                &|_| Decision::Allow,
                &MatchOptions {
                    resolve_host_executables: false,
                },
            )
            .decision
    }

    fn managed_rules(root: &Path, contents: &str) -> RequirementsLayerInput {
        RequirementsLayerInput {
            source: RequirementSourceInput::SystemRequirementsToml {
                file: root.join("requirements.toml"),
            },
            toml: contents.to_string(),
            base_dir: None,
        }
    }

    #[tokio::test]
    async fn loads_low_to_high_layers_and_sorts_each_rules_directory() {
        let root = TempDir::new().expect("temp root");
        let system = root.path().join("system");
        let user = root.path().join("user");
        write_rule(
            &system,
            "z.rules",
            r#"network_rule(host="ordered.example", protocol="https", decision="deny")"#,
        );
        write_rule(
            &system,
            "a.rules",
            r#"network_rule(host="ordered.example", protocol="https", decision="allow")"#,
        );
        write_rule(
            &user,
            "user.rules",
            r#"network_rule(host="ordered.example", protocol="https", decision="allow")"#,
        );

        let loaded = load_config_stack_policy(LoadConfigStackParams {
            layers: vec![system_layer(&system), user_layer(&user)],
            requirements_layers: Vec::new(),
            ignore_user_and_project_exec_policy_rules: false,
        })
        .await
        .expect("load stack");
        assert_eq!(
            loaded
                .policy_paths
                .iter()
                .map(|path| path.file_name().unwrap().to_string_lossy().into_owned())
                .collect::<Vec<_>>(),
            ["a.rules", "z.rules", "user.rules"]
        );
        assert_eq!(
            loaded.policy.compiled_network_domains(),
            (vec!["ordered.example".to_string()], Vec::new())
        );
    }

    #[tokio::test]
    async fn uses_upstream_effective_config_origins_and_requirements_composition() {
        let root = TempDir::new().expect("temp root");
        let system = root.path().join("system");
        let user = root.path().join("user");
        let mut system_layer = system_layer(&system);
        system_layer.config = json!({ "model": "system", "nested": { "owner": "system" } });
        let mut user_layer = user_layer(&user);
        user_layer.config = json!({ "model": "user", "nested": { "owner": "user" } });

        let loaded = load_config_stack_policy(LoadConfigStackParams {
            layers: vec![system_layer, user_layer],
            requirements_layers: vec![
                managed_rules(
                    root.path(),
                    "[rules]\nprefix_rules = [{ pattern = [{ token = \"git\" }], decision = \"prompt\" }]\n",
                ),
                RequirementsLayerInput {
                    source: RequirementSourceInput::EnterpriseManaged {
                        id: "enterprise".to_string(),
                        name: "Enterprise".to_string(),
                    },
                    toml: "[rules]\nprefix_rules = [{ pattern = [{ token = \"git\" }, { token = \"push\" }], decision = \"forbidden\" }]\n".to_string(),
                    base_dir: None,
                },
            ],
            ignore_user_and_project_exec_policy_rules: false,
        })
        .await
        .expect("load stack");

        assert_eq!(loaded.stack["effectiveConfig"]["model"], "user");
        assert_eq!(loaded.stack["origins"]["model"]["kind"], "user");
        assert_eq!(loaded.requirements["execPolicySource"]["kind"], "composite");
        assert_eq!(check(&loaded.policy, &["git", "push"]), Decision::Forbidden);
    }

    #[tokio::test]
    async fn ignoring_user_and_project_rules_keeps_system_rules() {
        let root = TempDir::new().expect("temp root");
        let system = root.path().join("system");
        let user = root.path().join("user");
        let project = root.path().join("repo/.codex");
        write_rule(
            &system,
            "system.rules",
            r#"prefix_rule(pattern=["curl"], decision="prompt")"#,
        );
        write_rule(
            &user,
            "user.rules",
            r#"prefix_rule(pattern=["rm"], decision="forbidden")"#,
        );
        write_rule(
            &project,
            "project.rules",
            r#"prefix_rule(pattern=["git"], decision="forbidden")"#,
        );

        let loaded = load_config_stack_policy(LoadConfigStackParams {
            layers: vec![
                system_layer(&system),
                user_layer(&user),
                project_layer(&project),
            ],
            requirements_layers: Vec::new(),
            ignore_user_and_project_exec_policy_rules: true,
        })
        .await
        .expect("load stack");

        assert_eq!(check(&loaded.policy, &["curl"]), Decision::Prompt);
        assert_eq!(check(&loaded.policy, &["rm"]), Decision::Allow);
        assert_eq!(check(&loaded.policy, &["git"]), Decision::Allow);
        assert_eq!(loaded.policy_paths.len(), 1);
        assert_eq!(
            loaded.discovered_rule_files[0]["files"]
                .as_array()
                .unwrap()
                .len(),
            1
        );
        assert_eq!(
            loaded.discovered_rule_files[1]["files"]
                .as_array()
                .unwrap()
                .len(),
            1
        );
        assert_eq!(
            loaded.discovered_rule_files[2]["files"]
                .as_array()
                .unwrap()
                .len(),
            1
        );
        assert_eq!(loaded.discovered_rule_files[1]["ignoredByExecPolicy"], true);
        assert_eq!(loaded.discovered_rule_files[2]["ignoredByExecPolicy"], true);
    }

    #[tokio::test]
    async fn requirements_survive_custom_parse_failure() {
        let root = TempDir::new().expect("temp root");
        let project = root.path().join("repo/.codex");
        write_rule(&project, "custom.rules", "prefix_rule(");
        let loaded = load_config_stack_policy(LoadConfigStackParams {
            layers: vec![project_layer(&project)],
            requirements_layers: vec![managed_rules(
                root.path(),
                "[rules]\nprefix_rules = [{ pattern = [{ token = \"rm\" }], decision = \"forbidden\", justification = \"managed restriction\" }]\n",
            )],
            ignore_user_and_project_exec_policy_rules: false,
        })
        .await
        .expect("parse errors fall back to requirements");
        assert_eq!(check(&loaded.policy, &["rm"]), Decision::Forbidden);
        assert_eq!(loaded.warning.unwrap().kind, "parse_policy");
    }

    #[tokio::test]
    async fn rejects_out_of_order_layers_and_allow_requirements() {
        let root = TempDir::new().expect("temp root");
        let user = root.path().join("user");
        let system = root.path().join("system");
        let out_of_order = load_config_stack_policy(LoadConfigStackParams {
            layers: vec![user_layer(&user), system_layer(&system)],
            requirements_layers: Vec::new(),
            ignore_user_and_project_exec_policy_rules: false,
        })
        .await
        .expect_err("out-of-order layers must fail");
        assert!(matches!(
            out_of_order,
            EngineError::InvalidConfigStack(ref message)
                if message == "config layers are not in correct precedence order"
        ));

        let allow_requirement = load_config_stack_policy(LoadConfigStackParams {
            layers: vec![system_layer(&system)],
            requirements_layers: vec![managed_rules(
                root.path(),
                "[rules]\nprefix_rules = [{ pattern = [{ token = \"git\" }], decision = \"allow\" }]\n",
            )],
            ignore_user_and_project_exec_policy_rules: false,
        })
        .await
        .expect_err("requirements cannot allow");
        assert!(matches!(
            allow_requirement,
            EngineError::InvalidRequirementsPolicy(ref message)
                if message.contains("decision 'allow'")
        ));
    }
}
