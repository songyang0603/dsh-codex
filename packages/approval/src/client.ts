import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { chmodSync, existsSync, statSync } from "node:fs";
import { createInterface } from "node:readline";
import { fileURLToPath } from "node:url";
import {
  APPROVAL_PARSE_REQUEST_METHOD,
  APPROVAL_PARSE_RESPONSE_METHOD,
  APPROVAL_PROTOCOL_VERSION,
  PINNED_APP_SERVER_PROTOCOL_PACKAGE,
  PINNED_APP_SERVER_PROTOCOL_TREE,
  PINNED_APP_SERVER_PROTOCOL_V2_TREE,
  PINNED_APP_SERVER_PROTOCOL_VERSION,
  PINNED_CODEX_CARGO_LOCK_BLOB,
  PINNED_CODEX_COMMIT,
  PINNED_CODEX_REPOSITORY,
  PINNED_COMMAND_APPROVAL_ITEM_BLOB,
  PINNED_COMMAND_APPROVAL_PERMISSIONS_BLOB,
  type ApprovalProtocolHello,
  type ApprovalProtocolIntegerLexeme,
  type ApprovalProtocolParseResult,
  type ApprovalProtocolRejected,
  type ApprovalProtocolSubjectError,
  type CommandExecutionRequestApprovalParams,
  type CommandExecutionRequestApprovalResponse,
} from "./types.js";

const DEFAULT_CLOSE_TIMEOUT_MS = 1_000;
const DEFAULT_MAX_STDERR_BYTES = 16 * 1024;
// Pinned Codex's serde surface has no corresponding 8 MiB subject limit. Keep
// the optional operational caps configurable, but do not reject an otherwise
// valid upstream request by default. JavaScript strings are bounded far below
// MAX_SAFE_INTEGER by the runtime itself.
const DEFAULT_MAX_RESPONSE_LINE_BYTES = Number.MAX_SAFE_INTEGER;
const DEFAULT_MAX_RAW_JSON_BYTES = Number.MAX_SAFE_INTEGER;
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
const POINTER_WIDTH_BY_NODE_ARCH: Readonly<Record<string, number>> = {
  arm64: 64,
  x64: 64,
};

interface ProtocolRequest {
  protocolVersion: typeof APPROVAL_PROTOCOL_VERSION;
  id: number;
  method: string;
  params: Record<string, unknown>;
}

interface PendingRequest {
  resolve(value: unknown): void;
  reject(error: Error): void;
  removeAbortListener(): void;
}

interface ProtocolErrorBody {
  code: string;
  message: string;
}

/** Process and framing options for the lossless pinned approval sidecar. */
export interface ApprovalProtocolClientOptions {
  /** Explicit executable. Otherwise resolve the env override, packaged native artifact, then repository builds. */
  enginePath?: string;
  /** Optional argv for a wrapper executable. The canonical engine takes no arguments. */
  engineArgs?: readonly string[];
  closeTimeoutMs?: number;
  maxStderrBytes?: number;
  maxResponseLineBytes?: number;
  maxRawJsonBytes?: number;
  maxPendingRequests?: number;
}

/** A valid JSONL response carrying an engine-level RPC error. */
export class ApprovalProtocolEngineError extends Error {
  readonly code: string;

  constructor(body: ProtocolErrorBody) {
    super(body.message);
    this.name = "ApprovalProtocolEngineError";
    this.code = body.code;
  }
}

/** A process, framing, validation, or provenance-integrity failure. */
export class ApprovalProtocolTransportError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "ApprovalProtocolTransportError";
  }
}

/** An operation attempted after owner-visible sidecar shutdown began. */
export class ApprovalProtocolClientClosedError extends Error {
  constructor() {
    super("the Codex approval protocol sidecar is closing or closed");
    this.name = "ApprovalProtocolClientClosedError";
  }
}

function abortError(): Error {
  const error = new Error("the Codex approval protocol request was aborted");
  error.name = "AbortError";
  return error;
}

function positiveInteger(
  value: number | undefined,
  fallback: number,
  name: string,
): number {
  const candidate = value ?? fallback;
  if (!Number.isSafeInteger(candidate) || candidate <= 0) {
    throw new TypeError(`${name} must be a positive safe integer`);
  }
  return candidate;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function engineFilename(): string {
  return process.platform === "win32"
    ? "dsh-codex-approval-protocol-engine.exe"
    : "dsh-codex-approval-protocol-engine";
}

/** Absolute package-local native path for the current platform and architecture. */
export function packagedApprovalProtocolEnginePath(): string {
  return fileURLToPath(
    new URL(
      `../native/${process.platform}-${process.arch}/${engineFilename()}`,
      import.meta.url,
    ),
  );
}

function ensurePackagedEngineExecutable(enginePath: string): void {
  if (
    process.platform === "win32" ||
    enginePath !== packagedApprovalProtocolEnginePath()
  ) {
    return;
  }
  try {
    const mode = statSync(enginePath).mode & 0o777;
    if ((mode & 0o100) === 0) chmodSync(enginePath, mode | 0o100);
  } catch (cause) {
    throw new ApprovalProtocolTransportError(
      `failed to make the packaged Codex approval protocol engine executable: ${enginePath}`,
      { cause },
    );
  }
}

/** Resolve the native engine without a shell or PATH lookup. */
export function resolveApprovalProtocolEnginePath(explicit?: string): string {
  if (explicit !== undefined) {
    if (explicit.length === 0)
      throw new TypeError("enginePath must not be empty");
    return explicit;
  }
  const fromEnvironment = process.env.DSH_CODEX_APPROVAL_PROTOCOL_ENGINE;
  if (fromEnvironment !== undefined && fromEnvironment.length > 0) {
    return fromEnvironment;
  }

  const candidates = [
    packagedApprovalProtocolEnginePath(),
    fileURLToPath(
      new URL(`../../../target/debug/${engineFilename()}`, import.meta.url),
    ),
    fileURLToPath(
      new URL(`../../../target/release/${engineFilename()}`, import.meta.url),
    ),
  ];
  const candidate = candidates.find((path) => existsSync(path));
  if (candidate !== undefined) return candidate;
  throw new ApprovalProtocolTransportError(
    `Codex approval protocol engine not found; set DSH_CODEX_APPROVAL_PROTOCOL_ENGINE or install the ${process.platform}-${process.arch} native artifact`,
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

function decodePointerSegment(segment: string): string {
  let output = "";
  for (let index = 0; index < segment.length; index += 1) {
    const character = segment[index];
    if (character !== "~") {
      output += character;
      continue;
    }
    const escape = segment[index + 1];
    if (escape === "0") output += "~";
    else if (escape === "1") output += "/";
    else {
      throw new ApprovalProtocolTransportError(
        `approval protocol returned an invalid JSON Pointer escape in ${JSON.stringify(segment)}`,
      );
    }
    index += 1;
  }
  return output;
}

function pointerTarget(
  root: unknown,
  pointer: string,
): { parent: Record<string, unknown> | unknown[]; key: string | number } {
  if (!pointer.startsWith("/") || pointer.length === 1) {
    throw new ApprovalProtocolTransportError(
      `approval protocol returned an unsupported integer JSON Pointer ${JSON.stringify(pointer)}`,
    );
  }
  const segments = pointer.slice(1).split("/").map(decodePointerSegment);
  let current = root;
  for (let index = 0; index < segments.length - 1; index += 1) {
    const segment = segments[index]!;
    if (Array.isArray(current)) {
      if (!/^(0|[1-9][0-9]*)$/.test(segment)) {
        throw new ApprovalProtocolTransportError(
          `approval protocol integer pointer has an invalid array index: ${pointer}`,
        );
      }
      const arrayIndex = Number(segment);
      if (!Number.isSafeInteger(arrayIndex) || arrayIndex >= current.length) {
        throw new ApprovalProtocolTransportError(
          `approval protocol integer pointer is outside its array: ${pointer}`,
        );
      }
      current = current[arrayIndex];
      continue;
    }
    if (!isRecord(current) || !Object.hasOwn(current, segment)) {
      throw new ApprovalProtocolTransportError(
        `approval protocol integer pointer does not resolve: ${pointer}`,
      );
    }
    current = current[segment];
  }

  const finalSegment = segments.at(-1)!;
  if (Array.isArray(current)) {
    if (!/^(0|[1-9][0-9]*)$/.test(finalSegment)) {
      throw new ApprovalProtocolTransportError(
        `approval protocol integer pointer has an invalid final array index: ${pointer}`,
      );
    }
    const arrayIndex = Number(finalSegment);
    if (!Number.isSafeInteger(arrayIndex) || arrayIndex >= current.length) {
      throw new ApprovalProtocolTransportError(
        `approval protocol integer pointer is outside its final array: ${pointer}`,
      );
    }
    return { parent: current, key: arrayIndex };
  }
  if (!isRecord(current) || !Object.hasOwn(current, finalSegment)) {
    throw new ApprovalProtocolTransportError(
      `approval protocol integer pointer does not resolve: ${pointer}`,
    );
  }
  return { parent: current, key: finalSegment };
}

function restoreExactIntegers(
  value: unknown,
  lexemes: readonly ApprovalProtocolIntegerLexeme[],
): unknown {
  const seen = new Set<string>();
  for (const entry of lexemes) {
    if (seen.has(entry.pointer)) {
      throw new ApprovalProtocolTransportError(
        `approval protocol returned a duplicate integer pointer: ${entry.pointer}`,
      );
    }
    seen.add(entry.pointer);
    if (!/^-?(0|[1-9][0-9]*)$/.test(entry.decimalLexeme)) {
      throw new ApprovalProtocolTransportError(
        `approval protocol returned a malformed integer lexeme at ${entry.pointer}`,
      );
    }
    const exact = BigInt(entry.decimalLexeme);
    const target = pointerTarget(value, entry.pointer);
    const current = target.parent[target.key as never] as unknown;
    if (
      typeof current !== "number" ||
      !Number.isInteger(current) ||
      current !== Number(exact)
    ) {
      throw new ApprovalProtocolTransportError(
        `approval protocol integer lexeme disagrees with canonical JSON at ${entry.pointer}`,
      );
    }
    if (
      exact < BigInt(Number.MIN_SAFE_INTEGER) ||
      exact > BigInt(Number.MAX_SAFE_INTEGER)
    ) {
      if (Array.isArray(target.parent)) {
        target.parent[target.key as number] = exact;
      } else {
        target.parent[target.key as string] = exact;
      }
    }
  }
  return value;
}

function validateIntegerLexemes(
  value: unknown,
): ApprovalProtocolIntegerLexeme[] {
  if (!Array.isArray(value)) {
    throw new ApprovalProtocolTransportError(
      "approval protocol parse result has no integerLexemes array",
    );
  }
  return value.map((entry) => {
    if (
      !isRecord(entry) ||
      typeof entry.pointer !== "string" ||
      typeof entry.decimalLexeme !== "string"
    ) {
      throw new ApprovalProtocolTransportError(
        "approval protocol parse result has a malformed integer lexeme",
      );
    }
    return {
      pointer: entry.pointer,
      decimalLexeme: entry.decimalLexeme,
    };
  });
}

function validateSubjectError(value: unknown): ApprovalProtocolSubjectError {
  if (
    !isRecord(value) ||
    (value.code !== "invalid_json" &&
      value.code !== "schema_rejected" &&
      value.code !== "parser_io_error") ||
    typeof value.message !== "string" ||
    !Number.isSafeInteger(value.line) ||
    (value.line as number) < 0 ||
    !Number.isSafeInteger(value.column) ||
    (value.column as number) < 0
  ) {
    throw new ApprovalProtocolTransportError(
      "approval protocol parse result has a malformed subject error",
    );
  }
  return {
    code: value.code,
    message: value.message,
    line: value.line as number,
    column: value.column as number,
  };
}

function validateParseResult<T>(
  value: unknown,
): ApprovalProtocolParseResult<T> {
  if (!isRecord(value) || typeof value.accepted !== "boolean") {
    throw new ApprovalProtocolTransportError(
      "approval protocol emitted a malformed parse result",
    );
  }
  const integerLexemes = validateIntegerLexemes(value.integerLexemes);
  if (!value.accepted) {
    if (
      value.canonicalJson !== null ||
      integerLexemes.length !== 0 ||
      value.error === null ||
      value.error === undefined
    ) {
      throw new ApprovalProtocolTransportError(
        "approval protocol emitted an inconsistent rejected parse result",
      );
    }
    const rejected: ApprovalProtocolRejected = {
      accepted: false,
      canonicalJson: null,
      integerLexemes: [],
      error: validateSubjectError(value.error),
    };
    return rejected;
  }
  if (typeof value.canonicalJson !== "string" || value.error !== null) {
    throw new ApprovalProtocolTransportError(
      "approval protocol emitted an inconsistent accepted parse result",
    );
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(value.canonicalJson) as unknown;
  } catch (cause) {
    throw new ApprovalProtocolTransportError(
      "approval protocol emitted invalid canonical JSON",
      { cause },
    );
  }
  const recovered = restoreExactIntegers(parsed, integerLexemes);
  return {
    accepted: true,
    canonicalJson: value.canonicalJson,
    integerLexemes,
    value: recovered as T,
  };
}

/**
 * Long-running client for the pinned Rust serde implementation.
 *
 * The raw app-server subject remains a string until Rust has parsed it. Every
 * public operation awaits a mandatory provenance handshake. Malformed output
 * poisons the complete client and rejects all pending work.
 */
export class ApprovalProtocolClient {
  readonly ready: Promise<ApprovalProtocolHello>;

  private readonly child: ChildProcessWithoutNullStreams;
  private readonly closeTimeoutMs: number;
  private readonly maxStderrBytes: number;
  private readonly maxResponseLineBytes: number;
  private readonly maxRawJsonBytes: number;
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

  constructor(options: ApprovalProtocolClientOptions = {}) {
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
    this.maxRawJsonBytes = positiveInteger(
      options.maxRawJsonBytes,
      DEFAULT_MAX_RAW_JSON_BYTES,
      "maxRawJsonBytes",
    );
    this.maxPendingRequests = positiveInteger(
      options.maxPendingRequests,
      DEFAULT_MAX_PENDING_REQUESTS,
      "maxPendingRequests",
    );
    this.exitPromise = new Promise((resolve) => {
      this.resolveExit = resolve;
    });

    const enginePath = resolveApprovalProtocolEnginePath(options.enginePath);
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
        new ApprovalProtocolTransportError(
          `failed to run Codex approval protocol engine: ${error.message}`,
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
        new ApprovalProtocolTransportError(
          `failed to read Codex approval protocol response: ${error.message}`,
          { cause: error },
        ),
      );
    });

    this.ready = this.send<ApprovalProtocolHello>("hello", {}, undefined, true)
      .then((hello) => this.validateHello(hello))
      .catch((error: unknown) => {
        const normalized =
          error instanceof Error
            ? error
            : new ApprovalProtocolTransportError(String(error));
        this.fail(normalized);
        throw normalized;
      });
    void this.ready.catch(() => {});
  }

  hello(signal?: AbortSignal): Promise<ApprovalProtocolHello> {
    return this.awaitReady(signal);
  }

  async parseRequest(
    rawJson: string,
    signal?: AbortSignal,
  ): Promise<
    ApprovalProtocolParseResult<CommandExecutionRequestApprovalParams>
  > {
    return this.parse(APPROVAL_PARSE_REQUEST_METHOD, rawJson, signal);
  }

  async parseResponse(
    rawJson: string,
    signal?: AbortSignal,
  ): Promise<
    ApprovalProtocolParseResult<CommandExecutionRequestApprovalResponse>
  > {
    return this.parse(APPROVAL_PARSE_RESPONSE_METHOD, rawJson, signal);
  }

  close(): Promise<void> {
    if (this.closePromise !== undefined) return this.closePromise;
    this.closing = true;
    this.closePromise = this.closeInternal();
    return this.closePromise;
  }

  private async parse<T>(
    method: string,
    rawJson: string,
    signal?: AbortSignal,
  ): Promise<ApprovalProtocolParseResult<T>> {
    if (typeof rawJson !== "string") {
      throw new TypeError("rawJson must be a string");
    }
    if (Buffer.byteLength(rawJson, "utf8") > this.maxRawJsonBytes) {
      throw new ApprovalProtocolTransportError(
        `raw approval JSON exceeds ${this.maxRawJsonBytes} bytes`,
      );
    }
    await this.awaitReady(signal);
    const result = await this.send<unknown>(method, { rawJson }, signal);
    try {
      return validateParseResult<T>(result);
    } catch (error: unknown) {
      const normalized =
        error instanceof Error
          ? error
          : new ApprovalProtocolTransportError(String(error));
      this.fail(normalized);
      throw normalized;
    }
  }

  private async closeInternal(): Promise<void> {
    try {
      await this.ready;
      if (this.terminalError === undefined && !this.closed) {
        await this.send<{ shutdown: true }>("shutdown", {}, undefined, true);
      }
    } catch {
      // A poisoned client is already fail closed; cleanup still owns the process.
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

  private async awaitReady(
    signal?: AbortSignal,
  ): Promise<ApprovalProtocolHello> {
    if (signal?.aborted === true) throw abortError();
    if (signal === undefined) return this.ready;
    return new Promise<ApprovalProtocolHello>((resolve, reject) => {
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
    params: Record<string, unknown>,
    signal?: AbortSignal,
    allowWhileClosing = false,
  ): Promise<T> {
    if (this.terminalError !== undefined) {
      return Promise.reject(this.terminalError);
    }
    if (this.closed || (this.closing && !allowWhileClosing)) {
      return Promise.reject(new ApprovalProtocolClientClosedError());
    }
    if (signal?.aborted === true) return Promise.reject(abortError());
    if (this.pending.size + this.abandoned.size >= this.maxPendingRequests) {
      return Promise.reject(
        new ApprovalProtocolTransportError(
          `Codex approval protocol request limit exceeded (${this.maxPendingRequests} pending or awaiting abandoned replies)`,
        ),
      );
    }
    if (this.requestId >= Number.MAX_SAFE_INTEGER) {
      return Promise.reject(
        new ApprovalProtocolTransportError(
          "Codex approval protocol request id space was exhausted",
        ),
      );
    }
    const id = ++this.requestId;
    const request: ProtocolRequest = {
      protocolVersion: APPROVAL_PROTOCOL_VERSION,
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
          new ApprovalProtocolTransportError(
            `failed to write Codex approval protocol request: ${error.message}`,
            { cause: error },
          ),
        );
      });
    });
  }

  private handleLine(line: string): void {
    if (Buffer.byteLength(line, "utf8") > this.maxResponseLineBytes) {
      this.fail(
        new ApprovalProtocolTransportError(
          `Codex approval protocol response exceeds ${this.maxResponseLineBytes} bytes`,
        ),
      );
      return;
    }
    let response: unknown;
    try {
      response = JSON.parse(line) as unknown;
    } catch (cause) {
      this.fail(
        new ApprovalProtocolTransportError(
          "Codex approval protocol engine emitted invalid JSON",
          { cause },
        ),
      );
      return;
    }
    if (
      !isRecord(response) ||
      response.protocolVersion !== APPROVAL_PROTOCOL_VERSION ||
      !Number.isSafeInteger(response.id)
    ) {
      this.fail(
        new ApprovalProtocolTransportError(
          "Codex approval protocol engine emitted a malformed response envelope",
        ),
      );
      return;
    }
    const id = response.id as number;
    if (this.abandoned.delete(id)) return;
    const pending = this.pending.get(id);
    if (pending === undefined) {
      this.fail(
        new ApprovalProtocolTransportError(
          `Codex approval protocol engine replied with unknown request id ${id}`,
        ),
      );
      return;
    }
    this.pending.delete(id);
    pending.removeAbortListener();

    const hasResult = Object.hasOwn(response, "result");
    const hasError = Object.hasOwn(response, "error");
    if (hasResult === hasError) {
      const error = new ApprovalProtocolTransportError(
        "Codex approval protocol response must contain exactly one of result or error",
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
        const error = new ApprovalProtocolTransportError(
          "Codex approval protocol engine emitted a malformed error response",
        );
        pending.reject(error);
        this.fail(error);
        return;
      }
      pending.reject(
        new ApprovalProtocolEngineError({
          code: body.code,
          message: body.message,
        }),
      );
      return;
    }
    pending.resolve(response.result);
  }

  private validateHello(hello: ApprovalProtocolHello): ApprovalProtocolHello {
    if (!isRecord(hello)) {
      throw new ApprovalProtocolTransportError(
        "Codex approval protocol hello is not an object",
      );
    }
    const mismatches: string[] = [];
    const expect = (
      field: keyof ApprovalProtocolHello,
      expected: string | number,
    ) => {
      if (hello[field] !== expected) {
        mismatches.push(
          `${field}: expected ${expected}, got ${String(hello[field])}`,
        );
      }
    };
    expect("protocolVersion", APPROVAL_PROTOCOL_VERSION);
    expect("codexRepository", PINNED_CODEX_REPOSITORY);
    expect("codexCommit", PINNED_CODEX_COMMIT);
    expect("codexAppServerProtocolPackage", PINNED_APP_SERVER_PROTOCOL_PACKAGE);
    expect("codexAppServerProtocolVersion", PINNED_APP_SERVER_PROTOCOL_VERSION);
    expect("codexAppServerProtocolTree", PINNED_APP_SERVER_PROTOCOL_TREE);
    expect("codexAppServerProtocolV2Tree", PINNED_APP_SERVER_PROTOCOL_V2_TREE);
    expect("commandApprovalItemBlob", PINNED_COMMAND_APPROVAL_ITEM_BLOB);
    expect(
      "commandApprovalPermissionsBlob",
      PINNED_COMMAND_APPROVAL_PERMISSIONS_BLOB,
    );
    expect("codexCargoLockBlob", PINNED_CODEX_CARGO_LOCK_BLOB);
    if (typeof hello.engineVersion !== "string" || hello.engineVersion === "") {
      mismatches.push("engineVersion: expected a non-empty string");
    }
    const expectedOs = RUST_OS_BY_NODE_PLATFORM[process.platform];
    const expectedArch = RUST_ARCH_BY_NODE_ARCH[process.arch];
    const expectedPointerWidth = POINTER_WIDTH_BY_NODE_ARCH[process.arch];
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
    if (expectedPointerWidth === undefined) {
      mismatches.push(`pointerWidth: unsupported Node arch ${process.arch}`);
    } else {
      expect("pointerWidth", expectedPointerWidth);
    }
    const expectedMethods = [
      APPROVAL_PARSE_REQUEST_METHOD,
      APPROVAL_PARSE_RESPONSE_METHOD,
    ];
    if (
      !Array.isArray(hello.methods) ||
      hello.methods.length !== expectedMethods.length ||
      hello.methods.some((method, index) => method !== expectedMethods[index])
    ) {
      mismatches.push(
        `methods: expected ${JSON.stringify(expectedMethods)}, got ${JSON.stringify(hello.methods)}`,
      );
    }
    if (mismatches.length > 0) {
      throw new ApprovalProtocolTransportError(
        `Codex approval protocol provenance handshake failed: ${mismatches.join("; ")}`,
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
      new ApprovalProtocolTransportError(
        `Codex approval protocol engine exited unexpectedly with ${status}${formatStderr(this.stderrTail.toString("utf8"))}`,
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
