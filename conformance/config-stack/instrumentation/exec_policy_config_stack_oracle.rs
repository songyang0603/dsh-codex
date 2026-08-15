//! Test-only config-stack and requirements oracle for a pinned Codex checkout.
//!
//! This file is injected as a child of `codex_core::exec_policy`. That placement
//! lets the oracle call the real crate-private rule-file collector and policy
//! loader. Config merging, origins, and requirements composition are delegated
//! directly to `codex-config`; no dsh-codex implementation is linked here.

use super::*;
use codex_config::ConfigLayerEntry;
use codex_config::ConfigRequirements;
use codex_config::ConfigRequirementsToml;
use codex_config::ConfigRequirementsWithSources;
use codex_config::RequirementSource;
use codex_config::RequirementsLayerEntry;
use codex_config::compose_requirements;
use codex_utils_absolute_path::AbsolutePathBuf;
use serde::Deserialize;
use serde_json::Value as JsonValue;
use serde_json::json;
use std::collections::BTreeMap;
use std::collections::BTreeSet;
use std::error::Error;
use std::fs::File;
use std::io::BufRead;
use std::io::BufReader;
use std::io::BufWriter;
use std::io::Write;
use std::path::Path;
use std::path::PathBuf;

const SCHEMA_VERSION: u32 = 1;
const CODEX_COMMIT: &str = "086396f7f60347b74c82784d5dfaf4fb2d3bda12";
const CONFIG_TREE: &str = "d3f4925b575b128dd1f0f74a5babcdb1efce0219";
const EXECPOLICY_TREE: &str = "e06e0b4ad718af8a74055a33b1536b25fb9d4a87";
const CORE_EXEC_POLICY_BLOB: &str = "5de05937533a2653a700b4ec40cda09578761f50";
const CORPUS_ENV: &str = "DSH_CODEX_CONFIG_STACK_ORACLE_CORPUS";
const OUTPUT_ENV: &str = "DSH_CODEX_CONFIG_STACK_ORACLE_OUTPUT";

type OracleResult<T> = Result<T, Box<dyn Error + Send + Sync>>;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct CorpusCase {
    schema_version: u32,
    id: String,
    layers: Vec<LayerSpec>,
    #[serde(default)]
    requirements_layers: Vec<RequirementsLayerSpec>,
    #[serde(default)]
    ignore_user_and_project_exec_policy_rules: bool,
    #[serde(default)]
    origin_keys: Vec<String>,
    #[serde(default)]
    evaluations: Vec<EvaluationSpec>,
    #[serde(default)]
    expect_stack_error: bool,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct LayerSpec {
    id: String,
    kind: LayerKind,
    #[serde(default = "empty_toml_table")]
    config: toml::Value,
    #[serde(default)]
    rules: Vec<RuleFileSpec>,
    #[serde(default)]
    profile: Option<String>,
    #[serde(default)]
    disabled_reason: Option<String>,
}

#[derive(Clone, Copy, Debug, Deserialize)]
#[serde(rename_all = "snake_case")]
enum LayerKind {
    System,
    User,
    Project,
    SessionFlags,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct RuleFileSpec {
    name: String,
    source: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct RequirementsLayerSpec {
    id: String,
    kind: RequirementsLayerKind,
    toml: String,
    #[serde(default)]
    name: Option<String>,
}

#[derive(Clone, Copy, Debug, Deserialize)]
#[serde(rename_all = "snake_case")]
enum RequirementsLayerKind {
    System,
    EnterpriseManaged,
    LegacyManagedFile,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct EvaluationSpec {
    command: Vec<String>,
    fallback: Decision,
}

fn empty_toml_table() -> toml::Value {
    toml::Value::Table(toml::map::Map::new())
}

fn invalid_input(message: impl Into<String>) -> Box<dyn Error + Send + Sync> {
    std::io::Error::new(std::io::ErrorKind::InvalidData, message.into()).into()
}

fn required_path(name: &str) -> OracleResult<PathBuf> {
    std::env::var_os(name)
        .map(PathBuf::from)
        .ok_or_else(|| invalid_input(format!("required environment variable {name} is not set")))
}

fn validate_component(value: &str, field: &str) -> OracleResult<()> {
    if value.is_empty()
        || value == "."
        || value == ".."
        || value.contains('/')
        || value.contains('\\')
    {
        return Err(invalid_input(format!(
            "{field} must be a non-empty path component: {value:?}"
        )));
    }
    Ok(())
}

fn absolute(path: impl AsRef<Path>) -> OracleResult<AbsolutePathBuf> {
    Ok(AbsolutePathBuf::from_absolute_path(path.as_ref())?)
}

fn canonical_path(path: &Path, case_root: &Path) -> String {
    match path.strip_prefix(case_root) {
        Ok(relative) if relative.as_os_str().is_empty() => "$CASE".to_string(),
        Ok(relative) => format!("$CASE/{}", relative.to_string_lossy().replace('\\', "/")),
        Err(_) => path.to_string_lossy().replace('\\', "/"),
    }
}

fn canonical_text(text: &str, case_root: &Path) -> String {
    text.replace(&case_root.to_string_lossy().to_string(), "$CASE")
}

fn layer_source_json(source: &ConfigLayerSource, case_root: &Path) -> JsonValue {
    match source {
        ConfigLayerSource::PackagedDefaults { file } => json!({
            "kind": "packaged_defaults",
            "file": canonical_path(file.as_path(), case_root),
        }),
        ConfigLayerSource::Mdm { domain, key } => json!({
            "kind": "mdm",
            "domain": domain,
            "key": key,
        }),
        ConfigLayerSource::System { file } => json!({
            "kind": "system",
            "file": canonical_path(file.as_path(), case_root),
        }),
        ConfigLayerSource::EnterpriseManaged { id, name } => json!({
            "kind": "enterprise_managed",
            "id": id,
            "name": name,
        }),
        ConfigLayerSource::User { file, profile } => json!({
            "kind": "user",
            "file": canonical_path(file.as_path(), case_root),
            "profile": profile,
        }),
        ConfigLayerSource::Project { dot_codex_folder } => json!({
            "kind": "project",
            "dotCodexFolder": canonical_path(dot_codex_folder.as_path(), case_root),
        }),
        ConfigLayerSource::SessionFlags => json!({ "kind": "session_flags" }),
        ConfigLayerSource::LegacyManagedConfigTomlFromFile { file } => json!({
            "kind": "legacy_managed_file",
            "file": canonical_path(file.as_path(), case_root),
        }),
        ConfigLayerSource::LegacyManagedConfigTomlFromMdm => {
            json!({ "kind": "legacy_managed_mdm" })
        }
    }
}

fn requirement_source_json(source: &RequirementSource, case_root: &Path) -> JsonValue {
    match source {
        RequirementSource::Unknown => json!({ "kind": "unknown" }),
        RequirementSource::MdmManagedPreferences { domain, key } => json!({
            "kind": "mdm_managed_preferences",
            "domain": domain,
            "key": key,
        }),
        RequirementSource::Composite { sources } => json!({
            "kind": "composite",
            "sources": sources
                .iter()
                .map(|source| requirement_source_json(source, case_root))
                .collect::<Vec<_>>(),
        }),
        RequirementSource::EnterpriseManaged { id, name } => json!({
            "kind": "enterprise_managed",
            "id": id,
            "name": name,
        }),
        RequirementSource::SystemRequirementsToml { file } => json!({
            "kind": "system_requirements_toml",
            "file": canonical_path(file.as_path(), case_root),
        }),
        RequirementSource::LegacyManagedConfigTomlFromFile { file } => json!({
            "kind": "legacy_managed_file",
            "file": canonical_path(file.as_path(), case_root),
        }),
        RequirementSource::LegacyManagedConfigTomlFromMdm => {
            json!({ "kind": "legacy_managed_mdm" })
        }
    }
}

fn warning_json(warning: &ExecPolicyError, case_root: &Path) -> JsonValue {
    match warning {
        ExecPolicyError::ParsePolicy { path, source } => {
            let location = source.location().map(|location| {
                json!({
                    "path": canonical_text(&location.path, case_root),
                    "startLine": location.range.start.line,
                    "startColumn": location.range.start.column,
                    "endLine": location.range.end.line,
                    "endColumn": location.range.end.column,
                })
            });
            json!({
                "kind": "parse_policy",
                "path": canonical_path(Path::new(path), case_root),
                "message": canonical_text(&source.to_string(), case_root),
                "location": location,
                "display": canonical_text(&format_exec_policy_error_with_source(warning), case_root),
            })
        }
        ExecPolicyError::ReadDir { dir, .. } => json!({
            "kind": "read_dir",
            "path": canonical_path(dir, case_root),
            "display": canonical_text(&warning.to_string(), case_root),
        }),
        ExecPolicyError::ReadFile { path, .. } => json!({
            "kind": "read_file",
            "path": canonical_path(path, case_root),
            "display": canonical_text(&warning.to_string(), case_root),
        }),
    }
}

fn materialize_layer(spec: &LayerSpec, case_root: &Path) -> OracleResult<ConfigLayerEntry> {
    validate_component(&spec.id, "layer id")?;
    if !matches!(spec.kind, LayerKind::User) && spec.profile.is_some() {
        return Err(invalid_input(format!(
            "layer {:?}: profile is only valid for user layers",
            spec.id
        )));
    }
    if matches!(spec.kind, LayerKind::SessionFlags) && !spec.rules.is_empty() {
        return Err(invalid_input(format!(
            "layer {:?}: session_flags has no config folder for rules",
            spec.id
        )));
    }

    let layer_root = case_root.join("layers").join(&spec.id);
    std::fs::create_dir_all(&layer_root)?;
    let config_file = layer_root.join(codex_config::CONFIG_TOML_FILE);
    std::fs::write(&config_file, toml::to_string(&spec.config)?)?;

    let mut rule_names = BTreeSet::new();
    if !spec.rules.is_empty() {
        let rules_dir = layer_root.join(RULES_DIR_NAME);
        std::fs::create_dir_all(&rules_dir)?;
        for rule in &spec.rules {
            validate_component(&rule.name, "rule filename")?;
            if !rule.name.ends_with(".rules") {
                return Err(invalid_input(format!(
                    "rule filename must end in .rules: {:?}",
                    rule.name
                )));
            }
            if !rule_names.insert(rule.name.clone()) {
                return Err(invalid_input(format!(
                    "duplicate rule filename {:?} in layer {:?}",
                    rule.name, spec.id
                )));
            }
            std::fs::write(rules_dir.join(&rule.name), &rule.source)?;
        }
    }

    let source = match spec.kind {
        LayerKind::System => ConfigLayerSource::System {
            file: absolute(&config_file)?,
        },
        LayerKind::User => ConfigLayerSource::User {
            file: absolute(&config_file)?,
            profile: spec.profile.clone(),
        },
        LayerKind::Project => ConfigLayerSource::Project {
            dot_codex_folder: absolute(&layer_root)?,
        },
        LayerKind::SessionFlags => ConfigLayerSource::SessionFlags,
    };

    Ok(match &spec.disabled_reason {
        Some(reason) => ConfigLayerEntry::new_disabled(source, spec.config.clone(), reason),
        None => ConfigLayerEntry::new(source, spec.config.clone()),
    })
}

fn materialize_requirements(
    specs: &[RequirementsLayerSpec],
    case_root: &Path,
) -> OracleResult<(
    ConfigRequirements,
    ConfigRequirementsToml,
    Vec<RequirementSource>,
)> {
    let requirements_root = case_root.join("requirements");
    std::fs::create_dir_all(&requirements_root)?;
    let mut ids = BTreeSet::new();
    let mut sources = Vec::new();
    let mut entries = Vec::new();

    for spec in specs {
        validate_component(&spec.id, "requirements layer id")?;
        if !ids.insert(spec.id.clone()) {
            return Err(invalid_input(format!(
                "duplicate requirements layer id {:?}",
                spec.id
            )));
        }
        let fixture_file = requirements_root.join(format!("{}.toml", spec.id));
        std::fs::write(&fixture_file, &spec.toml)?;
        let source = match spec.kind {
            RequirementsLayerKind::System => RequirementSource::SystemRequirementsToml {
                file: absolute(&fixture_file)?,
            },
            RequirementsLayerKind::EnterpriseManaged => {
                let name = spec.name.clone().ok_or_else(|| {
                    invalid_input(format!(
                        "requirements layer {:?}: enterprise_managed requires name",
                        spec.id
                    ))
                })?;
                RequirementSource::EnterpriseManaged {
                    id: spec.id.clone(),
                    name,
                }
            }
            RequirementsLayerKind::LegacyManagedFile => {
                RequirementSource::LegacyManagedConfigTomlFromFile {
                    file: absolute(&fixture_file)?,
                }
            }
        };
        sources.push(source.clone());
        entries.push(RequirementsLayerEntry::from_toml(source, spec.toml.clone()));
    }

    let with_sources =
        compose_requirements(entries)?.unwrap_or_else(ConfigRequirementsWithSources::default);
    let requirements_toml = with_sources.clone().into_toml();
    let requirements = ConfigRequirements::try_from(with_sources)?;
    Ok((requirements, requirements_toml, sources))
}

async fn evaluate_case(case: CorpusCase) -> OracleResult<JsonValue> {
    if case.schema_version != SCHEMA_VERSION {
        return Err(invalid_input(format!(
            "case {:?} uses schema version {}, expected {SCHEMA_VERSION}",
            case.id, case.schema_version
        )));
    }
    if case.id.is_empty() {
        return Err(invalid_input("case id must not be empty"));
    }
    if case.layers.is_empty() {
        return Err(invalid_input(format!(
            "case {:?} must contain at least one layer",
            case.id
        )));
    }

    let temp = tempfile::tempdir()?;
    let case_root = temp.path();
    let mut layer_ids = BTreeSet::new();
    let mut layers = Vec::new();
    for layer in &case.layers {
        if !layer_ids.insert(layer.id.clone()) {
            return Err(invalid_input(format!(
                "case {:?}: duplicate layer id {:?}",
                case.id, layer.id
            )));
        }
        layers.push(materialize_layer(layer, case_root)?);
    }

    let (requirements, requirements_toml, requirements_sources) =
        materialize_requirements(&case.requirements_layers, case_root)?;
    let stack_result = ConfigLayerStack::new(layers, requirements, requirements_toml);
    let result = match stack_result {
        Err(error) if case.expect_stack_error => json!({
            "stackError": {
                "kind": format!("{:?}", error.kind()).to_lowercase(),
                "message": canonical_text(&error.to_string(), case_root),
            }
        }),
        Err(error) => return Err(error.into()),
        Ok(_) if case.expect_stack_error => {
            return Err(invalid_input(format!(
                "case {:?} expected ConfigLayerStack::new to fail",
                case.id
            )));
        }
        Ok(stack) => {
            let stack = stack.with_user_and_project_exec_policy_rules_ignored(
                case.ignore_user_and_project_exec_policy_rules,
            );
            let all_layers = stack
                .all_layers_low_to_high()
                .map(|layer| {
                    json!({
                        "source": layer_source_json(&layer.name, case_root),
                        "disabledReason": layer.disabled_reason,
                    })
                })
                .collect::<Vec<_>>();
            let enabled_layers = stack
                .layers_low_to_high()
                .map(|layer| layer_source_json(&layer.name, case_root))
                .collect::<Vec<_>>();

            let origins = stack.origins();
            let selected_origins = case
                .origin_keys
                .iter()
                .map(|key| {
                    let source = origins
                        .get(key)
                        .map(|origin| layer_source_json(&origin.name, case_root))
                        .unwrap_or(JsonValue::Null);
                    (key.clone(), source)
                })
                .collect::<BTreeMap<_, _>>();

            let mut discovered_rule_files = Vec::new();
            for layer in stack.all_layers_low_to_high() {
                let files = match layer.config_folder() {
                    Some(folder) => collect_policy_files(folder.join(RULES_DIR_NAME))
                        .await?
                        .iter()
                        .map(|path| canonical_path(path, case_root))
                        .collect::<Vec<_>>(),
                    None => Vec::new(),
                };
                let ignored_by_exec_policy = stack.ignore_user_and_project_exec_policy_rules()
                    && matches!(
                        layer.name,
                        ConfigLayerSource::User { .. } | ConfigLayerSource::Project { .. }
                    );
                discovered_rule_files.push(json!({
                    "source": layer_source_json(&layer.name, case_root),
                    "files": files,
                    "enabled": !layer.is_disabled(),
                    "ignoredByExecPolicy": ignored_by_exec_policy,
                }));
            }

            let requirements_json = json!({
                "inputSourcesLowToHigh": requirements_sources
                    .iter()
                    .map(|source| requirement_source_json(source, case_root))
                    .collect::<Vec<_>>(),
                "execPolicySource": stack
                    .requirements()
                    .exec_policy_source()
                    .map(|source| requirement_source_json(source, case_root)),
                "rawRulesPresent": stack.requirements_toml().rules.is_some(),
                "normalizedRulesPresent": stack.requirements().exec_policy.is_some(),
            });

            let (policy, warning) = load_exec_policy_with_warning(&stack).await?;
            let mut evaluations = Vec::new();
            for evaluation in &case.evaluations {
                if evaluation.command.is_empty() {
                    return Err(invalid_input(format!(
                        "case {:?}: evaluation command must not be empty",
                        case.id
                    )));
                }
                let fallback = evaluation.fallback;
                let actual = policy.check(&evaluation.command, &|_| fallback);
                evaluations.push(json!({
                    "command": evaluation.command,
                    "fallback": fallback,
                    "evaluation": actual,
                }));
            }

            json!({
                "stack": {
                    "allLayersLowToHigh": all_layers,
                    "enabledLayersLowToHigh": enabled_layers,
                    "effectiveConfig": serde_json::to_value(stack.effective_config())?,
                    "origins": selected_origins,
                    "ignoreUserAndProjectExecPolicyRules": stack
                        .ignore_user_and_project_exec_policy_rules(),
                    "startupWarnings": stack.startup_warnings(),
                },
                "discoveredRuleFiles": discovered_rule_files,
                "requirements": requirements_json,
                "policy": {
                    "evaluations": evaluations,
                    "warning": warning
                        .as_ref()
                        .map(|warning| warning_json(warning, case_root)),
                },
            })
        }
    };

    Ok(json!({
        "schemaVersion": SCHEMA_VERSION,
        "id": case.id,
        "upstream": {
            "codexCommit": CODEX_COMMIT,
            "configTree": CONFIG_TREE,
            "execpolicyTree": EXECPOLICY_TREE,
            "coreExecPolicyBlob": CORE_EXEC_POLICY_BLOB,
            "os": std::env::consts::OS,
            "arch": std::env::consts::ARCH,
        },
        "result": result,
    }))
}

#[tokio::test]
#[ignore = "independent conformance oracle; run through conformance/config-stack/run-oracle.sh"]
async fn dsh_codex_config_stack_oracle() -> OracleResult<()> {
    let corpus_path = required_path(CORPUS_ENV)?;
    let output_path = required_path(OUTPUT_ENV)?;
    let corpus = BufReader::new(File::open(&corpus_path)?);
    let mut output = BufWriter::new(File::create(&output_path)?);
    let mut ids = BTreeSet::new();
    let mut count = 0_usize;

    for (line_index, line) in corpus.lines().enumerate() {
        let line = line?;
        if line.trim().is_empty() {
            return Err(invalid_input(format!(
                "{}:{}: blank lines are not valid JSONL records",
                corpus_path.display(),
                line_index + 1
            )));
        }
        let case: CorpusCase = serde_json::from_str(&line).map_err(|error| {
            invalid_input(format!(
                "{}:{}: invalid corpus record: {error}",
                corpus_path.display(),
                line_index + 1
            ))
        })?;
        if !ids.insert(case.id.clone()) {
            return Err(invalid_input(format!(
                "{}:{}: duplicate case id {:?}",
                corpus_path.display(),
                line_index + 1,
                case.id
            )));
        }
        serde_json::to_writer(&mut output, &evaluate_case(case).await?)?;
        output.write_all(b"\n")?;
        count += 1;
    }

    if count == 0 {
        return Err(invalid_input("corpus must contain at least one case"));
    }
    output.flush()?;
    Ok(())
}
