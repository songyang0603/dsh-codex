#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const CODEX_COMMIT = "086396f7f60347b74c82784d5dfaf4fb2d3bda12";
const CORE_BLOB = "5de05937533a2653a700b4ec40cda09578761f50";

function usage() {
  process.stderr.write(
    "Usage: node compare.mjs ORACLE.jsonl CANDIDATE.jsonl\n",
  );
}

function canonical(value) {
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

function parseJsonl(text, source) {
  const records = new Map();
  for (const [index, raw] of text.split(/\r?\n/u).entries()) {
    if (!raw.trim()) continue;
    let value;
    try {
      value = JSON.parse(raw);
    } catch (error) {
      throw new Error(`${source}:${index + 1}: ${error.message}`);
    }
    if (
      value.schemaVersion !== 1 ||
      typeof value.id !== "string" ||
      !value.id
    ) {
      throw new Error(`${source}:${index + 1}: invalid schemaVersion or id`);
    }
    if (records.has(value.id))
      throw new Error(`${source}: duplicate id ${value.id}`);
    records.set(value.id, value);
  }
  if (records.size === 0) throw new Error(`${source}: no records`);
  return records;
}

function assertRequirement(requirement, label) {
  if (!requirement || typeof requirement !== "object") {
    throw new Error(`${label}: missing requirement`);
  }
  if (!["skip", "needs_approval", "forbidden"].includes(requirement.kind)) {
    throw new Error(`${label}: invalid requirement kind ${requirement.kind}`);
  }
  if (
    requirement.proposedExecpolicyAmendment !== undefined &&
    (!Array.isArray(requirement.proposedExecpolicyAmendment) ||
      requirement.proposedExecpolicyAmendment.some(
        (token) => typeof token !== "string",
      ))
  ) {
    throw new Error(
      `${label}: proposedExecpolicyAmendment must be a string array`,
    );
  }
}

async function main() {
  const [oracleArgument, candidateArgument, ...extra] = process.argv.slice(2);
  if (!oracleArgument || !candidateArgument || extra.length > 0) {
    usage();
    process.exitCode = 64;
    return;
  }
  const oraclePath = resolve(oracleArgument);
  const candidatePath = resolve(candidateArgument);
  const [oracle, candidate] = await Promise.all([
    readFile(oraclePath, "utf8").then((text) => parseJsonl(text, oraclePath)),
    readFile(candidatePath, "utf8").then((text) =>
      parseJsonl(text, candidatePath),
    ),
  ]);

  const missing = [...oracle.keys()].filter((id) => !candidate.has(id));
  const extraIds = [...candidate.keys()].filter((id) => !oracle.has(id));
  if (missing.length || extraIds.length) {
    throw new Error(
      `case-set mismatch; missing=${JSON.stringify(missing)} extra=${JSON.stringify(extraIds)}`,
    );
  }

  const mismatches = [];
  for (const [id, expectedRecord] of oracle) {
    if (
      expectedRecord.upstream?.codexCommit !== CODEX_COMMIT ||
      expectedRecord.upstream?.coreExecPolicyBlob !== CORE_BLOB
    ) {
      throw new Error(
        `${id}: oracle upstream identity is not the fixed Codex source`,
      );
    }
    const actualRecord = candidate.get(id);
    if (
      actualRecord.engine?.codexCommit !== CODEX_COMMIT ||
      actualRecord.engine?.coreExecPolicyBlob !== CORE_BLOB
    ) {
      throw new Error(
        `${id}: candidate engine identity does not match the fixed Codex source`,
      );
    }
    if (
      actualRecord.engine.os !== expectedRecord.upstream.os ||
      actualRecord.engine.arch !== expectedRecord.upstream.arch
    ) {
      throw new Error(
        `${id}: oracle/candidate platform mismatch (${expectedRecord.upstream.os}/${expectedRecord.upstream.arch} vs ${actualRecord.engine.os}/${actualRecord.engine.arch})`,
      );
    }

    const expected = expectedRecord.result?.requirement;
    const actual = actualRecord.result?.requirement;
    assertRequirement(expected, `${id} oracle`);
    assertRequirement(actual, `${id} candidate`);
    const expectedJson = JSON.stringify(canonical(expected));
    const actualJson = JSON.stringify(canonical(actual));
    if (expectedJson !== actualJson) {
      mismatches.push({ id, expected, actual });
    }
  }

  if (mismatches.length > 0) {
    for (const mismatch of mismatches) {
      process.stderr.write(`${JSON.stringify(mismatch, null, 2)}\n`);
    }
    throw new Error(
      `runtime policy parity failed: ${mismatches.length}/${oracle.size} cases diverged`,
    );
  }
  process.stdout.write(
    `runtime policy parity: ${oracle.size}/${oracle.size} cases matched\n`,
  );
}

main().catch((error) => {
  process.stderr.write(`${error.stack ?? error}\n`);
  process.exitCode = 1;
});
