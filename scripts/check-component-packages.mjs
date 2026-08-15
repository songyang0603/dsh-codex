import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const packagesRoot = fileURLToPath(new URL("../packages/", import.meta.url));
const expectedRepository = "git+https://github.com/songyang0603/dsh-codex.git";
const requiredKeywords = ["deepseek-harness", "dsh-plugin", "codex"];
const requiredArchiveFiles = [
  "cordis.patch.yml",
  "LICENSE",
  "NOTICE",
  "README.md",
  "THIRD_PARTY_NOTICES.md",
  "UPSTREAMS.md",
];
const reservedCoreRows = new Set([
  "tools",
  "session",
  "llm",
  "web",
  "permission",
]);
const errors = [];
const bundleRows = new Map();

function fail(packageDirectory, message) {
  errors.push(`${packageDirectory}: ${message}`);
}

function readJson(path, packageDirectory) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    fail(packageDirectory, `cannot parse package.json: ${error.message}`);
    return undefined;
  }
}

function parseBundleRows(source, packageDirectory) {
  const rows = [];
  const lines = source.split(/\r?\n/u);

  for (let index = 0; index < lines.length; index += 1) {
    const idMatch = lines[index].match(
      /^\s*-\s+id:\s*["']?([^"'#\s]+)["']?\s*(?:#.*)?$/u,
    );
    if (!idMatch) continue;

    const idIndent = lines[index].match(/^\s*/u)[0].length;
    let name;
    for (let cursor = index + 1; cursor < lines.length; cursor += 1) {
      const line = lines[cursor];
      if (!line.trim() || /^\s*#/u.test(line)) continue;
      const indent = line.match(/^\s*/u)[0].length;
      if (indent <= idIndent) break;
      const nameMatch = line.match(
        /^\s+name:\s*["']?([^"'#\s]+)["']?\s*(?:#.*)?$/u,
      );
      if (nameMatch) {
        name = nameMatch[1];
        break;
      }
    }

    if (!name) {
      fail(packageDirectory, `bundle row ${idMatch[1]} has no package name`);
      continue;
    }
    rows.push({ id: idMatch[1], name });
  }

  if (rows.length === 0) {
    fail(
      packageDirectory,
      "cordis.patch.yml contains no insert row with id and name",
    );
  }
  return rows;
}

const packageDirectories = readdirSync(packagesRoot, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .filter((directory) =>
    existsSync(join(packagesRoot, directory, "package.json")),
  )
  .sort();

if (packageDirectories.length === 0) {
  errors.push("packages/: no component packages found");
}

for (const directory of packageDirectories) {
  const packageRoot = join(packagesRoot, directory);
  const manifest = readJson(join(packageRoot, "package.json"), directory);
  if (!manifest) continue;

  const expectedName = `@songyang0603/dsh-codex-${directory}`;
  if (manifest.name !== expectedName) {
    fail(directory, `package name must be ${expectedName}`);
  }
  if (manifest.repository?.url !== expectedRepository) {
    fail(directory, `repository.url must be ${expectedRepository}`);
  }
  if (manifest.repository?.directory !== `packages/${directory}`) {
    fail(directory, `repository.directory must be packages/${directory}`);
  }

  const keywords = new Set(manifest.keywords ?? []);
  for (const keyword of requiredKeywords) {
    if (!keywords.has(keyword)) fail(directory, `missing keyword ${keyword}`);
  }

  if (typeof manifest.main !== "string" || !manifest.main.startsWith("lib/")) {
    fail(directory, "main must point to compiled lib output");
  }
  if (
    typeof manifest.types !== "string" ||
    !manifest.types.startsWith("lib/")
  ) {
    fail(directory, "types must point to compiled lib output");
  }
  if (manifest.peerDependencies?.["@deepseek-ai/cordis"] !== "4.0.1") {
    fail(directory, "@deepseek-ai/cordis peer must be exactly 4.0.1");
  }
  if (manifest.dsh?.bundle?.patch !== "./cordis.patch.yml") {
    fail(directory, "dsh.bundle.patch must be ./cordis.patch.yml");
  }
  if (manifest.exports?.["./cordis.patch.yml"] !== "./cordis.patch.yml") {
    fail(directory, "exports must expose ./cordis.patch.yml");
  }

  const archiveFiles = manifest.files ?? [];
  for (const requiredFile of requiredArchiveFiles) {
    if (!archiveFiles.includes(requiredFile)) {
      fail(directory, `package files must include ${requiredFile}`);
    }
  }
  for (const entry of archiveFiles) {
    if (
      /(^|\/)(tests?|conformance)(\/|$)|\.(?:spec|test)\.[cm]?[jt]sx?$/iu.test(
        entry,
      )
    ) {
      fail(directory, `package files must not publish test material: ${entry}`);
    }
  }

  const patchPath = join(packageRoot, "cordis.patch.yml");
  if (!existsSync(patchPath)) {
    fail(directory, "cordis.patch.yml is missing");
  } else {
    for (const row of parseBundleRows(
      readFileSync(patchPath, "utf8"),
      directory,
    )) {
      if (reservedCoreRows.has(row.id)) {
        fail(
          directory,
          `bundle row id ${row.id} is reserved by the DSH core profile`,
        );
      }
      if (row.name !== manifest.name) {
        fail(
          directory,
          `bundle row ${row.id} names ${row.name}, expected ${manifest.name}`,
        );
      }
      const owner = bundleRows.get(row.id);
      if (owner) {
        fail(directory, `bundle row id ${row.id} is already owned by ${owner}`);
      } else {
        bundleRows.set(row.id, directory);
      }
    }
  }

  const readmePath = join(packageRoot, "README.md");
  if (!existsSync(readmePath)) {
    fail(directory, "README.md is missing");
  } else {
    const readme = readFileSync(readmePath, "utf8");
    if (!/dsh plugin --profile\s+\S+\s+add\s+/u.test(readme)) {
      fail(
        directory,
        "README must include a concrete dsh plugin --profile ... add example",
      );
    }
  }
}

if (errors.length > 0) {
  console.error("DSH component package contract failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exitCode = 1;
} else {
  console.log(
    `Verified ${packageDirectories.length} component package manifests and ${bundleRows.size} unique DSH bundle rows.`,
  );
}
