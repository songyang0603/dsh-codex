import { describe, expect, it } from "vitest";
import {
  commandExecutionRequestValidationError,
  effectiveAvailableDecisions,
  parseCommandExecutionApprovalDecision,
  parseCommandExecutionRequestApprovalParams,
  parseCommandExecutionRequestApprovalResponse,
  type CommandExecutionRequestApprovalParams,
} from "../src/index.js";

function params(
  overrides: Partial<CommandExecutionRequestApprovalParams> = {},
): CommandExecutionRequestApprovalParams {
  return {
    threadId: "thread-1",
    turnId: "turn-1",
    itemId: "item-1",
    startedAtMs: 1_725_000_000_000,
    environmentId: "env-1",
    command: "git status",
    cwd: "/workspace",
    commandActions: [{ type: "unknown", command: "git status" }],
    ...overrides,
  };
}

describe("pinned command approval wire", () => {
  it("keeps the normal-command legacy default ordered and does not invent a session grant", () => {
    expect(effectiveAvailableDecisions(params())).toEqual(["accept", "cancel"]);
  });

  it("inserts the exact transparent execpolicy amendment between accept and cancel", () => {
    expect(
      effectiveAvailableDecisions(
        params({ proposedExecpolicyAmendment: ["git", "status"] }),
      ),
    ).toEqual([
      "accept",
      {
        acceptWithExecpolicyAmendment: {
          execpolicy_amendment: ["git", "status"],
        },
      },
      "cancel",
    ]);
  });

  it("uses the network order and selects the first allow amendment, not a deny", () => {
    expect(
      effectiveAvailableDecisions(
        params({
          networkApprovalContext: { host: "example.com", protocol: "https" },
          proposedNetworkPolicyAmendments: [
            { host: "example.com", action: "deny" },
            { host: "example.com", action: "allow" },
          ],
        }),
      ),
    ).toEqual([
      "accept",
      "acceptForSession",
      {
        applyNetworkPolicyAmendment: {
          network_policy_amendment: {
            host: "example.com",
            action: "allow",
          },
        },
      },
      "cancel",
    ]);
  });

  it("gives additional permissions their pinned accept/cancel default", () => {
    expect(
      effectiveAvailableDecisions(
        params({
          additionalPermissions: {
            network: { enabled: true },
            fileSystem: {
              read: null,
              write: ["/workspace/out"],
              globScanMaxDepth: 8,
              entries: [
                {
                  path: { type: "special", value: { kind: "minimal" } },
                  access: "read",
                },
              ],
            },
          },
          proposedExecpolicyAmendment: ["ignored", "for-default-selection"],
        }),
      ),
    ).toEqual(["accept", "cancel"]);
  });

  it("preserves an explicit ordered availableDecisions vector exactly", () => {
    const explicit = ["cancel" as const, "decline" as const, "accept" as const];
    expect(
      effectiveAvailableDecisions(params({ availableDecisions: explicit })),
    ).toEqual(explicit);
  });

  it("accepts the fixed nested additional-permissions wire", () => {
    const value = params({
      approvalId: null,
      reason: null,
      networkApprovalContext: null,
      additionalPermissions: {
        network: { enabled: null },
        fileSystem: {
          read: ["/workspace/input"],
          write: null,
          entries: [
            {
              path: {
                type: "special",
                value: {
                  kind: "unknown",
                  path: "/managed",
                  subpath: null,
                },
              },
              access: "deny",
            },
            {
              path: { type: "glob_pattern", pattern: "/workspace/**/*.env" },
              access: "read",
            },
          ],
        },
      },
      availableDecisions: ["accept", "cancel"],
    });
    expect(commandExecutionRequestValidationError(value)).toBeUndefined();
  });

  it("preserves explicit empty and duplicate choice vectors accepted by the pinned wire", () => {
    expect(
      commandExecutionRequestValidationError(
        params({ availableDecisions: [] }),
      ),
    ).toBeUndefined();
    expect(
      commandExecutionRequestValidationError(
        params({ availableDecisions: ["accept", "accept"] }),
      ),
    ).toBeUndefined();
    expect(
      effectiveAvailableDecisions(
        params({ availableDecisions: ["accept", "accept"] }),
      ),
    ).toEqual(["accept", "accept"]);
  });

  it("ignores unknown fields while rejecting unknown decision variants", () => {
    expect(
      commandExecutionRequestValidationError({
        ...params(),
        futureField: true,
      }),
    ).toBeUndefined();
    expect(
      parseCommandExecutionApprovalDecision("approved-for-ever"),
    ).toBeUndefined();
    expect(
      parseCommandExecutionApprovalDecision({
        acceptWithExecpolicyAmendment: {
          execpolicy_amendment: ["git"],
          extra: true,
        },
      }),
    ).toEqual({
      acceptWithExecpolicyAmendment: {
        execpolicy_amendment: ["git"],
      },
    });
    expect(
      parseCommandExecutionApprovalDecision({
        acceptWithExecpolicyAmendment: {
          execpolicy_amendment: ["git"],
        },
        applyNetworkPolicyAmendment: {
          network_policy_amendment: {
            host: "example.com",
            action: "allow",
          },
        },
      }),
    ).toBeUndefined();
    expect(
      parseCommandExecutionApprovalDecision({
        acceptWithExecpolicyAmendment: {
          execpolicy_amendment: ["git"],
        },
        futureVariant: true,
      }),
    ).toBeUndefined();
  });

  it("canonicalizes omitted option children and the legacy project-roots alias", () => {
    expect(
      parseCommandExecutionRequestApprovalParams({
        threadId: "thread",
        turnId: "turn",
        itemId: "item",
        startedAtMs: 0,
        futureField: true,
        additionalPermissions: {
          network: {},
          fileSystem: {
            entries: [
              {
                path: {
                  type: "special",
                  value: { kind: "current_working_directory" },
                },
                access: "read",
                futureEntryField: true,
              },
            ],
          },
        },
      }),
    ).toEqual({
      threadId: "thread",
      turnId: "turn",
      itemId: "item",
      startedAtMs: 0,
      environmentId: null,
      additionalPermissions: {
        network: { enabled: null },
        fileSystem: {
          read: null,
          write: null,
          entries: [
            {
              path: {
                type: "special",
                value: { kind: "project_roots", subpath: null },
              },
              access: "read",
            },
          ],
        },
      },
    });
  });

  it("parses and canonicalizes the response envelope independently of offered choices", () => {
    expect(
      parseCommandExecutionRequestApprovalResponse({
        decision: {
          acceptWithExecpolicyAmendment: {
            execpolicy_amendment: ["git", "status"],
            futureChild: true,
          },
        },
        futureEnvelope: true,
      }),
    ).toEqual({
      decision: {
        acceptWithExecpolicyAmendment: {
          execpolicy_amendment: ["git", "status"],
        },
      },
    });
  });
});
