// Copyright 2026 dsh-codex contributors.
//
// Portions of this file are adapted from OpenAI Codex
// codex-rs/core/src/exec_policy.rs and codex-rs/core/src/exec_policy/model_policy.rs
// at commit 086396f7f60347b74c82784d5dfaf4fb2d3bda12.
// Licensed under the Apache License, Version 2.0. Changes: public JSON-facing
// input/output types replace Codex-private session/config types; the decision
// algorithms, reason strings, shell lowering, and amendment rules are kept in
// parity with that pinned source.

use codex_execpolicy::Decision;
use codex_execpolicy::Evaluation;
use codex_execpolicy::MatchOptions;
use codex_execpolicy::Policy;
use codex_execpolicy::PrefixRule;
use codex_execpolicy::RuleMatch;
use codex_shell_command::bash::parse_shell_lc_plain_commands;
use codex_shell_command::bash::parse_shell_lc_single_command_prefix;
use codex_shell_command::is_dangerous_command::DangerousCommandMatch;
use codex_shell_command::is_dangerous_command::dangerous_command_match;
use codex_shell_command::is_safe_command::is_known_safe_command;
use serde::Deserialize;
use serde::Serialize;
use shlex::try_join as shlex_try_join;
use std::sync::Arc;

const PROMPT_CONFLICT_REASON: &str =
    "approval required by policy, but AskForApproval is set to Never";
const REJECT_SANDBOX_APPROVAL_REASON: &str =
    "approval required by policy, but AskForApproval::Granular.sandbox_approval is false";
const REJECT_RULES_APPROVAL_REASON: &str =
    "approval required by policy rule, but AskForApproval::Granular.rules is false";

pub(crate) static BANNED_PREFIX_SUGGESTIONS: &[&[&str]] = &[
    &["/bin/bash"],
    &["/bin/bash", "-c"],
    &["/bin/bash", "-lc"],
    &["/bin/sh"],
    &["/bin/sh", "-c"],
    &["/bin/sh", "-lc"],
    &["/bin/zsh"],
    &["/bin/zsh", "-c"],
    &["/bin/zsh", "-lc"],
    &["Rscript"],
    &["bash"],
    &["bash", "-c"],
    &["bash", "-lc"],
    &["bun"],
    &["bun", "-e"],
    &["bun", "run"],
    &["cmd"],
    &["cmd", "/c"],
    &["cmd", "/k"],
    &["cmd.exe"],
    &["cmd.exe", "/c"],
    &["cmd.exe", "/k"],
    &["dash"],
    &["dash", "-c"],
    &["deno"],
    &["deno", "eval"],
    &["env"],
    &["fish"],
    &["fish", "-c"],
    &["git"],
    &["julia"],
    &["julia", "-e"],
    &["ksh"],
    &["ksh", "-c"],
    &["lua"],
    &["lua", "-e"],
    &["node"],
    &["node", "-e"],
    &["nodejs"],
    &["nodejs", "-e"],
    &["npm", "run"],
    &["osascript"],
    &["perl"],
    &["perl", "-e"],
    &["php"],
    &["php", "-r"],
    &["pnpm", "run"],
    &["powershell"],
    &["powershell", "-Command"],
    &["powershell", "-EncodedCommand"],
    &["powershell", "-File"],
    &["powershell", "-c"],
    &["powershell.exe"],
    &["powershell.exe", "-Command"],
    &["powershell.exe", "-EncodedCommand"],
    &["powershell.exe", "-File"],
    &["powershell.exe", "-c"],
    &["pwsh"],
    &["pwsh", "-Command"],
    &["pwsh", "-EncodedCommand"],
    &["pwsh", "-File"],
    &["pwsh", "-c"],
    &["pwsh", "-e"],
    &["pwsh", "-ec"],
    &["pwsh", "-f"],
    &["py"],
    &["py", "-3"],
    &["pypy"],
    &["pypy3"],
    &["python"],
    &["python", "-"],
    &["python", "-c"],
    &["python3"],
    &["python3", "-"],
    &["python3", "-c"],
    &["pythonw"],
    &["pyw"],
    &["rm"],
    &["ruby"],
    &["ruby", "-e"],
    &["sh"],
    &["sh", "-c"],
    &["sh", "-lc"],
    &["sudo"],
    &["yarn", "run"],
    &["zsh"],
    &["zsh", "-c"],
    &["zsh", "-lc"],
];

#[derive(Clone, Copy, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(
    tag = "kind",
    rename_all = "snake_case",
    rename_all_fields = "camelCase"
)]
pub enum ApprovalPolicy {
    UnlessTrusted,
    OnRequest,
    Granular { sandbox_approval: bool, rules: bool },
    Never,
}

#[derive(Clone, Copy, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum ManagedFileSystemKind {
    Restricted,
    Unrestricted,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
enum FileSystemSandboxKind {
    Restricted,
    Unrestricted,
    ExternalSandbox,
}

#[derive(Clone, Copy, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(
    tag = "kind",
    rename_all = "snake_case",
    rename_all_fields = "camelCase"
)]
pub enum PermissionProfile {
    Managed {
        file_system: ManagedFileSystemKind,
        has_full_disk_write_access: bool,
    },
    Disabled,
    External,
}

impl PermissionProfile {
    fn file_system_kind(self) -> FileSystemSandboxKind {
        match self {
            Self::Managed {
                file_system: ManagedFileSystemKind::Restricted,
                ..
            } => FileSystemSandboxKind::Restricted,
            Self::Managed {
                file_system: ManagedFileSystemKind::Unrestricted,
                ..
            } => FileSystemSandboxKind::Unrestricted,
            Self::Disabled => FileSystemSandboxKind::Unrestricted,
            Self::External => FileSystemSandboxKind::ExternalSandbox,
        }
    }
}

#[derive(Clone, Copy, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum WindowsSandboxLevel {
    Disabled,
    RestrictedToken,
    Elevated,
}

#[derive(Clone, Copy, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum SandboxPermissions {
    UseDefault,
    RequireEscalated,
    WithAdditionalPermissions,
}

impl SandboxPermissions {
    fn requests_sandbox_override(self) -> bool {
        !matches!(self, Self::UseDefault)
    }
}

#[derive(Clone, Copy, Debug, Default, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum AllowPrefixRules {
    #[default]
    Honor,
    IgnoreForCyberModel,
}

#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RuntimePolicyInput {
    pub command: Vec<String>,
    pub approval_policy: ApprovalPolicy,
    pub permission_profile: PermissionProfile,
    pub windows_sandbox_level: WindowsSandboxLevel,
    pub sandbox_permissions: SandboxPermissions,
    #[serde(default)]
    pub prefix_rule: Option<Vec<String>>,
    #[serde(default)]
    pub allow_prefix_rules: AllowPrefixRules,
}

impl RuntimePolicyInput {
    pub fn validate(&self) -> Result<(), String> {
        if self.command.is_empty() {
            return Err("command must contain at least one argv token".to_string());
        }

        if matches!(
            self.permission_profile,
            PermissionProfile::Managed {
                file_system: ManagedFileSystemKind::Unrestricted,
                has_full_disk_write_access: false,
            }
        ) {
            return Err(
                "an unrestricted managed filesystem always has full disk write access".to_string(),
            );
        }

        Ok(())
    }
}

#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(transparent)]
pub struct ExecPolicyAmendment {
    pub command: Vec<String>,
}

impl From<Vec<String>> for ExecPolicyAmendment {
    fn from(command: Vec<String>) -> Self {
        Self { command }
    }
}

#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(
    tag = "kind",
    rename_all = "snake_case",
    rename_all_fields = "camelCase"
)]
pub enum ExecApprovalRequirement {
    Skip {
        bypass_sandbox: bool,
        #[serde(skip_serializing_if = "Option::is_none")]
        proposed_execpolicy_amendment: Option<ExecPolicyAmendment>,
    },
    NeedsApproval {
        #[serde(skip_serializing_if = "Option::is_none")]
        reason: Option<String>,
        #[serde(skip_serializing_if = "Option::is_none")]
        proposed_execpolicy_amendment: Option<ExecPolicyAmendment>,
    },
    Forbidden {
        reason: String,
    },
}

#[derive(Clone, Copy, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum ExecPolicyCommandOrigin {
    Generic,
    #[cfg(windows)]
    PowerShell,
}

#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RuntimePolicyOutput {
    pub requirement: ExecApprovalRequirement,
    pub evaluation: Evaluation,
    pub lowered_commands: Vec<Vec<String>>,
    pub used_complex_parsing: bool,
    pub command_origin: ExecPolicyCommandOrigin,
}

#[derive(Debug, Eq, PartialEq)]
struct ExecPolicyCommands {
    commands: Vec<Vec<String>>,
    used_complex_parsing: bool,
    command_origin: ExecPolicyCommandOrigin,
}

#[derive(Clone, Copy)]
struct UnmatchedCommandContext<'a> {
    approval_policy: ApprovalPolicy,
    permission_profile: &'a PermissionProfile,
    windows_sandbox_level: WindowsSandboxLevel,
    sandbox_permissions: SandboxPermissions,
    used_complex_parsing: bool,
    command_origin: ExecPolicyCommandOrigin,
}

pub fn evaluate_runtime_policy(
    source_policy: &Policy,
    input: &RuntimePolicyInput,
) -> RuntimePolicyOutput {
    let policy = policy_for_allow_prefix_rules(source_policy, input.allow_prefix_rules);
    let ExecPolicyCommands {
        commands,
        used_complex_parsing,
        command_origin,
    } = commands_for_exec_policy(&input.command);
    let auto_amendment_allowed =
        !used_complex_parsing && input.allow_prefix_rules == AllowPrefixRules::Honor;
    let fallback = |command: &[String]| {
        render_decision_for_unmatched_command(
            command,
            UnmatchedCommandContext {
                approval_policy: input.approval_policy,
                permission_profile: &input.permission_profile,
                windows_sandbox_level: input.windows_sandbox_level,
                sandbox_permissions: input.sandbox_permissions,
                used_complex_parsing,
                command_origin,
            },
        )
    };
    let match_options = MatchOptions {
        resolve_host_executables: true,
    };
    let evaluation = policy.check_multiple_with_options(commands.iter(), &fallback, &match_options);

    let requested_amendment = if auto_amendment_allowed {
        derive_requested_execpolicy_amendment_from_prefix_rule(
            input.prefix_rule.as_ref(),
            &evaluation.matched_rules,
            &policy,
            &commands,
            &fallback,
            &match_options,
        )
    } else {
        None
    };

    let requirement = match evaluation.decision {
        Decision::Forbidden => ExecApprovalRequirement::Forbidden {
            reason: derive_forbidden_reason(
                &input.command,
                &evaluation,
                dangerous_command_match_for_heuristics(
                    &evaluation,
                    Decision::Forbidden,
                    command_origin,
                ),
            ),
        },
        Decision::Prompt => {
            let prompt_is_rule = evaluation.matched_rules.iter().any(|rule_match| {
                is_policy_match(rule_match) && rule_match.decision() == Decision::Prompt
            });
            match prompt_is_rejected_by_policy(input.approval_policy, prompt_is_rule) {
                Some(reason) if prompt_is_rule => ExecApprovalRequirement::Forbidden {
                    reason: reason.to_string(),
                },
                Some(reason) => ExecApprovalRequirement::Forbidden {
                    reason: derive_rejected_prompt_reason(
                        reason,
                        dangerous_command_match_for_heuristics(
                            &evaluation,
                            Decision::Prompt,
                            command_origin,
                        ),
                    ),
                },
                None => ExecApprovalRequirement::NeedsApproval {
                    reason: derive_prompt_reason(&input.command, &evaluation),
                    proposed_execpolicy_amendment: requested_amendment.or_else(|| {
                        if auto_amendment_allowed {
                            try_derive_execpolicy_amendment_for_prompt_rules(
                                &evaluation.matched_rules,
                            )
                        } else {
                            None
                        }
                    }),
                },
            }
        }
        Decision::Allow => ExecApprovalRequirement::Skip {
            bypass_sandbox: commands.iter().all(|command| {
                policy
                    .matches_for_command_with_options(command, None, &match_options)
                    .iter()
                    .any(|rule_match| {
                        is_policy_match(rule_match) && rule_match.decision() == Decision::Allow
                    })
            }),
            proposed_execpolicy_amendment: if auto_amendment_allowed {
                try_derive_execpolicy_amendment_for_allow_rules(&evaluation.matched_rules)
            } else {
                None
            },
        },
    };

    RuntimePolicyOutput {
        requirement,
        evaluation,
        lowered_commands: commands,
        used_complex_parsing,
        command_origin,
    }
}

fn policy_for_allow_prefix_rules(policy: &Policy, mode: AllowPrefixRules) -> Policy {
    if mode == AllowPrefixRules::Honor {
        return policy.clone();
    }

    let rules = policy
        .rules()
        .iter_all()
        .flat_map(|(program, rules)| {
            rules.iter().filter_map(move |rule| {
                let is_allow_prefix = rule
                    .as_any()
                    .downcast_ref::<PrefixRule>()
                    .is_some_and(|prefix| prefix.decision == Decision::Allow);
                (!is_allow_prefix).then(|| (program.clone(), Arc::clone(rule)))
            })
        })
        .collect();

    Policy::from_parts(
        rules,
        policy.network_rules().to_vec(),
        policy.host_executables().clone(),
    )
}

fn commands_for_exec_policy(command: &[String]) -> ExecPolicyCommands {
    if let Some(commands) = parse_shell_lc_plain_commands(command)
        && !commands.is_empty()
    {
        return ExecPolicyCommands {
            commands,
            used_complex_parsing: false,
            command_origin: ExecPolicyCommandOrigin::Generic,
        };
    }

    #[cfg(windows)]
    {
        if let Some(commands) =
            codex_shell_command::powershell::parse_powershell_command_into_plain_commands(command)
            && !commands.is_empty()
        {
            return ExecPolicyCommands {
                commands,
                used_complex_parsing: false,
                command_origin: ExecPolicyCommandOrigin::PowerShell,
            };
        }
    }

    if let Some(single_command) = parse_shell_lc_single_command_prefix(command) {
        return ExecPolicyCommands {
            commands: vec![single_command],
            used_complex_parsing: true,
            command_origin: ExecPolicyCommandOrigin::Generic,
        };
    }

    ExecPolicyCommands {
        commands: vec![command.to_vec()],
        used_complex_parsing: false,
        command_origin: ExecPolicyCommandOrigin::Generic,
    }
}

fn is_policy_match(rule_match: &RuleMatch) -> bool {
    matches!(rule_match, RuleMatch::PrefixRuleMatch { .. })
}

fn prompt_is_rejected_by_policy(
    approval_policy: ApprovalPolicy,
    prompt_is_rule: bool,
) -> Option<&'static str> {
    match approval_policy {
        ApprovalPolicy::Never => Some(PROMPT_CONFLICT_REASON),
        ApprovalPolicy::OnRequest | ApprovalPolicy::UnlessTrusted => None,
        ApprovalPolicy::Granular {
            sandbox_approval,
            rules,
        } => {
            if prompt_is_rule {
                (!rules).then_some(REJECT_RULES_APPROVAL_REASON)
            } else {
                (!sandbox_approval).then_some(REJECT_SANDBOX_APPROVAL_REASON)
            }
        }
    }
}

fn dangerous_command_match_for_origin(
    command: &[String],
    command_origin: ExecPolicyCommandOrigin,
) -> Option<DangerousCommandMatch> {
    match command_origin {
        ExecPolicyCommandOrigin::Generic => dangerous_command_match(command),
        #[cfg(windows)]
        ExecPolicyCommandOrigin::PowerShell => {
            codex_shell_command::is_dangerous_command::dangerous_powershell_words_match(command)
        }
    }
}

fn dangerous_command_match_for_heuristics(
    evaluation: &Evaluation,
    decision: Decision,
    command_origin: ExecPolicyCommandOrigin,
) -> Option<DangerousCommandMatch> {
    evaluation
        .matched_rules
        .iter()
        .find_map(|rule_match| match rule_match {
            RuleMatch::HeuristicsRuleMatch {
                command,
                decision: matched_decision,
            } if *matched_decision == decision => {
                dangerous_command_match_for_origin(command, command_origin)
            }
            _ => None,
        })
}

fn render_decision_for_unmatched_command(
    command: &[String],
    context: UnmatchedCommandContext<'_>,
) -> Decision {
    let dangerous_command_match =
        dangerous_command_match_for_origin(command, context.command_origin);
    let file_system_kind = context.permission_profile.file_system_kind();
    let is_known_safe = match context.command_origin {
        ExecPolicyCommandOrigin::Generic => is_known_safe_command(command),
        #[cfg(windows)]
        ExecPolicyCommandOrigin::PowerShell => {
            codex_shell_command::is_safe_command::is_safe_powershell_words(command)
        }
    };

    let windows_managed_fs_restrictions_without_sandbox_backend = cfg!(windows)
        && context.windows_sandbox_level == WindowsSandboxLevel::Disabled
        && profile_has_managed_filesystem_restrictions(context.permission_profile);

    if is_known_safe
        && !context.used_complex_parsing
        && (context.approval_policy == ApprovalPolicy::UnlessTrusted
            || windows_managed_fs_restrictions_without_sandbox_backend)
    {
        return Decision::Allow;
    }

    if dangerous_command_match.is_some() || windows_managed_fs_restrictions_without_sandbox_backend
    {
        return match context.approval_policy {
            ApprovalPolicy::Never => Decision::Forbidden,
            ApprovalPolicy::OnRequest
            | ApprovalPolicy::UnlessTrusted
            | ApprovalPolicy::Granular { .. } => Decision::Prompt,
        };
    }

    match context.approval_policy {
        ApprovalPolicy::Never => Decision::Allow,
        ApprovalPolicy::UnlessTrusted => Decision::Prompt,
        ApprovalPolicy::OnRequest | ApprovalPolicy::Granular { .. } => match file_system_kind {
            FileSystemSandboxKind::Unrestricted | FileSystemSandboxKind::ExternalSandbox => {
                Decision::Allow
            }
            FileSystemSandboxKind::Restricted => {
                if context.sandbox_permissions.requests_sandbox_override() {
                    Decision::Prompt
                } else {
                    Decision::Allow
                }
            }
        },
    }
}

fn profile_has_managed_filesystem_restrictions(permission_profile: &PermissionProfile) -> bool {
    matches!(
        permission_profile,
        PermissionProfile::Managed {
            file_system: ManagedFileSystemKind::Restricted,
            has_full_disk_write_access: false,
        }
    )
}

fn try_derive_execpolicy_amendment_for_prompt_rules(
    matched_rules: &[RuleMatch],
) -> Option<ExecPolicyAmendment> {
    if matched_rules
        .iter()
        .any(|rule_match| is_policy_match(rule_match) && rule_match.decision() == Decision::Prompt)
    {
        return None;
    }

    matched_rules
        .iter()
        .find_map(|rule_match| match rule_match {
            RuleMatch::HeuristicsRuleMatch {
                command,
                decision: Decision::Prompt,
            } => Some(ExecPolicyAmendment::from(command.clone())),
            _ => None,
        })
}

fn try_derive_execpolicy_amendment_for_allow_rules(
    matched_rules: &[RuleMatch],
) -> Option<ExecPolicyAmendment> {
    if matched_rules.iter().any(is_policy_match) {
        return None;
    }

    matched_rules
        .iter()
        .find_map(|rule_match| match rule_match {
            RuleMatch::HeuristicsRuleMatch {
                command,
                decision: Decision::Allow,
            } => Some(ExecPolicyAmendment::from(command.clone())),
            _ => None,
        })
}

fn derive_requested_execpolicy_amendment_from_prefix_rule(
    prefix_rule: Option<&Vec<String>>,
    matched_rules: &[RuleMatch],
    policy: &Policy,
    commands: &[Vec<String>],
    fallback: &impl Fn(&[String]) -> Decision,
    match_options: &MatchOptions,
) -> Option<ExecPolicyAmendment> {
    let prefix_rule = prefix_rule?;
    if prefix_rule.is_empty() {
        return None;
    }
    if BANNED_PREFIX_SUGGESTIONS.iter().any(|banned| {
        prefix_rule.len() == banned.len()
            && prefix_rule
                .iter()
                .map(String::as_str)
                .eq(banned.iter().copied())
    }) {
        return None;
    }
    if matched_rules.iter().any(is_policy_match) {
        return None;
    }

    let amendment = ExecPolicyAmendment::from(prefix_rule.clone());
    prefix_rule_would_approve_all_commands(
        policy,
        &amendment.command,
        commands,
        fallback,
        match_options,
    )
    .then_some(amendment)
}

fn prefix_rule_would_approve_all_commands(
    policy: &Policy,
    prefix_rule: &[String],
    commands: &[Vec<String>],
    fallback: &impl Fn(&[String]) -> Decision,
    match_options: &MatchOptions,
) -> bool {
    let mut policy_with_prefix_rule = policy.clone();
    if policy_with_prefix_rule
        .add_prefix_rule(prefix_rule, Decision::Allow)
        .is_err()
    {
        return false;
    }

    commands.iter().all(|command| {
        policy_with_prefix_rule
            .check_with_options(command, fallback, match_options)
            .decision
            == Decision::Allow
    })
}

fn derive_prompt_reason(command_args: &[String], evaluation: &Evaluation) -> Option<String> {
    let command = render_shlex_command(command_args);
    let most_specific_prompt = evaluation
        .matched_rules
        .iter()
        .filter_map(|rule_match| match rule_match {
            RuleMatch::PrefixRuleMatch {
                matched_prefix,
                decision: Decision::Prompt,
                justification,
                ..
            } => Some((matched_prefix.len(), justification.as_deref())),
            _ => None,
        })
        .max_by_key(|(matched_prefix_len, _)| *matched_prefix_len);

    match most_specific_prompt {
        Some((_, Some(justification))) => {
            Some(format!("`{command}` requires approval: {justification}"))
        }
        Some((_, None)) => Some(format!("`{command}` requires approval by policy")),
        None => None,
    }
}

fn render_shlex_command(args: &[String]) -> String {
    shlex_try_join(args.iter().map(String::as_str)).unwrap_or_else(|_| args.join(" "))
}

fn derive_forbidden_reason(
    command_args: &[String],
    evaluation: &Evaluation,
    dangerous_command_match: Option<DangerousCommandMatch>,
) -> String {
    let command = render_shlex_command(command_args);
    let most_specific_forbidden = evaluation
        .matched_rules
        .iter()
        .filter_map(|rule_match| match rule_match {
            RuleMatch::PrefixRuleMatch {
                matched_prefix,
                decision: Decision::Forbidden,
                justification,
                ..
            } => Some((matched_prefix, justification.as_deref())),
            _ => None,
        })
        .max_by_key(|(matched_prefix, _)| matched_prefix.len());

    match most_specific_forbidden {
        Some((_, Some(justification))) => format!("`{command}` rejected: {justification}"),
        Some((matched_prefix, None)) => {
            let prefix = render_shlex_command(matched_prefix);
            format!("`{command}` rejected: policy forbids commands starting with `{prefix}`")
        }
        None => {
            if let Some(dangerous_command_match) = dangerous_command_match {
                let reason = dangerous_command_rejection_reason(dangerous_command_match);
                format!("`{command}` rejected: {reason}")
            } else {
                format!("`{command}` rejected: blocked by policy")
            }
        }
    }
}

fn derive_rejected_prompt_reason(
    fallback_reason: &str,
    dangerous_command_match: Option<DangerousCommandMatch>,
) -> String {
    match dangerous_command_match {
        Some(dangerous_command_match @ DangerousCommandMatch::ForcedRm) => {
            dangerous_command_rejection_reason(dangerous_command_match).to_string()
        }
        Some(DangerousCommandMatch::Other) | None => fallback_reason.to_string(),
    }
}

fn dangerous_command_rejection_reason(
    dangerous_command_match: DangerousCommandMatch,
) -> &'static str {
    match dangerous_command_match {
        DangerousCommandMatch::ForcedRm => {
            "rm -f style commands are not permitted. Use a safer approach"
        }
        DangerousCommandMatch::Other => "blocked by policy",
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use codex_execpolicy::PolicyParser;

    fn policy(source: &str) -> Policy {
        let mut parser = PolicyParser::new();
        parser.parse("test.rules", source).expect("valid policy");
        parser.build()
    }

    fn base_input(command: Vec<&str>) -> RuntimePolicyInput {
        RuntimePolicyInput {
            command: command.into_iter().map(str::to_string).collect(),
            approval_policy: ApprovalPolicy::OnRequest,
            permission_profile: PermissionProfile::Managed {
                file_system: ManagedFileSystemKind::Restricted,
                has_full_disk_write_access: false,
            },
            windows_sandbox_level: WindowsSandboxLevel::Disabled,
            sandbox_permissions: SandboxPermissions::UseDefault,
            prefix_rule: None,
            allow_prefix_rules: AllowPrefixRules::Honor,
        }
    }

    #[test]
    fn explicit_allow_bypasses_sandbox() {
        let result = evaluate_runtime_policy(
            &policy(r#"prefix_rule(pattern=["git", "status"], decision="allow")"#),
            &base_input(vec!["git", "status"]),
        );
        assert_eq!(
            result.requirement,
            ExecApprovalRequirement::Skip {
                bypass_sandbox: true,
                proposed_execpolicy_amendment: None,
            }
        );
    }

    #[test]
    fn compound_shell_uses_strictest_segment() {
        let result = evaluate_runtime_policy(
            &policy(
                r#"
prefix_rule(pattern=["git", "status"], decision="allow")
prefix_rule(pattern=["rm"], decision="forbidden")
"#,
            ),
            &base_input(vec!["bash", "-c", "git status && rm -rf build"]),
        );
        assert!(matches!(
            result.requirement,
            ExecApprovalRequirement::Forbidden { .. }
        ));
        assert_eq!(result.lowered_commands.len(), 2);
    }

    #[test]
    fn never_rejects_rule_prompt() {
        let mut input = base_input(vec!["git", "push"]);
        input.approval_policy = ApprovalPolicy::Never;
        let result = evaluate_runtime_policy(
            &policy(r#"prefix_rule(pattern=["git", "push"], decision="prompt")"#),
            &input,
        );
        assert_eq!(
            result.requirement,
            ExecApprovalRequirement::Forbidden {
                reason: PROMPT_CONFLICT_REASON.to_string(),
            }
        );
    }

    #[test]
    fn execpolicy_amendment_uses_the_upstream_transparent_wire_shape() {
        let amendment = ExecPolicyAmendment::from(vec!["git".to_string(), "status".to_string()]);
        assert_eq!(
            serde_json::to_value(amendment).expect("amendment serializes"),
            serde_json::json!(["git", "status"]),
        );
    }
}
