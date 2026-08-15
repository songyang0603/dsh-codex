import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { chmodSync, existsSync, statSync } from "node:fs";
import { createInterface } from "node:readline";
import { fileURLToPath } from "node:url";
import {
  EXECPOLICY_PROTOCOL_VERSION,
  PINNED_CARGO_LOCK_BLOB,
  PINNED_CODEX_COMMIT,
  PINNED_CONFIG_TREE,
  PINNED_EXEC_SERVER_TREE,
  PINNED_CORE_EXEC_POLICY_BLOB,
  PINNED_CORE_EXEC_POLICY_DIR_TREE,
  PINNED_EXECPOLICY_TREE,
  PINNED_SHELL_COMMAND_TREE,
  PINNED_UTILS_CLI_TREE,
  PINNED_UTILS_HOME_DIR_TREE,
  type AppendNetworkOutput,
  type AppendNetworkParams,
  type AppendPrefixOutput,
  type AppendPrefixParams,
  type CheckTokensOutput,
  type CheckTokensParams,
  type DiagnosticsOutput,
  type HelloOutput,
  type JsonValue,
  type LoadOutput,
  type LoadParams,
  type LoadConfigStackOutput,
  type LoadConfigStackParams,
  type LoadHostConfigStackOutput,
  type LoadHostConfigStackParams,
  type NetworkDomainsOutput,
  type ProtocolErrorBody,
  type RuntimePolicyInput,
  type RuntimePolicyOutput,
} from "./types.js";

const DEFAULT_CLOSE_TIMEOUT_MS = 1_000;
const DEFAULT_MAX_STDERR_BYTES = 16 * 1024;
const DEFAULT_MAX_RESPONSE_LINE_BYTES = 8 * 1024 * 1024;
const DEFAULT_MAX_PENDING_REQUESTS = 1_024;

const RUST_OS_BY_NODE_PLATFORM: Readonly<Record<string, string>> = {
  darwin: "macos",
  linux: "linux",
  win32: "windows",
};
const RUST_ARCH_BY_NODE_ARCH: Readonly<Record<string, string>> = {
  arm64: "aarch64",
  x64: "x86_64",
};

interface ProtocolRequest {
  protocolVersion: typeof EXECPOLICY_PROTOCOL_VERSION;
  id: number;
  method: string;
  params: JsonValue;
}

interface PendingRequest {
  resolve(value: unknown): void;
  reject(error: Error): void;
  removeAbortListener(): void;
}

/** Process and framing options for one long-running execpolicy sidecar. */
export interface ExecPolicyClientOptions {
  /** Explicit engine executable. Falls back to DSH_CODEX_EXECPOLICY_ENGINE, a packaged native binary, then repository debug/release builds. */
  enginePath?: string;
  /** Optional argv for a wrapper executable. The canonical native engine requires no arguments. */
  engineArgs?: readonly string[];
  /** Grace period used by close() before terminating a non-quiescent sidecar. */
  closeTimeoutMs?: number;
  /** Tail of stderr retained for transport diagnostics. */
  maxStderrBytes?: number;
  /** Maximum accepted JSONL response line. */
  maxResponseLineBytes?: number;
  /** Backpressure bound for unresolved protocol requests. */
  maxPendingRequests?: number;
}

/** An error returned by the Rust engine in a valid protocol response. */
export class ExecPolicyEngineError extends Error {
  readonly code: string;
  readonly data: JsonValue | undefined;

  constructor(body: ProtocolErrorBody) {
    super(body.message);
    this.name = "ExecPolicyEngineError";
    this.code = body.code;
    this.data = body.data;
  }
}

/** A sidecar lifecycle, framing, or provenance-integrity failure. */
export class ExecPolicyTransportError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "ExecPolicyTransportError";
  }
}

/** A request attempted after sidecar shutdown began. */
export class ExecPolicyClientClosedError extends Error {
  constructor() {
    super("the Codex execpolicy sidecar is closing or closed");
    this.name = "ExecPolicyClientClosedError";
  }
}

function abortError(): Error {
  const error = new Error("the Codex execpolicy request was aborted");
  error.name = "AbortError";
  return error;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isDecision(value: unknown): value is "allow" | "prompt" | "forbidden" {
  return value === "allow" || value === "prompt" || value === "forbidden";
}

function isStringArray(value: unknown): value is string[] {
  return (
    Array.isArray(value) && value.every((token) => typeof token === "string")
  );
}

function validateOptionalAmendment(requirement: Record<string, unknown>): void {
  if (
    requirement.proposedExecpolicyAmendment !== undefined &&
    !isStringArray(requirement.proposedExecpolicyAmendment)
  ) {
    throw new ExecPolicyTransportError(
      "Codex execpolicy runtime response has a malformed proposedExecpolicyAmendment",
    );
  }
}

function validateRuleMatch(value: unknown): boolean {
  if (!isRecord(value)) return false;
  const prefix = value.prefixRuleMatch;
  const heuristic = value.heuristicsRuleMatch;
  if (isRecord(prefix) && heuristic === undefined) {
    return (
      isStringArray(prefix.matchedPrefix) &&
      isDecision(prefix.decision) &&
      (prefix.resolvedProgram === undefined ||
        typeof prefix.resolvedProgram === "string") &&
      (prefix.justification === undefined ||
        typeof prefix.justification === "string")
    );
  }
  if (isRecord(heuristic) && prefix === undefined) {
    return isStringArray(heuristic.command) && isDecision(heuristic.decision);
  }
  return false;
}

/** Runtime validator for the security-sensitive discriminated policy result. */
export function validateRuntimePolicyOutput(
  value: unknown,
): RuntimePolicyOutput {
  if (!isRecord(value)) {
    throw new ExecPolicyTransportError(
      "Codex execpolicy runtime response is not an object",
    );
  }
  const requirement = value.requirement;
  if (!isRecord(requirement) || typeof requirement.kind !== "string") {
    throw new ExecPolicyTransportError(
      "Codex execpolicy runtime response has no valid requirement",
    );
  }
  switch (requirement.kind) {
    case "skip":
      if (typeof requirement.bypassSandbox !== "boolean") {
        throw new ExecPolicyTransportError(
          "Codex execpolicy skip requirement has no boolean bypassSandbox",
        );
      }
      validateOptionalAmendment(requirement);
      break;
    case "needs_approval":
      if (
        requirement.reason !== undefined &&
        typeof requirement.reason !== "string"
      ) {
        throw new ExecPolicyTransportError(
          "Codex execpolicy needs_approval requirement has a malformed reason",
        );
      }
      validateOptionalAmendment(requirement);
      break;
    case "forbidden":
      if (typeof requirement.reason !== "string") {
        throw new ExecPolicyTransportError(
          "Codex execpolicy forbidden requirement has no reason",
        );
      }
      break;
    default:
      throw new ExecPolicyTransportError(
        `Codex execpolicy runtime response has unknown requirement kind ${JSON.stringify(requirement.kind)}`,
      );
  }

  const evaluation = value.evaluation;
  if (
    !isRecord(evaluation) ||
    !isDecision(evaluation.decision) ||
    !Array.isArray(evaluation.matchedRules) ||
    !evaluation.matchedRules.every(validateRuleMatch)
  ) {
    throw new ExecPolicyTransportError(
      "Codex execpolicy runtime response has a malformed evaluation",
    );
  }
  if (
    !Array.isArray(value.loweredCommands) ||
    !value.loweredCommands.every(
      (command) => isStringArray(command) && command.length > 0,
    )
  ) {
    throw new ExecPolicyTransportError(
      "Codex execpolicy runtime response has malformed loweredCommands",
    );
  }
  if (typeof value.usedComplexParsing !== "boolean") {
    throw new ExecPolicyTransportError(
      "Codex execpolicy runtime response has no boolean usedComplexParsing",
    );
  }
  if (
    value.commandOrigin !== "generic" &&
    value.commandOrigin !== "power_shell"
  ) {
    throw new ExecPolicyTransportError(
      "Codex execpolicy runtime response has an invalid commandOrigin",
    );
  }
  return value as unknown as RuntimePolicyOutput;
}

function positiveInteger(
  value: number | undefined,
  fallback: number,
  field: string,
): number {
  const resolved = value ?? fallback;
  if (!Number.isSafeInteger(resolved) || resolved <= 0) {
    throw new TypeError(`${field} must be a positive safe integer`);
  }
  return resolved;
}

function engineFilename(): string {
  return process.platform === "win32"
    ? "dsh-codex-execpolicy-engine.exe"
    : "dsh-codex-execpolicy-engine";
}

function packagedEnginePath(): string {
  return fileURLToPath(
    new URL(
      `../native/${process.platform}-${process.arch}/${engineFilename()}`,
      import.meta.url,
    ),
  );
}

function ensurePackagedEngineExecutable(enginePath: string): void {
  if (process.platform === "win32" || enginePath !== packagedEnginePath())
    return;
  try {
    const mode = statSync(enginePath).mode & 0o777;
    if ((mode & 0o100) === 0) chmodSync(enginePath, mode | 0o100);
  } catch (cause) {
    throw new ExecPolicyTransportError(
      `failed to make the packaged Codex execpolicy engine executable: ${enginePath}`,
      { cause },
    );
  }
}

/** Resolve the native engine without invoking a shell or consulting PATH. */
export function resolveExecPolicyEnginePath(explicit?: string): string {
  if (explicit !== undefined) {
    if (explicit.length === 0)
      throw new TypeError("enginePath must not be empty");
    return explicit;
  }
  const fromEnvironment = process.env.DSH_CODEX_EXECPOLICY_ENGINE;
  if (fromEnvironment !== undefined && fromEnvironment.length > 0)
    return fromEnvironment;

  const platformDirectory = `${process.platform}-${process.arch}`;
  const candidates = [
    packagedEnginePath(),
    fileURLToPath(
      new URL(`../../../target/debug/${engineFilename()}`, import.meta.url),
    ),
    fileURLToPath(
      new URL(`../../../target/release/${engineFilename()}`, import.meta.url),
    ),
  ];
  const candidate = candidates.find((path) => existsSync(path));
  if (candidate !== undefined) return candidate;
  throw new ExecPolicyTransportError(
    `Codex execpolicy engine not found; set DSH_CODEX_EXECPOLICY_ENGINE or install the ${platformDirectory} native artifact`,
  );
}

function sidecarEnvironment(): NodeJS.ProcessEnv {
  const environment: NodeJS.ProcessEnv = {};
  for (const [key, value] of Object.entries(process.env)) {
    if (/KEY|PASSWORD|SECRET|TOKEN/i.test(key)) continue;
    if (key.toUpperCase().startsWith("DSH_")) continue;
    environment[key] = value;
  }
  return environment;
}

function formatStderr(stderr: string): string {
  const trimmed = stderr.trim();
  return trimmed.length === 0 ? "" : `; stderr tail: ${trimmed}`;
}

/**
 * Long-running JSONL client for the pinned Rust engine.
 *
 * Construction starts the process and a mandatory hello handshake. Every
 * public operation awaits that handshake, whose commit and every declared
 * upstream object identity must match exactly. A malformed response or unexpected
 * process exit poisons the whole client and rejects every pending request.
 */
export class ExecPolicyClient {
  readonly ready: Promise<HelloOutput>;

  private readonly child: ChildProcessWithoutNullStreams;
  private readonly closeTimeoutMs: number;
  private readonly maxStderrBytes: number;
  private readonly maxResponseLineBytes: number;
  private readonly maxPendingRequests: number;
  private readonly pending = new Map<number, PendingRequest>();
  private readonly abandoned = new Set<number>();
  private readonly exitPromise: Promise<void>;
  private resolveExit!: () => void;
  private requestId = 0;
  private stderrTail = Buffer.alloc(0);
  private terminalError: Error | undefined;
  private closing = false;
  private closed = false;
  private closePromise: Promise<void> | undefined;

  constructor(options: ExecPolicyClientOptions = {}) {
    this.closeTimeoutMs = positiveInteger(
      options.closeTimeoutMs,
      DEFAULT_CLOSE_TIMEOUT_MS,
      "closeTimeoutMs",
    );
    this.maxStderrBytes = positiveInteger(
      options.maxStderrBytes,
      DEFAULT_MAX_STDERR_BYTES,
      "maxStderrBytes",
    );
    this.maxResponseLineBytes = positiveInteger(
      options.maxResponseLineBytes,
      DEFAULT_MAX_RESPONSE_LINE_BYTES,
      "maxResponseLineBytes",
    );
    this.maxPendingRequests = positiveInteger(
      options.maxPendingRequests,
      DEFAULT_MAX_PENDING_REQUESTS,
      "maxPendingRequests",
    );
    this.exitPromise = new Promise((resolve) => {
      this.resolveExit = resolve;
    });

    const enginePath = resolveExecPolicyEnginePath(options.enginePath);
    ensurePackagedEngineExecutable(enginePath);
    this.child = spawn(enginePath, [...(options.engineArgs ?? [])], {
      env: sidecarEnvironment(),
      shell: false,
      stdio: ["pipe", "pipe", "pipe"],
      windowsHide: true,
    });
    this.child.stdout.setEncoding("utf8");
    this.child.stderr.on("data", (chunk: Buffer | string) => {
      this.captureStderr(chunk);
    });
    this.child.on("error", (error) => {
      this.fail(
        new ExecPolicyTransportError(
          `failed to run Codex execpolicy engine: ${error.message}`,
          { cause: error },
        ),
      );
    });
    this.child.on("close", (code, signal) => {
      this.handleClose(code, signal);
    });

    const lines = createInterface({
      input: this.child.stdout,
      crlfDelay: Number.POSITIVE_INFINITY,
    });
    lines.on("line", (line) => {
      this.handleLine(line);
    });
    lines.on("error", (error) => {
      this.fail(
        new ExecPolicyTransportError(
          `failed to read Codex execpolicy response: ${error.message}`,
          { cause: error },
        ),
      );
    });

    this.ready = this.send<HelloOutput>("hello", {}, undefined, true)
      .then((hello) => this.validateHello(hello))
      .catch((error: unknown) => {
        const normalized =
          error instanceof Error
            ? error
            : new ExecPolicyTransportError(String(error));
        this.fail(normalized);
        throw normalized;
      });
    // Construction may precede Cordis' async class-plugin initializer. Keep an
    // eager failure observed; callers still receive it from ready/operations.
    void this.ready.catch(() => {});
  }

  async hello(signal?: AbortSignal): Promise<HelloOutput> {
    return this.awaitReady(signal);
  }

  async diagnostics(signal?: AbortSignal): Promise<DiagnosticsOutput> {
    await this.awaitReady(signal);
    return this.send("diagnostics", {}, signal);
  }

  async load(params: LoadParams, signal?: AbortSignal): Promise<LoadOutput> {
    await this.awaitReady(signal);
    return this.send("load", params as unknown as JsonValue, signal);
  }

  async loadConfigStack(
    params: LoadConfigStackParams,
    signal?: AbortSignal,
  ): Promise<LoadConfigStackOutput> {
    await this.awaitReady(signal);
    return this.send(
      "load_config_stack",
      params as unknown as JsonValue,
      signal,
    );
  }

  async loadHostConfigStack(
    params: LoadHostConfigStackParams,
    signal?: AbortSignal,
  ): Promise<LoadHostConfigStackOutput> {
    await this.awaitReady(signal);
    return this.send(
      "load_host_config_stack",
      params as unknown as JsonValue,
      signal,
    );
  }

  /** Canonical Codex startup: host discovery, one-shot migration, then policy load. */
  async openHostPolicy(
    params: LoadHostConfigStackParams,
  ): Promise<LoadHostConfigStackOutput> {
    await this.awaitReady();
    return this.send(
      "open_host_policy",
      params as unknown as JsonValue,
      undefined,
    );
  }

  async checkTokens(
    params: CheckTokensParams,
    signal?: AbortSignal,
  ): Promise<CheckTokensOutput> {
    await this.awaitReady(signal);
    return this.send("check_tokens", params as unknown as JsonValue, signal);
  }

  async checkExecApprovalRequirement(
    params: RuntimePolicyInput,
    signal?: AbortSignal,
  ): Promise<RuntimePolicyOutput> {
    await this.awaitReady(signal);
    const value = await this.send<unknown>(
      "check_exec_approval_requirement",
      params as unknown as JsonValue,
      signal,
    );
    try {
      return validateRuntimePolicyOutput(value);
    } catch (error: unknown) {
      const normalized =
        error instanceof Error
          ? error
          : new ExecPolicyTransportError(String(error));
      this.fail(normalized);
      throw normalized;
    }
  }

  async compileNetworkDomains(
    signal?: AbortSignal,
  ): Promise<NetworkDomainsOutput> {
    await this.awaitReady(signal);
    return this.send("compile_network_domains", {}, signal);
  }

  async appendPrefixAmendment(
    params: AppendPrefixParams,
  ): Promise<AppendPrefixOutput> {
    await this.awaitReady();
    return this.send(
      "append_prefix_amendment",
      params as unknown as JsonValue,
      undefined,
    );
  }

  async appendNetworkAmendment(
    params: AppendNetworkParams,
  ): Promise<AppendNetworkOutput> {
    await this.awaitReady();
    return this.send(
      "append_network_amendment",
      params as unknown as JsonValue,
      undefined,
    );
  }

  /** Gracefully stop the engine, then terminate it if its shutdown contract stalls. */
  close(): Promise<void> {
    if (this.closePromise !== undefined) return this.closePromise;
    this.closing = true;
    this.closePromise = this.closeInternal();
    return this.closePromise;
  }

  private async closeInternal(): Promise<void> {
    try {
      await this.ready;
      if (this.terminalError === undefined && !this.closed) {
        await this.send<{ shutdown: true }>("shutdown", {}, undefined, true);
      }
    } catch {
      // A poisoned client is already fail-closed. Disposal still owns process cleanup.
    }
    if (!this.child.stdin.destroyed) this.child.stdin.end();
    if (this.closed) return;

    const exited = await Promise.race([
      this.exitPromise.then(() => true),
      new Promise<false>((resolve) =>
        setTimeout(() => {
          resolve(false);
        }, this.closeTimeoutMs),
      ),
    ]);
    if (!exited && !this.closed) {
      this.child.kill();
      await Promise.race([
        this.exitPromise,
        new Promise<void>((resolve) =>
          setTimeout(resolve, this.closeTimeoutMs),
        ),
      ]);
    }
  }

  private async awaitReady(signal?: AbortSignal): Promise<HelloOutput> {
    if (signal?.aborted === true) throw abortError();
    if (signal === undefined) return this.ready;
    return new Promise<HelloOutput>((resolve, reject) => {
      const onAbort = () => {
        reject(abortError());
      };
      signal.addEventListener("abort", onAbort, { once: true });
      this.ready.then(
        (value) => {
          signal.removeEventListener("abort", onAbort);
          resolve(value);
        },
        (error: unknown) => {
          signal.removeEventListener("abort", onAbort);
          reject(error);
        },
      );
    });
  }

  private send<T>(
    method: string,
    params: JsonValue,
    signal?: AbortSignal,
    allowWhileClosing = false,
  ): Promise<T> {
    if (this.terminalError !== undefined)
      return Promise.reject(this.terminalError);
    if (this.closed || (this.closing && !allowWhileClosing))
      return Promise.reject(new ExecPolicyClientClosedError());
    if (signal?.aborted === true) return Promise.reject(abortError());
    if (this.pending.size + this.abandoned.size >= this.maxPendingRequests) {
      return Promise.reject(
        new ExecPolicyTransportError(
          `Codex execpolicy request limit exceeded (${this.maxPendingRequests} pending or awaiting abandoned replies)`,
        ),
      );
    }
    const id = ++this.requestId;
    const request: ProtocolRequest = {
      protocolVersion: EXECPOLICY_PROTOCOL_VERSION,
      id,
      method,
      params,
    };

    return new Promise<T>((resolve, reject) => {
      const onAbort = () => {
        const pending = this.pending.get(id);
        if (pending === undefined) return;
        this.pending.delete(id);
        this.abandoned.add(id);
        pending.removeAbortListener();
        pending.reject(abortError());
      };
      const removeAbortListener = () => {
        signal?.removeEventListener("abort", onAbort);
      };
      this.pending.set(id, {
        resolve: (value) => {
          resolve(value as T);
        },
        reject,
        removeAbortListener,
      });
      signal?.addEventListener("abort", onAbort, { once: true });

      const line = `${JSON.stringify(request)}\n`;
      this.child.stdin.write(line, (error) => {
        if (error === null || error === undefined) return;
        this.fail(
          new ExecPolicyTransportError(
            `failed to write Codex execpolicy request: ${error.message}`,
            { cause: error },
          ),
        );
      });
    });
  }

  private handleLine(line: string): void {
    if (Buffer.byteLength(line, "utf8") > this.maxResponseLineBytes) {
      this.fail(
        new ExecPolicyTransportError(
          `Codex execpolicy response exceeds ${this.maxResponseLineBytes} bytes`,
        ),
      );
      return;
    }
    let response: unknown;
    try {
      response = JSON.parse(line) as unknown;
    } catch (error: unknown) {
      this.fail(
        new ExecPolicyTransportError("Codex execpolicy emitted invalid JSON", {
          cause: error instanceof Error ? error : undefined,
        }),
      );
      return;
    }
    if (
      !isRecord(response) ||
      response.protocolVersion !== EXECPOLICY_PROTOCOL_VERSION ||
      !Number.isSafeInteger(response.id)
    ) {
      this.fail(
        new ExecPolicyTransportError(
          "Codex execpolicy emitted a malformed protocol response",
        ),
      );
      return;
    }
    const id = response.id as number;
    if (this.abandoned.delete(id)) return;
    const pending = this.pending.get(id);
    if (pending === undefined) {
      this.fail(
        new ExecPolicyTransportError(
          `Codex execpolicy replied with unknown request id ${id}`,
        ),
      );
      return;
    }
    this.pending.delete(id);
    pending.removeAbortListener();

    const hasResult = Object.hasOwn(response, "result");
    const hasError = Object.hasOwn(response, "error");
    if (hasResult === hasError) {
      const error = new ExecPolicyTransportError(
        "Codex execpolicy response must contain exactly one of result or error",
      );
      pending.reject(error);
      this.fail(error);
      return;
    }
    if (hasError) {
      const body = response.error;
      if (
        !isRecord(body) ||
        typeof body.code !== "string" ||
        typeof body.message !== "string"
      ) {
        const error = new ExecPolicyTransportError(
          "Codex execpolicy emitted a malformed error response",
        );
        pending.reject(error);
        this.fail(error);
        return;
      }
      pending.reject(
        new ExecPolicyEngineError({
          code: body.code,
          message: body.message,
          ...(Object.hasOwn(body, "data")
            ? { data: body.data as JsonValue }
            : {}),
        }),
      );
      return;
    }
    pending.resolve(response.result);
  }

  private validateHello(hello: HelloOutput): HelloOutput {
    if (!isRecord(hello))
      throw new ExecPolicyTransportError(
        "Codex execpolicy hello is not an object",
      );
    const mismatches: string[] = [];
    const expect = (field: keyof HelloOutput, expected: string | number) => {
      if (hello[field] !== expected)
        mismatches.push(
          `${field}: expected ${expected}, got ${String(hello[field])}`,
        );
    };
    expect("protocolVersion", EXECPOLICY_PROTOCOL_VERSION);
    expect("codexCommit", PINNED_CODEX_COMMIT);
    expect("execpolicyTree", PINNED_EXECPOLICY_TREE);
    expect("shellCommandTree", PINNED_SHELL_COMMAND_TREE);
    expect("configTree", PINNED_CONFIG_TREE);
    expect("execServerTree", PINNED_EXEC_SERVER_TREE);
    expect("utilsCliTree", PINNED_UTILS_CLI_TREE);
    expect("utilsHomeDirTree", PINNED_UTILS_HOME_DIR_TREE);
    expect("cargoLockBlob", PINNED_CARGO_LOCK_BLOB);
    expect("coreExecPolicyBlob", PINNED_CORE_EXEC_POLICY_BLOB);
    expect("coreExecPolicyDirTree", PINNED_CORE_EXEC_POLICY_DIR_TREE);
    if (typeof hello.engineVersion !== "string" || !hello.engineVersion) {
      mismatches.push("engineVersion: expected a non-empty string");
    }
    const expectedOs = RUST_OS_BY_NODE_PLATFORM[process.platform];
    const expectedArch = RUST_ARCH_BY_NODE_ARCH[process.arch];
    if (expectedOs === undefined) {
      mismatches.push(`os: unsupported Node platform ${process.platform}`);
    } else {
      expect("os", expectedOs);
    }
    if (expectedArch === undefined) {
      mismatches.push(`arch: unsupported Node architecture ${process.arch}`);
    } else {
      expect("arch", expectedArch);
    }
    if (mismatches.length > 0) {
      throw new ExecPolicyTransportError(
        `Codex execpolicy provenance handshake failed: ${mismatches.join("; ")}`,
      );
    }
    return hello;
  }

  private captureStderr(chunk: Buffer | string): void {
    const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    this.stderrTail = Buffer.concat([this.stderrTail, bytes]);
    if (this.stderrTail.length > this.maxStderrBytes) {
      this.stderrTail = this.stderrTail.subarray(
        this.stderrTail.length - this.maxStderrBytes,
      );
    }
  }

  private handleClose(
    code: number | null,
    signal: NodeJS.Signals | null,
  ): void {
    if (this.closed) return;
    this.closed = true;
    this.resolveExit();
    if (this.closing && this.pending.size === 0) return;
    const status =
      signal === null ? `exit code ${String(code)}` : `signal ${signal}`;
    this.fail(
      new ExecPolicyTransportError(
        `Codex execpolicy engine exited unexpectedly with ${status}${formatStderr(this.stderrTail.toString("utf8"))}`,
      ),
    );
  }

  private fail(error: Error): void {
    if (this.terminalError !== undefined) return;
    this.terminalError = error;
    for (const pending of this.pending.values()) {
      pending.removeAbortListener();
      pending.reject(error);
    }
    this.pending.clear();
    this.abandoned.clear();
    if (!this.closed) this.child.kill();
  }
}
