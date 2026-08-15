#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { canonicalJson, parseJsonl } from "./lib.mjs";

function usage() {
  process.stderr.write(
    "Usage: node compare-adapter-contract.mjs CONTRACT.jsonl OUTPUT.jsonl\n",
  );
}

async function main() {
  const [contractArg, outputArg, ...extra] = process.argv.slice(2);
  if (!contractArg || !outputArg || extra.length > 0) {
    usage();
    process.exitCode = 64;
    return;
  }
  const contractPath = resolve(contractArg);
  const outputPath = resolve(outputArg);
  const [contracts, outputs] = await Promise.all([
    readFile(contractPath, "utf8").then((text) =>
      parseJsonl(text, contractPath),
    ),
    readFile(outputPath, "utf8").then((text) => parseJsonl(text, outputPath)),
  ]);
  const outputById = new Map(outputs.map((record) => [record.id, record]));
  const contractIds = contracts.map((record) => record.id);
  const missing = contractIds.filter((id) => !outputById.has(id));
  const extraIds = outputs
    .map((record) => record.id)
    .filter((id) => !contractIds.includes(id));
  if (missing.length || extraIds.length) {
    throw new Error(
      `adapter case-set mismatch; missing=${JSON.stringify(missing)} extra=${JSON.stringify(extraIds)}`,
    );
  }
  const mismatches = [];
  for (const contract of contracts) {
    const actual = outputById.get(contract.id);
    if (actual.evidence !== "adapter_contract") {
      throw new Error(`${contract.id}: invalid adapter evidence kind`);
    }
    if (canonicalJson(contract.expected) !== canonicalJson(actual.result)) {
      mismatches.push({
        id: contract.id,
        expected: contract.expected,
        actual: actual.result,
      });
    }
  }
  if (mismatches.length) {
    for (const mismatch of mismatches) {
      process.stderr.write(`${JSON.stringify(mismatch, null, 2)}\n`);
    }
    throw new Error(
      `approval adapter contract failed: ${mismatches.length}/${contracts.length} cases diverged`,
    );
  }
  process.stdout.write(
    `approval adapter contract: ${contracts.length}/${contracts.length} cases matched\n`,
  );
}

main().catch((error) => {
  process.stderr.write(`${error.stack ?? error}\n`);
  process.exitCode = 1;
});
