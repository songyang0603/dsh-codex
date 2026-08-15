# Independent Codex runtime-policy oracle

This harness evaluates the dsh-codex exec-policy adapter against the actual
crate-private runtime policy implementation in a fixed OpenAI Codex source
snapshot:

- Codex commit: `086396f7f60347b74c82784d5dfaf4fb2d3bda12`
- `codex-rs/execpolicy` tree: `e06e0b4ad718af8a74055a33b1536b25fb9d4a87`
- `codex-rs/shell-command` tree: `3f5da93a61be77795d3fc5bb3d6e44a9dec1d106`
- `codex-rs/core/src/exec_policy.rs` blob:
  `5de05937533a2653a700b4ec40cda09578761f50`

It does not import, execute, or derive expected values from the dsh-codex
adapter. The oracle calls
`ExecPolicyManager::create_exec_approval_requirement_for_command` inside
`codex-core` itself. The candidate runner separately calls the real protocol-v3
sidecar RPC `check_exec_approval_requirement`, and `compare.mjs` compares only
the two canonical returned requirements.

## Trust boundary

`run-oracle.sh` verifies all four Git objects before doing any work. It makes a
temporary shared clone at the exact commit, applies `instrumentation.patch`,
injects `instrumentation/exec_policy_runtime_oracle.rs`, and runs one explicitly
ignored `codex-core` unit test. A shared clone reads the supplied repository's
object database but does not alter its checkout, index, configuration, or
worktree registry. The runner snapshots the supplied checkout's `HEAD` and
exact porcelain status, checks them again from its `EXIT` trap, and fails with
status 74 if either changed. The temporary clone is deleted unless
`--keep-temp` is used.

The instrumentation is a `#[cfg(test)]` child of the upstream `exec_policy`
module. That placement is necessary because the production manager and request
types are intentionally crate-private. The instrumentation only:

1. maps the documented corpus wire types to upstream Codex types;
2. calls the upstream runtime method;
3. canonicalizes its returned `ExecApprovalRequirement` to JSONL.

Only the returned requirement is compared. Lowered commands, parse mode,
command origin, policy evaluation diagnostics, and warning events are not
returned by that upstream method, so this harness makes no parity claim for
those fields.

## Corpus and schemas

`corpus.jsonl` contains 68 independent cases. Each line follows
`corpus.schema.json`. The oracle output follows `oracle-output.schema.json`. In
particular, `proposedExecpolicyAmendment` is the upstream transparent token
array, not an adapter-specific object.

Platform placeholders such as `$HOST_CARGO` are expanded independently by the
upstream instrumentation and candidate runner using the platform each process
reports. Cases marked `requiresWindowsPowerShell` are never skipped. They run
through the generic path on non-Windows systems; on Windows, both runners first
require `powershell.exe` to start successfully and fail closed otherwise. They
do not require the separately installed `pwsh` executable.

## Coverage map

The map below was derived by reviewing these files at the pinned commit:

- `codex-rs/core/src/exec_policy_tests.rs`
- `codex-rs/core/src/exec_policy_windows_tests.rs`
- `codex-rs/core/src/exec_policy/model_policy_tests.rs`
- `codex-rs/core/src/exec_policy.rs`
- `codex-rs/core/src/exec_policy/model_policy.rs`

Case names refer to `corpus.jsonl`. Several upstream tests share one runtime
branch; the map groups them only when their observable control flow is the
same.

### Command lowering, rules, sandboxing, and reasons

| Pinned upstream branch or test                                                                                                                                             | Differential cases                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | What is distinguished                                                                                                                                                                                      |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `evaluates_bash_lc_inner_commands`; strictest `check_multiple` aggregation                                                                                                 | `compound-shell-uses-strictest-segment`, `pipeline-policy-plus-heuristic-amendment`, `multi-segment-not-all-allowed-stays-sandboxed`, `multi-segment-all-allowed-bypasses`                                                                                                                                                                                                                                                                                                                                                | Plain `bash -lc` lowering, mixed segment decisions, and strictest-result selection                                                                                                                         |
| `commands_for_exec_policy_falls_back_for_empty_shell_script`, its whitespace twin, `empty_bash_lc_script_falls_back_to_original_command`, and its whitespace twin          | `empty-shell-falls-back-to-original`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | Empty lowering falls back to the original wrapper. Whitespace reaches the same empty-command branch and is retained as a pinned upstream unit variant rather than a duplicate differential case.           |
| `evaluates_heredoc_script_against_prefix_rules`                                                                                                                            | `allowed-heredoc`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | A simple heredoc single-command prefix can match an explicit allow rule                                                                                                                                    |
| `omits_auto_amendment_for_heredoc_fallback_prompts` and both `drops_requested_amendment_for_heredoc_fallback_prompts_*` tests                                              | `heredoc-fallback-prompt-omits-amendment`, `heredoc-requested-prefix-still-omitted`, `heredoc-nonmatching-requested-prefix-still-omitted`, `known-safe-complex-heredoc-still-prompts`                                                                                                                                                                                                                                                                                                                                     | Complex heredoc parsing disables automatic amendments; matching and non-matching requested prefixes are both rejected; the `echo` case separately locks the `is_known_safe && !used_complex_parsing` guard |
| `heredoc_with_variable_assignment_is_not_reduced_to_allowed_prefix`                                                                                                        | `complex-heredoc-does-not-bypass`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | Despite its legacy case name, this assignment heredoc takes the original-command fallback with `used_complex_parsing=false`; it does not claim the complex-parser branch                                   |
| `heredoc_redirect_without_escalation_runs_inside_sandbox` and `heredoc_redirect_with_escalation_requires_approval`                                                         | `heredoc-policy-allow-without-escalation-stays-sandboxed`, `heredoc-policy-allow-with-escalation-prompts`                                                                                                                                                                                                                                                                                                                                                                                                                 | Same redirecting heredoc under `use_default` versus `require_escalated`                                                                                                                                    |
| Explicit allow, prompt, forbidden, and strictest rule handling; `exec_approval_requirement_prefers_execpolicy_match`; `exec_approval_requirement_respects_approval_policy` | `explicit-allow-bypasses-sandbox`, `specific-prompt-rule-on-request`, `prompt-rule-rejected-by-never`, `prompt-rule-rejected-by-granular-rules`, `explicit-forbidden-rule`, `compound-shell-uses-strictest-segment`, `policy-match-suppresses-requested-prefix`, `granular-rule-prompt-allowed`                                                                                                                                                                                                                           | All three rule decisions, rule precedence over fallback/requested amendments, `Never`, and granular rule rejection                                                                                         |
| `justification_is_included_in_forbidden_exec_approval_requirement`; prompt/forbidden reason selection                                                                      | `prompt-rule-without-justification`, `most-specific-prompt-justification`, `most-specific-forbidden-justification`, `specific-prompt-rule-on-request`, `explicit-forbidden-rule`                                                                                                                                                                                                                                                                                                                                          | Default reason text, justification text, shell rendering, and most-specific matching-prefix selection                                                                                                      |
| `unmatched_*`, known-safe escalation, additional-permissions, and granular sandbox tests                                                                                   | `known-safe-unless-trusted`, `unknown-command-unless-trusted`, `restricted-escalation-on-request`, `restricted-use-default-on-request`, `restricted-additional-permissions-on-request`, `known-safe-escalation-on-request`, `disabled-profile-on-request`, `external-profile-on-request`, `managed-full-disk-write-profile`, `managed-unrestricted-profile`, `unmatched-never-relies-on-sandbox`, `granular-rejects-sandbox-escalation`, `granular-restricted-use-default-skips`, `granular-heuristic-escalation-allowed` | Known-safe versus unknown fallback, all approval modes, three sandbox-permission forms, restricted/unrestricted/external/disabled profiles, full-disk access, and granular allow/reject behavior           |
| `mixed_rule_and_sandbox_prompt_prioritizes_rule_for_rejection_decision`; `forced_rm_preserves_rule_rejection_when_granular_rules_are_disabled`                             | `mixed-rule-prompt-prioritizes-rules-over-disabled-sandbox`, `mixed-rule-danger-granular-rules-disabled`                                                                                                                                                                                                                                                                                                                                                                                                                  | A rule prompt takes precedence over a simultaneous heuristic/sandbox prompt; the two granular switches are discriminated in opposite directions                                                            |
| `other_danger_preserves_rejected_prompt_reason`; `forced_rm_rejected_prompt_reason_does_not_repeat_command`                                                                | `forced-rm-granular-rejection-special-reason`; future Windows result of `powershell-dangerous-other`                                                                                                                                                                                                                                                                                                                                                                                                                      | `ForcedRm` replaces the generic granular rejection reason, while Windows `Other` must preserve it                                                                                                          |
| `dangerous_rm_rf_*`, `forced_rm_requires_approval_or_specific_rejection_on_all_platforms`, external-sandbox danger tests                                                   | `dangerous-rm-rejected-by-never`, `dangerous-rm-prompts-on-request`, `dangerous-rm-shell-loop-prompts-original`, `external-policy-prompt-never-forbidden`, `forced-rm-granular-rejection-special-reason`                                                                                                                                                                                                                                                                                                                  | Direct and control-flow-nested forced removal, prompt versus forbid, original-wrapper amendment, and external-policy conflict                                                                              |
| `render_shlex_command` error fallback                                                                                                                                      | `nul-command-render-fallback`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | Supplemental low-level case: an embedded NUL makes shlex joining fail, while the forbidden reason remains serializable and deterministic                                                                   |

### Amendments and host executables

| Pinned upstream branch or test                                                                                                  | Differential cases                                                                                                                                                                                                                                    | What is distinguished                                                                                                                                                                                                |
| ------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `exec_approval_requirement_falls_back_to_heuristics`; single/multi-command proposed-amendment tests                             | `unknown-command-unless-trusted`, `dangerous-rm-prompts-on-request`, `multi-command-first-unmatched-amendment`, `pipeline-policy-plus-heuristic-amendment`                                                                                            | Prompt amendments come from the first heuristic prompt, including when other commands have policy matches                                                                                                            |
| `proposed_execpolicy_amendment_is_present_when_heuristics_allow`; suppression when policy allow/prompt matches                  | `known-safe-unless-trusted`, `restricted-use-default-on-request`, `explicit-allow-bypasses-sandbox`, `policy-match-suppresses-requested-prefix`                                                                                                       | Allow-path amendments are emitted only for heuristic matches and suppressed for explicit policy matches                                                                                                              |
| `request_rule_uses_prefix_rule`; prefix does not approve all commands; missing/empty/exact-banned/non-exact/policy-match guards | `requested-prefix-amendment`, `requested-prefix-does-not-cover-all-segments`, `empty-requested-prefix-falls-back-to-auto`, `exact-banned-prefix-falls-back-to-auto`, `nonexact-banned-prefix-is-reusable`, `policy-match-suppresses-requested-prefix` | Requested amendment acceptance and every distinct guard in `derive_requested_execpolicy_amendment_from_prefix_rule`                                                                                                  |
| Banned Windows/Python/shell/PowerShell prefix variants                                                                          | `exact-banned-prefix-falls-back-to-auto`, `nonexact-banned-prefix-is-reusable`                                                                                                                                                                        | The exact-entry versus longer-prefix branch is differential. Exhaustive string membership remains covered by the pinned table-driven unit tests; duplicating every list item would not reach another runtime branch. |
| `multi_segment_shell_requires_policy_allow_for_every_segment_to_bypass_sandbox` and its all-allowed twin                        | `multi-segment-not-all-allowed-stays-sandboxed`, `multi-segment-all-allowed-bypasses`                                                                                                                                                                 | `bypass_sandbox` is true only when every lowered segment has an explicit allow match                                                                                                                                 |
| Absolute host executable allow/disallow and requested basename prefix tests                                                     | `absolute-host-executable-policy-allow`, `absolute-disallowed-host-path-does-not-match`, `absolute-command-requested-basename-prefix`                                                                                                                 | Allowed resolved path, rejected alternate path, and basename requested-prefix resolution                                                                                                                             |

### Cyber/model policy

| Pinned upstream test                                                              | Differential cases                                                                                                                                | What is distinguished                                                                                                                    |
| --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `cyber_policy_filters_allow_prefixes_but_preserves_restrictive_and_network_rules` | `cyber-mode-ignores-allow-prefix`, `cyber-restrictive-prompt-preserved`, `cyber-forbidden-rule-preserved`, `cyber-resolved-host-prompt-preserved` | Broad allow prefixes are removed, prompt/forbidden rules survive, and a resolved `host_executable` still reaches a preserved prompt rule |
| `cyber_policy_requires_approval_for_broad_wrapped_and_resolved_prefixes`          | `cyber-mode-ignores-allow-prefix`, `cyber-wrapped-broad-allow-filtered`, `cyber-resolved-broad-allow-filtered`                                    | Plain, shell-wrapped, and resolved absolute commands do not inherit a saved broad allow or requested amendment                           |
| `cyber_policy_keeps_heuristically_safe_commands_inside_the_sandbox`               | `cyber-safe-command-stays-sandboxed` plus `explicit-allow-bypasses-sandbox` as the standard-mode control                                          | Safe fallback remains sandboxed after broad policy allows are filtered                                                                   |

The structural equality of `network_rules()` in the first model-policy test is
not observable in `ExecApprovalRequirement`; it is therefore not claimed by
this differential comparator. The pinned upstream unit test is the source
evidence for that structural property.

### Windows branch fixtures

The bundled evidence in `STATUS.md` was generated on macOS. Consequently, the
following cases were executed through the generic non-Windows path locally;
their presence in the corpus is not Windows branch evidence.

| Pinned Windows branch or test                                                                                                             | Cross-platform corpus cases                                                                                                         | Required Windows result path                                                                                                                     |
| ----------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `evaluates_powershell_inner_commands_against_prompt_rules` and its allow twin; `commands_for_exec_policy_parses_powershell_shell_wrapper` | `powershell-inner-prompt-rule`, `powershell-inner-allow-rule`                                                                       | Parse the `powershell.exe -Command` body and match the inner `echo` command                                                                      |
| `unmatched_safe_powershell_words_are_allowed`                                                                                             | `powershell-unmatched-safe-words`                                                                                                   | Use `ExecPolicyCommandOrigin::PowerShell` and the PowerShell read-only safelist                                                                  |
| Read-only Windows backend disabled versus enabled; full-disk managed profile exclusion                                                    | `windows-read-only-backend-disabled`, `windows-read-only-restricted-token`, `windows-full-disk-managed-disabled-backend-on-request` | Distinguish the conservative no-backend branch from `RestrictedToken`, and prove full-disk write access does not trigger the conservative branch |
| `unmatched_dangerous_powershell_inner_commands_require_approval`; `DangerousCommandMatch::Other` rejected-prompt behavior                 | `powershell-dangerous-other`                                                                                                        | Lower `Remove-Item`, classify it as `Other`, then preserve the granular sandbox-rejection reason                                                 |

`RestrictedToken` represents the enabled-backend branch; `Elevated` follows the
same non-`Disabled` condition in this pinned implementation. A real Windows
oracle/candidate run is still required before claiming either branch. The
upstream cross-platform `verify_approval_requirement_for_unsafe_powershell_command`
test depends on `pwsh` and silently returns when it is absent; `pwsh` was absent
on the recorded macOS host, so that test is not cited as executed evidence.
The differential Windows fixtures instead use `powershell.exe` and fail closed
when it is unavailable on Windows.

## Deliberate routing and limits

- Policy-file discovery, stable sorting, requirements overlays, malformed
  ordinary-rule fallback, trust, and ignore-layer semantics are exercised by
  `../config-stack/` and `../host-config/`; constructing preloaded policy text
  here would not test those branches.
- Amendment append/reload and canonical persistence are exercised by
  `../persistence/`; this runtime RPC does not persist amendments.
- Parent/child manager reuse, source-range diagnostic formatting, load warnings,
  and policy-file I/O errors are not returned by the runtime requirement and
  are outside this comparator's claim.
- The wire can represent restricted/unrestricted/full-disk profile summaries,
  but not arbitrary managed filesystem entry lists. The exact project-root and
  unresolvable-write profile constructors in pinned unit tests therefore cannot
  be reconstructed here; the shared `profile_has_managed_filesystem_restrictions`
  decision is covered by restricted/full-disk cases.
- Windows-specific results remain pending until this same corpus is run on a
  Windows host. No local macOS match is relabeled as Windows evidence.

## Run the upstream oracle

Rust 1.95 is required by the pinned Codex workspace. The first run compiles the
full `codex-core --lib` test target and may need network access for lockfile
dependencies. `CODEX_ORACLE_TARGET_DIR` keeps Cargo artifacts outside both
repositories. Reuse one target directory; repeated full targets are large.

```sh
CODEX_ORACLE_TARGET_DIR=/tmp/dsh-codex-codex-core-target \
  bash conformance/upstream-runtime/run-oracle.sh \
  --codex-checkout /absolute/path/to/codex \
  --output /tmp/codex-runtime-oracle.jsonl
```

`CARGO_BIN` can select a non-default Cargo executable. After dependencies have
been fetched, `CARGO_NET_OFFLINE=true` makes subsequent runs explicitly
offline.

## Run the candidate and compare

Build the sidecar from the current dsh-codex source, then feed it the exact same
corpus:

```sh
cargo build --locked --package dsh-codex-execpolicy-engine

node conformance/upstream-runtime/run-candidate.mjs \
  --engine target/debug/dsh-codex-execpolicy-engine \
  --corpus conformance/upstream-runtime/corpus.jsonl \
  --output /tmp/dsh-codex-runtime-candidate.jsonl

node conformance/upstream-runtime/compare.mjs \
  /tmp/codex-runtime-oracle.jsonl \
  /tmp/dsh-codex-runtime-candidate.jsonl
```

The candidate runner verifies the complete protocol-v3 `hello` source identity
before loading any policy. The comparator fails closed on duplicate, missing,
or extra cases; wrong fixed-source identity; different target OS/architecture;
malformed amendments; or any requirement mismatch. A successful message
reports the exact matched count.

## What is and is not proven

A passing run proves parity of the upstream runtime method's observable
approval requirement for this pinned snapshot, platform, and corpus. It is not
a universal proof over every command or platform. New semantic branches must
add corpus cases, and Windows-specific behavior requires a Windows oracle run.
The exact executed state for the current repository is recorded in `STATUS.md`;
never infer a pass merely from the presence of scripts or fixtures.
