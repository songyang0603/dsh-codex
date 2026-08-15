import type {
  CommandExecutionApprovalDecision,
  ExecPolicyAmendment,
  NetworkPolicyAmendment,
} from "./types.js";
import { parseCommandExecutionRequestApprovalResponse } from "./validation.js";

/** Exact observable subset of pinned core `ReviewDecision`. */
export type CodexCoreReviewDecision =
  | "approved"
  | {
      approved_execpolicy_amendment: {
        proposed_execpolicy_amendment: ExecPolicyAmendment;
      };
    }
  | "approved_for_session"
  | "approved_mcp_policy_amendment"
  | {
      network_policy_amendment: {
        network_policy_amendment: NetworkPolicyAmendment;
      };
    }
  | { denied: { rejection: string } }
  | "timed_out"
  | "abort";

export type CommandApprovalCompletionStatus = "declined" | "failed" | null;

export interface CommandApprovalResponseBridgeResult {
  reviewDecision: CodexCoreReviewDecision;
  completionStatus: CommandApprovalCompletionStatus;
}

/** Pinned `From<CoreReviewDecision>` conversion used for outgoing prompts. */
export function commandExecutionApprovalDecisionFromCore(
  decision: Readonly<CodexCoreReviewDecision>,
): CommandExecutionApprovalDecision {
  if (decision === "approved") return "accept";
  if (decision === "approved_for_session") return "acceptForSession";
  if (decision === "approved_mcp_policy_amendment") return "decline";
  if (decision === "timed_out") return "decline";
  if (decision === "abort") return "cancel";
  if ("approved_execpolicy_amendment" in decision) {
    return {
      acceptWithExecpolicyAmendment: {
        execpolicy_amendment: [
          ...decision.approved_execpolicy_amendment
            .proposed_execpolicy_amendment,
        ],
      },
    };
  }
  if ("network_policy_amendment" in decision) {
    return {
      applyNetworkPolicyAmendment: {
        network_policy_amendment: {
          ...decision.network_policy_amendment.network_policy_amendment,
        },
      },
    };
  }
  return "decline";
}

/**
 * Pinned app-server response conversion. This function deliberately does not
 * consult the prompt's offered choices because upstream does not do so.
 */
export function commandExecutionApprovalResponseToCore(
  response: unknown,
): CommandApprovalResponseBridgeResult {
  const parsed = parseCommandExecutionRequestApprovalResponse(response);
  if (parsed === undefined) return commandExecutionApprovalFailureToCore();
  const decision = parsed.decision;
  if (decision === "accept") {
    return { reviewDecision: "approved", completionStatus: null };
  }
  if (decision === "acceptForSession") {
    return { reviewDecision: "approved_for_session", completionStatus: null };
  }
  if (decision === "decline") {
    return {
      reviewDecision: { denied: { rejection: "rejected by user" } },
      completionStatus: "declined",
    };
  }
  if (decision === "cancel") {
    return { reviewDecision: "abort", completionStatus: "declined" };
  }
  if ("acceptWithExecpolicyAmendment" in decision) {
    return {
      reviewDecision: {
        approved_execpolicy_amendment: {
          proposed_execpolicy_amendment: [
            ...decision.acceptWithExecpolicyAmendment.execpolicy_amendment,
          ],
        },
      },
      completionStatus: null,
    };
  }
  const amendment =
    decision.applyNetworkPolicyAmendment.network_policy_amendment;
  return {
    reviewDecision: {
      network_policy_amendment: {
        network_policy_amendment: { ...amendment },
      },
    },
    completionStatus: amendment.action === "deny" ? "declined" : null,
  };
}

/** Pinned malformed/client/receiver failure conversion. */
export function commandExecutionApprovalFailureToCore(): CommandApprovalResponseBridgeResult {
  return {
    reviewDecision: { denied: { rejection: "approval request failed" } },
    completionStatus: "failed",
  };
}
