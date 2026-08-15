import { existsSync } from "node:fs";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { ExecPolicyClient } from "../src/client.js";

const executableName =
  process.platform === "win32"
    ? "dsh-codex-execpolicy-engine.exe"
    : "dsh-codex-execpolicy-engine";
const nativeEngine = fileURLToPath(
  new URL(`../../../target/debug/${executableName}`, import.meta.url),
);

describe("pinned native execpolicy engine integration", () => {
  let client: ExecPolicyClient | undefined;
  let temporaryDirectory: string | undefined;

  beforeAll(() => {
    if (!existsSync(nativeEngine)) {
      throw new Error(
        `native execpolicy engine is required at ${nativeEngine}; run cargo build --locked --workspace before tests`,
      );
    }
  });

  afterEach(async () => {
    await client?.close();
    client = undefined;
    if (temporaryDirectory !== undefined) {
      await rm(temporaryDirectory, { recursive: true, force: true });
      temporaryDirectory = undefined;
    }
  });

  it("lowers bash -c and enforces a real upstream forbidden prefix rule", async () => {
    client = new ExecPolicyClient({ enginePath: nativeEngine });
    await client.load({
      sources: [
        {
          identifier: "integration.rules",
          content:
            'prefix_rule(pattern=["git", "status"], decision="forbidden")',
        },
      ],
    });
    const output = await client.checkExecApprovalRequirement({
      command: ["bash", "-c", "git status"],
      approvalPolicy: { kind: "on_request" },
      permissionProfile: {
        kind: "managed",
        fileSystem: "restricted",
        hasFullDiskWriteAccess: false,
      },
      windowsSandboxLevel: "disabled",
      sandboxPermissions: "use_default",
      allowPrefixRules: "honor",
    });

    expect(output.loweredCommands).toEqual([["git", "status"]]);
    expect(output.usedComplexParsing).toBe(false);
    expect(output.evaluation).toEqual({
      decision: "forbidden",
      matchedRules: [
        {
          prefixRuleMatch: {
            decision: "forbidden",
            matchedPrefix: ["git", "status"],
          },
        },
      ],
    });
    expect(output.requirement).toMatchObject({ kind: "forbidden" });
  });

  it("preserves the explicit-allow bypassSandbox fact from the pinned runtime algorithm", async () => {
    client = new ExecPolicyClient({ enginePath: nativeEngine });
    await client.load({
      sources: [
        {
          identifier: "integration.rules",
          content: 'prefix_rule(pattern=["git", "status"], decision="allow")',
        },
      ],
    });
    const output = await client.checkExecApprovalRequirement({
      command: ["bash", "-c", "git status"],
      approvalPolicy: { kind: "never" },
      permissionProfile: {
        kind: "managed",
        fileSystem: "restricted",
        hasFullDiskWriteAccess: false,
      },
      windowsSandboxLevel: "disabled",
      sandboxPermissions: "use_default",
      allowPrefixRules: "honor",
    });

    expect(output.requirement).toEqual({ kind: "skip", bypassSandbox: true });
  });

  it("preserves upstream serde-transparent amendments as a token array", async () => {
    client = new ExecPolicyClient({ enginePath: nativeEngine });
    await client.load({ sources: [], paths: [] });
    const output = await client.checkExecApprovalRequirement({
      command: ["bash", "-c", "mytool build"],
      approvalPolicy: { kind: "unless_trusted" },
      permissionProfile: {
        kind: "managed",
        fileSystem: "restricted",
        hasFullDiskWriteAccess: false,
      },
      windowsSandboxLevel: "disabled",
      sandboxPermissions: "use_default",
      prefixRule: ["mytool", "build"],
      allowPrefixRules: "honor",
    });

    expect(output.requirement).toEqual({
      kind: "needs_approval",
      proposedExecpolicyAmendment: ["mytool", "build"],
    });
  });

  it("loads the Codex layer-stack projection and falls back to managed requirements on parse errors", async () => {
    temporaryDirectory = await mkdtemp(join(tmpdir(), "dsh-codex-stack-"));
    const projectConfigFolder = join(temporaryDirectory, "repo", ".codex");
    const rulesDirectory = join(projectConfigFolder, "rules");
    await mkdir(rulesDirectory, { recursive: true });
    await writeFile(join(rulesDirectory, "broken.rules"), "prefix_rule(");

    client = new ExecPolicyClient({ enginePath: nativeEngine });
    const output = await client.loadConfigStack({
      layers: [
        {
          source: { kind: "project", dotCodexFolder: projectConfigFolder },
        },
      ],
      requirementsLayers: [
        {
          source: {
            kind: "system_requirements_toml",
            file: join(temporaryDirectory, "requirements.toml"),
          },
          toml: '[rules]\nprefix_rules = [{ pattern = [{ token = "rm" }], decision = "forbidden", justification = "managed restriction" }]\n',
        },
      ],
    });

    expect(output.loadedFiles).toEqual([join(rulesDirectory, "broken.rules")]);
    expect(output.warning).toMatchObject({
      kind: "parse_policy",
      path: join(rulesDirectory, "broken.rules"),
    });
    expect(output.stack.enabledLayersLowToHigh).toEqual([
      { kind: "project", dotCodexFolder: projectConfigFolder },
    ]);
    expect(output.requirements.execPolicySource).toMatchObject({
      kind: "system_requirements_toml",
    });
    await expect(
      client.checkTokens({ commands: [["rm"]], fallbackDecision: "allow" }),
    ).resolves.toMatchObject({ decision: "forbidden" });
  });

  it("uses the pinned Codex host loader for profile, cloud snapshot, CLI, and canonical rule discovery", async () => {
    temporaryDirectory = await mkdtemp(join(tmpdir(), "dsh-codex-host-"));
    const rulesDirectory = join(temporaryDirectory, "rules");
    await mkdir(rulesDirectory, { recursive: true });
    await writeFile(
      join(temporaryDirectory, "config.toml"),
      'model = "user-model"\n',
    );
    await writeFile(
      join(temporaryDirectory, "work.config.toml"),
      'model = "profile-model"\n',
    );
    const defaultPolicyPath = join(rulesDirectory, "default.rules");
    await writeFile(
      defaultPolicyPath,
      'prefix_rule(pattern=["user-tool"], decision="allow")\n',
    );

    client = new ExecPolicyClient({ enginePath: nativeEngine });
    const output = await client.loadHostConfigStack({
      schemaVersion: 1,
      codexHome: { mode: "explicit", path: temporaryDirectory },
      cwd: null,
      cliOverrides: ['model="cli-model"'],
      profileV2: "work",
      cloud: {
        mode: "snapshot",
        bundle: {
          config_toml: {
            enterprise_managed: [
              {
                id: "cloud-config",
                name: "Cloud config",
                contents: 'model = "cloud-model"\n',
              },
            ],
          },
          requirements_toml: {
            enterprise_managed: [
              {
                id: "cloud-requirements",
                name: "Cloud requirements",
                contents:
                  '[rules]\nprefix_rules = [{ pattern = [{ token = "managed-tool" }], decision = "forbidden", justification = "enterprise block" }]\n',
              },
            ],
          },
        },
      },
      threadConfig: { mode: "none" },
    });

    expect(output.discovery).toMatchObject({
      mode: "host",
      codexHomeMode: "explicit",
      resolvedCodexHome: temporaryDirectory,
      cwd: null,
      profileV2: "work",
      cloudMode: "snapshot",
      threadConfigMode: "none",
      defaultPolicyPath,
    });
    expect(output.stack.effectiveConfig.model).toBe("cli-model");
    expect(output.stack.origins.model).toEqual({ kind: "session_flags" });
    expect(
      output.loadedFiles.filter((path) => path === defaultPolicyPath),
    ).toHaveLength(2);
    expect(output.requirements.inputSourcesLowToHigh).toBeNull();
    expect(output.requirements.execPolicySource).toMatchObject({
      kind: "enterprise_managed",
      id: "cloud-requirements",
    });
    await expect(
      client.checkTokens({
        commands: [["managed-tool"]],
        fallbackDecision: "allow",
      }),
    ).resolves.toMatchObject({ decision: "forbidden" });
  });

  it("runs startup migration before loading and persists amendments only to canonical default.rules", async () => {
    temporaryDirectory = await mkdtemp(join(tmpdir(), "dsh-codex-open-"));
    const rulesDirectory = join(temporaryDirectory, "rules");
    await mkdir(rulesDirectory, { recursive: true });
    const defaultPolicyPath = join(rulesDirectory, "default.rules");
    await writeFile(
      defaultPolicyPath,
      [
        'prefix_rule(pattern=["git"], decision="allow")',
        'prefix_rule(pattern=["existing-tool"], decision="allow")',
        "",
      ].join("\n"),
    );

    client = new ExecPolicyClient({ enginePath: nativeEngine });
    const opened = await client.openHostPolicy({
      schemaVersion: 1,
      codexHome: { mode: "explicit", path: temporaryDirectory },
      cwd: null,
      cloud: { mode: "not_requested" },
      threadConfig: { mode: "none" },
    });
    expect(opened.discovery.startupMigration).toEqual({
      mode: "canonical_startup",
      attempted: true,
      completed: true,
      warning: null,
    });
    expect(await readFile(defaultPolicyPath, "utf8")).toBe(
      'prefix_rule(pattern=["existing-tool"], decision="allow")\n',
    );
    await expect(
      client.checkTokens({
        commands: [["git", "status"]],
        fallbackDecision: "prompt",
      }),
    ).resolves.toMatchObject({ decision: "prompt" });

    await expect(
      client.appendPrefixAmendment({ prefix: ["echo", "hello"] }),
    ).resolves.toEqual({
      policyPath: defaultPolicyPath,
      changedInMemory: true,
    });
    await expect(
      client.appendPrefixAmendment({ prefix: ["echo", "hello"] }),
    ).resolves.toEqual({
      policyPath: defaultPolicyPath,
      changedInMemory: false,
    });
    await expect(
      client.checkTokens({
        commands: [["echo", "hello", "world"]],
        fallbackDecision: "forbidden",
      }),
    ).resolves.toMatchObject({ decision: "allow" });

    await expect(
      client.appendNetworkAmendment({
        host: "example.com",
        protocol: "https",
        decision: "allow",
        justification: "approved host",
      }),
    ).resolves.toEqual({ updated: true, policyPath: defaultPolicyPath });
    await expect(client.compileNetworkDomains()).resolves.toEqual({
      allowed: ["example.com"],
      denied: [],
    });

    const policy = await readFile(defaultPolicyPath, "utf8");
    expect(
      policy.match(
        /prefix_rule\(pattern=\["echo", "hello"\], decision="allow"\)/g,
      ),
    ).toHaveLength(1);
    expect(policy).toContain(
      'network_rule(host="example.com", protocol="https", decision="allow", justification="approved host")',
    );
  });

  it("fails closed when persistence is attempted without canonical host ownership", async () => {
    client = new ExecPolicyClient({ enginePath: nativeEngine });
    await client.load({ sources: [], paths: [] });
    await expect(
      client.appendPrefixAmendment({ prefix: ["echo"] }),
    ).rejects.toMatchObject({ code: "canonical_host_policy_not_open" });
  });
});
