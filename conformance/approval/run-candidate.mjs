#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { mkdir } from "node:fs/promises";
import {
  EXPECTED_COMMIT,
  baseParams,
  loadCandidate,
  mounted,
  parseJsonl,
  pointerWidth,
  resolutionDecision,
  waitUntil,
} from "./lib.mjs";

const EXPECTED_OPERATIONS = new Set([
  "decisions",
  "requestWire",
  "responseWire",
  "cache",
  "persistence",
  "decisionFromCore",
  "responseToCore",
]);

function usage() {
  process.stderr.write(
    "Usage: node run-candidate.mjs --package-dir DIR --corpus FILE --output FILE\n",
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

function decisionParams(input) {
  const params = baseParams();
  if (Object.hasOwn(input, "explicitAvailableDecisions")) {
    params.availableDecisions = structuredClone(
      input.explicitAvailableDecisions,
    );
  }
  for (const key of [
    "networkApprovalContext",
    "proposedExecpolicyAmendment",
    "proposedNetworkPolicyAmendments",
    "additionalPermissions",
  ]) {
    if (Object.hasOwn(input, key)) params[key] = structuredClone(input[key]);
  }
  return params;
}

function stringEnd(text, start) {
  if (text[start] !== '"') throw new Error("expected JSON string");
  for (let index = start + 1; index < text.length; index += 1) {
    if (text[index] === "\\") {
      index += 1;
      continue;
    }
    if (text[index] === '"') return index + 1;
  }
  throw new Error("unterminated JSON string");
}

function valueEnd(text, start) {
  if (text[start] === '"') return stringEnd(text, start);
  if (text[start] === "{" || text[start] === "[") {
    const stack = [text[start]];
    for (let index = start + 1; index < text.length; index += 1) {
      if (text[index] === '"') {
        index = stringEnd(text, index) - 1;
        continue;
      }
      if (text[index] === "{" || text[index] === "[") {
        stack.push(text[index]);
        continue;
      }
      if (text[index] === "}" || text[index] === "]") {
        const opening = stack.pop();
        const expected = text[index] === "}" ? "{" : "[";
        if (opening !== expected) throw new Error("mismatched JSON brackets");
        if (stack.length === 0) return index + 1;
      }
    }
    throw new Error("unterminated JSON container");
  }
  let index = start;
  while (index < text.length && text[index] !== "," && text[index] !== "}") {
    index += 1;
  }
  return index;
}

/** Extract one top-level member without first parsing its numeric tokens. */
function rawObjectMember(text, wantedKey) {
  let index = 0;
  while (/\s/u.test(text[index] ?? "")) index += 1;
  if (text[index] !== "{") throw new Error("JSONL record is not an object");
  index += 1;
  for (;;) {
    while (/\s/u.test(text[index] ?? "")) index += 1;
    if (text[index] === "}") break;
    const keyStart = index;
    const keyEnd = stringEnd(text, keyStart);
    const key = JSON.parse(text.slice(keyStart, keyEnd));
    index = keyEnd;
    while (/\s/u.test(text[index] ?? "")) index += 1;
    if (text[index] !== ":") throw new Error("JSON object key has no colon");
    index += 1;
    while (/\s/u.test(text[index] ?? "")) index += 1;
    const start = index;
    const end = valueEnd(text, start);
    if (key === wantedKey) return text.slice(start, end).trimEnd();
    index = end;
    while (/\s/u.test(text[index] ?? "")) index += 1;
    if (text[index] === ",") {
      index += 1;
      continue;
    }
    if (text[index] === "}") break;
    throw new Error("JSON object member has no delimiter");
  }
  throw new Error(`JSONL record has no top-level ${wantedKey}`);
}

function runDecisions(loaded, corpusCase) {
  if (!corpusCase.input || typeof corpusCase.input !== "object") {
    throw new Error(`${corpusCase.id}: decisions input must be an object`);
  }
  return {
    availableDecisions: loaded.candidate.effectiveAvailableDecisions(
      decisionParams(corpusCase.input),
    ),
  };
}

async function runRequestWire(protocolClient, corpusCase, rawLine) {
  const width = pointerWidth();
  const comparison = corpusCase.comparison ?? "canonical";
  if (!["canonical", "acceptanceOnly"].includes(comparison)) {
    throw new Error(`${corpusCase.id}: invalid request wire comparison`);
  }
  if (
    corpusCase.requiresPointerWidth !== undefined &&
    corpusCase.requiresPointerWidth !== width
  ) {
    return {
      skipped: true,
      skipReason: "pointer_width_mismatch",
      pointerWidth: width,
      comparison,
    };
  }
  const parsed = await protocolClient.parseRequest(
    rawObjectMember(rawLine, "params"),
  );
  const result = {
    accepted: parsed.accepted,
    pointerWidth: width,
    comparison,
  };
  if (comparison === "canonical") {
    result.canonical = parsed.accepted ? parsed.value : null;
  }
  return result;
}

async function runResponseWire(loaded, protocolClient, corpusCase, rawLine) {
  if (!Array.isArray(corpusCase.offered)) {
    throw new Error(`${corpusCase.id}: response offered must be an array`);
  }
  const rawResponse = rawObjectMember(rawLine, "response");
  const parsedResponse = await protocolClient.parseResponse(rawResponse);
  const runtime = await mounted(loaded);
  let prompt;
  let respondResult;
  runtime.ctx.on("codex-approval/request", async (nextPrompt) => {
    prompt = nextPrompt;
    respondResult = await runtime.service.respondJson(
      nextPrompt.requestId,
      rawResponse,
    );
    return "claimed";
  });
  try {
    const resolution = await runtime.service.request({
      params: baseParams({
        availableDecisions: structuredClone(corpusCase.offered),
      }),
    });
    const accepted = respondResult?.kind === "accepted";
    return {
      accepted,
      decision: accepted
        ? parsedResponse.accepted
          ? parsedResponse.value.decision
          : resolutionDecision(resolution)
        : null,
    };
  } finally {
    await runtime.dispose();
  }
}

function runDecisionFromCore(loaded, corpusCase) {
  return {
    decision: loaded.candidate.commandExecutionApprovalDecisionFromCore(
      structuredClone(corpusCase.reviewDecision),
    ),
  };
}

function runResponseToCore(loaded, corpusCase) {
  return loaded.candidate.commandExecutionApprovalResponseToCore(
    structuredClone(corpusCase.response),
  );
}

async function runCache(loaded, corpusCase) {
  if (!Array.isArray(corpusCase.sessions) || corpusCase.sessions.length === 0) {
    throw new Error(`${corpusCase.id}: cache sessions must be non-empty`);
  }
  const runtime = await mounted(loaded);
  let currentDecision;
  let promptCalled = false;
  runtime.ctx.on("codex-approval/request", (prompt) => {
    promptCalled = true;
    const response = runtime.service.respond(prompt.requestId, currentDecision);
    if (response.kind !== "accepted") {
      throw new Error(
        `${corpusCase.id}: cache fetch decision was rejected: ${JSON.stringify(response)}`,
      );
    }
    return Promise.resolve("claimed");
  });
  try {
    const sessions = [];
    for (const inputSession of corpusCase.sessions) {
      if (
        !Array.isArray(inputSession.steps) ||
        inputSession.steps.length === 0
      ) {
        throw new Error(
          `${corpusCase.id}: cache session steps must be non-empty`,
        );
      }
      const sessionCache = runtime.service.createSessionCache();
      const steps = [];
      for (const step of inputSession.steps) {
        if (
          !Array.isArray(step.keys) ||
          step.keys.some((key) => typeof key !== "string" || key.length === 0)
        ) {
          throw new Error(`${corpusCase.id}: invalid cache keys`);
        }
        currentDecision = structuredClone(step.fetchDecision);
        promptCalled = false;
        const resolution = await runtime.service.request({
          params: baseParams({
            availableDecisions: [
              "accept",
              "acceptForSession",
              "decline",
              "cancel",
            ],
          }),
          sessionCache,
          sessionCacheKeys: step.keys.map((key) =>
            loaded.candidate.ApprovalCacheKey(key),
          ),
        });
        steps.push({
          decision: resolutionDecision(resolution),
          fetchCalled: promptCalled,
        });
      }
      sessions.push({ steps });
    }
    return { sessions };
  } finally {
    await runtime.dispose();
  }
}

async function runPersistence(loaded, corpusCase) {
  if (
    !Array.isArray(corpusCase.amendment) ||
    corpusCase.amendment.length === 0 ||
    corpusCase.amendment.some((token) => typeof token !== "string")
  ) {
    throw new Error(`${corpusCase.id}: invalid amendment`);
  }
  if (!["success", "failure"].includes(corpusCase.mode)) {
    throw new Error(`${corpusCase.id}: invalid persistence mode`);
  }
  const runtime = await mounted(loaded);
  let persistenceCalls = 0;
  let persistenceFinished = false;
  let releasePersistence;
  let persistenceStarted;
  const persistenceStartedPromise = new Promise((resolveStarted) => {
    persistenceStarted = resolveStarted;
  });
  const persistenceGate = new Promise((resolveGate) => {
    releasePersistence = resolveGate;
  });
  let warningCount = 0;
  runtime.ctx.on("codex-approval/warning", () => {
    warningCount += 1;
  });
  runtime.ctx.on("codex-approval/request", (prompt) => {
    const response = runtime.service.respond(prompt.requestId, {
      acceptWithExecpolicyAmendment: {
        execpolicy_amendment: structuredClone(corpusCase.amendment),
      },
    });
    if (response.kind !== "accepted") {
      throw new Error(
        `${corpusCase.id}: amendment response rejected: ${JSON.stringify(response)}`,
      );
    }
    return Promise.resolve("claimed");
  });

  try {
    let requestResolved = false;
    const requestPromise = runtime.service
      .request({
        params: baseParams({
          proposedExecpolicyAmendment: structuredClone(corpusCase.amendment),
        }),
        execpolicyAmendmentCoordinator: {
          async persistExecpolicyAmendment() {
            persistenceCalls += 1;
            persistenceStarted();
            if (corpusCase.mode === "failure") {
              throw new Error("simulated persistence failure");
            }
            await persistenceGate;
            persistenceFinished = true;
          },
        },
      })
      .then((resolution) => {
        requestResolved = true;
        return resolution;
      });
    await persistenceStartedPromise;
    await Promise.resolve();
    const unresolvedWhilePersistencePending = !requestResolved;
    if (corpusCase.mode === "success") releasePersistence();
    const resolution = await requestPromise;
    const warningsAtRelease = warningCount;
    const failure = corpusCase.mode === "failure";
    return {
      releasedDecision: resolutionDecision(resolution),
      persistenceAttempted: persistenceCalls === 1,
      persistenceOutcome: failure ? "failed" : "persisted",
      persistedBeforeRelease:
        !failure && unresolvedWhilePersistencePending && persistenceFinished,
      warningObservedBeforeRelease: failure && warningsAtRelease === 1,
      warningCount: warningsAtRelease,
      releasedDespiteFailure: failure && resolution.kind === "approved_once",
    };
  } finally {
    if (corpusCase.mode === "success") releasePersistence();
    await runtime.dispose();
  }
}

async function sourceHash(packageDir, relativePath) {
  return createHash("sha256")
    .update(await readFile(resolve(packageDir, relativePath)))
    .digest("hex");
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const loaded = await loadCandidate(args["package-dir"]);
  const corpusText = await readFile(args.corpus, "utf8");
  const cases = parseJsonl(corpusText, args.corpus);
  const rawLines = corpusText.split(/\r?\n/u).filter((line) => line.trim());
  if (rawLines.length !== cases.length) {
    throw new Error("parsed corpus and raw JSONL line counts differ");
  }
  const protocolClient = new loaded.candidate.ApprovalProtocolClient();
  const nativeHello = await protocolClient.hello();
  const identity = {
    codexCommit: EXPECTED_COMMIT,
    os: process.platform === "darwin" ? "macos" : process.platform,
    arch: process.arch === "arm64" ? "aarch64" : process.arch,
    pointerWidth: pointerWidth(),
    serviceSha256: await sourceHash(loaded.packageDir, "lib/service.js"),
    validationSha256: await sourceHash(loaded.packageDir, "lib/validation.js"),
    bridgeSha256: await sourceHash(loaded.packageDir, "lib/bridge.js"),
    clientSha256: await sourceHash(loaded.packageDir, "lib/client.js"),
    approvalProtocolVersion: nativeHello.protocolVersion,
    appServerProtocolTree: nativeHello.codexAppServerProtocolTree,
    appServerProtocolV2Tree: nativeHello.codexAppServerProtocolV2Tree,
  };
  const records = [];
  try {
    for (const [index, corpusCase] of cases.entries()) {
      if (!EXPECTED_OPERATIONS.has(corpusCase.operation)) {
        throw new Error(
          `${corpusCase.id}: unsupported operation ${corpusCase.operation}`,
        );
      }
      let result;
      switch (corpusCase.operation) {
        case "decisions":
          result = runDecisions(loaded, corpusCase);
          break;
        case "requestWire":
          result = await runRequestWire(
            protocolClient,
            corpusCase,
            rawLines[index],
          );
          break;
        case "responseWire":
          result = await runResponseWire(
            loaded,
            protocolClient,
            corpusCase,
            rawLines[index],
          );
          break;
        case "cache":
          result = await runCache(loaded, corpusCase);
          break;
        case "persistence":
          result = await runPersistence(loaded, corpusCase);
          break;
        case "decisionFromCore":
          result = runDecisionFromCore(loaded, corpusCase);
          break;
        case "responseToCore":
          result = runResponseToCore(loaded, corpusCase);
          break;
      }
      records.push({
        schemaVersion: 1,
        id: corpusCase.id,
        evidence: "candidate",
        identity,
        result,
      });
    }
  } finally {
    await protocolClient.close();
  }
  await mkdir(dirname(args.output), { recursive: true });
  await writeFile(
    args.output,
    `${records.map((record) => JSON.stringify(record)).join("\n")}\n`,
  );
  process.stdout.write(`approval candidate output: ${args.output}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error.stack ?? error}\n`);
  process.exitCode = 1;
});
