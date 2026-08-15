import type {
  AdditionalFileSystemPermissions,
  AdditionalNetworkPermissions,
  AdditionalPermissionProfile,
  CodexJsonInteger,
  CodexApprovalRequest,
  CommandAction,
  CommandExecutionApprovalDecision,
  CommandExecutionRequestApprovalParams,
  CommandExecutionRequestApprovalResponse,
  FileSystemPath,
  FileSystemSandboxEntry,
  FileSystemSpecialPath,
  NetworkApprovalContext,
  NetworkPolicyAmendment,
} from "./types.js";

type UnknownRecord = Record<string, unknown>;
const INVALID = Symbol("invalid pinned approval wire");
type Parsed<T> = T | typeof INVALID;

const I64_MIN = -(1n << 63n);
const I64_MAX = (1n << 63n) - 1n;
const USIZE_MAX =
  process.arch === "ia32" || process.arch === "arm"
    ? (1n << 32n) - 1n
    : (1n << 64n) - 1n;

function isRecord(value: unknown): value is UnknownRecord {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  const prototype = Object.getPrototypeOf(value) as unknown;
  return prototype === Object.prototype || prototype === null;
}

function hasOwn(value: UnknownRecord, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(value, key);
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function parseExactInteger(
  value: unknown,
  minimum: bigint,
  maximum: bigint,
): Parsed<CodexJsonInteger> {
  if (typeof value === "number") {
    if (!Number.isSafeInteger(value)) return INVALID;
    const integer = BigInt(value);
    return integer >= minimum && integer <= maximum ? value : INVALID;
  }
  if (typeof value === "bigint") {
    return value >= minimum && value <= maximum ? value : INVALID;
  }
  return INVALID;
}

function parseStringArray(value: unknown): Parsed<string[]> {
  return Array.isArray(value) && value.every(isString) ? [...value] : INVALID;
}

function parseNetworkApprovalContext(
  value: unknown,
): Parsed<NetworkApprovalContext> {
  if (!isRecord(value) || !isString(value["host"])) return INVALID;
  const protocol = value["protocol"];
  if (
    protocol !== "http" &&
    protocol !== "https" &&
    protocol !== "socks5Tcp" &&
    protocol !== "socks5Udp"
  ) {
    return INVALID;
  }
  return { host: value["host"], protocol };
}

function parseNetworkPolicyAmendmentValue(
  value: unknown,
): Parsed<NetworkPolicyAmendment> {
  if (!isRecord(value) || !isString(value["host"])) return INVALID;
  const action = value["action"];
  if (action !== "allow" && action !== "deny") return INVALID;
  return { host: value["host"], action };
}

function parseFileSystemSpecialPath(
  value: unknown,
): Parsed<FileSystemSpecialPath> {
  if (!isRecord(value) || typeof value["kind"] !== "string") return INVALID;
  switch (value["kind"]) {
    case "root":
    case "minimal":
    case "tmpdir":
    case "slash_tmp":
      return { kind: value["kind"] };
    case "project_roots":
    case "current_working_directory": {
      const subpath = value["subpath"];
      if (subpath !== undefined && subpath !== null && !isString(subpath)) {
        return INVALID;
      }
      return { kind: "project_roots", subpath: subpath ?? null };
    }
    case "unknown": {
      const path = value["path"];
      const subpath = value["subpath"];
      if (
        !isString(path) ||
        (subpath !== undefined && subpath !== null && !isString(subpath))
      ) {
        return INVALID;
      }
      return { kind: "unknown", path, subpath: subpath ?? null };
    }
    default:
      return INVALID;
  }
}

function parseFileSystemPath(value: unknown): Parsed<FileSystemPath> {
  if (!isRecord(value) || typeof value["type"] !== "string") return INVALID;
  switch (value["type"]) {
    case "path":
      return isString(value["path"])
        ? { type: "path", path: value["path"] }
        : INVALID;
    case "glob_pattern":
      return isString(value["pattern"])
        ? { type: "glob_pattern", pattern: value["pattern"] }
        : INVALID;
    case "special": {
      const special = parseFileSystemSpecialPath(value["value"]);
      return special === INVALID
        ? INVALID
        : { type: "special", value: special };
    }
    default:
      return INVALID;
  }
}

function parseFileSystemSandboxEntry(
  value: unknown,
): Parsed<FileSystemSandboxEntry> {
  if (!isRecord(value)) return INVALID;
  const path = parseFileSystemPath(value["path"]);
  const access = value["access"];
  if (
    path === INVALID ||
    (access !== "read" && access !== "write" && access !== "deny")
  ) {
    return INVALID;
  }
  return { path, access };
}

function parseAdditionalFileSystemPermissions(
  value: unknown,
): Parsed<AdditionalFileSystemPermissions> {
  if (!isRecord(value)) return INVALID;
  const read =
    value["read"] === undefined || value["read"] === null
      ? null
      : parseStringArray(value["read"]);
  const write =
    value["write"] === undefined || value["write"] === null
      ? null
      : parseStringArray(value["write"]);
  if (read === INVALID || write === INVALID) return INVALID;

  const result: AdditionalFileSystemPermissions = { read, write };
  if (hasOwn(value, "globScanMaxDepth")) {
    const depth = parseExactInteger(value["globScanMaxDepth"], 1n, USIZE_MAX);
    if (depth === INVALID) return INVALID;
    result.globScanMaxDepth = depth;
  }
  if (hasOwn(value, "entries")) {
    const entries = value["entries"];
    if (!Array.isArray(entries)) return INVALID;
    const parsedEntries: FileSystemSandboxEntry[] = [];
    for (const entry of entries) {
      const parsed = parseFileSystemSandboxEntry(entry);
      if (parsed === INVALID) return INVALID;
      parsedEntries.push(parsed);
    }
    result.entries = parsedEntries;
  }
  return result;
}

function parseAdditionalNetworkPermissions(
  value: unknown,
): Parsed<AdditionalNetworkPermissions> {
  if (!isRecord(value)) return INVALID;
  const enabled = value["enabled"];
  if (
    enabled !== undefined &&
    enabled !== null &&
    typeof enabled !== "boolean"
  ) {
    return INVALID;
  }
  return { enabled: enabled ?? null };
}

function parseAdditionalPermissionProfile(
  value: unknown,
): Parsed<AdditionalPermissionProfile> {
  if (!isRecord(value)) return INVALID;
  const network =
    value["network"] === undefined || value["network"] === null
      ? null
      : parseAdditionalNetworkPermissions(value["network"]);
  const fileSystem =
    value["fileSystem"] === undefined || value["fileSystem"] === null
      ? null
      : parseAdditionalFileSystemPermissions(value["fileSystem"]);
  if (network === INVALID || fileSystem === INVALID) return INVALID;
  return { network, fileSystem };
}

function parseCommandAction(value: unknown): Parsed<CommandAction> {
  if (!isRecord(value) || typeof value["type"] !== "string") return INVALID;
  const command = value["command"];
  if (!isString(command)) return INVALID;
  switch (value["type"]) {
    case "read":
      return isString(value["name"]) && isString(value["path"])
        ? {
            type: "read",
            command,
            name: value["name"],
            path: value["path"],
          }
        : INVALID;
    case "listFiles": {
      const path = value["path"];
      return path === undefined || path === null || isString(path)
        ? { type: "listFiles", command, path: path ?? null }
        : INVALID;
    }
    case "search": {
      const query = value["query"];
      const path = value["path"];
      return (query === undefined || query === null || isString(query)) &&
        (path === undefined || path === null || isString(path))
        ? {
            type: "search",
            command,
            query: query ?? null,
            path: path ?? null,
          }
        : INVALID;
    }
    case "unknown":
      return { type: "unknown", command };
    default:
      return INVALID;
  }
}

/** Parse and canonicalize one untrusted pinned decision wire value. */
export function parseCommandExecutionApprovalDecision(
  value: unknown,
): CommandExecutionApprovalDecision | undefined {
  if (
    value === "accept" ||
    value === "acceptForSession" ||
    value === "decline" ||
    value === "cancel"
  ) {
    return value;
  }
  if (!isRecord(value)) return undefined;
  // Serde's externally tagged enum requires exactly one variant key. Picking
  // the first known key would authorize an object that pinned Codex rejects.
  if (Object.keys(value).length !== 1) return undefined;
  if (hasOwn(value, "acceptWithExecpolicyAmendment")) {
    const body = value["acceptWithExecpolicyAmendment"];
    if (!isRecord(body)) return undefined;
    const amendment = parseStringArray(body["execpolicy_amendment"]);
    if (amendment === INVALID) return undefined;
    return {
      acceptWithExecpolicyAmendment: {
        execpolicy_amendment: amendment,
      },
    };
  }
  if (hasOwn(value, "applyNetworkPolicyAmendment")) {
    const body = value["applyNetworkPolicyAmendment"];
    if (!isRecord(body)) return undefined;
    const amendment = parseNetworkPolicyAmendmentValue(
      body["network_policy_amendment"],
    );
    if (amendment === INVALID) return undefined;
    return {
      applyNetworkPolicyAmendment: {
        network_policy_amendment: amendment,
      },
    };
  }
  return undefined;
}

/** Parse and canonicalize the pinned response envelope; unknown fields are ignored. */
export function parseCommandExecutionRequestApprovalResponse(
  value: unknown,
): CommandExecutionRequestApprovalResponse | undefined {
  if (!isRecord(value)) return undefined;
  const decision = parseCommandExecutionApprovalDecision(value["decision"]);
  return decision === undefined ? undefined : { decision };
}

function decisionIdentity(decision: CommandExecutionApprovalDecision): string {
  if (typeof decision === "string") return `simple:${decision}`;
  if ("acceptWithExecpolicyAmendment" in decision) {
    return `exec:${JSON.stringify(
      decision.acceptWithExecpolicyAmendment.execpolicy_amendment,
    )}`;
  }
  const amendment =
    decision.applyNetworkPolicyAmendment.network_policy_amendment;
  return `network:${JSON.stringify([amendment.host, amendment.action])}`;
}

export function decisionsEqual(
  left: CommandExecutionApprovalDecision,
  right: CommandExecutionApprovalDecision,
): boolean {
  return decisionIdentity(left) === decisionIdentity(right);
}

/**
 * Exact pinned legacy fallback when the experimental ordered field is absent.
 * In particular, a normal command does not gain `acceptForSession` by default.
 */
export function effectiveAvailableDecisions(
  params: Readonly<CommandExecutionRequestApprovalParams>,
): CommandExecutionApprovalDecision[] {
  if (
    params.availableDecisions !== undefined &&
    params.availableDecisions !== null
  ) {
    return [...params.availableDecisions];
  }
  if (
    params.networkApprovalContext !== undefined &&
    params.networkApprovalContext !== null
  ) {
    const decisions: CommandExecutionApprovalDecision[] = [
      "accept",
      "acceptForSession",
    ];
    const allow = params.proposedNetworkPolicyAmendments?.find(
      (amendment) => amendment.action === "allow",
    );
    if (allow !== undefined) {
      decisions.push({
        applyNetworkPolicyAmendment: {
          network_policy_amendment: allow,
        },
      });
    }
    decisions.push("cancel");
    return decisions;
  }
  if (
    params.additionalPermissions !== undefined &&
    params.additionalPermissions !== null
  ) {
    return ["accept", "cancel"];
  }
  const decisions: CommandExecutionApprovalDecision[] = ["accept"];
  if (
    params.proposedExecpolicyAmendment !== undefined &&
    params.proposedExecpolicyAmendment !== null
  ) {
    decisions.push({
      acceptWithExecpolicyAmendment: {
        execpolicy_amendment: params.proposedExecpolicyAmendment,
      },
    });
  }
  decisions.push("cancel");
  return decisions;
}

/**
 * Parse an object-mode app-server request and return the same canonical shape
 * produced by pinned serde for values representable exactly by JavaScript.
 * Unknown fields are ignored and legacy aliases are normalized.
 */
export function parseCommandExecutionRequestApprovalParams(
  value: unknown,
): CommandExecutionRequestApprovalParams | undefined {
  if (!isRecord(value)) return undefined;
  const threadId = value["threadId"];
  const turnId = value["turnId"];
  const itemId = value["itemId"];
  const startedAtMs = parseExactInteger(value["startedAtMs"], I64_MIN, I64_MAX);
  if (
    !isString(threadId) ||
    !isString(turnId) ||
    !isString(itemId) ||
    startedAtMs === INVALID
  ) {
    return undefined;
  }
  const environmentId = value["environmentId"];
  if (
    environmentId !== undefined &&
    environmentId !== null &&
    !isString(environmentId)
  ) {
    return undefined;
  }

  const result: CommandExecutionRequestApprovalParams = {
    threadId,
    turnId,
    itemId,
    startedAtMs,
    environmentId: environmentId ?? null,
  };

  const stringOptions = ["approvalId", "reason", "command", "cwd"] as const;
  for (const key of stringOptions) {
    const option = value[key];
    if (option !== undefined && option !== null) {
      if (!isString(option)) return undefined;
      result[key] = option;
    }
  }

  if (
    value["networkApprovalContext"] !== undefined &&
    value["networkApprovalContext"] !== null
  ) {
    const parsed = parseNetworkApprovalContext(value["networkApprovalContext"]);
    if (parsed === INVALID) return undefined;
    result.networkApprovalContext = parsed;
  }
  if (
    value["commandActions"] !== undefined &&
    value["commandActions"] !== null
  ) {
    if (!Array.isArray(value["commandActions"])) return undefined;
    const actions: CommandAction[] = [];
    for (const action of value["commandActions"]) {
      const parsed = parseCommandAction(action);
      if (parsed === INVALID) return undefined;
      actions.push(parsed);
    }
    result.commandActions = actions;
  }
  if (
    value["additionalPermissions"] !== undefined &&
    value["additionalPermissions"] !== null
  ) {
    const parsed = parseAdditionalPermissionProfile(
      value["additionalPermissions"],
    );
    if (parsed === INVALID) return undefined;
    result.additionalPermissions = parsed;
  }
  if (
    value["proposedExecpolicyAmendment"] !== undefined &&
    value["proposedExecpolicyAmendment"] !== null
  ) {
    const parsed = parseStringArray(value["proposedExecpolicyAmendment"]);
    if (parsed === INVALID) return undefined;
    result.proposedExecpolicyAmendment = parsed;
  }
  if (
    value["proposedNetworkPolicyAmendments"] !== undefined &&
    value["proposedNetworkPolicyAmendments"] !== null
  ) {
    const amendments = value["proposedNetworkPolicyAmendments"];
    if (!Array.isArray(amendments)) return undefined;
    const parsedAmendments: NetworkPolicyAmendment[] = [];
    for (const amendment of amendments) {
      const parsed = parseNetworkPolicyAmendmentValue(amendment);
      if (parsed === INVALID) return undefined;
      parsedAmendments.push(parsed);
    }
    result.proposedNetworkPolicyAmendments = parsedAmendments;
  }
  if (
    value["availableDecisions"] !== undefined &&
    value["availableDecisions"] !== null
  ) {
    const decisions = value["availableDecisions"];
    if (!Array.isArray(decisions)) return undefined;
    const parsedDecisions: CommandExecutionApprovalDecision[] = [];
    for (const decision of decisions) {
      const parsed = parseCommandExecutionApprovalDecision(decision);
      if (parsed === undefined) return undefined;
      parsedDecisions.push(parsed);
    }
    result.availableDecisions = parsedDecisions;
  }
  return result;
}

export function commandExecutionRequestValidationError(
  value: unknown,
): string | undefined {
  return parseCommandExecutionRequestApprovalParams(value) === undefined
    ? "approval params contain a malformed pinned wire field"
    : undefined;
}

export function requestEnvelopeValidationError(
  request: CodexApprovalRequest | unknown,
): string | undefined {
  if (typeof request !== "object" || request === null) {
    return "approval request envelope must be an object";
  }
  const typed = request as CodexApprovalRequest;
  const params = parseCommandExecutionRequestApprovalParams(typed.params);
  if (params === undefined) {
    return "approval params contain a malformed pinned wire field";
  }
  const keys = typed.sessionCacheKeys ?? [];
  if (!Array.isArray(keys)) return "sessionCacheKeys must be an array";
  if (keys.some((key) => typeof key !== "string" || key.length === 0)) {
    return "sessionCacheKeys must contain non-empty canonical strings";
  }
  if (keys.length > 0 && params.networkApprovalContext !== undefined) {
    return "network approvals must use the canonical network coordinator cache, not the generic approval cache";
  }
  return undefined;
}

export function deepFreeze<T>(value: T): Readonly<T> {
  if (typeof value !== "object" || value === null || Object.isFrozen(value)) {
    return value;
  }
  for (const child of Object.values(value as Record<string, unknown>)) {
    deepFreeze(child);
  }
  return Object.freeze(value);
}
