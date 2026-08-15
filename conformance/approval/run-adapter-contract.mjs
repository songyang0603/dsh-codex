#!/usr/bin/env node

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import {
  baseParams,
  loadCandidate,
  mounted,
  parseJsonl,
  waitUntil,
} from "./lib.mjs";

const OPERATIONS = new Set([
  "pendingReverseCorrelation",
  "signalCancelLateDecision",
  "unknownAndDuplicateResponse",
  "malformedKnownResponse",
  "ordinaryDoesNotOfferSessionChoice",
  "disposeCancelsPending",
  "crossThreadEqualIdIsolation",
  "sameThreadEqualIdSupersedes",
  "ambiguousDecisionFailsClosed",
  "malformedBackendFailsClosed",
]);

function usage() {
  process.stderr.write(
    "Usage: node run-adapter-contract.mjs --package-dir DIR --corpus FILE --output FILE\n",
  );
}

function parseArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "-h" || argument === "--help") {
      usage();
      process.exit(0);
    }
    if (!["--package-dir", "--corpus", "--output"].includes(argument)) {
      throw new Error(`unknown argument: ${argument}`);
    }
    const value = argv[index + 1];
    if (!value) throw new Error(`missing value for ${argument}`);
    args[argument.slice(2)] = resolve(value);
    index += 1;
  }
  for (const key of ["package-dir", "corpus", "output"]) {
    if (!args[key]) throw new Error(`--${key} is required`);
  }
  if (args.corpus === args.output) {
    throw new Error("output must not overwrite the corpus");
  }
  return args;
}

function request(overrides = {}) {
  return { params: baseParams(), ...overrides };
}

async function claimedRuntime(loaded, handler) {
  const runtime = await mounted(loaded);
  runtime.ctx.on("codex-approval/request", (prompt) => {
    handler?.(prompt, runtime);
    return Promise.resolve("claimed");
  });
  return runtime;
}

async function waitForPrompts(runtime, count) {
  return waitUntil(() => {
    const prompts = runtime.service.pendingPrompts();
    return prompts.length === count ? prompts : undefined;
  }, `${count} pending approval prompt(s)`);
}

function reasonCategory(resolution) {
  const reason = resolution?.reason ?? "";
  if (reason.includes("malformed")) return "malformed_decision";
  if (reason.includes("not present")) return "decision_not_available";
  if (reason.includes("empty")) return "empty_available_decisions";
  return "other";
}

function normalizeFailClosed(resolution) {
  return {
    kind: resolution.kind,
    source: resolution.source,
    decision: resolution.decision,
    reasonCategory: reasonCategory(resolution),
  };
}

async function pendingReverseCorrelation(loaded) {
  const runtime = await claimedRuntime(loaded);
  try {
    const first = runtime.service.request(
      request({ params: baseParams({ itemId: "first" }) }),
    );
    const second = runtime.service.request(
      request({ params: baseParams({ itemId: "second" }) }),
    );
    const prompts = await waitForPrompts(runtime, 2);
    const byItem = new Map(
      prompts.map((prompt) => [prompt.params.itemId, prompt]),
    );
    const responses = [
      runtime.service.respond(byItem.get("second").requestId, "cancel"),
      runtime.service.respond(byItem.get("first").requestId, "accept"),
    ];
    return {
      pendingBefore: prompts.length,
      responses,
      resolutions: [await first, await second],
      pendingAfter: runtime.service.pendingPrompts().length,
    };
  } finally {
    await runtime.dispose();
  }
}

async function signalCancelLateDecision(loaded) {
  const runtime = await claimedRuntime(loaded);
  try {
    const controller = new AbortController();
    const pending = runtime.service.request(
      request({ signal: controller.signal }),
    );
    const [prompt] = await waitForPrompts(runtime, 1);
    const promptAbortedBefore = prompt.signal.aborted;
    controller.abort();
    const resolution = await pending;
    return {
      promptAbortedBefore,
      resolution,
      promptAbortedAfter: prompt.signal.aborted,
      lateResponse: runtime.service.respond(prompt.requestId, "accept"),
      pendingAfter: runtime.service.pendingPrompts().length,
    };
  } finally {
    await runtime.dispose();
  }
}

async function unknownAndDuplicateResponse(loaded) {
  const runtime = await claimedRuntime(loaded);
  try {
    const pending = runtime.service.request(request());
    const [prompt] = await waitForPrompts(runtime, 1);
    const unknown = runtime.service.respond("unknown-request-id", "accept");
    const pendingAfterUnknown = runtime.service.pendingPrompts().length;
    const accepted = runtime.service.respond(prompt.requestId, "accept");
    const duplicate = runtime.service.respond(prompt.requestId, "cancel");
    return {
      unknown,
      pendingAfterUnknown,
      accepted,
      duplicate,
      resolution: await pending,
      pendingAfter: runtime.service.pendingPrompts().length,
    };
  } finally {
    await runtime.dispose();
  }
}

async function malformedKnownResponse(loaded) {
  const runtime = await claimedRuntime(loaded);
  try {
    const pending = runtime.service.request(request());
    const [prompt] = await waitForPrompts(runtime, 1);
    const response = runtime.service.respond(prompt.requestId, {
      futureDecision: "grant",
    });
    const resolution = normalizeFailClosed(await pending);
    return {
      response,
      resolution,
      lateResponse: runtime.service.respond(prompt.requestId, "accept"),
      pendingAfter: runtime.service.pendingPrompts().length,
    };
  } finally {
    await runtime.dispose();
  }
}

async function ordinaryDoesNotOfferSessionChoice(loaded) {
  let availableDecisions;
  let response;
  const runtime = await claimedRuntime(loaded, (prompt, mountedRuntime) => {
    availableDecisions = [...prompt.availableDecisions];
    response = mountedRuntime.service.respond(prompt.requestId, "accept");
  });
  try {
    const resolution = await runtime.service.request(request());
    return {
      availableDecisions,
      response,
      resolution,
      pendingAfter: runtime.service.pendingPrompts().length,
    };
  } finally {
    await runtime.dispose();
  }
}

async function disposeCancelsPending(loaded) {
  const runtime = await claimedRuntime(loaded);
  let disposed = false;
  try {
    const pending = runtime.service.request(request());
    const [prompt] = await waitForPrompts(runtime, 1);
    await runtime.dispose();
    disposed = true;
    return {
      resolution: await pending,
      promptAborted: prompt.signal.aborted,
      lateResponse: runtime.service.respond(prompt.requestId, "accept"),
    };
  } finally {
    if (!disposed) await runtime.dispose();
  }
}

async function crossThreadEqualIdIsolation(loaded) {
  const runtime = await claimedRuntime(loaded);
  try {
    const first = runtime.service.request(
      request({
        params: baseParams({ threadId: "thread-a", itemId: "shared-item" }),
      }),
    );
    const second = runtime.service.request(
      request({
        params: baseParams({ threadId: "thread-b", itemId: "shared-item" }),
      }),
    );
    const prompts = await waitForPrompts(runtime, 2);
    const byThread = new Map(
      prompts.map((prompt) => [prompt.params.threadId, prompt]),
    );
    const firstPrompt = byThread.get("thread-a");
    const secondPrompt = byThread.get("thread-b");
    const responses = [
      runtime.service.respond(secondPrompt.requestId, "cancel"),
      runtime.service.respond(firstPrompt.requestId, "accept"),
    ];
    return {
      requestIdsDistinct: firstPrompt.requestId !== secondPrompt.requestId,
      pendingBefore: prompts.length,
      responses,
      resolutions: [await first, await second],
      pendingAfter: runtime.service.pendingPrompts().length,
    };
  } finally {
    await runtime.dispose();
  }
}

async function sameThreadEqualIdSupersedes(loaded) {
  const runtime = await claimedRuntime(loaded);
  try {
    const first = runtime.service.request(
      request({ params: baseParams({ itemId: "shared-item" }) }),
    );
    const [firstPrompt] = await waitForPrompts(runtime, 1);
    const second = runtime.service.request(
      request({
        params: baseParams({
          turnId: "replacement-turn",
          itemId: "shared-item",
        }),
      }),
    );
    const firstResolution = await first;
    const [secondPrompt] = await waitForPrompts(runtime, 1);
    const lateFirstResponse = runtime.service.respond(
      firstPrompt.requestId,
      "accept",
    );
    const response = runtime.service.respond(secondPrompt.requestId, "accept");
    return {
      requestIdsDistinct: firstPrompt.requestId !== secondPrompt.requestId,
      firstResolution,
      lateFirstResponse,
      response,
      secondResolution: await second,
      pendingAfter: runtime.service.pendingPrompts().length,
    };
  } finally {
    await runtime.dispose();
  }
}

async function ambiguousDecisionFailsClosed(loaded) {
  const runtime = await claimedRuntime(loaded);
  try {
    const pending = runtime.service.request(request());
    const [prompt] = await waitForPrompts(runtime, 1);
    const response = runtime.service.respond(prompt.requestId, {
      acceptWithExecpolicyAmendment: {
        execpolicy_amendment: ["git", "status"],
      },
      applyNetworkPolicyAmendment: {
        network_policy_amendment: {
          host: "example.com",
          action: "allow",
        },
      },
    });
    return {
      response,
      resolution: normalizeFailClosed(await pending),
      pendingAfter: runtime.service.pendingPrompts().length,
    };
  } finally {
    await runtime.dispose();
  }
}

async function malformedBackendFailsClosed(loaded) {
  const runtime = await mounted(loaded);
  try {
    runtime.service.registerBackend({
      id: "malformed-backend",
      capabilities: {
        richRequestPresentation: true,
        approvedOnce: true,
        approvedForSession: true,
        execpolicyAmendment: true,
        networkPolicyAmendment: true,
        distinguishesDeclineFromCancel: true,
      },
      canHandle: () => true,
      request: () => Promise.resolve("future-decision"),
    });
    return {
      resolution: normalizeFailClosed(await runtime.service.request(request())),
      pendingAfter: runtime.service.pendingPrompts().length,
    };
  } finally {
    await runtime.dispose();
  }
}

async function execute(loaded, corpusCase) {
  switch (corpusCase.operation) {
    case "pendingReverseCorrelation":
      return pendingReverseCorrelation(loaded);
    case "signalCancelLateDecision":
      return signalCancelLateDecision(loaded);
    case "unknownAndDuplicateResponse":
      return unknownAndDuplicateResponse(loaded);
    case "malformedKnownResponse":
      return malformedKnownResponse(loaded);
    case "ordinaryDoesNotOfferSessionChoice":
      return ordinaryDoesNotOfferSessionChoice(loaded);
    case "disposeCancelsPending":
      return disposeCancelsPending(loaded);
    case "crossThreadEqualIdIsolation":
      return crossThreadEqualIdIsolation(loaded);
    case "sameThreadEqualIdSupersedes":
      return sameThreadEqualIdSupersedes(loaded);
    case "ambiguousDecisionFailsClosed":
      return ambiguousDecisionFailsClosed(loaded);
    case "malformedBackendFailsClosed":
      return malformedBackendFailsClosed(loaded);
    default:
      throw new Error(
        `${corpusCase.id}: unsupported adapter operation ${corpusCase.operation}`,
      );
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const loaded = await loadCandidate(args["package-dir"]);
  const cases = parseJsonl(await readFile(args.corpus, "utf8"), args.corpus);
  const records = [];
  for (const corpusCase of cases) {
    if (!OPERATIONS.has(corpusCase.operation)) {
      throw new Error(
        `${corpusCase.id}: unsupported operation ${corpusCase.operation}`,
      );
    }
    records.push({
      schemaVersion: 1,
      id: corpusCase.id,
      evidence: "adapter_contract",
      result: await execute(loaded, corpusCase),
    });
  }
  await mkdir(dirname(args.output), { recursive: true });
  await writeFile(
    args.output,
    `${records.map((record) => JSON.stringify(record)).join("\n")}\n`,
  );
  process.stdout.write(`approval adapter contract output: ${args.output}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error.stack ?? error}\n`);
  process.exitCode = 1;
});
