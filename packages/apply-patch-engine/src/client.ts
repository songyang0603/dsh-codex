import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { chmodSync, existsSync, statSync } from "node:fs";
import { createInterface } from "node:readline";
import { fileURLToPath } from "node:url";
import {
  APPLY_PATCH_FILESYSTEM,
  APPLY_PATCH_METHODS,
  APPLY_PATCH_MODES,
  APPLY_PATCH_PROTOCOL_VERSION,
  APPLY_PATCH_SANDBOX,
  APPLY_PATCH_SCOPE,
  PINNED_APPLY_PATCH_LIB_BLOB,
  PINNED_APPLY_PATCH_FILE_UPDATE_BLOB,
  PINNED_APPLY_PATCH_INVOCATION_BLOB,
  PINNED_APPLY_PATCH_PACKAGE,
  PINNED_APPLY_PATCH_PARSER_BLOB,
  PINNED_APPLY_PATCH_SEEK_SEQUENCE_BLOB,
  PINNED_APPLY_PATCH_STREAMING_PARSER_BLOB,
  PINNED_APPLY_PATCH_TEXT_FILE_BLOB,
  PINNED_APPLY_PATCH_TREE,
  PINNED_APPLY_PATCH_VERSION,
  PINNED_CODEX_CARGO_LOCK_BLOB,
  PINNED_CODEX_COMMIT,
  PINNED_CODEX_REPOSITORY,
  type ApplyPatchHelloOutput,
  type ApplyPatchOutput,
  type ApplyPatchParams,
  type JsonValue,
  type ParsePatchOutput,
  type ParsePatchParams,
  type ProtocolErrorBody,
  type ShutdownOutput,
  type StreamParsePatchOutput,
  type StreamParsePatchParams,
  type VerifyInvocationParams,
  type VerifyPatchOutput,
  type VerifyPatchParams,
} from "./types.js";
import {
  ApplyPatchProtocolShapeError,
  isRecord,
  validateApplyPatchOutput,
  validateParsePatchOutput,
  validateStreamParsePatchOutput,
  validateVerifyPatchOutput,
} from "./validation.js";

const DEFAULT_SHUTDOWN_TIMEOUT_MS = 1_000;
const DEFAULT_MAX_STDERR_BYTES = 16 * 1024;
// The pinned apply-patch API declares no smaller semantic input/output or
// concurrency limit. Keep optional operational caps configurable without
// imposing an adapter-owned default below the host runtime's own capacity.
const DEFAULT_MAX_RESPONSE_LINE_BYTES = Number.MAX_SAFE_INTEGER;
const DEFAULT_MAX_PENDING_REQUESTS = Number.MAX_SAFE_INTEGER;

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
  protocolVersion: typeof APPLY_PATCH_PROTOCOL_VERSION;
  id: number;
  method: string;
  params: JsonValue;
}

type TerminalResult<T> = { ok: true; value: T } | { ok: false; error: Error };

interface TrackedRequest<T> {
  caller: Promise<T>;
  terminal: Promise<TerminalResult<T>>;
}

interface PendingRequest {
  callerSettled: boolean;
  resolveCaller(value: unknown): void;
  rejectCaller(error: Error): void;
  settleTerminal(result: TerminalResult<unknown>): void;
  removeAbortListener(): void;
}

/** Process and framing options for the pinned apply-patch sidecar. */
export interface ApplyPatchClientOptions {
  /** Explicit engine executable. Falls back to DSH_CODEX_APPLY_PATCH_ENGINE, a packaged binary, then repository builds. */
  enginePath?: string;
  /** Optional argv for a wrapper executable. The canonical engine takes none. */
  engineArgs?: readonly string[];
  /** Grace period after quiescence for the acknowledged shutdown to exit. */
  shutdownTimeoutMs?: number;
  /** Tail of stderr retained for transport diagnostics. */
  maxStderrBytes?: number;
  /** Optional operational cap for an accepted JSONL response line. */
  maxResponseLineBytes?: number;
  /** Optional operational cap for requests whose response is not terminal. */
  maxPendingRequests?: number;
}

/** An RPC error returned by the Rust engine in a valid response. */
export class ApplyPatchEngineError extends Error {
  readonly code: string;

  constructor(body: ProtocolErrorBody) {
    super(body.message);
    this.name = "ApplyPatchEngineError";
    this.code = body.code;
  }
}

/** A sidecar lifecycle, framing, or provenance-integrity failure. */
export class ApplyPatchTransportError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "ApplyPatchTransportError";
  }
}

/** A request attempted after service shutdown closed admission. */
export class ApplyPatchClientClosedError extends Error {
  constructor() {
    super("the Codex apply-patch sidecar is closing or closed");
    this.name = "ApplyPatchClientClosedError";
  }
}

/**
 * The mutation reached the sidecar but its exact terminal delta became
 * unavailable. Callers must treat the filesystem effect as unknown.
 */
export class ApplyPatchUnknownEffectError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "ApplyPatchUnknownEffectError";
  }
}

function abortError(): Error {
  const error = new Error("the Codex apply-patch request was aborted");
  error.name = "AbortError";
  return error;
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
    ? "dsh-codex-apply-patch-engine.exe"
    : "dsh-codex-apply-patch-engine";
}

function packagedEnginePath(): string {
  return fileURLToPath(
    new URL(
      `../native/${process.platform}-${process.arch}/${engineFilename()}`,
      import.meta.url,
    ),
  );
}

function candidateEnginePaths(): string[] {
  return [
    packagedEnginePath(),
    fileURLToPath(
      new URL(`../../../target/release/${engineFilename()}`, import.meta.url),
    ),
    fileURLToPath(
      new URL(`../../../target/debug/${engineFilename()}`, import.meta.url),
    ),
  ];
}

/** Resolve the sidecar without ever falling back to the installed Codex CLI. */
export function resolveApplyPatchEnginePath(explicit?: string): string {
  const configured = explicit ?? process.env.DSH_CODEX_APPLY_PATCH_ENGINE;
  const candidates =
    configured === undefined ? candidateEnginePaths() : [configured];
  for (const candidate of candidates) {
    if (!existsSync(candidate) || !statSync(candidate).isFile()) continue;
    if (process.platform !== "win32") {
      const mode = statSync(candidate).mode;
      if ((mode & 0o111) === 0) chmodSync(candidate, mode | 0o100);
    }
    return candidate;
  }
  throw new ApplyPatchTransportError(
    configured === undefined
      ? `cannot find ${engineFilename()}; build the pinned native workspace or install a package containing native/${process.platform}-${process.arch}`
      : `configured Codex apply-patch engine is not a file: ${configured}`,
  );
}

function formatStderr(stderr: string): string {
  const trimmed = stderr.trim();
  return trimmed.length === 0 ? "" : `; stderr: ${trimmed}`;
}

function arraysEqual(
  actual: readonly string[],
  expected: readonly string[],
): boolean {
  return (
    actual.length === expected.length &&
    actual.every((value, index) => value === expected[index])
  );
}

/**
 * Strict, provenance-checked client for one long-running apply-patch sidecar.
 * Mutation admission is serialized and remains owner-visible after caller
 * cancellation until the native response reaches a terminal state.
 */
export class ApplyPatchClient {
  readonly ready: Promise<ApplyPatchHelloOutput>;

  private readonly child: ChildProcessWithoutNullStreams;
  private readonly shutdownTimeoutMs: number;
  private readonly maxStderrBytes: number;
  private readonly maxResponseLineBytes: number;
  private readonly maxPendingRequests: number;
  private readonly pending = new Map<number, PendingRequest>();
  private readonly inFlight = new Set<Promise<void>>();
  private readonly exitPromise: Promise<void>;
  private resolveExit!: () => void;
  private requestId = 0;
  private stderrTail = Buffer.alloc(0);
  private terminalError: Error | undefined;
  private closing = false;
  private closed = false;
  private closePromise: Promise<void> | undefined;
  private mutationTail: Promise<void> = Promise.resolve();

  constructor(options: ApplyPatchClientOptions = {}) {
    this.shutdownTimeoutMs = positiveInteger(
      options.shutdownTimeoutMs,
      DEFAULT_SHUTDOWN_TIMEOUT_MS,
      "shutdownTimeoutMs",
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

    const enginePath = resolveApplyPatchEnginePath(options.enginePath);
    this.child = spawn(enginePath, [...(options.engineArgs ?? [])], {
      stdio: ["pipe", "pipe", "pipe"],
      windowsHide: true,
    });
    this.exitPromise = new Promise<void>((resolve) => {
      this.resolveExit = resolve;
    });
    this.child.stderr.on("data", (chunk: Buffer | string) => {
      this.captureStderr(chunk);
    });
    this.child.on("error", (error) => {
      this.fail(
        new ApplyPatchTransportError(
          `failed to run Codex apply-patch engine: ${error.message}`,
          { cause: error },
        ),
      );
    });
    this.child.on("close", (code, signal) => {
      this.handleClose(code, signal);
    });

    const lines = createInterface({
      input: this.child.stdout,
      crlfDelay: Infinity,
    });
    lines.on("line", (line) => {
      this.handleLine(line);
    });

    const hello = this.sendTracked<unknown>(
      "hello",
      {},
      undefined,
      true,
    ).caller;
    this.ready = hello
      .then((value) => this.validateHello(value))
      .catch((error: unknown) => {
        const normalized =
          error instanceof Error
            ? error
            : new ApplyPatchTransportError(String(error));
        this.fail(normalized);
        throw normalized;
      });
    void this.ready.catch(() => {});
  }

  async hello(signal?: AbortSignal): Promise<ApplyPatchHelloOutput> {
    return this.awaitReady(signal);
  }

  async parse(
    params: ParsePatchParams,
    signal?: AbortSignal,
  ): Promise<ParsePatchOutput> {
    await this.awaitReady(signal);
    const value = await this.sendTracked<unknown>(
      "parse",
      params as unknown as JsonValue,
      signal,
    ).caller;
    return this.validateOrPoison(value, validateParsePatchOutput);
  }

  async streamParse(
    params: StreamParsePatchParams,
    signal?: AbortSignal,
  ): Promise<StreamParsePatchOutput> {
    await this.awaitReady(signal);
    const value = await this.sendTracked<unknown>(
      "stream_parse",
      params as unknown as JsonValue,
      signal,
    ).caller;
    return this.validateOrPoison(value, validateStreamParsePatchOutput);
  }

  async verifyPatch(
    params: VerifyPatchParams,
    signal?: AbortSignal,
  ): Promise<VerifyPatchOutput> {
    await this.awaitReady(signal);
    const value = await this.sendTracked<unknown>(
      "verify_patch",
      params as unknown as JsonValue,
      signal,
    ).caller;
    return this.validateOrPoison(value, validateVerifyPatchOutput);
  }

  async verifyInvocation(
    params: VerifyInvocationParams,
    signal?: AbortSignal,
  ): Promise<VerifyPatchOutput> {
    await this.awaitReady(signal);
    const value = await this.sendTracked<unknown>(
      "verify_invocation",
      params as unknown as JsonValue,
      signal,
    ).caller;
    return this.validateOrPoison(value, validateVerifyPatchOutput);
  }

  /**
   * Admit one mutation in call order. Once sent, cancellation rejects only the
   * caller-facing promise; serialization and shutdown still await the exact
   * terminal response.
   */
  applyPatch(
    params: ApplyPatchParams,
    signal?: AbortSignal,
  ): Promise<ApplyPatchOutput> {
    if (this.terminalError !== undefined)
      return Promise.reject(this.terminalError);
    if (this.closing || this.closed) {
      return Promise.reject(new ApplyPatchClientClosedError());
    }
    if (signal?.aborted === true) return Promise.reject(abortError());

    let settled = false;
    let cancelledBeforeSend = false;
    let resolveCaller!: (value: ApplyPatchOutput) => void;
    let rejectCaller!: (error: Error) => void;
    const caller = new Promise<ApplyPatchOutput>((resolve, reject) => {
      resolveCaller = resolve;
      rejectCaller = reject;
    });
    const settleResolve = (value: ApplyPatchOutput) => {
      if (settled) return;
      settled = true;
      resolveCaller(value);
    };
    const settleReject = (error: Error) => {
      if (settled) return;
      settled = true;
      rejectCaller(error);
    };
    const onQueuedAbort = () => {
      cancelledBeforeSend = true;
      settleReject(abortError());
    };
    signal?.addEventListener("abort", onQueuedAbort, { once: true });

    const ownerOperation = this.mutationTail.then(async () => {
      if (cancelledBeforeSend) return;
      try {
        await this.ready;
      } catch (error: unknown) {
        signal?.removeEventListener("abort", onQueuedAbort);
        settleReject(
          error instanceof Error
            ? error
            : new ApplyPatchTransportError(String(error)),
        );
        return;
      }
      if (cancelledBeforeSend || signal?.aborted === true) return;
      signal?.removeEventListener("abort", onQueuedAbort);

      const tracked = this.sendTracked<unknown>(
        "apply_patch",
        params as unknown as JsonValue,
        signal,
        true,
      );
      void tracked.caller.then(
        (value) => {
          try {
            settleResolve(
              this.validateOrPoison(value, validateApplyPatchOutput),
            );
          } catch (error: unknown) {
            const normalized =
              error instanceof Error
                ? error
                : new ApplyPatchTransportError(String(error));
            settleReject(
              new ApplyPatchUnknownEffectError(
                "Codex apply-patch mutation reached a terminal response whose committed delta could not be trusted",
                { cause: normalized },
              ),
            );
          }
        },
        (error: unknown) => {
          const normalized =
            error instanceof Error
              ? error
              : new ApplyPatchTransportError(String(error));
          if (normalized.name === "AbortError") {
            settleReject(normalized);
          } else if (normalized instanceof ApplyPatchEngineError) {
            settleReject(normalized);
          } else {
            settleReject(
              new ApplyPatchUnknownEffectError(
                "lost the exact terminal result of a Codex apply-patch mutation",
                { cause: normalized },
              ),
            );
          }
        },
      );
      await tracked.terminal;
    });
    this.mutationTail = ownerOperation.catch(() => {});
    return caller;
  }

  /** Idempotently close admission, drain accepted work, and stop the sidecar. */
  shutdown(): Promise<void> {
    return this.close();
  }

  close(): Promise<void> {
    if (this.closePromise !== undefined) return this.closePromise;
    this.closing = true;
    this.closePromise = this.closeInternal();
    return this.closePromise;
  }

  private async closeInternal(): Promise<void> {
    try {
      await this.ready;
    } catch {
      // The poisoned client has already settled every owned request.
    }

    // Calls accepted before admission closed remain service-owned even when
    // their callers detached. Never kill the process while one can mutate.
    await this.mutationTail;
    await Promise.all([...this.inFlight]);

    if (this.terminalError === undefined && !this.closed) {
      try {
        await this.sendTracked<ShutdownOutput>("shutdown", {}, undefined, true)
          .caller;
      } catch {
        // Transport failure has already poisoned and settled the client.
      }
    }
    if (!this.child.stdin.destroyed) this.child.stdin.end();
    if (this.closed) return;

    const exited = await Promise.race([
      this.exitPromise.then(() => true),
      new Promise<false>((resolve) =>
        setTimeout(() => resolve(false), this.shutdownTimeoutMs),
      ),
    ]);
    if (!exited && !this.closed) {
      // All admitted mutation responses were terminal before this timeout.
      this.child.kill();
      await Promise.race([
        this.exitPromise,
        new Promise<void>((resolve) =>
          setTimeout(resolve, this.shutdownTimeoutMs),
        ),
      ]);
    }
  }

  private async awaitReady(
    signal?: AbortSignal,
  ): Promise<ApplyPatchHelloOutput> {
    if (signal?.aborted === true) throw abortError();
    if (signal === undefined) return this.ready;
    return new Promise<ApplyPatchHelloOutput>((resolve, reject) => {
      const onAbort = () => reject(abortError());
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

  private sendTracked<T>(
    method: string,
    params: JsonValue,
    signal?: AbortSignal,
    allowWhileClosing = false,
  ): TrackedRequest<T> {
    if (this.terminalError !== undefined) {
      return this.rejectedTracked(this.terminalError);
    }
    if (this.closed || (this.closing && !allowWhileClosing)) {
      return this.rejectedTracked(new ApplyPatchClientClosedError());
    }
    if (signal?.aborted === true) return this.rejectedTracked(abortError());
    if (this.pending.size >= this.maxPendingRequests) {
      return this.rejectedTracked(
        new ApplyPatchTransportError(
          `Codex apply-patch request limit exceeded (${this.maxPendingRequests} non-terminal requests)`,
        ),
      );
    }

    const id = ++this.requestId;
    const request: ProtocolRequest = {
      protocolVersion: APPLY_PATCH_PROTOCOL_VERSION,
      id,
      method,
      params,
    };

    let resolveCaller!: (value: T) => void;
    let rejectCaller!: (error: Error) => void;
    const caller = new Promise<T>((resolve, reject) => {
      resolveCaller = resolve;
      rejectCaller = reject;
    });
    let settleTerminal!: (result: TerminalResult<T>) => void;
    const terminal = new Promise<TerminalResult<T>>((resolve) => {
      settleTerminal = resolve;
    });
    const ownerTerminal = terminal.then(() => {});
    this.inFlight.add(ownerTerminal);
    void ownerTerminal.finally(() => {
      this.inFlight.delete(ownerTerminal);
    });

    const pending: PendingRequest = {
      callerSettled: false,
      resolveCaller: (value) => {
        if (pending.callerSettled) return;
        pending.callerSettled = true;
        resolveCaller(value as T);
      },
      rejectCaller: (error) => {
        if (pending.callerSettled) return;
        pending.callerSettled = true;
        rejectCaller(error);
      },
      settleTerminal: (result) => {
        settleTerminal(result as TerminalResult<T>);
      },
      removeAbortListener: () => {
        signal?.removeEventListener("abort", onAbort);
      },
    };
    const onAbort = () => {
      pending.rejectCaller(abortError());
    };
    this.pending.set(id, pending);
    signal?.addEventListener("abort", onAbort, { once: true });

    const line = `${JSON.stringify(request)}\n`;
    this.child.stdin.write(line, (error) => {
      if (error === null || error === undefined) return;
      this.fail(
        new ApplyPatchTransportError(
          `failed to write Codex apply-patch request: ${error.message}`,
          { cause: error },
        ),
      );
    });
    return { caller, terminal };
  }

  private rejectedTracked<T>(error: Error): TrackedRequest<T> {
    return {
      caller: Promise.reject(error),
      terminal: Promise.resolve({ ok: false, error }),
    };
  }

  private handleLine(line: string): void {
    if (Buffer.byteLength(line, "utf8") > this.maxResponseLineBytes) {
      this.fail(
        new ApplyPatchTransportError(
          `Codex apply-patch response exceeds ${this.maxResponseLineBytes} bytes`,
        ),
      );
      return;
    }
    let response: unknown;
    try {
      response = JSON.parse(line) as unknown;
    } catch (error: unknown) {
      this.fail(
        new ApplyPatchTransportError(
          "Codex apply-patch engine emitted invalid JSON",
          { cause: error instanceof Error ? error : undefined },
        ),
      );
      return;
    }
    if (
      !isRecord(response) ||
      response.protocolVersion !== APPLY_PATCH_PROTOCOL_VERSION ||
      !Number.isSafeInteger(response.id)
    ) {
      this.fail(
        new ApplyPatchTransportError(
          "Codex apply-patch engine emitted a malformed protocol response",
        ),
      );
      return;
    }
    const keys = Object.keys(response);
    const hasResult = Object.hasOwn(response, "result");
    const hasError = Object.hasOwn(response, "error");
    if (
      hasResult === hasError ||
      keys.some(
        (key) =>
          key !== "protocolVersion" &&
          key !== "id" &&
          key !== "result" &&
          key !== "error",
      )
    ) {
      this.fail(
        new ApplyPatchTransportError(
          "Codex apply-patch response must contain exactly one of result or error and no unknown fields",
        ),
      );
      return;
    }

    const id = response.id as number;
    const pending = this.pending.get(id);
    if (pending === undefined) {
      this.fail(
        new ApplyPatchTransportError(
          `Codex apply-patch engine replied with unknown request id ${id}`,
        ),
      );
      return;
    }
    this.pending.delete(id);
    pending.removeAbortListener();

    if (hasError) {
      const body = response.error;
      if (
        !isRecord(body) ||
        Object.keys(body).some((key) => key !== "code" && key !== "message") ||
        typeof body.code !== "string" ||
        typeof body.message !== "string"
      ) {
        const error = new ApplyPatchTransportError(
          "Codex apply-patch engine emitted a malformed error response",
        );
        pending.rejectCaller(error);
        pending.settleTerminal({ ok: false, error });
        this.fail(error);
        return;
      }
      const error = new ApplyPatchEngineError({
        code: body.code,
        message: body.message,
      });
      pending.rejectCaller(error);
      pending.settleTerminal({ ok: false, error });
      return;
    }

    pending.resolveCaller(response.result);
    pending.settleTerminal({ ok: true, value: response.result as JsonValue });
  }

  private validateHello(value: unknown): ApplyPatchHelloOutput {
    if (!isRecord(value)) {
      throw new ApplyPatchTransportError(
        "Codex apply-patch hello is not an object",
      );
    }
    const expectedKeys = [
      "protocolVersion",
      "engineVersion",
      "codexRepository",
      "codexCommit",
      "codexApplyPatchPackage",
      "codexApplyPatchVersion",
      "codexApplyPatchTree",
      "codexApplyPatchLibBlob",
      "codexApplyPatchParserBlob",
      "codexApplyPatchStreamingParserBlob",
      "codexApplyPatchInvocationBlob",
      "codexApplyPatchFileUpdateBlob",
      "codexApplyPatchTextFileBlob",
      "codexApplyPatchSeekSequenceBlob",
      "codexCargoLockBlob",
      "os",
      "arch",
      "pointerWidth",
      "filesystem",
      "sandbox",
      "scope",
      "methods",
      "modes",
    ];
    const keys = Object.keys(value);
    const mismatches: string[] = [];
    if (
      keys.length !== expectedKeys.length ||
      expectedKeys.some((key) => !Object.hasOwn(value, key))
    ) {
      mismatches.push("hello fields do not match the protocol-v1 identity set");
    }
    const expect = (field: string, expected: string | number) => {
      if (value[field] !== expected) {
        mismatches.push(
          `${field}: expected ${String(expected)}, got ${String(value[field])}`,
        );
      }
    };
    expect("protocolVersion", APPLY_PATCH_PROTOCOL_VERSION);
    expect("codexRepository", PINNED_CODEX_REPOSITORY);
    expect("codexCommit", PINNED_CODEX_COMMIT);
    expect("codexApplyPatchPackage", PINNED_APPLY_PATCH_PACKAGE);
    expect("codexApplyPatchVersion", PINNED_APPLY_PATCH_VERSION);
    expect("codexApplyPatchTree", PINNED_APPLY_PATCH_TREE);
    expect("codexApplyPatchLibBlob", PINNED_APPLY_PATCH_LIB_BLOB);
    expect("codexApplyPatchParserBlob", PINNED_APPLY_PATCH_PARSER_BLOB);
    expect(
      "codexApplyPatchStreamingParserBlob",
      PINNED_APPLY_PATCH_STREAMING_PARSER_BLOB,
    );
    expect("codexApplyPatchInvocationBlob", PINNED_APPLY_PATCH_INVOCATION_BLOB);
    expect(
      "codexApplyPatchFileUpdateBlob",
      PINNED_APPLY_PATCH_FILE_UPDATE_BLOB,
    );
    expect("codexApplyPatchTextFileBlob", PINNED_APPLY_PATCH_TEXT_FILE_BLOB);
    expect(
      "codexApplyPatchSeekSequenceBlob",
      PINNED_APPLY_PATCH_SEEK_SEQUENCE_BLOB,
    );
    expect("codexCargoLockBlob", PINNED_CODEX_CARGO_LOCK_BLOB);
    expect("filesystem", APPLY_PATCH_FILESYSTEM);
    expect("sandbox", APPLY_PATCH_SANDBOX);
    expect("scope", APPLY_PATCH_SCOPE);
    expect("pointerWidth", 64);
    if (
      typeof value.engineVersion !== "string" ||
      value.engineVersion.length === 0
    ) {
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
    if (
      !Array.isArray(value.methods) ||
      !value.methods.every((entry) => typeof entry === "string") ||
      !arraysEqual(value.methods as string[], APPLY_PATCH_METHODS)
    ) {
      mismatches.push(
        "methods: expected the exact protocol-v1 method set and order",
      );
    }
    if (
      !Array.isArray(value.modes) ||
      !value.modes.every((entry) => typeof entry === "string") ||
      !arraysEqual(value.modes as string[], APPLY_PATCH_MODES)
    ) {
      mismatches.push("modes: expected the exact update-mode set and order");
    }
    if (mismatches.length > 0) {
      throw new ApplyPatchTransportError(
        `Codex apply-patch provenance handshake failed: ${mismatches.join("; ")}`,
      );
    }
    return value as unknown as ApplyPatchHelloOutput;
  }

  private validateOrPoison<T>(
    value: unknown,
    validator: (candidate: unknown) => T,
  ): T {
    try {
      return validator(value);
    } catch (error: unknown) {
      const normalized =
        error instanceof ApplyPatchProtocolShapeError
          ? new ApplyPatchTransportError(error.message, { cause: error })
          : error instanceof Error
            ? error
            : new ApplyPatchTransportError(String(error));
      this.fail(normalized);
      throw normalized;
    }
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
      new ApplyPatchTransportError(
        `Codex apply-patch engine exited unexpectedly with ${status}${formatStderr(this.stderrTail.toString("utf8"))}`,
      ),
    );
  }

  private fail(error: Error): void {
    if (this.terminalError !== undefined) return;
    this.terminalError = error;
    for (const pending of this.pending.values()) {
      pending.removeAbortListener();
      pending.rejectCaller(error);
      pending.settleTerminal({ ok: false, error });
    }
    this.pending.clear();
    if (!this.closed) this.child.kill();
  }
}
