import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

export const EXPECTED_COMMIT = "086396f7f60347b74c82784d5dfaf4fb2d3bda12";

export function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, canonical(value[key])]),
    );
  }
  return value;
}

export function canonicalJson(value) {
  return JSON.stringify(canonical(value));
}

export function parseJsonl(text, source) {
  const ids = new Set();
  const records = [];
  for (const [index, raw] of text.split(/\r?\n/u).entries()) {
    if (!raw.trim()) continue;
    let value;
    try {
      value = JSON.parse(raw);
    } catch (error) {
      throw new Error(`${source}:${index + 1}: ${error.message}`);
    }
    if (
      !value ||
      typeof value !== "object" ||
      value.schemaVersion !== 1 ||
      typeof value.id !== "string" ||
      value.id.length === 0
    ) {
      throw new Error(`${source}:${index + 1}: invalid schemaVersion or id`);
    }
    if (ids.has(value.id))
      throw new Error(`${source}: duplicate id ${value.id}`);
    ids.add(value.id);
    records.push(value);
  }
  if (records.length === 0) throw new Error(`${source}: no records`);
  return records;
}

export async function readJsonl(path) {
  const resolved = resolve(path);
  return parseJsonl(await readFile(resolved, "utf8"), resolved);
}

export async function loadCandidate(packageDirectory) {
  const packageDir = resolve(packageDirectory);
  const candidate = await import(
    pathToFileURL(resolve(packageDir, "lib/index.js")).href
  );
  const cordis = await import(
    pathToFileURL(
      resolve(packageDir, "node_modules/@deepseek-ai/cordis/lib/index.js"),
    ).href
  );
  if (candidate.PINNED_CODEX_COMMIT !== EXPECTED_COMMIT) {
    throw new Error(
      `candidate commit mismatch: ${candidate.PINNED_CODEX_COMMIT}`,
    );
  }
  if (typeof candidate.CodexApprovalService !== "function") {
    throw new Error("candidate CodexApprovalService export is unavailable");
  }
  if (typeof candidate.ApprovalProtocolClient !== "function") {
    throw new Error("candidate ApprovalProtocolClient export is unavailable");
  }
  if (typeof cordis.Context !== "function") {
    throw new Error("candidate Cordis Context export is unavailable");
  }
  return { packageDir, candidate, Context: cordis.Context };
}

export async function mounted(loaded) {
  const ctx = new loaded.Context();
  const fiber = await ctx.plugin(loaded.candidate.CodexApprovalService);
  return {
    ctx,
    service: ctx.codexApproval,
    dispose: () => fiber.dispose(),
  };
}

export function baseParams(overrides = {}) {
  return {
    threadId: "thread-conformance",
    turnId: "turn-conformance",
    itemId: "item-conformance",
    startedAtMs: 0,
    environmentId: null,
    command: "git status",
    cwd: "/workspace",
    ...overrides,
  };
}

export async function waitUntil(predicate, label, timeoutMs = 2_000) {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const value = predicate();
    if (value) return value;
    if (Date.now() >= deadline)
      throw new Error(`timed out waiting for ${label}`);
    await new Promise((resolveWait) => setTimeout(resolveWait, 1));
  }
}

export function resolutionDecision(resolution) {
  if (!resolution || typeof resolution !== "object") {
    throw new Error("candidate returned a non-object approval resolution");
  }
  switch (resolution.kind) {
    case "approved_once":
    case "approved_for_session":
    case "network_policy_amendment":
    case "declined":
    case "cancelled":
      return resolution.decision;
    default:
      throw new Error(`unknown approval resolution kind: ${resolution.kind}`);
  }
}

export function pointerWidth() {
  return process.arch === "ia32" || process.arch === "arm" ? 32 : 64;
}
