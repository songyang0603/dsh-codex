import { Context } from "@deepseek-ai/cordis";
import { afterEach, describe, expect, it } from "vitest";
import CodexApprovalService, {
  ApprovalProtocolClient,
  ApprovalProtocolClientClosedError,
  APPROVAL_PARSE_REQUEST_METHOD,
  APPROVAL_PARSE_RESPONSE_METHOD,
  PINNED_CODEX_COMMIT,
  type CodexApprovalPrompt,
} from "../src/index.js";

const clients = new Set<ApprovalProtocolClient>();

function client(): ApprovalProtocolClient {
  const value = new ApprovalProtocolClient();
  clients.add(value);
  return value;
}

afterEach(async () => {
  await Promise.all([...clients].map((value) => value.close()));
  clients.clear();
});

describe("lossless pinned approval protocol client", () => {
  it("requires the complete pinned provenance handshake", async () => {
    const value = client();
    const hello = await value.hello();
    expect(hello.codexCommit).toBe(PINNED_CODEX_COMMIT);
    expect(hello.pointerWidth).toBe(64);
    expect(hello.methods).toEqual([
      APPROVAL_PARSE_REQUEST_METHOD,
      APPROVAL_PARSE_RESPONSE_METHOD,
    ]);
  });

  it("restores i64::MAX as bigint and rejects the adjacent overflow", async () => {
    const value = client();
    const maximum = await value.parseRequest(
      '{"threadId":"thread","turnId":"turn","itemId":"item","startedAtMs":9223372036854775807}',
    );
    expect(maximum.accepted).toBe(true);
    if (!maximum.accepted) throw new Error("i64::MAX was rejected");
    expect(maximum.value.startedAtMs).toBe(9_223_372_036_854_775_807n);
    expect(maximum.canonicalJson).toContain("9223372036854775807");
    expect(maximum.integerLexemes).toContainEqual({
      pointer: "/startedAtMs",
      decimalLexeme: "9223372036854775807",
    });

    const overflow = await value.parseRequest(
      '{"threadId":"thread","turnId":"turn","itemId":"item","startedAtMs":9223372036854775808}',
    );
    expect(overflow).toMatchObject({
      accepted: false,
      error: { code: "schema_rejected" },
    });
  });

  it("restores 64-bit usize::MAX and round-trips every response envelope", async () => {
    const value = client();
    const maximum = await value.parseRequest(
      '{"threadId":"thread","turnId":"turn","itemId":"item","startedAtMs":1,"additionalPermissions":{"network":null,"fileSystem":{"read":null,"write":null,"globScanMaxDepth":18446744073709551615}}}',
    );
    expect(maximum.accepted).toBe(true);
    if (!maximum.accepted) throw new Error("usize::MAX was rejected");
    expect(
      maximum.value.additionalPermissions?.fileSystem?.globScanMaxDepth,
    ).toBe(18_446_744_073_709_551_615n);

    for (const decision of [
      '"accept"',
      '"acceptForSession"',
      '{"acceptWithExecpolicyAmendment":{"execpolicy_amendment":["git","status"]}}',
      '{"applyNetworkPolicyAmendment":{"network_policy_amendment":{"host":"example.com","action":"allow"}}}',
      '"decline"',
      '"cancel"',
    ]) {
      const parsed = await value.parseResponse(`{"decision":${decision}}`);
      expect(parsed.accepted).toBe(true);
    }
  });

  it("does not impose a local byte ceiling below the pinned serde surface", async () => {
    const value = client();
    const command = '"'.repeat(2_200_000);
    const rawJson = JSON.stringify({
      threadId: "large-thread",
      turnId: "large-turn",
      itemId: "large-item",
      startedAtMs: 1,
      command,
    });
    expect(Buffer.byteLength(rawJson, "utf8")).toBeGreaterThan(4_400_000);

    const parsed = await value.parseRequest(rawJson);
    expect(parsed.accepted).toBe(true);
    if (!parsed.accepted) throw new Error("large valid request was rejected");
    expect(parsed.value.command).toBe(command);
    expect((await value.hello()).codexCommit).toBe(PINNED_CODEX_COMMIT);
  }, 30_000);

  it("fails closed after owner-visible shutdown", async () => {
    const value = client();
    await value.hello();
    await value.close();
    await expect(
      value.parseRequest(
        '{"threadId":"thread","turnId":"turn","itemId":"item","startedAtMs":1}',
      ),
    ).rejects.toBeInstanceOf(ApprovalProtocolClientClosedError);
  });
});

describe("lossless ingress through CodexApprovalService", () => {
  it("delivers exact bigint params to the rich transport and resolves normally", async () => {
    const ctx = new Context();
    const fiber = await ctx.plugin(CodexApprovalService);
    let observed: CodexApprovalPrompt | undefined;
    try {
      ctx.on("codex-approval/request", async (prompt) => {
        observed = prompt;
        const result = await ctx.codexApproval.respondJson(
          prompt.requestId,
          '{"decision":"accept"}',
        );
        expect(result).toEqual({ kind: "accepted" });
        return "claimed";
      });
      const resolution = await ctx.codexApproval.requestJson({
        rawJson:
          '{"threadId":"thread","turnId":"turn","itemId":"item","startedAtMs":9223372036854775807}',
      });
      expect(observed?.params.startedAtMs).toBe(9_223_372_036_854_775_807n);
      expect(resolution).toMatchObject({
        kind: "approved_once",
        decision: "accept",
      });
    } finally {
      await fiber.dispose();
    }
  });

  it("settles a known prompt fail-closed when native response serde rejects", async () => {
    const ctx = new Context();
    const fiber = await ctx.plugin(CodexApprovalService);
    try {
      ctx.on("codex-approval/request", async (prompt) => {
        const result = await ctx.codexApproval.respondJson(
          prompt.requestId,
          '{"decision":"future"}',
        );
        expect(result).toEqual({
          kind: "rejected",
          reason: "malformed_decision",
        });
        return "claimed";
      });
      await expect(
        ctx.codexApproval.requestJson({
          rawJson:
            '{"threadId":"thread","turnId":"turn","itemId":"item","startedAtMs":1}',
        }),
      ).resolves.toMatchObject({
        kind: "declined",
        source: "fail_closed",
      });
    } finally {
      await fiber.dispose();
    }
  });
});
