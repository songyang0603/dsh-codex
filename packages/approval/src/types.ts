/**
 * Public approval wire and runtime contracts.
 *
 * `CommandExecutionRequestApprovalParams` and
 * `CommandExecutionApprovalDecision` mirror the pinned Codex app-server v2
 * command-execution approval wire. Cordis correlation, cancellation, cache,
 * and persistence coordination live in separate envelopes so the wire payload
 * is not silently extended with DSH-only fields.
 */

export const PINNED_CODEX_COMMIT =
  "086396f7f60347b74c82784d5dfaf4fb2d3bda12" as const;
export const APPROVAL_PROTOCOL_VERSION = 1 as const;
export const PINNED_CODEX_REPOSITORY =
  "https://github.com/openai/codex" as const;
export const PINNED_APP_SERVER_PROTOCOL_PACKAGE =
  "codex-app-server-protocol" as const;
export const PINNED_APP_SERVER_PROTOCOL_VERSION = "0.0.0" as const;
export const PINNED_APP_SERVER_PROTOCOL_TREE =
  "1120727af584eecf578cdd6a5c63d3a9146167c8" as const;
export const PINNED_APP_SERVER_PROTOCOL_V2_TREE =
  "079e6cf5d2adbe98f3d3fd6fa3fbc2acb9b0b252" as const;
export const PINNED_COMMAND_APPROVAL_ITEM_BLOB =
  "dcfe928508e8eef1af3b3f05c739860e75c0d607" as const;
export const PINNED_COMMAND_APPROVAL_PERMISSIONS_BLOB =
  "9360934aa4c92e907a905926b490463cdd66a163" as const;
export const PINNED_CODEX_CARGO_LOCK_BLOB =
  "a8c2addc02055be48c345b65760a7a1b96cfbf28" as const;
export const APPROVAL_PARSE_REQUEST_METHOD =
  "parse_command_execution_request_approval" as const;
export const APPROVAL_PARSE_RESPONSE_METHOD =
  "parse_command_execution_request_approval_response" as const;

/**
 * A JSON integer after lossless pinned-Rust parsing. Values inside
 * JavaScript's exact range remain numbers; wider accepted `i64`/`usize`
 * values are represented as bigint. This type is an in-process semantic
 * value, not a JSON serialization format.
 */
export type CodexJsonInteger = number | bigint;

declare const approvalRequestIdBrand: unique symbol;
/**
 * Opaque Cordis correlation id for one pending approval.
 *
 * Pinned Codex stores `approvalId ?? itemId` inside a Session's active-turn
 * state for ownership and supersession, while each outbound server request
 * receives a fresh correlation id. The service preserves that separation:
 * consumers must return the exact one-shot value from `CodexApprovalPrompt`
 * and must never reconstruct it from thread, turn, approval, or item fields.
 */
export type CodexApprovalRequestId = string & {
  readonly [approvalRequestIdBrand]: "CodexApprovalRequestId";
};

declare const approvalCacheKeyBrand: unique symbol;
/**
 * Consumer-canonicalized exact cache key. The service treats the string as
 * opaque and never derives shell, path, environment, or session semantics.
 */
export type ApprovalCacheKey = string & {
  readonly [approvalCacheKeyBrand]: "ApprovalCacheKey";
};

declare const approvalSessionCacheBrand: unique symbol;
/**
 * Non-serializable live-session cache handle issued by the service. A resumed
 * session must obtain a new handle even when its upstream thread id is reused.
 */
export interface CodexApprovalSessionCache {
  readonly [approvalSessionCacheBrand]: "CodexApprovalSessionCache";
}

export function ApprovalCacheKey(value: string): ApprovalCacheKey {
  if (value.length === 0) {
    throw new TypeError(
      "approval cache key must be a non-empty canonical string",
    );
  }
  return value as ApprovalCacheKey;
}

export type ExecPolicyAmendment = string[];
export type NetworkApprovalProtocol =
  "http" | "https" | "socks5Tcp" | "socks5Udp";
export type NetworkPolicyRuleAction = "allow" | "deny";

export interface NetworkApprovalContext {
  host: string;
  protocol: NetworkApprovalProtocol;
}

export interface NetworkPolicyAmendment {
  host: string;
  action: NetworkPolicyRuleAction;
}

export type FileSystemAccessMode = "read" | "write" | "deny";

export type FileSystemSpecialPath =
  | { kind: "root" }
  | { kind: "minimal" }
  | { kind: "project_roots"; subpath: string | null }
  | { kind: "tmpdir" }
  | { kind: "slash_tmp" }
  | { kind: "unknown"; path: string; subpath: string | null };

export type FileSystemPath =
  | { type: "path"; path: string }
  | { type: "glob_pattern"; pattern: string }
  | { type: "special"; value: FileSystemSpecialPath };

export interface FileSystemSandboxEntry {
  path: FileSystemPath;
  access: FileSystemAccessMode;
}

export interface AdditionalFileSystemPermissions {
  /** Deprecated upstream fields retained for exact wire compatibility. */
  read: string[] | null;
  /** Deprecated upstream fields retained for exact wire compatibility. */
  write: string[] | null;
  globScanMaxDepth?: CodexJsonInteger;
  entries?: FileSystemSandboxEntry[];
}

export interface AdditionalNetworkPermissions {
  enabled: boolean | null;
}

export interface AdditionalPermissionProfile {
  network: AdditionalNetworkPermissions | null;
  fileSystem: AdditionalFileSystemPermissions | null;
}

export type CommandAction =
  | { type: "read"; command: string; name: string; path: string }
  | { type: "listFiles"; command: string; path: string | null }
  | {
      type: "search";
      command: string;
      query: string | null;
      path: string | null;
    }
  | { type: "unknown"; command: string };

/** Exact pinned app-server v2 externally-tagged command decision union. */
export type CommandExecutionApprovalDecision =
  | "accept"
  | "acceptForSession"
  | {
      acceptWithExecpolicyAmendment: {
        execpolicy_amendment: ExecPolicyAmendment;
      };
    }
  | {
      applyNetworkPolicyAmendment: {
        network_policy_amendment: NetworkPolicyAmendment;
      };
    }
  | "decline"
  | "cancel";

/** Exact pinned app-server v2 response envelope. */
export interface CommandExecutionRequestApprovalResponse {
  decision: CommandExecutionApprovalDecision;
}

/**
 * Pinned `CommandExecutionRequestApprovalParams`, including the two fields
 * currently marked experimental upstream (`additionalPermissions` and
 * `availableDecisions`). Optional nullable fields intentionally retain both
 * the omitted and explicit-null wire states.
 */
export interface CommandExecutionRequestApprovalParams {
  threadId: string;
  turnId: string;
  itemId: string;
  startedAtMs: CodexJsonInteger;
  approvalId?: string | null;
  environmentId: string | null;
  reason?: string | null;
  networkApprovalContext?: NetworkApprovalContext | null;
  command?: string | null;
  cwd?: string | null;
  commandActions?: CommandAction[] | null;
  additionalPermissions?: AdditionalPermissionProfile | null;
  proposedExecpolicyAmendment?: ExecPolicyAmendment | null;
  proposedNetworkPolicyAmendments?: NetworkPolicyAmendment[] | null;
  availableDecisions?: CommandExecutionApprovalDecision[] | null;
}

/** One exact integer recovered from a canonical native JSON pointer. */
export interface ApprovalProtocolIntegerLexeme {
  pointer: string;
  decimalLexeme: string;
}

/** Stable pinned-serde rejection information for one raw subject. */
export interface ApprovalProtocolSubjectError {
  code: "invalid_json" | "schema_rejected" | "parser_io_error";
  message: string;
  line: number;
  column: number;
}

/** Successful raw-wire parse with both exact JSON and an in-process value. */
export interface ApprovalProtocolAccepted<T> {
  accepted: true;
  canonicalJson: string;
  integerLexemes: readonly ApprovalProtocolIntegerLexeme[];
  value: T;
}

/** Pinned serde rejected the raw subject; this is not a transport failure. */
export interface ApprovalProtocolRejected {
  accepted: false;
  canonicalJson: null;
  integerLexemes: readonly [];
  error: ApprovalProtocolSubjectError;
}

export type ApprovalProtocolParseResult<T> =
  ApprovalProtocolAccepted<T> | ApprovalProtocolRejected;

/** Identity returned by the package's mandatory native protocol handshake. */
export interface ApprovalProtocolHello {
  protocolVersion: number;
  engineVersion: string;
  codexRepository: string;
  codexCommit: string;
  codexAppServerProtocolPackage: string;
  codexAppServerProtocolVersion: string;
  codexAppServerProtocolTree: string;
  codexAppServerProtocolV2Tree: string;
  commandApprovalItemBlob: string;
  commandApprovalPermissionsBlob: string;
  codexCargoLockBlob: string;
  os: string;
  arch: string;
  pointerWidth: number;
  methods: string[];
}

export interface ExecpolicyAmendmentCoordinator {
  /**
   * Persist the exact selected amendment. The approval service neither parses
   * rules nor chooses a policy path. This call completes before `request()`
   * releases its approved-once resolution.
   */
  persistExecpolicyAmendment(
    amendment: Readonly<ExecPolicyAmendment>,
    params: Readonly<CommandExecutionRequestApprovalParams>,
  ): Promise<void>;
}

export interface CodexApprovalRequest {
  params: CommandExecutionRequestApprovalParams;
  /** Live-session cache identity. Never serialize or reconstruct this handle. */
  sessionCache?: CodexApprovalSessionCache;
  /** Empty or omitted keys deliberately bypass the generic session cache. */
  sessionCacheKeys?: readonly ApprovalCacheKey[];
  signal?: AbortSignal;
  execpolicyAmendmentCoordinator?: ExecpolicyAmendmentCoordinator;
}

/**
 * Lossless app-server ingress. The raw JSON is parsed by the pinned Rust
 * protocol crate before entering the semantic approval service.
 */
export interface CodexApprovalRawRequest extends Omit<
  CodexApprovalRequest,
  "params"
> {
  rawJson: string;
}

/** Immutable prompt passed to a rich answerer transport. */
export interface CodexApprovalPrompt {
  requestId: CodexApprovalRequestId;
  params: Readonly<CommandExecutionRequestApprovalParams>;
  /** Effective ordered choices, including the pinned legacy fallback. */
  availableDecisions: readonly CommandExecutionApprovalDecision[];
  /** Aborted as soon as the prompt ceases to be pending. */
  signal: AbortSignal;
}

export type CodexApprovalTransportClaim = "claimed" | "unavailable";

export interface ExecpolicyAmendmentPersistenceWarning {
  kind: "execpolicy_amendment_persistence_failed";
  requestId: CodexApprovalRequestId;
  amendment: Readonly<ExecPolicyAmendment>;
  message: string;
}

export type ApprovalResolutionSource =
  | "answerer"
  | "session_cache"
  | "signal"
  | "superseded"
  | "service_disposed"
  | "fail_closed";

export type CodexApprovalResolution =
  | {
      kind: "approved_once";
      source: "answerer";
      decision: "accept";
    }
  | {
      kind: "approved_once";
      source: "answerer";
      decision: {
        acceptWithExecpolicyAmendment: {
          execpolicy_amendment: ExecPolicyAmendment;
        };
      };
      amendmentPersistence:
        | { kind: "persisted" }
        | { kind: "failed"; warning: ExecpolicyAmendmentPersistenceWarning };
    }
  | {
      kind: "approved_for_session";
      source: "answerer" | "session_cache";
      decision: "acceptForSession";
      /** False when the consumer deliberately supplied no generic cache keys. */
      cacheKeysRecorded: boolean;
    }
  | {
      kind: "network_policy_amendment";
      source: "answerer";
      decision: {
        applyNetworkPolicyAmendment: {
          network_policy_amendment: NetworkPolicyAmendment;
        };
      };
    }
  | {
      kind: "declined";
      source: "answerer" | "fail_closed";
      decision: "decline";
      reason?: string;
    }
  | {
      kind: "cancelled";
      source: "answerer" | "signal" | "superseded" | "service_disposed";
      decision: "cancel";
    };

export type CodexApprovalRespondResult =
  | { kind: "accepted" }
  | { kind: "ignored"; reason: "unknown_or_settled_request" }
  | { kind: "rejected"; reason: "malformed_decision" };

export interface CodexApprovalBackendCapabilities {
  richRequestPresentation: boolean;
  approvedOnce: boolean;
  approvedForSession: boolean;
  execpolicyAmendment: boolean;
  networkPolicyAmendment: boolean;
  distinguishesDeclineFromCancel: boolean;
}

export interface CodexApprovalBackend {
  readonly id: string;
  readonly capabilities: Readonly<CodexApprovalBackendCapabilities>;
  canHandle(prompt: CodexApprovalPrompt): boolean;
  /** `undefined` delegates to the next registered backend. */
  request(
    prompt: CodexApprovalPrompt,
  ): Promise<CommandExecutionApprovalDecision | undefined>;
}

export interface DshOneShotCompatibilityBackendOptions {
  id: string;
  /**
   * DSH has one undifferentiated rejection. The integrator must explicitly
   * choose which pinned Codex denial it means; the adapter never guesses.
   */
  rejectionDecision: "decline" | "cancel";
  request(prompt: CodexApprovalPrompt): Promise<DshOneShotApprovalOutcome>;
}

/**
 * Closed outcome vocabulary exposed by DSH rc.6's generic one-shot approval
 * service. It is declared locally so rich approval consumers do not acquire a
 * runtime or type-resolution dependency on that optional compatibility seam.
 */
export type DshOneShotApprovalOutcome =
  "allowed-once" | "rejected" | "cancelled" | "unavailable";

export const DSH_ONE_SHOT_BACKEND_CAPABILITIES = Object.freeze({
  richRequestPresentation: false,
  approvedOnce: true,
  approvedForSession: false,
  execpolicyAmendment: false,
  networkPolicyAmendment: false,
  distinguishesDeclineFromCancel: false,
}) satisfies Readonly<CodexApprovalBackendCapabilities>;
