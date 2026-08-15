import { Context } from "@deepseek-ai/cordis";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import CodexExecPolicyService from "../src/service.js";

const fixture = fileURLToPath(
  new URL("./fixtures/mock-engine.mjs", import.meta.url),
);

describe("CodexExecPolicyService Cordis lifecycle", () => {
  it("does not finish mounting until handshake and initial atomic load complete, then owns teardown", async () => {
    const ctx = new Context();
    const fiber = await ctx.plugin(CodexExecPolicyService, {
      enginePath: process.execPath,
      engineArgs: [fixture],
      ruleSources: [{ identifier: "boot.rules", content: "# fixture" }],
    });

    await expect(ctx.codexExecPolicy.diagnostics()).resolves.toMatchObject({
      hello: { engineVersion: "0.1.0-test" },
    });
    await fiber.dispose();
    expect(ctx.get("codexExecPolicy")).toBeUndefined();
  });

  it("rejects the plugin mount when the provenance handshake fails", async () => {
    const ctx = new Context();
    await expect(
      ctx.plugin(CodexExecPolicyService, {
        enginePath: process.execPath,
        engineArgs: [fixture, "--mismatch"],
      }),
    ).rejects.toThrow(/provenance handshake failed/);
    expect(ctx.get("codexExecPolicy")).toBeUndefined();
  });
});
