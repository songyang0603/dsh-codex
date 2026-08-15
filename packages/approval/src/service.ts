import { Context, Service } from "@deepseek-ai/cordis";
import {
  ApprovalProtocolClient,
  type ApprovalProtocolClientOptions,
} from "./client.js";
import type {
  ApprovalProtocolHello,
  ApprovalProtocolParseResult,
  ApprovalCacheKey,
  CodexApprovalBackend,
  CodexApprovalBackendCapabilities,
  CodexApprovalPrompt,
  CodexApprovalRawRequest,
  CodexApprovalRequest,
  CodexApprovalRequestId,
  CodexApprovalResolution,
  CodexApprovalRespondResult,
  CodexApprovalSessionCache,
  CodexApprovalTransportClaim,
  CommandExecutionApprovalDecision,
  CommandExecutionRequestApprovalParams,
  CommandExecutionRequestApprovalResponse,
  ExecpolicyAmendmentPersistenceWarning,
} from "./types.js";
import {
  deepFreeze,
  effectiveAvailableDecisions,
  parseCommandExecutionApprovalDecision,
  parseCommandExecutionRequestApprovalParams,
  requestEnvelopeValidationError,
} from "./validation.js";

declare module "@deepseek-ai/cordis" {
  interface Context {
    /** Rich pinned-Codex command approval state and transport service. */
    codexApproval: CodexApprovalService;
  }

  interface Events {
    /**
     * Rich answerer transport waterfall. A listener either calls `next()` or
     * returns `claimed`, then settles the exact prompt through
     * `ctx.codexApproval.respond(requestId, decision)`.
     * @mode waterfall
     */
    "codex-approval/request"(
      prompt: CodexApprovalPrompt,
      next: () => Promise<CodexApprovalTransportClaim>,
    ): Promise<CodexApprovalTransportClaim>;
    /** Persistence failed after the user approved an execpolicy amendment. */
    "codex-approval/warning"(
      warning: ExecpolicyAmendmentPersistenceWarning,
    ): void;
  }
}

type PendingSettlement =
  | {
      kind: "decision";
      decision: CommandExecutionApprovalDecision;
    }
  | {
      kind: "cancelled";
      source: "signal" | "superseded" | "service_disposed";
    }
  | { kind: "fail_closed"; reason: string };

interface PendingRecord {
  readonly prompt: CodexApprovalPrompt;
  readonly params: Readonly<CommandExecutionRequestApprovalParams>;
  readonly sessionCache: CodexApprovalSessionCache | undefined;
  readonly cacheKeys: readonly ApprovalCacheKey[];
  readonly coordinator: CodexApprovalRequest["execpolicyAmendmentCoordinator"];
  readonly settle: (settlement: PendingSettlement) => boolean;
  readonly done: Promise<void>;
  readonly resolveDone: () => void;
}

let nextServiceInstanceId = 0n;

interface RegisteredBackend extends CodexApprovalBackend {
  readonly capabilities: Readonly<CodexApprovalBackendCapabilities>;
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  try {
    return String(error);
  } catch {
    return "<unprintable thrown value>";
  }
}

function cloneWire<T>(value: T): T {
  return structuredClone(value);
}

function failClosed(reason: string): CodexApprovalResolution {
  return {
    kind: "declined",
    source: "fail_closed",
    decision: "decline",
    reason,
  };
}

/**
 * Pinned Codex owns effective approval ids inside each Session's active turn.
 * The app-server `threadId` identifies that Session at this component seam.
 * JSON array encoding is injective for the two arbitrary string fields and
 * keeps the transport token opaque to consumers.
 */
function approvalOwnerKey(
  params: Readonly<CommandExecutionRequestApprovalParams>,
): string {
  return JSON.stringify([params.threadId, params.approvalId ?? params.itemId]);
}

/**
 * `ctx.codexApproval`: rich pinned-Codex command approval service.
 *
 * The service owns pending correlation and generic ApprovedForSession state,
 * but never derives cache keys, parses execpolicy rules, persists policy, runs
 * a shell, or mutates a network proxy.
 */
export class CodexApprovalService extends Service {
  private readonly pending = new Map<CodexApprovalRequestId, PendingRecord>();
  private readonly pendingOwners = new Map<string, PendingRecord>();
  private readonly sessionCaches = new Map<
    CodexApprovalSessionCache,
    Set<ApprovalCacheKey>
  >();
  private readonly backends: RegisteredBackend[] = [];
  private readonly activeRecords = new Set<PendingRecord>();
  private readonly protocolClient: ApprovalProtocolClient;
  private readonly serviceInstanceId = (nextServiceInstanceId += 1n);
  private nextRequestSequence = 0n;
  private closed = false;

  constructor(ctx: Context, clientOptions: ApprovalProtocolClientOptions = {}) {
    super(ctx, "codexApproval");
    this.protocolClient = new ApprovalProtocolClient(clientOptions);
    ctx.effect(
      () => async () => {
        this.closed = true;
        for (const record of [...this.pending.values()]) {
          record.settle({ kind: "cancelled", source: "service_disposed" });
        }
        // A response may already have left the pending map while its approved
        // execpolicy amendment is still being persisted. Keep the Cordis fiber
        // alive until every such operation is quiescent; otherwise unload could
        // report completion while a permanent allow rule is still mutating.
        await Promise.allSettled(
          [...this.activeRecords].map((record) => record.done),
        );
        await this.protocolClient.close();
        this.sessionCaches.clear();
        this.backends.length = 0;
      },
      "dsh-codex approval pending/cache teardown",
    );
  }

  /** Do not activate the DSH service unless the pinned native serde is ready. */
  protected async [Service.init](): Promise<void> {
    await this.protocolClient.ready;
  }

  /** Return the mandatory native provenance handshake. */
  protocolHello(signal?: AbortSignal): Promise<ApprovalProtocolHello> {
    return this.protocolClient.hello(signal);
  }

  /** Parse a raw pinned request without crossing JavaScript's lossy number boundary. */
  parseRequestJson(
    rawJson: string,
    signal?: AbortSignal,
  ): Promise<
    ApprovalProtocolParseResult<CommandExecutionRequestApprovalParams>
  > {
    return this.protocolClient.parseRequest(rawJson, signal);
  }

  /** Parse a raw pinned response with the same fixed upstream serde. */
  parseResponseJson(
    rawJson: string,
    signal?: AbortSignal,
  ): Promise<
    ApprovalProtocolParseResult<CommandExecutionRequestApprovalResponse>
  > {
    return this.protocolClient.parseResponse(rawJson, signal);
  }

  /**
   * Lossless app-server ingress. Native/schema failures are an explicit
   * decline; they never fall back to the lossy object-mode parser.
   */
  async requestJson(
    request: CodexApprovalRawRequest,
  ): Promise<CodexApprovalResolution> {
    if (this.closed) return failClosed("codex approval service is disposed");
    if (typeof request !== "object" || request === null) {
      return failClosed("raw approval request envelope must be an object");
    }
    let parsed: ApprovalProtocolParseResult<CommandExecutionRequestApprovalParams>;
    try {
      parsed = await this.protocolClient.parseRequest(
        request.rawJson,
        request.signal,
      );
    } catch (error) {
      if (request.signal?.aborted === true) {
        return { kind: "cancelled", source: "signal", decision: "cancel" };
      }
      return failClosed(
        `pinned approval request parser failed: ${errorMessage(error)}`,
      );
    }
    if (!parsed.accepted) {
      return failClosed(
        `pinned approval request rejected (${parsed.error.code}): ${parsed.error.message}`,
      );
    }
    return this.request({
      params: parsed.value,
      ...(request.sessionCache === undefined
        ? {}
        : { sessionCache: request.sessionCache }),
      ...(request.sessionCacheKeys === undefined
        ? {}
        : { sessionCacheKeys: request.sessionCacheKeys }),
      ...(request.signal === undefined ? {} : { signal: request.signal }),
      ...(request.execpolicyAmendmentCoordinator === undefined
        ? {}
        : {
            execpolicyAmendmentCoordinator:
              request.execpolicyAmendmentCoordinator,
          }),
    });
  }

  /**
   * Lossless response ingress. A malformed or unavailable native parser
   * settles a known prompt as fail-closed and cannot later be replaced.
   */
  async respondJson(
    id: CodexApprovalRequestId | string,
    rawJson: string,
    signal?: AbortSignal,
  ): Promise<CodexApprovalRespondResult> {
    let parsed: ApprovalProtocolParseResult<CommandExecutionRequestApprovalResponse>;
    try {
      parsed = await this.protocolClient.parseResponse(rawJson, signal);
    } catch {
      return this.respond(id, undefined);
    }
    if (!parsed.accepted) return this.respond(id, undefined);
    return this.respond(id, parsed.value.decision);
  }

  /** Create a new, non-serializable generic approval cache for one live session. */
  createSessionCache(): CodexApprovalSessionCache {
    if (this.closed) throw new Error("codex approval service is disposed");
    const handle = Object.freeze({
      token: Symbol("dsh-codex approval session cache"),
    }) as unknown as CodexApprovalSessionCache;
    this.sessionCaches.set(handle, new Set());
    return handle;
  }

  /** End one live session and discard every ApprovedForSession exact key. */
  closeSessionCache(handle: CodexApprovalSessionCache): boolean {
    return this.sessionCaches.delete(handle);
  }

  /** All-keys lookup; empty keys deliberately bypass the cache. */
  areApprovedForSession(
    handle: CodexApprovalSessionCache,
    keys: readonly ApprovalCacheKey[],
  ): boolean {
    if (keys.length === 0) return false;
    const cache = this.sessionCaches.get(handle);
    return cache !== undefined && keys.every((key) => cache.has(key));
  }

  /** Snapshot registered backend capabilities without exposing mutable state. */
  backendCapabilities(): ReadonlyArray<{
    id: string;
    capabilities: Readonly<CodexApprovalBackendCapabilities>;
  }> {
    return this.backends.map((backend) => ({
      id: backend.id,
      capabilities: backend.capabilities,
    }));
  }

  /**
   * Register an ordered in-process backend. Rich Cordis transports run first;
   * backends are compatibility fallbacks and must advertise their limitations.
   */
  registerBackend(backend: CodexApprovalBackend): () => void {
    if (this.closed) throw new Error("codex approval service is disposed");
    if (backend.id.length === 0)
      throw new TypeError("backend id must be non-empty");
    if (this.backends.some((candidate) => candidate.id === backend.id)) {
      throw new Error(
        `codex approval backend already registered: ${backend.id}`,
      );
    }
    const capabilities = deepFreeze(cloneWire(backend.capabilities));
    const registered: RegisteredBackend = {
      id: backend.id,
      capabilities,
      canHandle: backend.canHandle.bind(backend),
      request: backend.request.bind(backend),
    };
    this.backends.push(registered);
    let active = true;
    return () => {
      if (!active) return;
      active = false;
      const index = this.backends.indexOf(registered);
      if (index >= 0) this.backends.splice(index, 1);
    };
  }

  /** Return immutable snapshots of prompts that are pending right now. */
  pendingPrompts(): readonly CodexApprovalPrompt[] {
    return [...this.pending.values()].map((record) => record.prompt);
  }

  /**
   * Settle one rich transport prompt. Unknown/duplicate ids cannot grant
   * anything; malformed decisions settle the known request with an explicit
   * fail-closed decline. As in the pinned app-server, the presentation list is
   * not an authorization allowlist: any valid response decision is accepted.
   */
  respond(
    id: CodexApprovalRequestId | string,
    candidate: unknown,
  ): CodexApprovalRespondResult {
    const record = this.pending.get(id as CodexApprovalRequestId);
    if (record === undefined) {
      return { kind: "ignored", reason: "unknown_or_settled_request" };
    }
    const parsed = parseCommandExecutionApprovalDecision(candidate);
    if (parsed === undefined) {
      record.settle({ kind: "fail_closed", reason: "malformed decision wire" });
      return { kind: "rejected", reason: "malformed_decision" };
    }
    const immutable = deepFreeze(cloneWire(parsed));
    record.settle({ kind: "decision", decision: immutable });
    return { kind: "accepted" };
  }

  /** Request one exact command decision. */
  async request(
    request: CodexApprovalRequest,
  ): Promise<CodexApprovalResolution> {
    if (this.closed) return failClosed("codex approval service is disposed");
    const validationError = requestEnvelopeValidationError(request);
    if (validationError !== undefined) return failClosed(validationError);
    if (request.signal?.aborted === true) {
      return { kind: "cancelled", source: "signal", decision: "cancel" };
    }

    let params: Readonly<CommandExecutionRequestApprovalParams>;
    let availableDecisions: readonly CommandExecutionApprovalDecision[];
    try {
      const parsed = parseCommandExecutionRequestApprovalParams(request.params);
      if (parsed === undefined) {
        return failClosed(
          "approval params contain a malformed pinned wire field",
        );
      }
      params = deepFreeze(cloneWire(parsed));
      availableDecisions = deepFreeze(
        cloneWire(effectiveAvailableDecisions(params)),
      );
    } catch (error) {
      return failClosed(
        `approval wire snapshot failed: ${errorMessage(error)}`,
      );
    }
    const cacheKeys = Object.freeze([...(request.sessionCacheKeys ?? [])]);
    const sessionCache = request.sessionCache;
    if (sessionCache !== undefined && !this.sessionCaches.has(sessionCache)) {
      return failClosed(
        "session cache handle is unknown, closed, or from another service",
      );
    }
    if (cacheKeys.length > 0 && sessionCache === undefined) {
      return failClosed(
        "non-empty session cache keys require a live session cache handle",
      );
    }
    if (
      sessionCache !== undefined &&
      this.areApprovedForSession(sessionCache, cacheKeys)
    ) {
      return {
        kind: "approved_for_session",
        source: "session_cache",
        decision: "acceptForSession",
        cacheKeysRecorded: true,
      };
    }

    const ownerKey = approvalOwnerKey(params);
    const superseded = this.pendingOwners.get(ownerKey);
    if (superseded !== undefined) {
      superseded.settle({ kind: "cancelled", source: "superseded" });
    }
    const id =
      `dsh-codex-approval:${this.serviceInstanceId}:${(this.nextRequestSequence += 1n).toString()}` as CodexApprovalRequestId;
    const promptController = new AbortController();
    const prompt = Object.freeze({
      requestId: id,
      params,
      availableDecisions,
      signal: promptController.signal,
    }) satisfies CodexApprovalPrompt;

    let resolveSettlement!: (settlement: PendingSettlement) => void;
    const settlementPromise = new Promise<PendingSettlement>((resolve) => {
      resolveSettlement = resolve;
    });
    let resolveDone!: () => void;
    const done = new Promise<void>((resolve) => {
      resolveDone = resolve;
    });
    let settled = false;
    const externalSignal = request.signal;
    const onAbort = () => {
      record.settle({ kind: "cancelled", source: "signal" });
    };
    const settle = (settlement: PendingSettlement): boolean => {
      if (settled) return false;
      settled = true;
      this.pending.delete(id);
      if (this.pendingOwners.get(ownerKey) === record) {
        this.pendingOwners.delete(ownerKey);
      }
      externalSignal?.removeEventListener("abort", onAbort);
      promptController.abort();
      resolveSettlement(settlement);
      return true;
    };
    const record: PendingRecord = {
      prompt,
      params,
      sessionCache,
      cacheKeys,
      coordinator: request.execpolicyAmendmentCoordinator,
      settle,
      done,
      resolveDone,
    };
    this.activeRecords.add(record);
    this.pending.set(id, record);
    this.pendingOwners.set(ownerKey, record);
    externalSignal?.addEventListener("abort", onAbort, { once: true });
    if (externalSignal?.aborted === true) onAbort();

    void this.dispatch(record);
    try {
      const settlement = await settlementPromise;
      return await this.finalize(record, settlement);
    } finally {
      this.activeRecords.delete(record);
      resolveDone();
    }
  }

  private isPending(record: PendingRecord): boolean {
    return this.pending.get(record.prompt.requestId) === record;
  }

  private async dispatch(record: PendingRecord): Promise<void> {
    let claim: unknown;
    try {
      claim = await this.ctx.waterfall(
        "codex-approval/request",
        record.prompt,
        () => Promise.resolve<CodexApprovalTransportClaim>("unavailable"),
      );
    } catch (error) {
      record.settle({
        kind: "fail_closed",
        reason: `rich approval transport failed: ${errorMessage(error)}`,
      });
      return;
    }
    if (!this.isPending(record)) return;
    if (claim === "claimed") return;
    if (claim !== "unavailable") {
      record.settle({
        kind: "fail_closed",
        reason: "rich approval transport returned an unknown claim",
      });
      return;
    }
    await this.dispatchBackends(record);
  }

  private async dispatchBackends(record: PendingRecord): Promise<void> {
    for (const backend of [...this.backends]) {
      if (!this.isPending(record)) return;
      let handles: boolean;
      try {
        handles = backend.canHandle(record.prompt);
      } catch (error) {
        record.settle({
          kind: "fail_closed",
          reason: `approval backend ${backend.id} classifier failed: ${errorMessage(error)}`,
        });
        return;
      }
      if (!handles) continue;
      let candidate: unknown;
      try {
        candidate = await backend.request(record.prompt);
      } catch (error) {
        record.settle({
          kind: "fail_closed",
          reason: `approval backend ${backend.id} failed: ${errorMessage(error)}`,
        });
        return;
      }
      if (!this.isPending(record)) return;
      if (candidate === undefined) continue;
      let decision: CommandExecutionApprovalDecision | undefined;
      try {
        decision = parseCommandExecutionApprovalDecision(candidate);
      } catch (error) {
        record.settle({
          kind: "fail_closed",
          reason: `approval backend ${backend.id} returned a decision that could not be validated: ${errorMessage(error)}`,
        });
        return;
      }
      if (decision === undefined) {
        record.settle({
          kind: "fail_closed",
          reason: `approval backend ${backend.id} returned a malformed decision`,
        });
        return;
      }
      if (!this.backendMayReturn(backend, decision)) {
        record.settle({
          kind: "fail_closed",
          reason: `approval backend ${backend.id} returned a decision outside its advertised capabilities`,
        });
        return;
      }
      this.respond(record.prompt.requestId, decision);
      return;
    }
    record.settle({
      kind: "fail_closed",
      reason: "no rich approval transport or compatible backend was available",
    });
  }

  private backendMayReturn(
    backend: RegisteredBackend,
    decision: CommandExecutionApprovalDecision,
  ): boolean {
    if (decision === "accept") return backend.capabilities.approvedOnce;
    if (decision === "acceptForSession") {
      return backend.capabilities.approvedForSession;
    }
    if (decision === "decline" || decision === "cancel") return true;
    if ("acceptWithExecpolicyAmendment" in decision) {
      return backend.capabilities.execpolicyAmendment;
    }
    return backend.capabilities.networkPolicyAmendment;
  }

  private async finalize(
    record: PendingRecord,
    settlement: PendingSettlement,
  ): Promise<CodexApprovalResolution> {
    if (settlement.kind === "cancelled") {
      return {
        kind: "cancelled",
        source: settlement.source,
        decision: "cancel",
      };
    }
    if (settlement.kind === "fail_closed") {
      return failClosed(settlement.reason);
    }
    const decision = settlement.decision;
    if (decision === "accept") {
      return { kind: "approved_once", source: "answerer", decision };
    }
    if (decision === "acceptForSession") {
      const cache =
        record.sessionCache === undefined
          ? undefined
          : this.sessionCaches.get(record.sessionCache);
      const cacheKeysRecorded =
        cache !== undefined && record.cacheKeys.length > 0;
      if (cacheKeysRecorded) {
        for (const key of record.cacheKeys) cache.add(key);
      }
      return {
        kind: "approved_for_session",
        source: "answerer",
        decision,
        cacheKeysRecorded,
      };
    }
    if (decision === "decline") {
      return { kind: "declined", source: "answerer", decision };
    }
    if (decision === "cancel") {
      return { kind: "cancelled", source: "answerer", decision };
    }
    if ("applyNetworkPolicyAmendment" in decision) {
      return {
        kind: "network_policy_amendment",
        source: "answerer",
        decision,
      };
    }

    const amendment =
      decision.acceptWithExecpolicyAmendment.execpolicy_amendment;
    let warning: ExecpolicyAmendmentPersistenceWarning | undefined;
    if (record.coordinator === undefined) {
      warning = {
        kind: "execpolicy_amendment_persistence_failed",
        requestId: record.prompt.requestId,
        amendment,
        message: "no execpolicy amendment coordinator was supplied",
      };
    } else {
      try {
        await record.coordinator.persistExecpolicyAmendment(
          amendment,
          record.params,
        );
      } catch (error) {
        warning = {
          kind: "execpolicy_amendment_persistence_failed",
          requestId: record.prompt.requestId,
          amendment,
          message: errorMessage(error),
        };
      }
    }
    if (warning !== undefined) this.reportWarning(warning);
    return {
      kind: "approved_once",
      source: "answerer",
      decision,
      amendmentPersistence:
        warning === undefined
          ? { kind: "persisted" }
          : { kind: "failed", warning },
    };
  }

  private reportWarning(warning: ExecpolicyAmendmentPersistenceWarning): void {
    try {
      this.ctx.logger.warn(
        `execpolicy amendment persistence failed after one-shot approval: ${warning.message}`,
      );
    } catch {
      // Logging is diagnostic and must not revoke an already accepted command.
    }
    try {
      this.ctx.emit("codex-approval/warning", warning);
    } catch {
      // Warning observers are non-authoritative for the same reason.
    }
  }
}

export default CodexApprovalService;
