import type {
  CodexApprovalBackend,
  CodexApprovalPrompt,
  CommandExecutionApprovalDecision,
  DshOneShotApprovalOutcome,
  DshOneShotCompatibilityBackendOptions,
} from "./types.js";
import { DSH_ONE_SHOT_BACKEND_CAPABILITIES } from "./types.js";
import { decisionsEqual } from "./validation.js";

function offered(
  prompt: CodexApprovalPrompt,
  decision: CommandExecutionApprovalDecision,
): boolean {
  return prompt.availableDecisions.some((candidate) =>
    decisionsEqual(candidate, decision),
  );
}

/**
 * Adapt DSH rc.6's closed one-shot outcome vocabulary without pretending it
 * can return session grants or policy amendments. `cancelled` maps to Codex
 * cancel, `unavailable` delegates, and only `rejected` uses the caller's
 * explicit decline/cancel mapping. Agent lookup and the actual
 * `ctx.approval.request(...)` call remain explicit in the supplied callback.
 */
export function createDshOneShotCompatibilityBackend(
  options: DshOneShotCompatibilityBackendOptions,
): CodexApprovalBackend {
  if (options.id.length === 0)
    throw new TypeError("backend id must be non-empty");
  const rejectionDecision = options.rejectionDecision;
  return {
    id: options.id,
    capabilities: DSH_ONE_SHOT_BACKEND_CAPABILITIES,
    canHandle(prompt) {
      return (
        offered(prompt, "accept") &&
        offered(prompt, rejectionDecision) &&
        offered(prompt, "cancel")
      );
    },
    async request(prompt) {
      const outcome: DshOneShotApprovalOutcome = await options.request(prompt);
      switch (outcome) {
        case "allowed-once":
          return "accept";
        case "rejected":
          return rejectionDecision;
        case "cancelled":
          return "cancel";
        case "unavailable":
          return undefined;
      }
    },
  };
}
