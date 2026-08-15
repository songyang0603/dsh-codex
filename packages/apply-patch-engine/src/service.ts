import { Context, Service } from "@deepseek-ai/cordis";
import z from "@deepseek-ai/schemastery";
import { ApplyPatchClient, type ApplyPatchClientOptions } from "./client.js";
import type {
  ApplyPatchHelloOutput,
  ApplyPatchOutput,
  ApplyPatchParams,
  ParsePatchOutput,
  ParsePatchParams,
  StreamParsePatchOutput,
  StreamParsePatchParams,
  VerifyInvocationParams,
  VerifyPatchOutput,
  VerifyPatchParams,
} from "./types.js";

declare module "@deepseek-ai/cordis" {
  interface Context {
    /** Exact pinned Codex apply-patch semantic and local-mutation service. */
    codexApplyPatch: CodexApplyPatchService;
  }
}

/** Sidecar process configuration. No tool, approval, or sandbox options exist here. */
export interface Config {
  enginePath?: string;
  engineArgs?: string[];
  shutdownTimeoutMs?: number;
  maxStderrBytes?: number;
  maxResponseLineBytes?: number;
  maxPendingRequests?: number;
}

/**
 * `ctx.codexApplyPatch`: sole DSH lifecycle owner for one provenance-checked
 * native semantic engine. The service is unavailable until hello succeeds.
 */
export class CodexApplyPatchService extends Service {
  static Config: z<Config> = z.object({
    enginePath: z.string(),
    engineArgs: z.array(z.string()).default([]),
    shutdownTimeoutMs: z.natural().min(1).default(1_000),
    maxStderrBytes: z
      .natural()
      .min(1)
      .default(16 * 1024),
    maxResponseLineBytes: z.natural().min(1),
    maxPendingRequests: z.natural().min(1),
  });

  private readonly client: ApplyPatchClient;

  constructor(ctx: Context, config: Config = {}) {
    super(ctx, "codexApplyPatch");
    const options: ApplyPatchClientOptions = {
      ...(config.enginePath === undefined
        ? {}
        : { enginePath: config.enginePath }),
      ...(config.engineArgs === undefined
        ? {}
        : { engineArgs: config.engineArgs }),
      ...(config.shutdownTimeoutMs === undefined
        ? {}
        : { shutdownTimeoutMs: config.shutdownTimeoutMs }),
      ...(config.maxStderrBytes === undefined
        ? {}
        : { maxStderrBytes: config.maxStderrBytes }),
      ...(config.maxResponseLineBytes === undefined
        ? {}
        : { maxResponseLineBytes: config.maxResponseLineBytes }),
      ...(config.maxPendingRequests === undefined
        ? {}
        : { maxPendingRequests: config.maxPendingRequests }),
    };
    this.client = new ApplyPatchClient(options);
    ctx.effect(
      () => async () => {
        await this.client.shutdown();
      },
      "dsh-codex apply-patch semantic engine teardown",
    );
  }

  protected async [Service.init](): Promise<void> {
    await this.client.ready;
  }

  hello(signal?: AbortSignal): Promise<ApplyPatchHelloOutput> {
    return this.client.hello(signal);
  }

  parse(
    params: ParsePatchParams,
    signal?: AbortSignal,
  ): Promise<ParsePatchOutput> {
    return this.client.parse(params, signal);
  }

  streamParse(
    params: StreamParsePatchParams,
    signal?: AbortSignal,
  ): Promise<StreamParsePatchOutput> {
    return this.client.streamParse(params, signal);
  }

  verifyPatch(
    params: VerifyPatchParams,
    signal?: AbortSignal,
  ): Promise<VerifyPatchOutput> {
    return this.client.verifyPatch(params, signal);
  }

  verifyInvocation(
    params: VerifyInvocationParams,
    signal?: AbortSignal,
  ): Promise<VerifyPatchOutput> {
    return this.client.verifyInvocation(params, signal);
  }

  applyPatch(
    params: ApplyPatchParams,
    signal?: AbortSignal,
  ): Promise<ApplyPatchOutput> {
    return this.client.applyPatch(params, signal);
  }

  /** Explicitly close admission and wait for all accepted work to quiesce. */
  shutdown(): Promise<void> {
    return this.client.shutdown();
  }
}

export default CodexApplyPatchService;
