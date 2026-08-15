import { Context, Service } from "@deepseek-ai/cordis";
import z from "@deepseek-ai/schemastery";
import { ExecPolicyClient, type ExecPolicyClientOptions } from "./client.js";
import type {
  AppendNetworkOutput,
  AppendNetworkParams,
  AppendPrefixOutput,
  AppendPrefixParams,
  CheckTokensOutput,
  CheckTokensParams,
  ConfigLayerInput,
  ConfigLayerSource,
  DiagnosticsOutput,
  HelloOutput,
  HostCloudInput,
  HostCodexHomeInput,
  HostCwdInput,
  LoadOutput,
  LoadParams,
  LoadConfigStackOutput,
  LoadConfigStackParams,
  LoadHostConfigStackOutput,
  LoadHostConfigStackParams,
  NetworkDomainsOutput,
  RequirementSourceInput,
  RuleSource,
  RequirementsLayerInput,
  RuntimePolicyInput,
  RuntimePolicyOutput,
  TomlJsonValue,
} from "./types.js";

const configLayerSourceSchema = z.union([
  z.object({
    kind: z.const("packaged_defaults"),
    file: z.string().required(),
  }),
  z.object({
    kind: z.const("mdm"),
    domain: z.string().required(),
    key: z.string().required(),
  }),
  z.object({ kind: z.const("system"), file: z.string().required() }),
  z.object({
    kind: z.const("enterprise_managed"),
    id: z.string().required(),
    name: z.string().required(),
  }),
  z.object({
    kind: z.const("user"),
    file: z.string().required(),
    profile: z.string(),
  }),
  z.object({
    kind: z.const("project"),
    dotCodexFolder: z.string().required(),
  }),
  z.object({ kind: z.const("session_flags") }),
  z.object({
    kind: z.const("legacy_managed_config_toml_from_file"),
    file: z.string().required(),
  }),
  z.object({ kind: z.const("legacy_managed_config_toml_from_mdm") }),
]) as unknown as z<ConfigLayerSource>;

const configLayerSchema = z.object({
  source: configLayerSourceSchema.required(),
  config: z.dict(z.any<TomlJsonValue>()).default({}),
  disabledReason: z.string(),
}) as z<ConfigLayerInput>;

const requirementSourceSchema = z.union([
  z.object({ kind: z.const("unknown") }),
  z.object({
    kind: z.const("mdm_managed_preferences"),
    domain: z.string().required(),
    key: z.string().required(),
  }),
  z.object({
    kind: z.const("enterprise_managed"),
    id: z.string().required(),
    name: z.string().required(),
  }),
  z.object({
    kind: z.const("system_requirements_toml"),
    file: z.string().required(),
  }),
  z.object({
    kind: z.const("legacy_managed_config_toml_from_file"),
    file: z.string().required(),
  }),
  z.object({ kind: z.const("legacy_managed_config_toml_from_mdm") }),
]) as unknown as z<RequirementSourceInput>;

const requirementsLayerSchema = z.object({
  source: requirementSourceSchema.required(),
  toml: z.string().required(),
  baseDir: z.string(),
}) as z<RequirementsLayerInput>;

const configStackSchema = z.object({
  layers: z.array(configLayerSchema).required(),
  requirementsLayers: z.array(requirementsLayerSchema).default([]),
  ignoreUserAndProjectExecPolicyRules: z.boolean().default(false),
}) as z<LoadConfigStackParams>;

const hostCodexHomeSchema = z.union([
  z.object({ mode: z.const("discover") }),
  z.object({ mode: z.const("explicit"), path: z.string().required() }),
]) as unknown as z<HostCodexHomeInput>;

const hostCwdSchema = z.union([
  z.object({ mode: z.const("absolute"), path: z.string().required() }),
  z.object({ mode: z.const("current_process") }),
]) as unknown as z<HostCwdInput>;

const cloudFragmentSchema = z.object({
  id: z.string().required(),
  name: z.string().required(),
  contents: z.string().required(),
});

const cloudBundleSchema = z.object({
  config_toml: z
    .object({ enterprise_managed: z.array(cloudFragmentSchema).required() })
    .required(),
  requirements_toml: z
    .object({ enterprise_managed: z.array(cloudFragmentSchema).required() })
    .required(),
});

const hostCloudSchema = z.union([
  z.object({ mode: z.const("not_requested") }),
  z.object({
    mode: z.const("snapshot"),
    bundle: z.union([cloudBundleSchema, z.const(null)]).required(),
  }),
]) as unknown as z<HostCloudInput>;

const hostConfigStackSchema = z.object({
  schemaVersion: z.const(1).required(),
  codexHome: hostCodexHomeSchema.required(),
  cwd: z.union([hostCwdSchema, z.const(null)]).required(),
  cliOverrides: z.array(z.string()).default([]),
  strictConfig: z.boolean().default(false),
  profileV2: z.string(),
  ignoreUserConfig: z.boolean().default(false),
  ignoreUserAndProjectExecPolicyRules: z.boolean().default(false),
  cloud: hostCloudSchema.required(),
  threadConfig: z.object({ mode: z.const("none") }).required(),
}) as z<LoadHostConfigStackParams>;

declare module "@deepseek-ai/cordis" {
  interface Context {
    /** Exact pinned Codex execpolicy semantic service. */
    codexExecPolicy: CodexExecPolicyService;
  }
}

/** Cordis service configuration. Rule sources replace the engine's complete in-memory policy on startup. */
export interface Config {
  enginePath?: string;
  engineArgs?: string[];
  rulePaths?: string[];
  ruleSources?: RuleSource[];
  /** Canonical layered policy input. Mutually exclusive with rulePaths/ruleSources. */
  configStack?: LoadConfigStackParams;
  /** Discover the canonical pinned-Codex host layer stack. Mutually exclusive with every other initial policy input. */
  hostConfigStack?: LoadHostConfigStackParams;
  closeTimeoutMs?: number;
}

/**
 * `ctx.codexExecPolicy`: lifecycle owner for one provenance-checked native
 * engine process. The Cordis class initializer does not complete until hello
 * and the initial atomic policy load both succeed.
 */
export class CodexExecPolicyService extends Service {
  static Config: z<Config> = z.object({
    enginePath: z.string(),
    engineArgs: z.array(z.string()).default([]),
    rulePaths: z.array(z.string()).default([]),
    ruleSources: z
      .array(
        z.object({
          identifier: z.string().required(),
          content: z.string().required(),
        }),
      )
      .default([]),
    configStack: configStackSchema.default(
      undefined as unknown as LoadConfigStackParams,
    ),
    hostConfigStack: hostConfigStackSchema.default(
      undefined as unknown as LoadHostConfigStackParams,
    ),
    closeTimeoutMs: z.natural().min(1).default(1_000),
  });

  private readonly client: ExecPolicyClient;
  private readonly initialRules: LoadParams;
  private readonly initialConfigStack: LoadConfigStackParams | undefined;
  private readonly initialHostConfigStack:
    LoadHostConfigStackParams | undefined;

  constructor(ctx: Context, config: Config = {}) {
    super(ctx, "codexExecPolicy");
    const clientOptions: ExecPolicyClientOptions = {
      ...(config.enginePath === undefined
        ? {}
        : { enginePath: config.enginePath }),
      ...(config.engineArgs === undefined
        ? {}
        : { engineArgs: config.engineArgs }),
      ...(config.closeTimeoutMs === undefined
        ? {}
        : { closeTimeoutMs: config.closeTimeoutMs }),
    };
    this.initialRules = {
      sources: config.ruleSources ?? [],
      paths: config.rulePaths ?? [],
    };
    this.initialConfigStack = config.configStack;
    this.initialHostConfigStack = config.hostConfigStack;
    if (
      Number(this.initialConfigStack !== undefined) +
        Number(this.initialHostConfigStack !== undefined) +
        Number(
          (this.initialRules.paths?.length ?? 0) > 0 ||
            (this.initialRules.sources?.length ?? 0) > 0,
        ) >
      1
    ) {
      throw new TypeError(
        "hostConfigStack, configStack, rulePaths, and ruleSources are mutually exclusive initial policy inputs",
      );
    }
    this.client = new ExecPolicyClient(clientOptions);
    ctx.effect(
      () => async () => {
        await this.client.close();
      },
      "dsh-codex execpolicy sidecar teardown",
    );
  }

  protected async [Service.init](): Promise<void> {
    await this.client.ready;
    if (this.initialHostConfigStack !== undefined) {
      await this.client.openHostPolicy(this.initialHostConfigStack);
    } else if (this.initialConfigStack === undefined) {
      await this.client.load(this.initialRules);
    } else {
      await this.client.loadConfigStack(this.initialConfigStack);
    }
  }

  hello(signal?: AbortSignal): Promise<HelloOutput> {
    return this.client.hello(signal);
  }

  diagnostics(signal?: AbortSignal): Promise<DiagnosticsOutput> {
    return this.client.diagnostics(signal);
  }

  /** Atomically replace the engine's entire in-memory policy. */
  load(params: LoadParams, signal?: AbortSignal): Promise<LoadOutput> {
    return this.client.load(params, signal);
  }

  /** Load the pinned Codex layer-stack projection atomically. */
  loadConfigStack(
    params: LoadConfigStackParams,
    signal?: AbortSignal,
  ): Promise<LoadConfigStackOutput> {
    return this.client.loadConfigStack(params, signal);
  }

  /** Discover and load the real pinned-Codex host configuration stack. */
  loadHostConfigStack(
    params: LoadHostConfigStackParams,
    signal?: AbortSignal,
  ): Promise<LoadHostConfigStackOutput> {
    return this.client.loadHostConfigStack(params, signal);
  }

  /** Run the exact Codex startup ordering and retain canonical persistence ownership. */
  openHostPolicy(
    params: LoadHostConfigStackParams,
  ): Promise<LoadHostConfigStackOutput> {
    return this.client.openHostPolicy(params);
  }

  checkTokens(
    params: CheckTokensParams,
    signal?: AbortSignal,
  ): Promise<CheckTokensOutput> {
    return this.client.checkTokens(params, signal);
  }

  checkExecApprovalRequirement(
    params: RuntimePolicyInput,
    signal?: AbortSignal,
  ): Promise<RuntimePolicyOutput> {
    return this.client.checkExecApprovalRequirement(params, signal);
  }

  compileNetworkDomains(signal?: AbortSignal): Promise<NetworkDomainsOutput> {
    return this.client.compileNetworkDomains(signal);
  }

  appendPrefixAmendment(
    params: AppendPrefixParams,
  ): Promise<AppendPrefixOutput> {
    return this.client.appendPrefixAmendment(params);
  }

  appendNetworkAmendment(
    params: AppendNetworkParams,
  ): Promise<AppendNetworkOutput> {
    return this.client.appendNetworkAmendment(params);
  }
}

export default CodexExecPolicyService;
