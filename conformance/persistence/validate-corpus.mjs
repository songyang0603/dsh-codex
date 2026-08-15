#!/usr/bin/env node

import { readCorpus } from "./lib.mjs";

const [argument, ...extra] = process.argv.slice(2);
if (!argument || extra.length > 0) {
  process.stderr.write("Usage: node validate-corpus.mjs CORPUS.jsonl\n");
  process.exit(64);
}

readCorpus(argument)
  .then(({ cases, sha256 }) => {
    process.stdout.write(
      `validated persistence corpus: ${cases.length} cases; sha256=${sha256}\n`,
    );
  })
  .catch((error) => {
    process.stderr.write(`${error.stack ?? error}\n`);
    process.exitCode = 1;
  });
