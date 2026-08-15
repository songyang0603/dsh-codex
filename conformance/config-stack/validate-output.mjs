#!/usr/bin/env node

import fs from "node:fs";

const EXPECTED = Object.freeze({
  codexCommit: "086396f7f60347b74c82784d5dfaf4fb2d3bda12",
  configTree: "d3f4925b575b128dd1f0f74a5babcdb1efce0219",
  execpolicyTree: "e06e0b4ad718af8a74055a33b1536b25fb9d4a87",
  coreExecPolicyBlob: "5de05937533a2653a700b4ec40cda09578761f50",
});

function usage() {
  return "Usage: validate-output.mjs --corpus FILE --output FILE";
}

function parseArgs(argv) {
  const parsed = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg !== "--corpus" && arg !== "--output") {
      throw new Error(`unknown argument: ${arg}\n${usage()}`);
    }
    const value = argv[index + 1];
    if (value === undefined) {
      throw new Error(`missing value for ${arg}\n${usage()}`);
    }
    parsed[arg.slice(2)] = value;
    index += 1;
  }
  if (!parsed.corpus || !parsed.output) {
    throw new Error(usage());
  }
  return parsed;
}

function readJsonl(path) {
  const raw = fs.readFileSync(path, "utf8");
  const lines = raw.endsWith("\n")
    ? raw.slice(0, -1).split(/\r?\n/)
    : raw.split(/\r?\n/);
  if (lines.length === 0 || (lines.length === 1 && lines[0] === "")) {
    throw new Error(`${path}: JSONL file is empty`);
  }
  return lines.map((line, index) => {
    if (line.trim() === "") {
      throw new Error(`${path}:${index + 1}: blank JSONL record`);
    }
    try {
      return JSON.parse(line);
    } catch (error) {
      throw new Error(`${path}:${index + 1}: invalid JSON: ${error.message}`);
    }
  });
}

function uniqueById(records, label) {
  const byId = new Map();
  for (const record of records) {
    if (typeof record?.id !== "string" || record.id.length === 0) {
      throw new Error(`${label}: every record must have a non-empty string id`);
    }
    if (byId.has(record.id)) {
      throw new Error(`${label}: duplicate id ${JSON.stringify(record.id)}`);
    }
    byId.set(record.id, record);
  }
  return byId;
}

function assertObject(value, label) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be an object`);
  }
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const corpus = uniqueById(readJsonl(args.corpus), "corpus");
  const output = uniqueById(readJsonl(args.output), "output");
  if (corpus.size !== output.size) {
    throw new Error(
      `case count mismatch: corpus=${corpus.size}, output=${output.size}`,
    );
  }

  for (const id of corpus.keys()) {
    const record = output.get(id);
    if (!record) {
      throw new Error(`output is missing case ${JSON.stringify(id)}`);
    }
    if (record.schemaVersion !== 1) {
      throw new Error(`${id}: output schemaVersion must be 1`);
    }
    assertObject(record.upstream, `${id}.upstream`);
    for (const [field, expected] of Object.entries(EXPECTED)) {
      if (record.upstream[field] !== expected) {
        throw new Error(`${id}: upstream.${field} identity mismatch`);
      }
    }
    if (
      typeof record.upstream.os !== "string" ||
      typeof record.upstream.arch !== "string"
    ) {
      throw new Error(`${id}: upstream os/arch must be strings`);
    }
    assertObject(record.result, `${id}.result`);
    const hasStack = Object.hasOwn(record.result, "stack");
    const hasStackError = Object.hasOwn(record.result, "stackError");
    if (hasStack === hasStackError) {
      throw new Error(
        `${id}: result must contain exactly one of stack or stackError`,
      );
    }
    if (hasStack) {
      assertObject(record.result.stack, `${id}.result.stack`);
      if (!Array.isArray(record.result.discoveredRuleFiles)) {
        throw new Error(`${id}: discoveredRuleFiles must be an array`);
      }
      assertObject(record.result.requirements, `${id}.result.requirements`);
      assertObject(record.result.policy, `${id}.result.policy`);
      if (!Array.isArray(record.result.policy.evaluations)) {
        throw new Error(`${id}: policy.evaluations must be an array`);
      }
    }
  }

  for (const id of output.keys()) {
    if (!corpus.has(id)) {
      throw new Error(`output contains extra case ${JSON.stringify(id)}`);
    }
  }
  process.stdout.write(
    `validated config-stack oracle output: ${output.size}/${corpus.size} cases\n`,
  );
}

try {
  main();
} catch (error) {
  process.stderr.write(`${error.stack ?? error}\n`);
  process.exitCode = 1;
}
