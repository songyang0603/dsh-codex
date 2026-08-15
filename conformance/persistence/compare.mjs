#!/usr/bin/env node

import { canonical, firstDifference } from "./lib.mjs";
import { validateOutput } from "./validate-output.mjs";

function selfTest() {
  if (firstDifference({ nested: [1, "same"] }, { nested: [1, "same"] })) {
    throw new Error("comparator self-test rejected equal values");
  }
  const difference = firstDifference(
    { nested: [1, "expected"] },
    { nested: [1, "actual"] },
  );
  if (difference !== "$.nested[1]") {
    throw new Error(
      `comparator self-test failed to locate difference: ${difference}`,
    );
  }
}

async function main() {
  selfTest();
  const [corpus, oracle, candidate, ...extra] = process.argv.slice(2);
  if (!corpus || !oracle || !candidate || extra.length > 0) {
    throw new Error(
      "Usage: node compare.mjs CORPUS.jsonl ORACLE.jsonl CANDIDATE.jsonl",
    );
  }
  const [oracleOutput, candidateOutput] = await Promise.all([
    validateOutput(corpus, oracle, "upstream_oracle"),
    validateOutput(corpus, candidate, "sidecar_candidate"),
  ]);
  const mismatches = [];
  for (let index = 0; index < oracleOutput.records.length; index += 1) {
    const expectedRecord = oracleOutput.records[index];
    const actualRecord = candidateOutput.records[index];
    if (
      expectedRecord.source.os !== actualRecord.source.os ||
      expectedRecord.source.arch !== actualRecord.source.arch
    ) {
      throw new Error(
        `${expectedRecord.id}: platform mismatch (${expectedRecord.source.os}/${expectedRecord.source.arch} vs ${actualRecord.source.os}/${actualRecord.source.arch})`,
      );
    }
    const expected = canonical(expectedRecord.result);
    const actual = canonical(actualRecord.result);
    const path = firstDifference(expected, actual);
    if (path)
      mismatches.push({ id: expectedRecord.id, path, expected, actual });
  }
  if (mismatches.length > 0) {
    for (const mismatch of mismatches) {
      process.stderr.write(`${JSON.stringify(mismatch, null, 2)}\n`);
    }
    throw new Error(
      `persistence parity failed: ${mismatches.length}/${oracleOutput.records.length} cases diverged`,
    );
  }
  process.stdout.write(
    `persistence parity: ${oracleOutput.records.length}/${oracleOutput.records.length} cases matched\n`,
  );
}

main().catch((error) => {
  process.stderr.write(`${error.stack ?? error}\n`);
  process.exitCode = 1;
});
