//! Test-only independent host-discovery oracle for pinned OpenAI Codex.
//!
//! This module is injected into `codex_core::exec_policy` only inside a
//! temporary detached clone. Every successful case calls the real
//! `codex_config::loader::load_config_layers_state` with
//! `codex_exec_server::LocalFileSystem::unsandboxed()`. It never constructs a
//! `ConfigLayerEntry`, never links dsh-codex, and uses the upstream private
//! exec-policy loader only after real host discovery has produced the stack.

use super::*;
use codex_config::CloudConfigBundle;
use codex_config::CloudConfigBundleLoader;
use codex_config::ConfigLoadOptions;
use codex_config::LoaderOverrides;
use codex_config::NoopThreadConfigLoader;
use codex_config::ProfileV2Name;
use codex_config::RequirementSource;
use codex_exec_server::LocalFileSystem;
use codex_utils_absolute_path::AbsolutePathBuf;
use codex_utils_cli::CliConfigOverrides;
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
use std::path::Component;
use std::path::Path;
use std::path::PathBuf;

const SCHEMA_VERSION: u32 = 1;
const CODEX_COMMIT: &str = "086396f7f60347b74c82784d5dfaf4fb2d3bda12";
const CONFIG_TREE: &str = "d3f4925b575b128dd1f0f74a5babcdb1efce0219";
const EXEC_SERVER_TREE: &str = "51751785508060e633f0e0472fa0d2572787b36a";
const UTILS_CLI_TREE: &str = "5d9c72fcadefb9a1c95e38c4726d25c5b8d195ee";
const UTILS_HOME_DIR_TREE: &str = "c2d10a4f4844c2a517584ee623a0b8aa4ceb44f5";
const EXECPOLICY_TREE: &str = "e06e0b4ad718af8a74055a33b1536b25fb9d4a87";
const CORE_EXEC_POLICY_BLOB: &str = "5de05937533a2653a700b4ec40cda09578761f50";
const CORE_CARGO_BLOB: &str = "ff683fb5f921dcf23fe52ef52db6cf9889ca8efe";
const CARGO_LOCK_BLOB: &str = "a8c2addc02055be48c345b65760a7a1b96cfbf28";
const CONFIG_LOADER_BLOB: &str = "244f7df02f1aba0eeb80fa8acebc7732195f8f3a";
const CONFIG_STATE_BLOB: &str = "bda2b7d1a73a22c0f39abbba0bad7f4a5e6932ea";
const EXEC_SERVER_LIB_BLOB: &str = "bfaec24cad2a27a91a7c685f3fead3138e2b01f7";
const UTILS_CLI_LIB_BLOB: &str = "633638e72d65a931f68a503d523c76f75d0ac62b";
const UTILS_HOME_DIR_LIB_BLOB: &str = "caa43569c78bae9f5cc875092f378f4d935b8063";
const CORPUS_ENV: &str = "DSH_CODEX_HOST_CONFIG_ORACLE_CORPUS";
const OUTPUT_ENV: &str = "DSH_CODEX_HOST_CONFIG_ORACLE_OUTPUT";
const CASES_ROOT_ENV: &str = "DSH_CODEX_HOST_CONFIG_ORACLE_CASES_ROOT";

type OracleResult<T> = Result<T, Box<dyn Error + Send + Sync>>;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct CorpusCase {
    schema_version: u32,
    id: String,
    codex_home_mode: CodexHomeMode,
    #[serde(default)]
    directories: Vec<String>,
    #[serde(default)]
    files: Vec<FileFixture>,
    #[serde(default)]
    symlinks: Vec<SymlinkFixture>,
    #[serde(default)]
    requires_unix_symlinks: bool,
    #[serde(default)]
    cwd: Option<String>,
    #[serde(default)]
    cli_overrides: Vec<String>,
    #[serde(default)]
    strict_config: bool,
    #[serde(default)]
    profile_v2: Option<String>,
    #[serde(default)]
    ignore_user_config: bool,
    #[serde(default)]
    ignore_user_and_project_exec_policy_rules: bool,
    #[serde(default)]
    cloud: CloudInput,
    #[serde(default)]
    origin_keys: Vec<String>,
    #[serde(default)]
    evaluations: Vec<EvaluationSpec>,
    #[serde(default)]
    expect_error_stage: Option<ErrorStage>,
}

#[derive(Clone, Copy, Debug, Deserialize, Eq, PartialEq)]
#[serde(rename_all = "snake_case")]
enum CodexHomeMode {
    Discover,
    Explicit,
}

impl CodexHomeMode {
    fn as_str(self) -> &'static str {
        match self {
            Self::Discover => "discover",
            Self::Explicit => "explicit",
        }
    }
}

#[derive(Clone, Copy, Debug, Deserialize, Eq, PartialEq)]
#[serde(rename_all = "snake_case")]
enum ErrorStage {
    Profile,
    Cli,
    Loader,
}

impl ErrorStage {
    fn as_str(self) -> &'static str {
        match self {
            Self::Profile => "profile",
            Self::Cli => "cli",
            Self::Loader => "loader",
        }
    }
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct FileFixture {
    path: String,
    contents: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct SymlinkFixture {
    path: String,
    target: String,
}

#[derive(Clone, Debug, Deserialize)]
#[serde(
    tag = "mode",
    rename_all = "snake_case",
    rename_all_fields = "camelCase"
)]
enum CloudInput {
    NotRequested,
    Snapshot { bundle: Option<CloudConfigBundle> },
}

impl Default for CloudInput {
    fn default() -> Self {
        Self::NotRequested
    }
}

impl CloudInput {
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

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct EvaluationSpec {
    command: Vec<String>,
    fallback: Decision,
}

fn invalid_input(message: impl Into<String>) -> Box<dyn Error + Send + Sync> {
    std::io::Error::new(std::io::ErrorKind::InvalidData, message.into()).into()
}

fn required_path(name: &str) -> OracleResult<PathBuf> {
    std::env::var_os(name)
        .map(PathBuf::from)
        .ok_or_else(|| invalid_input(format!("required environment variable {name} is not set")))
}

fn validate_relative_path(value: &str, field: &str) -> OracleResult<PathBuf> {
    if value.is_empty() || value.contains('\0') {
        return Err(invalid_input(format!(
            "{field} must be a non-empty safe relative path"
        )));
    }
    let path = PathBuf::from(value);
    if path
        .components()
        .any(|component| !matches!(component, Component::Normal(_)))
    {
        return Err(invalid_input(format!(
            "{field} must contain only normal relative path components: {value:?}"
        )));
    }
    Ok(path)
}

fn expand_text(text: &str, case_root: &Path) -> String {
    text.replace("$CASE", &case_root.to_string_lossy())
}

fn canonical_text(text: &str, case_root: &Path) -> String {
    let canonical = text.replace(&case_root.to_string_lossy().to_string(), "$CASE");
    if canonical.contains("$CASE") {
        canonical.replace('\\', "/")
    } else {
        canonical
    }
}

fn canonical_path(path: &Path, case_root: &Path) -> String {
    canonical_text(&path.to_string_lossy(), case_root).replace('\\', "/")
}

fn canonical_json(value: JsonValue, case_root: &Path) -> JsonValue {
    match value {
        JsonValue::String(value) => JsonValue::String(canonical_text(&value, case_root)),
        JsonValue::Array(values) => JsonValue::Array(
            values
                .into_iter()
                .map(|value| canonical_json(value, case_root))
                .collect(),
        ),
        JsonValue::Object(values) => JsonValue::Object(
            values
                .into_iter()
                .map(|(key, value)| {
                    (
                        canonical_text(&key, case_root),
                        canonical_json(value, case_root),
                    )
                })
                .collect(),
        ),
        other => other,
    }
}

fn layer_source_json(source: &ConfigLayerSource, case_root: &Path) -> JsonValue {
    match source {
        ConfigLayerSource::PackagedDefaults { .. } => json!({
            "kind": "packaged_defaults",
            "file": "$EXECUTABLE",
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
            "kind": "legacy_managed_config_toml_from_file",
            "file": canonical_path(file.as_path(), case_root),
        }),
        ConfigLayerSource::LegacyManagedConfigTomlFromMdm => {
            json!({ "kind": "legacy_managed_config_toml_from_mdm" })
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
            "kind": "legacy_managed_config_toml_from_file",
            "file": canonical_path(file.as_path(), case_root),
        }),
        RequirementSource::LegacyManagedConfigTomlFromMdm => {
            json!({ "kind": "legacy_managed_config_toml_from_mdm" })
        }
    }
}

fn warning_json(warning: &ExecPolicyError, case_root: &Path) -> JsonValue {
    match warning {
        ExecPolicyError::ParsePolicy { path, source } => json!({
            "kind": "parse_policy",
            "path": canonical_text(path, case_root),
            "message": canonical_text(&source.to_string(), case_root),
            "location": source.location().map(|location| json!({
                "path": canonical_text(&location.path, case_root),
                "startLine": location.range.start.line,
                "startColumn": location.range.start.column,
                "endLine": location.range.end.line,
                "endColumn": location.range.end.column,
            })),
        }),
        ExecPolicyError::ReadDir { dir, source } => json!({
            "kind": "read_dir",
            "path": canonical_path(dir, case_root),
            "message": source.to_string(),
        }),
        ExecPolicyError::ReadFile { path, source } => json!({
            "kind": "read_file",
            "path": canonical_path(path, case_root),
            "message": source.to_string(),
        }),
    }
}

fn record(result: JsonValue, id: String) -> JsonValue {
    json!({
        "schemaVersion": SCHEMA_VERSION,
        "id": id,
        "upstream": {
            "codexCommit": CODEX_COMMIT,
            "configTree": CONFIG_TREE,
            "execServerTree": EXEC_SERVER_TREE,
            "utilsCliTree": UTILS_CLI_TREE,
            "utilsHomeDirTree": UTILS_HOME_DIR_TREE,
            "execpolicyTree": EXECPOLICY_TREE,
            "coreExecPolicyBlob": CORE_EXEC_POLICY_BLOB,
            "coreCargoBlob": CORE_CARGO_BLOB,
            "cargoLockBlob": CARGO_LOCK_BLOB,
            "configLoaderBlob": CONFIG_LOADER_BLOB,
            "configStateBlob": CONFIG_STATE_BLOB,
            "execServerLibBlob": EXEC_SERVER_LIB_BLOB,
            "utilsCliLibBlob": UTILS_CLI_LIB_BLOB,
            "utilsHomeDirLibBlob": UTILS_HOME_DIR_LIB_BLOB,
            "os": std::env::consts::OS,
            "arch": std::env::consts::ARCH,
        },
        "result": result,
    })
}

fn error_result(
    case: &CorpusCase,
    stage: ErrorStage,
    kind: &str,
    message: String,
    case_root: &Path,
) -> OracleResult<JsonValue> {
    if case.expect_error_stage != Some(stage) {
        return Err(invalid_input(format!(
            "case {:?}: unexpected {} error: {}",
            case.id,
            stage.as_str(),
            message
        )));
    }
    Ok(json!({
        "loadError": {
            "stage": stage.as_str(),
            "kind": kind,
            "message": canonical_text(&message, case_root),
        }
    }))
}

fn materialize_case(case: &CorpusCase, case_root: &Path) -> OracleResult<()> {
    if case.requires_unix_symlinks && !cfg!(unix) {
        return Err(invalid_input(format!(
            "case {:?} requires Unix symlink semantics",
            case.id
        )));
    }
    std::fs::create_dir_all(case_root.join("home"))?;
    let mut occupied = BTreeSet::new();
    for (index, directory) in case.directories.iter().enumerate() {
        let relative = validate_relative_path(directory, &format!("directories[{index}]"))?;
        if !occupied.insert(relative.clone()) {
            return Err(invalid_input(format!(
                "case {:?}: duplicate fixture path {:?}",
                case.id, directory
            )));
        }
        std::fs::create_dir_all(case_root.join(relative))?;
    }
    for (index, fixture) in case.files.iter().enumerate() {
        let relative = validate_relative_path(&fixture.path, &format!("files[{index}].path"))?;
        if !occupied.insert(relative.clone()) {
            return Err(invalid_input(format!(
                "case {:?}: duplicate fixture path {:?}",
                case.id, fixture.path
            )));
        }
        let path = case_root.join(relative);
        if let Some(parent) = path.parent() {
            std::fs::create_dir_all(parent)?;
        }
        std::fs::write(path, expand_text(&fixture.contents, case_root))?;
    }
    for (index, fixture) in case.symlinks.iter().enumerate() {
        let relative = validate_relative_path(&fixture.path, &format!("symlinks[{index}].path"))?;
        let target = validate_relative_path(&fixture.target, &format!("symlinks[{index}].target"))?;
        if !occupied.insert(relative.clone()) {
            return Err(invalid_input(format!(
                "case {:?}: duplicate fixture path {:?}",
                case.id, fixture.path
            )));
        }
        let path = case_root.join(relative);
        if let Some(parent) = path.parent() {
            std::fs::create_dir_all(parent)?;
        }
        #[cfg(unix)]
        std::os::unix::fs::symlink(target, path)?;
        #[cfg(not(unix))]
        return Err(invalid_input("symlink fixtures require Unix"));
    }
    Ok(())
}

async fn policy_paths_for_stack(
    stack: &codex_config::ConfigLayerStack,
) -> OracleResult<Vec<PathBuf>> {
    let mut paths = Vec::new();
    for layer in stack.layers_low_to_high() {
        if stack.ignore_user_and_project_exec_policy_rules()
            && matches!(
                layer.name,
                ConfigLayerSource::User { .. } | ConfigLayerSource::Project { .. }
            )
        {
            continue;
        }
        if let Some(folder) = layer.config_folder() {
            paths.extend(collect_policy_files(&folder.join(RULES_DIR_NAME)).await?);
        }
    }
    Ok(paths)
}

async fn successful_result(
    case: &CorpusCase,
    case_root: &Path,
    codex_home: &AbsolutePathBuf,
    cwd: &Option<AbsolutePathBuf>,
    profile: &Option<ProfileV2Name>,
    cloud_mode: &str,
    stack: codex_config::ConfigLayerStack,
) -> OracleResult<JsonValue> {
    let all_layers = stack
        .all_layers_low_to_high()
        .map(|layer| {
            json!({
                "source": layer_source_json(&layer.name, case_root),
                "disabledReason": layer
                    .disabled_reason
                    .as_ref()
                    .map(|reason| canonical_text(reason, case_root)),
            })
        })
        .collect::<Vec<_>>();
    let enabled_layers = stack
        .layers_low_to_high()
        .map(|layer| layer_source_json(&layer.name, case_root))
        .collect::<Vec<_>>();

    let origins = stack.origins();
    let mut selected_origins = BTreeMap::new();
    for key in &case.origin_keys {
        let lookup_key = expand_text(key, case_root);
        selected_origins.insert(
            key.clone(),
            origins
                .get(&lookup_key)
                .map(|origin| layer_source_json(&origin.name, case_root))
                .unwrap_or(JsonValue::Null),
        );
    }

    let mut discovered_rule_files = Vec::new();
    for layer in stack.all_layers_low_to_high() {
        let files = match layer.config_folder() {
            Some(folder) => collect_policy_files(&folder.join(RULES_DIR_NAME))
                .await?
                .iter()
                .map(|path| canonical_path(path, case_root))
                .collect::<Vec<_>>(),
            None => Vec::new(),
        };
        let ignored = stack.ignore_user_and_project_exec_policy_rules()
            && matches!(
                layer.name,
                ConfigLayerSource::User { .. } | ConfigLayerSource::Project { .. }
            );
        discovered_rule_files.push(json!({
            "source": layer_source_json(&layer.name, case_root),
            "files": files,
            "enabled": !layer.is_disabled(),
            "ignoredByExecPolicy": ignored,
        }));
    }

    let policy_paths = policy_paths_for_stack(&stack).await?;
    let (policy, warning) = load_exec_policy_with_warning(&stack).await?;
    let evaluations = case
        .evaluations
        .iter()
        .map(|evaluation| {
            if evaluation.command.is_empty() || evaluation.command.iter().any(String::is_empty) {
                return Err(invalid_input(format!(
                    "case {:?}: evaluation command must contain non-empty tokens",
                    case.id
                )));
            }
            let actual = policy.check(&evaluation.command, &|_| evaluation.fallback);
            Ok(json!({
                "command": evaluation.command,
                "fallback": evaluation.fallback,
                "evaluation": actual,
            }))
        })
        .collect::<OracleResult<Vec<_>>>()?;

    let default_policy_path = codex_home.join("rules").join("default.rules");
    let load = json!({
        "loadedSources": policy_paths.len(),
        "loadedFiles": policy_paths
            .iter()
            .map(|path| canonical_path(path, case_root))
            .collect::<Vec<_>>(),
        "allowedPrefixes": policy.get_allowed_prefixes(),
        "warning": warning
            .as_ref()
            .map(|warning| warning_json(warning, case_root)),
        "stack": {
            "allLayersLowToHigh": all_layers,
            "enabledLayersLowToHigh": enabled_layers,
            "effectiveConfig": canonical_json(
                serde_json::to_value(stack.effective_config())?,
                case_root,
            ),
            "origins": selected_origins,
            "ignoreUserAndProjectExecPolicyRules": stack
                .ignore_user_and_project_exec_policy_rules(),
            "startupWarnings": canonical_json(
                serde_json::to_value(stack.startup_warnings())?,
                case_root,
            ),
        },
        "discoveredRuleFiles": discovered_rule_files,
        "requirements": {
            "inputSourcesLowToHigh": JsonValue::Null,
            "execPolicySource": stack
                .requirements()
                .exec_policy_source()
                .map(|source| requirement_source_json(source, case_root)),
            "rawRulesPresent": stack.requirements_toml().rules.is_some(),
            "normalizedRulesPresent": stack.requirements().exec_policy.is_some(),
        },
        "discovery": {
            "mode": "host",
            "codexHomeMode": case.codex_home_mode.as_str(),
            "resolvedCodexHome": canonical_path(codex_home.as_path(), case_root),
            "cwd": cwd
                .as_ref()
                .map(|path| canonical_path(path.as_path(), case_root)),
            "profileV2": profile.as_ref().map(ToString::to_string),
            "cloudMode": cloud_mode,
            "threadConfigMode": "none",
            "strictConfig": case.strict_config,
            "ignoreUserConfig": case.ignore_user_config,
            "ignoreUserAndProjectExecPolicyRules": case
                .ignore_user_and_project_exec_policy_rules,
            "defaultPolicyPath": canonical_path(default_policy_path.as_path(), case_root),
            "startupMigration": {
                "mode": "not_requested",
                "attempted": false,
                "completed": false,
                "warning": JsonValue::Null,
            },
        },
    });

    if default_policy_path.exists() {
        return Err(invalid_input(format!(
            "case {:?}: load_config_layers_state unexpectedly created {}",
            case.id,
            default_policy_path.display()
        )));
    }

    Ok(json!({
        "load": load,
        "evaluations": evaluations,
    }))
}

async fn evaluate_case(
    case: CorpusCase,
    case_index: usize,
    cases_root: &Path,
) -> OracleResult<JsonValue> {
    if case.schema_version != SCHEMA_VERSION {
        return Err(invalid_input(format!(
            "case {:?} uses schema version {}, expected {SCHEMA_VERSION}",
            case.id, case.schema_version
        )));
    }
    if case.id.is_empty() {
        return Err(invalid_input("case id must not be empty"));
    }
    if case.requires_unix_symlinks && !cfg!(unix) {
        return Ok(record(
            json!({
                "skipped": {
                    "reason": "requires_unix_symlinks",
                    "platform": std::env::consts::OS,
                }
            }),
            case.id,
        ));
    }
    let case_root = cases_root.join(case_index.to_string());
    materialize_case(&case, &case_root)?;
    let fixture_home = AbsolutePathBuf::from_absolute_path(case_root.join("home"))?;
    let codex_home = match case.codex_home_mode {
        CodexHomeMode::Discover => {
            if case_index != 0 {
                return Err(invalid_input(
                    "the single discover-home case must be corpus record zero",
                ));
            }
            let resolved = codex_utils_home_dir::find_codex_home()?;
            if resolved != fixture_home {
                return Err(invalid_input(format!(
                    "discover-home resolved {}, expected {}",
                    resolved.display(),
                    fixture_home.display()
                )));
            }
            resolved
        }
        CodexHomeMode::Explicit => fixture_home,
    };
    let cwd = case
        .cwd
        .as_deref()
        .map(|value| -> OracleResult<AbsolutePathBuf> {
            let relative = validate_relative_path(value, "cwd")?;
            Ok(AbsolutePathBuf::from_absolute_path(
                case_root.join(relative),
            )?)
        })
        .transpose()?;

    let profile = match case
        .profile_v2
        .as_deref()
        .map(str::parse::<ProfileV2Name>)
        .transpose()
    {
        Ok(profile) => profile,
        Err(error) => {
            let result = error_result(
                &case,
                ErrorStage::Profile,
                "profile_parse",
                error.to_string(),
                &case_root,
            )?;
            return Ok(record(result, case.id));
        }
    };

    let cli_overrides = match (CliConfigOverrides {
        raw_overrides: case.cli_overrides.clone(),
    })
    .parse_overrides()
    {
        Ok(overrides) => overrides,
        Err(error) => {
            let result = error_result(&case, ErrorStage::Cli, "cli_parse", error, &case_root)?;
            return Ok(record(result, case.id));
        }
    };

    let mut loader_overrides = LoaderOverrides {
        ignore_user_config: case.ignore_user_config,
        ignore_user_and_project_exec_policy_rules: case.ignore_user_and_project_exec_policy_rules,
        ..LoaderOverrides::default()
    };
    if let Some(profile) = profile.as_ref() {
        loader_overrides.user_config_profile = Some(profile.clone());
        loader_overrides.user_config_path = Some(codex_home.join(format!("{profile}.config.toml")));
    }
    let cloud_mode = case.cloud.mode();
    let cloud_loader = case.cloud.clone().into_loader();
    let fs = LocalFileSystem::unsandboxed();
    let stack = match codex_config::loader::load_config_layers_state(
        &fs,
        codex_home.as_path(),
        cwd.clone(),
        &cli_overrides,
        ConfigLoadOptions {
            loader_overrides,
            strict_config: case.strict_config,
            cloud_config_bundle: cloud_loader,
        },
        &NoopThreadConfigLoader,
    )
    .await
    {
        Ok(stack) => stack,
        Err(error) => {
            let kind = format!("{:?}", error.kind()).to_ascii_lowercase();
            let result = error_result(
                &case,
                ErrorStage::Loader,
                &kind,
                error.to_string(),
                &case_root,
            )?;
            return Ok(record(result, case.id));
        }
    };

    if let Some(stage) = case.expect_error_stage {
        return Err(invalid_input(format!(
            "case {:?} expected a {} error but host discovery succeeded",
            case.id,
            stage.as_str()
        )));
    }
    let result = successful_result(
        &case,
        &case_root,
        &codex_home,
        &cwd,
        &profile,
        cloud_mode,
        stack,
    )
    .await?;
    Ok(record(result, case.id))
}

#[tokio::test]
#[ignore = "independent pinned host-config oracle; run through conformance/host-config/run-oracle.sh"]
async fn dsh_codex_host_config_oracle() -> OracleResult<()> {
    let corpus_path = required_path(CORPUS_ENV)?;
    let output_path = required_path(OUTPUT_ENV)?;
    let cases_root = required_path(CASES_ROOT_ENV)?;
    std::fs::create_dir_all(&cases_root)?;
    let corpus = BufReader::new(File::open(&corpus_path)?);
    let mut output = BufWriter::new(File::create(&output_path)?);
    let mut ids = BTreeSet::new();
    let mut discover_cases = 0_usize;
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
        if case.codex_home_mode == CodexHomeMode::Discover {
            discover_cases += 1;
        }
        serde_json::to_writer(
            &mut output,
            &evaluate_case(case, line_index, &cases_root).await?,
        )?;
        output.write_all(b"\n")?;
        count += 1;
    }

    if count == 0 {
        return Err(invalid_input("corpus must contain at least one case"));
    }
    if discover_cases != 1 {
        return Err(invalid_input(format!(
            "corpus must contain exactly one discover-home case; found {discover_cases}"
        )));
    }
    output.flush()?;
    Ok(())
}
