/**
 * JSON protocol types for the pinned Codex execpolicy sidecar.
 *
 * These spellings mirror the Rust serde contract. They are deliberately not
 * simplified into a DSH-specific policy vocabulary: callers can exercise the
 * same component semantics as the pinned Codex implementation.
 */

export const EXECPOLICY_PROTOCOL_VERSION = 3 as const;
export const PINNED_CODEX_COMMIT =
  "086396f7f60347b74c82784d5dfaf4fb2d3bda12" as const;
export const PINNED_EXECPOLICY_TREE =
  "e06e0b4ad718af8a74055a33b1536b25fb9d4a87" as const;
export const PINNED_SHELL_COMMAND_TREE =
  "3f5da93a61be77795d3fc5bb3d6e44a9dec1d106" as const;
export const PINNED_CONFIG_TREE =
  "d3f4925b575b128dd1f0f74a5babcdb1efce0219" as const;
export const PINNED_EXEC_SERVER_TREE =
  "51751785508060e633f0e0472fa0d2572787b36a" as const;
export const PINNED_UTILS_CLI_TREE =
  "5d9c72fcadefb9a1c95e38c4726d25c5b8d195ee" as const;
export const PINNED_UTILS_HOME_DIR_TREE =
  "c2d10a4f4844c2a517584ee623a0b8aa4ceb44f5" as const;
export const PINNED_CARGO_LOCK_BLOB =
  "a8c2addc02055be48c345b65760a7a1b96cfbf28" as const;
export const PINNED_CORE_EXEC_POLICY_BLOB =
  "5de05937533a2653a700b4ec40cda09578761f50" as const;
export const PINNED_CORE_EXEC_POLICY_DIR_TREE =
  "b313a3ba1b113f08e3c1686272162910dad76540" as const;

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue =
  JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };
export type TomlJsonValue =
  | string
  | number
  | boolean
  | TomlJsonValue[]
  | { [key: string]: TomlJsonValue };

export type Decision = "allow" | "prompt" | "forbidden";

export interface PrefixRuleMatchBody {
  matchedPrefix: string[];
  decision: Decision;
  resolvedProgram?: string;
  justification?: string;
}

export interface HeuristicsRuleMatchBody {
  command: string[];
  decision: Decision;
}

export type RuleMatch =
  | { prefixRuleMatch: PrefixRuleMatchBody }
  | { heuristicsRuleMatch: HeuristicsRuleMatchBody };

export interface Evaluation {
  decision: Decision;
  matchedRules: RuleMatch[];
}

export interface HelloOutput {
  protocolVersion: number;
  engineVersion: string;
  codexCommit: string;
  execpolicyTree: string;
  shellCommandTree: string;
  configTree: string;
  execServerTree: string;
  utilsCliTree: string;
  utilsHomeDirTree: string;
  cargoLockBlob: string;
  coreExecPolicyBlob: string;
  coreExecPolicyDirTree: string;
  os: string;
  arch: string;
}

export interface DiagnosticsOutput {
  hello: HelloOutput;
  loadedSources: number;
  allowedPrefixes: string[][];
  networkRules: number;
  hostExecutables: number;
}

export interface RuleSource {
  identifier: string;
  content: string;
}

export interface LoadParams {
  sources?: RuleSource[];
  paths?: string[];
}

export interface LoadOutput {
  loadedSources: number;
  allowedPrefixes: string[][];
}

/** Exact exec-policy-relevant projection of pinned Codex ConfigLayerSource. */
export type ConfigLayerSource =
  | { kind: "packaged_defaults"; file: string }
  | { kind: "mdm"; domain: string; key: string }
  | { kind: "system"; file: string }
  | { kind: "enterprise_managed"; id: string; name: string }
  | { kind: "user"; file: string; profile?: string }
  | { kind: "project"; dotCodexFolder: string }
  | { kind: "session_flags" }
  | { kind: "legacy_managed_config_toml_from_file"; file: string }
  | { kind: "legacy_managed_config_toml_from_mdm" };

export interface ConfigLayerInput {
  source: ConfigLayerSource;
  /** Materialized TOML table for this exact layer. */
  config?: { [key: string]: TomlJsonValue };
  disabledReason?: string;
}

export type RequirementSourceInput =
  | { kind: "unknown" }
  | { kind: "mdm_managed_preferences"; domain: string; key: string }
  | { kind: "enterprise_managed"; id: string; name: string }
  | { kind: "system_requirements_toml"; file: string }
  | { kind: "legacy_managed_config_toml_from_file"; file: string }
  | { kind: "legacy_managed_config_toml_from_mdm" };

export type RequirementSource =
  RequirementSourceInput | { kind: "composite"; sources: RequirementSource[] };

export interface RequirementsLayerInput {
  source: RequirementSourceInput;
  /** Raw pinned-Codex requirements.toml layer. */
  toml: string;
  baseDir?: string;
}

export interface LoadConfigStackParams {
  /** Pinned Codex order: lowest precedence first, highest precedence last. */
  layers: ConfigLayerInput[];
  /** Pinned Codex requirements order: lowest precedence first. */
  requirementsLayers?: RequirementsLayerInput[];
  ignoreUserAndProjectExecPolicyRules?: boolean;
}

export type HostCodexHomeInput =
  { mode: "discover" } | { mode: "explicit"; path: string };

export type HostCwdInput =
  { mode: "absolute"; path: string } | { mode: "current_process" };

export interface CloudConfigFragment {
  id: string;
  name: string;
  contents: string;
}

/** Pinned Codex wire shape; upstream intentionally uses snake_case here. */
export interface CloudConfigBundle {
  config_toml: {
    enterprise_managed: CloudConfigFragment[];
  };
  requirements_toml: {
    enterprise_managed: CloudConfigFragment[];
  };
}

export type HostCloudInput =
  | { mode: "not_requested" }
  | { mode: "snapshot"; bundle: CloudConfigBundle | null };

export interface LoadHostConfigStackParams {
  schemaVersion: 1;
  codexHome: HostCodexHomeInput;
  /** null is reserved for thread-agnostic config queries. */
  cwd: HostCwdInput | null;
  /** Raw pinned-Codex `key=value` CLI strings, parsed by codex-utils-cli. */
  cliOverrides?: string[];
  strictConfig?: boolean;
  profileV2?: string;
  ignoreUserConfig?: boolean;
  ignoreUserAndProjectExecPolicyRules?: boolean;
  /** Snapshot production is owned by a future auth/cloud-config component. */
  cloud: HostCloudInput;
  threadConfig: { mode: "none" };
}

export interface PolicyLoadWarningLocation {
  path: string;
  startLine: number;
  startColumn: number;
  endLine: number;
  endColumn: number;
}

export interface PolicyLoadWarning {
  kind: "parse_policy";
  path: string;
  message: string;
  location?: PolicyLoadWarningLocation;
}

export interface ConfigStackMetadata {
  allLayersLowToHigh: Array<{
    source: ConfigLayerSource;
    disabledReason: string | null;
  }>;
  enabledLayersLowToHigh: ConfigLayerSource[];
  effectiveConfig: { [key: string]: TomlJsonValue };
  origins: Record<string, ConfigLayerSource>;
  ignoreUserAndProjectExecPolicyRules: boolean;
  startupWarnings: string[] | null;
}

export interface DiscoveredRuleFiles {
  source: ConfigLayerSource;
  files: string[];
  enabled: boolean;
  ignoredByExecPolicy: boolean;
}

export interface RequirementsMetadata {
  /** null when the public Codex host loader has already composed the sources. */
  inputSourcesLowToHigh: RequirementSourceInput[] | null;
  execPolicySource: RequirementSource | null;
  rawRulesPresent: boolean;
  normalizedRulesPresent: boolean;
}

export interface LoadConfigStackOutput extends LoadOutput {
  loadedFiles: string[];
  warning: PolicyLoadWarning | null;
  stack: ConfigStackMetadata;
  discoveredRuleFiles: DiscoveredRuleFiles[];
  requirements: RequirementsMetadata;
}

export interface HostConfigDiscovery {
  mode: "host";
  codexHomeMode: "discover" | "explicit";
  resolvedCodexHome: string;
  cwd: string | null;
  profileV2: string | null;
  cloudMode: "not_requested" | "snapshot";
  threadConfigMode: "none";
  strictConfig: boolean;
  ignoreUserConfig: boolean;
  ignoreUserAndProjectExecPolicyRules: boolean;
  defaultPolicyPath: string;
  startupMigration:
    | {
        mode: "not_requested";
        attempted: false;
        completed: false;
        warning: null;
      }
    | {
        mode: "canonical_startup";
        attempted: true;
        completed: boolean;
        warning: string | null;
      }
    | {
        mode: "canonical_startup";
        attempted: false;
        completed: false;
        skippedReason: "user_and_project_exec_policy_rules_ignored";
        warning: null;
      };
}

export interface LoadHostConfigStackOutput extends LoadConfigStackOutput {
  discovery: HostConfigDiscovery;
}

export interface CheckTokensParams {
  commands: string[][];
  fallbackDecision?: Decision;
  resolveHostExecutables?: boolean;
}

export interface CheckTokensOutput {
  decision?: Decision;
  matchedRules: RuleMatch[];
}

export type ApprovalPolicy =
  | { kind: "unless_trusted" }
  | { kind: "on_request" }
  | { kind: "granular"; sandboxApproval: boolean; rules: boolean }
  | { kind: "never" };

export type FileSystemSandboxKind = "restricted" | "unrestricted";

export type PermissionProfile =
  | {
      kind: "managed";
      fileSystem: FileSystemSandboxKind;
      hasFullDiskWriteAccess: boolean;
    }
  | { kind: "disabled" }
  | { kind: "external" };

export type WindowsSandboxLevel = "disabled" | "restricted_token" | "elevated";
export type SandboxPermissions =
  "use_default" | "require_escalated" | "with_additional_permissions";
export type AllowPrefixRules = "honor" | "ignore_for_cyber_model";

export interface RuntimePolicyInput {
  command: string[];
  approvalPolicy: ApprovalPolicy;
  permissionProfile: PermissionProfile;
  windowsSandboxLevel: WindowsSandboxLevel;
  sandboxPermissions: SandboxPermissions;
  prefixRule?: string[];
  allowPrefixRules?: AllowPrefixRules;
}

/** Upstream ExecPolicyAmendment is serde-transparent over its argv tokens. */
export type ExecPolicyAmendment = string[];

export type ExecApprovalRequirement =
  | {
      kind: "skip";
      bypassSandbox: boolean;
      proposedExecpolicyAmendment?: ExecPolicyAmendment;
    }
  | {
      kind: "needs_approval";
      reason?: string;
      proposedExecpolicyAmendment?: ExecPolicyAmendment;
    }
  | {
      kind: "forbidden";
      reason: string;
    };

export type ExecPolicyCommandOrigin = "generic" | "power_shell";

export interface RuntimePolicyOutput {
  requirement: ExecApprovalRequirement;
  evaluation: Evaluation;
  loweredCommands: string[][];
  usedComplexParsing: boolean;
  commandOrigin: ExecPolicyCommandOrigin;
}

export interface NetworkDomainsOutput {
  allowed: string[];
  denied: string[];
}

export interface AppendPrefixParams {
  prefix: string[];
}

export interface AppendPrefixOutput {
  policyPath: string;
  changedInMemory: boolean;
}

export interface AppendNetworkParams {
  host: string;
  protocol:
    | "http"
    | "https"
    | "https_connect"
    | "http-connect"
    | "socks5_tcp"
    | "socks5_udp";
  decision: Decision;
  justification?: string;
}

export interface AppendNetworkOutput {
  updated: true;
  policyPath: string;
}

export interface ProtocolErrorBody {
  code: string;
  message: string;
  data?: JsonValue;
}
