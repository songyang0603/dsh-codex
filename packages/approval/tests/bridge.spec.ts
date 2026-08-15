import { describe, expect, it } from "vitest";
import {
  commandExecutionApprovalDecisionFromCore,
  commandExecutionApprovalFailureToCore,
  commandExecutionApprovalResponseToCore,
  type CodexCoreReviewDecision,
} from "../src/index.js";

describe("pinned core and app-server approval bridge", () => {
  it("maps every core ReviewDecision branch to the v2 command decision", () => {
    const cases: Array<
      [
        CodexCoreReviewDecision,
        ReturnType<typeof commandExecutionApprovalDecisionFromCore>,
      ]
    > = [
      ["approved", "accept"],
      ["approved_for_session", "acceptForSession"],
      ["approved_mcp_policy_amendment", "decline"],
      ["timed_out", "decline"],
      ["abort", "cancel"],
      [{ denied: { rejection: "policy" } }, "decline"],
      [
        {
          approved_execpolicy_amendment: {
            proposed_execpolicy_amendment: ["git", "status"],
          },
        },
        {
          acceptWithExecpolicyAmendment: {
            execpolicy_amendment: ["git", "status"],
          },
        },
      ],
      [
        {
          network_policy_amendment: {
            network_policy_amendment: {
              host: "example.com",
              action: "deny",
            },
          },
        },
        {
          applyNetworkPolicyAmendment: {
            network_policy_amendment: {
              host: "example.com",
              action: "deny",
            },
          },
        },
      ],
    ];
    for (const [input, expected] of cases) {
      expect(commandExecutionApprovalDecisionFromCore(input)).toEqual(expected);
    }
  });

  it("maps all valid response decisions and exact completion statuses", () => {
    expect(
      commandExecutionApprovalResponseToCore({ decision: "accept" }),
    ).toEqual({ reviewDecision: "approved", completionStatus: null });
    expect(
      commandExecutionApprovalResponseToCore({
        decision: "acceptForSession",
      }),
    ).toEqual({
      reviewDecision: "approved_for_session",
      completionStatus: null,
    });
    expect(
      commandExecutionApprovalResponseToCore({ decision: "decline" }),
    ).toEqual({
      reviewDecision: { denied: { rejection: "rejected by user" } },
      completionStatus: "declined",
    });
    expect(
      commandExecutionApprovalResponseToCore({ decision: "cancel" }),
    ).toEqual({ reviewDecision: "abort", completionStatus: "declined" });
    expect(
      commandExecutionApprovalResponseToCore({
        decision: {
          applyNetworkPolicyAmendment: {
            network_policy_amendment: {
              host: "example.com",
              action: "deny",
            },
          },
        },
      }),
    ).toEqual({
      reviewDecision: {
        network_policy_amendment: {
          network_policy_amendment: {
            host: "example.com",
            action: "deny",
          },
        },
      },
      completionStatus: "declined",
    });
  });

  it("uses the pinned failure decision and status for malformed responses", () => {
    expect(
      commandExecutionApprovalResponseToCore({ decision: "future" }),
    ).toEqual(commandExecutionApprovalFailureToCore());
    expect(commandExecutionApprovalFailureToCore()).toEqual({
      reviewDecision: { denied: { rejection: "approval request failed" } },
      completionStatus: "failed",
    });
  });
});
