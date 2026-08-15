import { Context } from "@deepseek-ai/cordis";
import { describe, expect, it, vi } from "vitest";
import CodexApprovalService, {
  ApprovalCacheKey,
  createDshOneShotCompatibilityBackend,
  type CodexApprovalPrompt,
  type CodexApprovalRequest,
  type CodexApprovalRequestId,
  type CommandExecutionRequestApprovalParams,
  type ExecpolicyAmendmentPersistenceWarning,
} from "../src/index.js";

function params(
  overrides: Partial<CommandExecutionRequestApprovalParams> = {},
): CommandExecutionRequestApprovalParams {
  return {
    threadId: "thread-1",
    turnId: "turn-1",
    itemId: "item-1",
    startedAtMs: Date.now(),
    environmentId: "env-1",
    command: "git status",
    cwd: "/workspace",
    ...overrides,
  };
}

function request(
  overrides: Partial<CodexApprovalRequest> = {},
): CodexApprovalRequest {
  return { params: params(), ...overrides };
}

async function mounted(): Promise<{
  ctx: Context;
  dispose: () => Promise<void>;
}> {
  const ctx = new Context();
  const fiber = await ctx.plugin(CodexApprovalService);
  return { ctx, dispose: () => fiber.dispose() };
}

async function waitForPrompt(ctx: Context): Promise<CodexApprovalPrompt> {
  let prompt = ctx.codexApproval.pendingPrompts()[0];
  await vi.waitFor(() => {
    prompt = ctx.codexApproval.pendingPrompts()[0];
    expect(prompt).toBeDefined();
  });
  return prompt as CodexApprovalPrompt;
}

describe("CodexApprovalService pending state", () => {
  it("fails closed and cleans pending state when no provider exists", async () => {
    const { ctx, dispose } = await mounted();
    await expect(ctx.codexApproval.request(request())).resolves.toMatchObject({
      kind: "declined",
      source: "fail_closed",
      decision: "decline",
      reason: expect.stringContaining("no rich approval transport"),
    });
    expect(ctx.codexApproval.pendingPrompts()).toHaveLength(0);
    await dispose();
  });

  it("fails closed on a malformed request envelope instead of dispatching", async () => {
    const { ctx, dispose } = await mounted();
    let dispatched = false;
    ctx.on("codex-approval/request", () => {
      dispatched = true;
      return Promise.resolve("claimed");
    });
    await expect(
      ctx.codexApproval.request(null as unknown as CodexApprovalRequest),
    ).resolves.toMatchObject({
      kind: "declined",
      source: "fail_closed",
      reason: expect.stringContaining("envelope"),
    });
    expect(dispatched).toBe(false);
    await dispose();
  });

  it("dispatches an exact empty vector and accepts a valid programmatic decision", async () => {
    const { ctx, dispose } = await mounted();
    let dispatched = false;
    ctx.on("codex-approval/request", (prompt) => {
      dispatched = true;
      expect(prompt.availableDecisions).toEqual([]);
      ctx.codexApproval.respond(prompt.requestId, "accept");
      return Promise.resolve("claimed");
    });
    await expect(
      ctx.codexApproval.request(
        request({ params: params({ availableDecisions: [] }) }),
      ),
    ).resolves.toMatchObject({ kind: "approved_once" });
    expect(dispatched).toBe(true);
    await dispose();
  });

  it("preserves duplicate offered choices and validates the selected value", async () => {
    const { ctx, dispose } = await mounted();
    let observed: readonly unknown[] | undefined;
    ctx.on("codex-approval/request", (prompt) => {
      observed = prompt.availableDecisions;
      ctx.codexApproval.respond(prompt.requestId, "accept");
      return Promise.resolve("claimed");
    });
    await expect(
      ctx.codexApproval.request(
        request({
          params: params({
            availableDecisions: ["accept", "accept", "cancel"],
          }),
        }),
      ),
    ).resolves.toMatchObject({ kind: "approved_once" });
    expect(observed).toEqual(["accept", "accept", "cancel"]);
    await dispose();
  });

  it("matches a network decision structurally rather than by JSON object key order", async () => {
    const { ctx, dispose } = await mounted();
    ctx.on("codex-approval/request", (prompt) => {
      ctx.codexApproval.respond(prompt.requestId, {
        applyNetworkPolicyAmendment: {
          network_policy_amendment: {
            action: "allow",
            host: "example.com",
          },
        },
      });
      return Promise.resolve("claimed");
    });
    await expect(
      ctx.codexApproval.request({
        params: params({
          networkApprovalContext: { host: "example.com", protocol: "https" },
          proposedNetworkPolicyAmendments: [
            { host: "example.com", action: "allow" },
          ],
        }),
      }),
    ).resolves.toMatchObject({ kind: "network_policy_amendment" });
    await dispose();
  });

  it("correlates two concurrent prompts even when responses arrive in reverse order", async () => {
    const { ctx, dispose } = await mounted();
    const prompts: CodexApprovalPrompt[] = [];
    ctx.on("codex-approval/request", (prompt) => {
      prompts.push(prompt);
      return Promise.resolve("claimed" as const);
    });
    const first = ctx.codexApproval.request(
      request({ params: params({ itemId: "first" }) }),
    );
    const second = ctx.codexApproval.request(
      request({ params: params({ itemId: "second" }) }),
    );
    await vi.waitFor(() => expect(prompts).toHaveLength(2));

    expect(ctx.codexApproval.respond(prompts[1]!.requestId, "cancel")).toEqual({
      kind: "accepted",
    });
    expect(ctx.codexApproval.respond(prompts[0]!.requestId, "accept")).toEqual({
      kind: "accepted",
    });
    await expect(first).resolves.toMatchObject({ kind: "approved_once" });
    await expect(second).resolves.toMatchObject({ kind: "cancelled" });
    await dispose();
  });

  it("uses approvalId over itemId and supersedes an older waiter with the same effective id", async () => {
    const { ctx, dispose } = await mounted();
    const prompts: CodexApprovalPrompt[] = [];
    ctx.on("codex-approval/request", (prompt) => {
      prompts.push(prompt);
      return Promise.resolve("claimed");
    });
    const first = ctx.codexApproval.request(
      request({
        params: params({ itemId: "parent", approvalId: "subcommand" }),
      }),
    );
    await vi.waitFor(() => expect(prompts).toHaveLength(1));
    expect(prompts[0]?.params.approvalId).toBe("subcommand");

    const second = ctx.codexApproval.request(
      request({
        params: params({
          itemId: "different-parent",
          approvalId: "subcommand",
        }),
      }),
    );
    await expect(first).resolves.toEqual({
      kind: "cancelled",
      source: "superseded",
      decision: "cancel",
    });
    await vi.waitFor(() => expect(prompts).toHaveLength(2));
    expect(prompts[0]!.requestId).not.toBe(prompts[1]!.requestId);
    expect(ctx.codexApproval.respond(prompts[0]!.requestId, "accept")).toEqual({
      kind: "ignored",
      reason: "unknown_or_settled_request",
    });
    expect(ctx.codexApproval.respond(prompts[1]!.requestId, "accept")).toEqual({
      kind: "accepted",
    });
    await expect(second).resolves.toMatchObject({ kind: "approved_once" });
    await dispose();
  });

  it("isolates equal effective ids owned by different pinned threads", async () => {
    const { ctx, dispose } = await mounted();
    const prompts: CodexApprovalPrompt[] = [];
    ctx.on("codex-approval/request", (prompt) => {
      prompts.push(prompt);
      return Promise.resolve("claimed");
    });

    const first = ctx.codexApproval.request(
      request({
        params: params({ threadId: "thread-a", itemId: "shared-item" }),
      }),
    );
    const second = ctx.codexApproval.request(
      request({
        params: params({ threadId: "thread-b", itemId: "shared-item" }),
      }),
    );
    await vi.waitFor(() => expect(prompts).toHaveLength(2));

    const firstPrompt = prompts.find(
      (prompt) => prompt.params.threadId === "thread-a",
    );
    const secondPrompt = prompts.find(
      (prompt) => prompt.params.threadId === "thread-b",
    );
    expect(firstPrompt).toBeDefined();
    expect(secondPrompt).toBeDefined();
    expect(firstPrompt?.requestId).not.toBe(secondPrompt?.requestId);
    expect(ctx.codexApproval.pendingPrompts()).toHaveLength(2);

    expect(
      ctx.codexApproval.respond(secondPrompt!.requestId, "cancel"),
    ).toEqual({ kind: "accepted" });
    expect(ctx.codexApproval.respond(firstPrompt!.requestId, "accept")).toEqual(
      { kind: "accepted" },
    );
    await expect(first).resolves.toMatchObject({ kind: "approved_once" });
    await expect(second).resolves.toMatchObject({ kind: "cancelled" });
    expect(ctx.codexApproval.pendingPrompts()).toHaveLength(0);
    await dispose();
  });

  it("ignores unknown and duplicate response ids without granting anything", async () => {
    const { ctx, dispose } = await mounted();
    ctx.on("codex-approval/request", () => Promise.resolve("claimed"));
    const pending = ctx.codexApproval.request(request());
    const prompt = await waitForPrompt(ctx);

    expect(
      ctx.codexApproval.respond(
        "unknown-request" as CodexApprovalRequestId,
        "accept",
      ),
    ).toEqual({ kind: "ignored", reason: "unknown_or_settled_request" });
    expect(ctx.codexApproval.pendingPrompts()).toHaveLength(1);
    expect(ctx.codexApproval.respond(prompt.requestId, "accept")).toEqual({
      kind: "accepted",
    });
    expect(ctx.codexApproval.respond(prompt.requestId, "cancel")).toEqual({
      kind: "ignored",
      reason: "unknown_or_settled_request",
    });
    await expect(pending).resolves.toMatchObject({ kind: "approved_once" });
    await dispose();
  });

  it("accepts a valid unoffered decision and rejects a malformed decision", async () => {
    const { ctx, dispose } = await mounted();
    let count = 0;
    ctx.on("codex-approval/request", (prompt) => {
      count += 1;
      const decision = count === 1 ? "acceptForSession" : { future: "allow" };
      const result = ctx.codexApproval.respond(prompt.requestId, decision);
      expect(result.kind).toBe(count === 1 ? "accepted" : "rejected");
      return Promise.resolve("claimed");
    });

    await expect(ctx.codexApproval.request(request())).resolves.toMatchObject({
      kind: "approved_for_session",
      source: "answerer",
    });
    await expect(ctx.codexApproval.request(request())).resolves.toMatchObject({
      kind: "declined",
      source: "fail_closed",
      reason: expect.stringContaining("malformed"),
    });
    await dispose();
  });

  it("fails closed for ambiguous externally tagged decision objects", async () => {
    const { ctx, dispose } = await mounted();
    ctx.on("codex-approval/request", (prompt) => {
      const result = ctx.codexApproval.respond(prompt.requestId, {
        acceptWithExecpolicyAmendment: {
          execpolicy_amendment: ["git"],
        },
        applyNetworkPolicyAmendment: {
          network_policy_amendment: {
            host: "example.com",
            action: "allow",
          },
        },
      });
      expect(result).toEqual({
        kind: "rejected",
        reason: "malformed_decision",
      });
      return Promise.resolve("claimed");
    });

    await expect(ctx.codexApproval.request(request())).resolves.toMatchObject({
      kind: "declined",
      source: "fail_closed",
      reason: expect.stringContaining("malformed"),
    });
    await dispose();
  });

  it("cancels immediately, aborts the prompt signal, and discards a late answer", async () => {
    const { ctx, dispose } = await mounted();
    const controller = new AbortController();
    ctx.on("codex-approval/request", () => Promise.resolve("claimed"));
    const pending = ctx.codexApproval.request(
      request({ signal: controller.signal }),
    );
    const prompt = await waitForPrompt(ctx);
    expect(prompt.signal.aborted).toBe(false);

    controller.abort();
    await expect(pending).resolves.toEqual({
      kind: "cancelled",
      source: "signal",
      decision: "cancel",
    });
    expect(prompt.signal.aborted).toBe(true);
    expect(ctx.codexApproval.respond(prompt.requestId, "accept")).toEqual({
      kind: "ignored",
      reason: "unknown_or_settled_request",
    });
    await dispose();
  });

  it("contains throwing and rogue rich transports", async () => {
    const throwing = await mounted();
    throwing.ctx.on("codex-approval/request", () => {
      throw new Error("transport down");
    });
    await expect(
      throwing.ctx.codexApproval.request(request()),
    ).resolves.toMatchObject({
      kind: "declined",
      reason: expect.stringContaining("transport down"),
    });
    await throwing.dispose();

    const rogue = await mounted();
    rogue.ctx.on("codex-approval/request", () =>
      Promise.resolve("granted" as never),
    );
    await expect(
      rogue.ctx.codexApproval.request(request()),
    ).resolves.toMatchObject({
      kind: "declined",
      reason: expect.stringContaining("unknown claim"),
    });
    await rogue.dispose();
  });
});

describe("generic ApprovedForSession cache", () => {
  it("stores every consumer-provided exact key and skips only when all keys match", async () => {
    const { ctx, dispose } = await mounted();
    const cache = ctx.codexApproval.createSessionCache();
    const keyA = ApprovalCacheKey('{"argv":["git","status"]}');
    const keyB = ApprovalCacheKey('{"cwd":"/workspace"}');
    const keyC = ApprovalCacheKey('{"tty":true}');
    let prompts = 0;
    ctx.on("codex-approval/request", (prompt) => {
      prompts += 1;
      ctx.codexApproval.respond(
        prompt.requestId,
        prompts === 1 ? "acceptForSession" : "accept",
      );
      return Promise.resolve("claimed");
    });
    const choiceParams = params({
      availableDecisions: ["accept", "acceptForSession", "cancel"],
    });

    await expect(
      ctx.codexApproval.request({
        params: choiceParams,
        sessionCache: cache,
        sessionCacheKeys: [keyA, keyB],
      }),
    ).resolves.toEqual({
      kind: "approved_for_session",
      source: "answerer",
      decision: "acceptForSession",
      cacheKeysRecorded: true,
    });
    expect(ctx.codexApproval.areApprovedForSession(cache, [keyA])).toBe(true);
    expect(ctx.codexApproval.areApprovedForSession(cache, [keyA, keyB])).toBe(
      true,
    );
    expect(ctx.codexApproval.areApprovedForSession(cache, [])).toBe(false);

    await expect(
      ctx.codexApproval.request({
        params: choiceParams,
        sessionCache: cache,
        sessionCacheKeys: [keyB],
      }),
    ).resolves.toMatchObject({
      kind: "approved_for_session",
      source: "session_cache",
    });
    expect(prompts).toBe(1);

    await expect(
      ctx.codexApproval.request({
        params: choiceParams,
        sessionCache: cache,
        sessionCacheKeys: [keyA, keyC],
      }),
    ).resolves.toMatchObject({ kind: "approved_once" });
    expect(prompts).toBe(2);
    await dispose();
  });

  it("does not persist, resume, or reuse a closed session cache", async () => {
    const first = await mounted();
    const firstCache = first.ctx.codexApproval.createSessionCache();
    const key = ApprovalCacheKey("exact-key");
    first.ctx.on("codex-approval/request", (prompt) => {
      first.ctx.codexApproval.respond(prompt.requestId, "acceptForSession");
      return Promise.resolve("claimed");
    });
    const choiceParams = params({
      availableDecisions: ["accept", "acceptForSession", "cancel"],
    });
    await first.ctx.codexApproval.request({
      params: choiceParams,
      sessionCache: firstCache,
      sessionCacheKeys: [key],
    });
    expect(first.ctx.codexApproval.closeSessionCache(firstCache)).toBe(true);
    await expect(
      first.ctx.codexApproval.request({
        params: choiceParams,
        sessionCache: firstCache,
        sessionCacheKeys: [key],
      }),
    ).resolves.toMatchObject({ kind: "declined", source: "fail_closed" });
    await first.dispose();

    const resumed = await mounted();
    const resumedCache = resumed.ctx.codexApproval.createSessionCache();
    let prompted = false;
    resumed.ctx.on("codex-approval/request", (prompt) => {
      prompted = true;
      resumed.ctx.codexApproval.respond(prompt.requestId, "accept");
      return Promise.resolve("claimed");
    });
    await resumed.ctx.codexApproval.request({
      params: choiceParams,
      sessionCache: resumedCache,
      sessionCacheKeys: [key],
    });
    expect(prompted).toBe(true);
    await resumed.dispose();
  });

  it("refuses to use the generic cache for a network approval", async () => {
    const { ctx, dispose } = await mounted();
    const cache = ctx.codexApproval.createSessionCache();
    await expect(
      ctx.codexApproval.request({
        params: params({
          networkApprovalContext: { host: "example.com", protocol: "https" },
        }),
        sessionCache: cache,
        sessionCacheKeys: [ApprovalCacheKey("network-key")],
      }),
    ).resolves.toMatchObject({
      kind: "declined",
      reason: expect.stringContaining("canonical network coordinator"),
    });
    await dispose();
  });
});

describe("execpolicy amendment coordination", () => {
  it("waits for persistence before releasing an approved-once result", async () => {
    const { ctx, dispose } = await mounted();
    const amendment = ["git", "status"];
    let release!: () => void;
    const persisted = new Promise<void>((resolve) => {
      release = resolve;
    });
    const persistExecpolicyAmendment = vi.fn(() => persisted);
    ctx.on("codex-approval/request", (prompt) => {
      ctx.codexApproval.respond(prompt.requestId, {
        acceptWithExecpolicyAmendment: {
          execpolicy_amendment: amendment,
        },
      });
      return Promise.resolve("claimed");
    });
    let resolved = false;
    const result = ctx.codexApproval
      .request({
        params: params({ proposedExecpolicyAmendment: amendment }),
        execpolicyAmendmentCoordinator: { persistExecpolicyAmendment },
      })
      .then((value) => {
        resolved = true;
        return value;
      });
    await vi.waitFor(() =>
      expect(persistExecpolicyAmendment).toHaveBeenCalledOnce(),
    );
    expect(resolved).toBe(false);
    release();
    await expect(result).resolves.toMatchObject({
      kind: "approved_once",
      amendmentPersistence: { kind: "persisted" },
    });
    await dispose();
  });

  it("warns on persistence failure but still releases only a one-shot approval", async () => {
    const { ctx, dispose } = await mounted();
    const amendment = ["git", "status"];
    const warnings: ExecpolicyAmendmentPersistenceWarning[] = [];
    const logger = vi.spyOn(ctx.logger, "warn").mockImplementation(() => {});
    ctx.on("codex-approval/warning", (warning) => {
      warnings.push(warning);
    });
    ctx.on("codex-approval/request", (prompt) => {
      ctx.codexApproval.respond(prompt.requestId, {
        acceptWithExecpolicyAmendment: {
          execpolicy_amendment: amendment,
        },
      });
      return Promise.resolve("claimed");
    });

    const result = await ctx.codexApproval.request({
      params: params({ proposedExecpolicyAmendment: amendment }),
      execpolicyAmendmentCoordinator: {
        persistExecpolicyAmendment: () =>
          Promise.reject(new Error("disk full")),
      },
    });
    expect(result).toMatchObject({
      kind: "approved_once",
      amendmentPersistence: {
        kind: "failed",
        warning: { message: "disk full" },
      },
    });
    expect(warnings).toHaveLength(1);
    expect(logger).toHaveBeenCalledWith(expect.stringContaining("disk full"));
    await dispose();
  });

  it("keeps disposal owner-visible until amendment persistence is quiescent", async () => {
    const { ctx, dispose } = await mounted();
    const amendment = ["git", "status"];
    let release!: () => void;
    const persistence = new Promise<void>((resolve) => {
      release = resolve;
    });
    const persistExecpolicyAmendment = vi.fn(() => persistence);
    ctx.on("codex-approval/request", (prompt) => {
      ctx.codexApproval.respond(prompt.requestId, {
        acceptWithExecpolicyAmendment: {
          execpolicy_amendment: amendment,
        },
      });
      return Promise.resolve("claimed");
    });
    const result = ctx.codexApproval.request({
      params: params({ proposedExecpolicyAmendment: amendment }),
      execpolicyAmendmentCoordinator: { persistExecpolicyAmendment },
    });
    await vi.waitFor(() =>
      expect(persistExecpolicyAmendment).toHaveBeenCalledOnce(),
    );

    let disposed = false;
    const disposing = dispose().then(() => {
      disposed = true;
    });
    await Promise.resolve();
    expect(disposed).toBe(false);

    release();
    await expect(result).resolves.toMatchObject({
      kind: "approved_once",
      amendmentPersistence: { kind: "persisted" },
    });
    await disposing;
    expect(disposed).toBe(true);
  });

  it("does not pretend an amendment persisted when no coordinator exists", async () => {
    const { ctx, dispose } = await mounted();
    ctx.on("codex-approval/request", (prompt) => {
      ctx.codexApproval.respond(prompt.requestId, {
        acceptWithExecpolicyAmendment: {
          execpolicy_amendment: ["git", "status"],
        },
      });
      return Promise.resolve("claimed");
    });
    await expect(
      ctx.codexApproval.request({
        params: params({ proposedExecpolicyAmendment: ["git", "status"] }),
      }),
    ).resolves.toMatchObject({
      kind: "approved_once",
      amendmentPersistence: {
        kind: "failed",
        warning: { message: expect.stringContaining("no execpolicy") },
      },
    });
    await dispose();
  });
});

describe("DSH one-shot compatibility backend", () => {
  it("maps allowed-once, rejected, and cancelled distinctly, while unavailable delegates", async () => {
    const { ctx, dispose } = await mounted();
    const oneShot = vi
      .fn<
        () => Promise<"allowed-once" | "rejected" | "cancelled" | "unavailable">
      >()
      .mockResolvedValueOnce("allowed-once")
      .mockResolvedValueOnce("rejected")
      .mockResolvedValueOnce("cancelled")
      .mockResolvedValueOnce("unavailable");
    ctx.codexApproval.registerBackend(
      createDshOneShotCompatibilityBackend({
        id: "dsh-generic",
        rejectionDecision: "decline",
        request: oneShot,
      }),
    );
    expect(ctx.codexApproval.backendCapabilities()).toEqual([
      {
        id: "dsh-generic",
        capabilities: {
          richRequestPresentation: false,
          approvedOnce: true,
          approvedForSession: false,
          execpolicyAmendment: false,
          networkPolicyAmendment: false,
          distinguishesDeclineFromCancel: false,
        },
      },
    ]);
    const compatibleParams = params({
      availableDecisions: ["accept", "decline", "cancel"],
    });
    await expect(
      ctx.codexApproval.request({ params: compatibleParams }),
    ).resolves.toMatchObject({ kind: "approved_once" });
    await expect(
      ctx.codexApproval.request({ params: compatibleParams }),
    ).resolves.toMatchObject({ kind: "declined", source: "answerer" });
    await expect(
      ctx.codexApproval.request({ params: compatibleParams }),
    ).resolves.toMatchObject({ kind: "cancelled", source: "answerer" });
    await expect(
      ctx.codexApproval.request({ params: compatibleParams }),
    ).resolves.toMatchObject({ kind: "declined", source: "fail_closed" });
    expect(oneShot).toHaveBeenCalledTimes(4);
    await dispose();
  });

  it("delegates DSH unavailable to the next registered backend", async () => {
    const { ctx, dispose } = await mounted();
    ctx.codexApproval.registerBackend(
      createDshOneShotCompatibilityBackend({
        id: "dsh-unavailable",
        rejectionDecision: "decline",
        request: () => Promise.resolve("unavailable"),
      }),
    );
    const fallback = vi.fn(() => Promise.resolve("accept" as const));
    ctx.codexApproval.registerBackend({
      id: "fallback",
      capabilities: {
        richRequestPresentation: true,
        approvedOnce: true,
        approvedForSession: false,
        execpolicyAmendment: false,
        networkPolicyAmendment: false,
        distinguishesDeclineFromCancel: true,
      },
      canHandle: () => true,
      request: fallback,
    });
    await expect(
      ctx.codexApproval.request({
        params: params({
          availableDecisions: ["accept", "decline", "cancel"],
        }),
      }),
    ).resolves.toMatchObject({ kind: "approved_once" });
    expect(fallback).toHaveBeenCalledOnce();
    await dispose();
  });

  it("does not claim a prompt whose configured rejection decision is unavailable", async () => {
    const { ctx, dispose } = await mounted();
    const oneShot = vi.fn(() => Promise.resolve("allowed-once" as const));
    ctx.codexApproval.registerBackend(
      createDshOneShotCompatibilityBackend({
        id: "dsh-generic",
        rejectionDecision: "decline",
        request: oneShot,
      }),
    );
    await expect(ctx.codexApproval.request(request())).resolves.toMatchObject({
      kind: "declined",
      source: "fail_closed",
    });
    expect(oneShot).not.toHaveBeenCalled();
    await dispose();
  });

  it("fails closed when a backend exceeds its advertised decision capabilities", async () => {
    const { ctx, dispose } = await mounted();
    ctx.codexApproval.registerBackend({
      id: "dishonest-one-shot",
      capabilities: {
        richRequestPresentation: false,
        approvedOnce: true,
        approvedForSession: false,
        execpolicyAmendment: false,
        networkPolicyAmendment: false,
        distinguishesDeclineFromCancel: false,
      },
      canHandle: () => true,
      request: () => Promise.resolve("acceptForSession"),
    });
    await expect(
      ctx.codexApproval.request({
        params: params({
          availableDecisions: ["accept", "acceptForSession", "cancel"],
        }),
      }),
    ).resolves.toMatchObject({
      kind: "declined",
      source: "fail_closed",
      reason: expect.stringContaining("advertised capabilities"),
    });
    await dispose();
  });

  it("fails closed when a backend returns a malformed runtime decision", async () => {
    const { ctx, dispose } = await mounted();
    ctx.codexApproval.registerBackend({
      id: "malformed-runtime-backend",
      capabilities: {
        richRequestPresentation: true,
        approvedOnce: true,
        approvedForSession: true,
        execpolicyAmendment: true,
        networkPolicyAmendment: true,
        distinguishesDeclineFromCancel: true,
      },
      canHandle: () => true,
      request: () => Promise.resolve("future-decision" as never),
    });

    await expect(ctx.codexApproval.request(request())).resolves.toMatchObject({
      kind: "declined",
      source: "fail_closed",
      reason: expect.stringContaining("malformed decision"),
    });
    expect(ctx.codexApproval.pendingPrompts()).toHaveLength(0);
    await dispose();
  });

  it("fails closed when a backend request throws", async () => {
    const { ctx, dispose } = await mounted();
    ctx.codexApproval.registerBackend({
      id: "throwing-request-backend",
      capabilities: {
        richRequestPresentation: true,
        approvedOnce: true,
        approvedForSession: true,
        execpolicyAmendment: true,
        networkPolicyAmendment: true,
        distinguishesDeclineFromCancel: true,
      },
      canHandle: () => true,
      request: () => {
        throw new Error("backend request trap");
      },
    });

    await expect(ctx.codexApproval.request(request())).resolves.toMatchObject({
      kind: "declined",
      source: "fail_closed",
      reason: expect.stringContaining("backend request trap"),
    });
    expect(ctx.codexApproval.pendingPrompts()).toHaveLength(0);
    await dispose();
  });

  it("fails closed when validating a hostile backend decision throws", async () => {
    const { ctx, dispose } = await mounted();
    const hostile = new Proxy(
      {},
      {
        getPrototypeOf() {
          throw new Error("hostile decision trap");
        },
      },
    );
    ctx.codexApproval.registerBackend({
      id: "throwing-decision-backend",
      capabilities: {
        richRequestPresentation: true,
        approvedOnce: true,
        approvedForSession: true,
        execpolicyAmendment: true,
        networkPolicyAmendment: true,
        distinguishesDeclineFromCancel: true,
      },
      canHandle: () => true,
      request: () => Promise.resolve(hostile as never),
    });

    await expect(ctx.codexApproval.request(request())).resolves.toMatchObject({
      kind: "declined",
      source: "fail_closed",
      reason: expect.stringContaining("hostile decision trap"),
    });
    expect(ctx.codexApproval.pendingPrompts()).toHaveLength(0);
    await dispose();
  });
});
