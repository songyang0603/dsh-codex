import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import {
  ExecPolicyClient,
  ExecPolicyClientClosedError,
  ExecPolicyEngineError,
  ExecPolicyTransportError,
} from "../src/client.js";
import {
  PINNED_CARGO_LOCK_BLOB,
  PINNED_CORE_EXEC_POLICY_DIR_TREE,
} from "../src/types.js";

const fixture = fileURLToPath(
  new URL("./fixtures/mock-engine.mjs", import.meta.url),
);

describe("ExecPolicyClient JSONL transport", () => {
  let client: ExecPolicyClient | undefined;

  afterEach(async () => {
    await client?.close();
    client = undefined;
  });

  function create(...args: string[]): ExecPolicyClient {
    client = new ExecPolicyClient({
      enginePath: process.execPath,
      engineArgs: [fixture, ...args],
    });
    return client;
  }

  it("pins every provenance identity during hello and keeps one process for requests", async () => {
    const active = create();
    const hello = await active.hello();
    expect(hello.coreExecPolicyDirTree).toBe(PINNED_CORE_EXEC_POLICY_DIR_TREE);
    expect(hello.cargoLockBlob).toBe(PINNED_CARGO_LOCK_BLOB);

    await expect(
      active.load({
        sources: [
          {
            identifier: "inline.rules",
            content: 'prefix_rule(pattern=["git"], decision="allow")',
          },
        ],
      }),
    ).resolves.toEqual({ loadedSources: 1, allowedPrefixes: [] });
    await expect(active.diagnostics()).resolves.toMatchObject({
      loadedSources: 1,
    });
    await expect(active.compileNetworkDomains()).resolves.toEqual({
      allowed: ["example.com"],
      denied: [],
    });
  });

  it("rejects a sidecar whose directory-tree provenance differs by one field", async () => {
    const active = create("--mismatch");
    await expect(active.ready).rejects.toThrow(/coreExecPolicyDirTree/);
    await expect(
      active.checkTokens({ commands: [["git"]] }),
    ).rejects.toBeInstanceOf(ExecPolicyTransportError);
  });

  it("rejects a correctly pinned sidecar built for another host target", async () => {
    const active = create("--host-mismatch");
    await expect(active.ready).rejects.toThrow(/os: expected|arch: expected/);
    await expect(active.diagnostics()).rejects.toBeInstanceOf(
      ExecPolicyTransportError,
    );
  });

  it("maps valid engine errors without poisoning the transport", async () => {
    const active = create();
    await expect(
      active.checkTokens({ commands: [["engine_error"]] }),
    ).rejects.toMatchObject({
      name: "ExecPolicyEngineError",
      code: "invalid_params",
      data: { fixture: true },
    } satisfies Partial<ExecPolicyEngineError>);
    await expect(active.checkTokens({ commands: [["git"]] })).resolves.toEqual({
      decision: "allow",
      matchedRules: [],
    });
  });

  it("abandons an aborted request id without misrouting its late response", async () => {
    client = new ExecPolicyClient({
      enginePath: process.execPath,
      engineArgs: [fixture],
      maxPendingRequests: 1,
    });
    const active = client;
    await active.ready;
    const abort = new AbortController();
    const delayed = active.checkTokens({ commands: [["delay"]] }, abort.signal);
    // Let the already-ready client write the delayed request before aborting,
    // so its id is abandoned while the sidecar still owes a reply.
    await new Promise((resolve) => setTimeout(resolve, 10));
    abort.abort();
    await expect(delayed).rejects.toMatchObject({ name: "AbortError" });
    await expect(
      active.checkTokens({ commands: [["backpressure"]] }),
    ).rejects.toThrow(/pending or awaiting abandoned replies/);
    await new Promise((resolve) => setTimeout(resolve, 150));
    await expect(
      active.checkTokens({ commands: [["after-abort"]] }),
    ).resolves.toMatchObject({ decision: "allow" });
  });

  it("poisons the client when a runtime response violates the discriminated wire union", async () => {
    const active = create();
    await expect(
      active.checkExecApprovalRequirement({
        command: ["malformed"],
        approvalPolicy: { kind: "on_request" },
        permissionProfile: {
          kind: "managed",
          fileSystem: "restricted",
          hasFullDiskWriteAccess: false,
        },
        windowsSandboxLevel: "disabled",
        sandboxPermissions: "use_default",
        allowPrefixRules: "honor",
      }),
    ).rejects.toThrow(/boolean bypassSandbox/);
    await expect(active.diagnostics()).rejects.toBeInstanceOf(
      ExecPolicyTransportError,
    );
  });

  it("rejects every future request after an unexpected process exit and includes bounded stderr", async () => {
    const active = create();
    await active.ready;
    await expect(active.checkTokens({ commands: [["exit"]] })).rejects.toThrow(
      /exit code 17.*intentional mock crash/s,
    );
    await expect(
      active.checkTokens({ commands: [["never-runs"]] }),
    ).rejects.toBeInstanceOf(ExecPolicyTransportError);
  });

  it("closes idempotently and rejects operations started after shutdown", async () => {
    const active = create();
    await active.ready;
    const first = active.close();
    expect(active.close()).toBe(first);
    await first;
    await expect(active.diagnostics()).rejects.toBeInstanceOf(
      ExecPolicyClientClosedError,
    );
  });
});
