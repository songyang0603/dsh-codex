import { Context } from "@deepseek-ai/cordis";
import Loader from "@deepseek-ai/cordis-plugin-loader";
import { describe, expect, it, vi } from "vitest";
import type {
  CodexApprovalPrompt,
  CodexApprovalResolution,
} from "../src/types.js";

describe("real Cordis Loader built-artifact integration", () => {
  it("loads lib/index.js as a service and cancels pending work on removal", async () => {
    const packageJsonUrl = new URL("../package.json", import.meta.url);
    const builtUrl = new URL("../lib/index.js", import.meta.url);
    const exports = (await import(builtUrl.href)) as Record<string, unknown>;
    expect(typeof exports["default"]).toBe("function");

    const ctx = new Context();
    const loaderFiber = await ctx.plugin(Loader, {
      baseUrl: packageJsonUrl.href,
    });
    const serviceId = await ctx.loader.create({ name: "./lib/index.js" });
    let serviceLoaded = true;
    try {
      await ctx.loader.await();
      const entry = ctx.loader.resolve(serviceId);
      expect(entry.fiber?.runtime?.callback?.name).toBe("CodexApprovalService");
      expect(ctx.get("codexApproval")).toBeDefined();

      let prompt: CodexApprovalPrompt | undefined;
      ctx.on("codex-approval/request", (value) => {
        prompt = value;
        return Promise.resolve("claimed");
      });
      const pending: Promise<CodexApprovalResolution> =
        ctx.codexApproval.request({
          params: {
            threadId: "loader-thread",
            turnId: "loader-turn",
            itemId: "loader-item",
            startedAtMs: Date.now(),
            environmentId: null,
            command: "git status",
            cwd: "/workspace",
          },
        });
      await vi.waitFor(() => expect(prompt).toBeDefined());

      await ctx.loader.remove(serviceId);
      serviceLoaded = false;
      await expect(pending).resolves.toEqual({
        kind: "cancelled",
        source: "service_disposed",
        decision: "cancel",
      });
      expect(prompt?.signal.aborted).toBe(true);
      expect(ctx.get("codexApproval")).toBeUndefined();
    } finally {
      if (serviceLoaded) {
        await ctx.loader.remove(serviceId);
      }
      await loaderFiber.dispose();
    }
  });

  it("keeps compiled-service removal pending until a post-response finalizer is quiescent", async () => {
    const packageJsonUrl = new URL("../package.json", import.meta.url);
    const ctx = new Context();
    const loaderFiber = await ctx.plugin(Loader, {
      baseUrl: packageJsonUrl.href,
    });
    const serviceId = await ctx.loader.create({ name: "./lib/index.js" });
    let serviceLoaded = true;
    let release!: () => void;
    const persistence = new Promise<void>((resolve) => {
      release = resolve;
    });
    try {
      await ctx.loader.await();
      ctx.on("codex-approval/request", (prompt) => {
        ctx.codexApproval.respond(prompt.requestId, {
          acceptWithExecpolicyAmendment: {
            execpolicy_amendment: ["git", "status"],
          },
        });
        return Promise.resolve("claimed");
      });
      const coordinator = vi.fn(() => persistence);
      const pending = ctx.codexApproval.request({
        params: {
          threadId: "loader-thread",
          turnId: "loader-turn",
          itemId: "loader-finalizer",
          startedAtMs: Date.now(),
          environmentId: null,
          proposedExecpolicyAmendment: ["git", "status"],
        },
        execpolicyAmendmentCoordinator: {
          persistExecpolicyAmendment: coordinator,
        },
      });
      await vi.waitFor(() => expect(coordinator).toHaveBeenCalledOnce());

      let removed = false;
      const removing = ctx.loader.remove(serviceId).then(() => {
        removed = true;
      });
      await Promise.resolve();
      expect(removed).toBe(false);
      // Cordis detaches the service binding while awaiting owner-visible
      // cleanup, but loader.remove itself must not report completion yet.
      expect(ctx.get("codexApproval")).toBeUndefined();

      release();
      await expect(pending).resolves.toMatchObject({
        kind: "approved_once",
        amendmentPersistence: { kind: "persisted" },
      });
      await removing;
      serviceLoaded = false;
      expect(removed).toBe(true);
      expect(ctx.get("codexApproval")).toBeUndefined();
    } finally {
      release?.();
      if (serviceLoaded) await ctx.loader.remove(serviceId);
      await loaderFiber.dispose();
    }
  });
});
