#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const README_PLUGIN_SECTIONS = new Set([
  "Core",
  "Agents & Orchestration",
  "Context & Search",
  "Input & Editing",
  "UI & Experience",
  "IDE & Clients",
  "Browser & Remote",
  "Models & Inference",
  "Git & Engineering",
  "Output & Deliverables",
  "Notifications & Channels",
  "Fun & Lifestyle",
  "Infrastructure & Development",
  "Data & Market",
  "Science & Research",
]);

function parseArgs(argv) {
  const options = {};
  for (let index = 2; index < argv.length; index += 2) {
    const key = argv[index];
    const value = argv[index + 1];
    if (!key?.startsWith("--") || value === undefined) {
      throw new Error(`invalid argument sequence at ${key ?? "<end>"}`);
    }
    options[key.slice(2)] = value;
  }
  if (!options.awesome || !options.output) {
    throw new Error(
      "usage: build-inventory.mjs --awesome <checkout> --output <directory>",
    );
  }
  return options;
}

function normalizeSubpath(value) {
  const normalized = (value || ".").replace(/^\/+|\/+$/g, "");
  return normalized || ".";
}

function parseGithubUrl(url) {
  const parsed = new URL(url);
  const pieces = parsed.pathname.split("/").filter(Boolean);
  if (parsed.hostname.toLowerCase() !== "github.com" || pieces.length < 2)
    return null;
  const owner = pieces[0];
  const repo = pieces[1].replace(/\.git$/i, "");
  let subpath = ".";
  let requestedRef = null;
  if ((pieces[2] === "tree" || pieces[2] === "blob") && pieces.length >= 4) {
    requestedRef = pieces[3];
    subpath = normalizeSubpath(pieces.slice(4).join("/"));
  }
  return {
    owner,
    repo,
    repository: `${owner}/${repo}`,
    repositoryKey: `${owner}/${repo}`.toLowerCase(),
    subpath,
    key: `${owner}/${repo}`.toLowerCase() + `::${subpath}`,
    requestedRef,
    url,
  };
}

function parseGithubSpec(spec) {
  const match = spec.match(
    /^github:([^/#\s]+)\/([^#\s]+)#([^&\s`]+)(?:&path:\/?([^`\s]+))?$/,
  );
  if (!match) return null;
  const [, owner, rawRepo, requestedRef, rawSubpath] = match;
  const repo = rawRepo.replace(/\.git$/i, "");
  const subpath = normalizeSubpath(rawSubpath);
  return {
    owner,
    repo,
    repository: `${owner}/${repo}`,
    repositoryKey: `${owner}/${repo}`.toLowerCase(),
    subpath,
    key: `${owner}/${repo}`.toLowerCase() + `::${subpath}`,
    requestedRef,
    url: `https://github.com/${owner}/${repo}`,
    packageSpec: spec,
  };
}

function parseReadme(text) {
  const records = [];
  let section = "";
  for (const [offset, line] of text.split(/\r?\n/).entries()) {
    if (line.startsWith("## ")) section = line.slice(3).trim();
    const match = line.match(
      /^- \[([^\]]+)\]\((https:\/\/github\.com\/[^)]+)\)\s+-\s+(.*)$/,
    );
    if (!match || !README_PLUGIN_SECTIONS.has(section)) continue;
    const github = parseGithubUrl(match[2]);
    if (!github) continue;
    records.push({
      ...github,
      name: match[1],
      description: match[3].trim(),
      sourceFile: "README.md",
      sourceLine: offset + 1,
      sourceSection: section,
      sourceLayer: "readme-curated",
    });
  }
  return records;
}

function parseCatalog(text) {
  const records = [];
  let heading2 = "";
  let heading3 = "";
  let mode = "hub";
  for (const [offset, line] of text.split(/\r?\n/).entries()) {
    if (line.startsWith("## ")) {
      heading2 = line.slice(3).trim();
      heading3 = "";
      if (heading2 === "插件集") mode = "plugin-set-members";
      else if (heading2.includes("公开插件 Topic")) mode = "topic";
      else mode = "hub";
    } else if (line.startsWith("### ")) {
      heading3 = line.slice(4).trim();
    }
    if (!line.startsWith("| ") || line.startsWith("|---")) continue;

    const linked = line.match(
      /^\| \[([^\]]+)\]\((https:\/\/github\.com\/[^)]+)\) \| (.*) \|$/,
    );
    const packageSpec = line.match(
      /^\| `([^`]+)` \| (.*?)`(github:[^`]+)`\s*\|$/,
    );
    let github;
    let name;
    let description;
    let spec;
    if (linked) {
      github = parseGithubUrl(linked[2]);
      name = linked[1];
      description = linked[3].trim();
    } else if (packageSpec) {
      github = parseGithubSpec(packageSpec[3]);
      name = packageSpec[1];
      description = packageSpec[2].replace(/\s*·\s*$/, "").trim();
      spec = packageSpec[3];
    } else {
      continue;
    }
    if (!github) continue;
    records.push({
      ...github,
      name,
      description,
      packageSpec: spec ?? github.packageSpec,
      sourceFile: "CATALOG.md",
      sourceLine: offset + 1,
      sourceSection: heading3 || heading2,
      sourceLayer:
        mode === "hub"
          ? "catalog-hub"
          : mode === "plugin-set-members"
            ? "catalog-plugin-set-member"
            : "catalog-topic",
    });
  }
  return records;
}

function classifyHint(record) {
  const haystack =
    `${record.name} ${record.description} ${record.sourceSection} ${record.subpath}`.toLowerCase();
  if (
    record.sourceSection.includes("社区") ||
    /issue feedback|问题追踪/.test(haystack)
  )
    return "community";
  if (
    record.sourceSection.includes("技能") ||
    /(?:^|[\s/.-])skill(?:s|\.md)?(?:$|[\s/.-])/.test(haystack)
  )
    return "skill";
  if (
    /mcp/.test(haystack) &&
    !/(?:dsh|harness).*(?:plugin|bundle)|(?:plugin|bundle).*(?:dsh|harness)/.test(
      haystack,
    )
  )
    return "mcp-or-tool";
  if (
    /awesome|目录|catalog|registry|market|store|插件集|plugin collection/.test(
      haystack,
    )
  )
    return "directory-or-collection";
  if (/desktop|桌面客户端|launcher|启动器|portable/.test(haystack))
    return "client-or-launcher";
  if (/theme|skin|皮肤|colorscheme|wallpaper|壁纸/.test(haystack))
    return "theme-or-ui-plugin";
  if (
    /基础设施|docker|template|scaffold|create-dsh|sdk|health check|checker/.test(
      haystack,
    )
  )
    return "infrastructure-or-devtool";
  return "plugin-candidate";
}

function mergeByKey(readme, catalog) {
  const records = new Map();
  for (const origin of [...readme, ...catalog]) {
    const existing = records.get(origin.key);
    if (!existing) {
      records.set(origin.key, {
        key: origin.key,
        repository: origin.repository,
        repositoryKey: origin.repositoryKey,
        owner: origin.owner,
        repo: origin.repo,
        url: origin.url,
        subpath: origin.subpath,
        requestedRef: origin.requestedRef,
        packageSpec: origin.packageSpec ?? null,
        name: origin.name,
        description: origin.description,
        classificationHint: classifyHint(origin),
        origins: [],
      });
    }
    records.get(origin.key).origins.push({
      sourceFile: origin.sourceFile,
      sourceLine: origin.sourceLine,
      sourceSection: origin.sourceSection,
      sourceLayer: origin.sourceLayer,
      name: origin.name,
      description: origin.description,
      url: origin.url,
      packageSpec: origin.packageSpec ?? null,
    });
  }
  return [...records.values()].sort((left, right) =>
    left.key.localeCompare(right.key),
  );
}

function asJsonl(records) {
  return `${records.map((record) => JSON.stringify(record)).join("\n")}\n`;
}

const options = parseArgs(process.argv);
const readmePath = path.join(options.awesome, "README.md");
const catalogPath = path.join(options.awesome, "CATALOG.md");
const { stdout: sourceCommit } = await execFileAsync(
  "git",
  ["rev-parse", "HEAD"],
  {
    cwd: options.awesome,
    encoding: "utf8",
  },
);
const readme = parseReadme(await readFile(readmePath, "utf8"));
const catalog = parseCatalog(await readFile(catalogPath, "utf8"));
const merged = mergeByKey(readme, catalog);
const readmeKeys = new Set(readme.map((record) => record.key));
const readmeRecords = merged.filter((record) => readmeKeys.has(record.key));
const catalogOnlyRecords = merged.filter(
  (record) => !readmeKeys.has(record.key),
);
const repositories = [
  ...Map.groupBy(merged, (record) => record.repositoryKey).entries(),
]
  .map(([repositoryKey, targets]) => ({
    repositoryKey,
    repository: targets[0].repository,
    url: `https://github.com/${targets[0].repository}`,
    targetKeys: targets.map((target) => target.key).sort(),
    subpaths: [...new Set(targets.map((target) => target.subpath))].sort(),
    layers: [
      ...new Set(
        targets.flatMap((target) =>
          target.origins.map((origin) => origin.sourceLayer),
        ),
      ),
    ].sort(),
  }))
  .sort((left, right) => left.repositoryKey.localeCompare(right.repositoryKey));

const sourceLayerCounts = Object.fromEntries(
  [...Map.groupBy(catalog, (record) => record.sourceLayer).entries()].map(
    ([key, values]) => [key, values.length],
  ),
);
const summary = {
  generatedAt: new Date().toISOString(),
  source: {
    checkout: path.resolve(options.awesome),
    commit: sourceCommit.trim(),
    readme: readmePath,
    catalog: catalogPath,
  },
  counts: {
    readmeEntries: readme.length,
    readmeUniqueTargets: readmeRecords.length,
    readmeRepositories: new Set(
      readmeRecords.map((record) => record.repositoryKey),
    ).size,
    catalogEntries: catalog.length,
    catalogUniqueTargets: new Set(catalog.map((record) => record.key)).size,
    catalogRepositories: new Set(catalog.map((record) => record.repositoryKey))
      .size,
    catalogOnlyTargets: catalogOnlyRecords.length,
    allUniqueTargets: merged.length,
    allRepositories: repositories.length,
    ...sourceLayerCounts,
  },
};

if (
  summary.counts.readmeEntries !== 285 ||
  summary.counts.catalogEntries !== 1332 ||
  summary.counts.catalogOnlyTargets !== 1124 ||
  summary.counts.allUniqueTargets !== 1409 ||
  summary.counts.allRepositories !== 1344
) {
  throw new Error(
    `source inventory drifted: ${JSON.stringify(summary.counts)}`,
  );
}

await mkdir(options.output, { recursive: true });
await Promise.all([
  writeFile(path.join(options.output, "inventory.all.jsonl"), asJsonl(merged)),
  writeFile(
    path.join(options.output, "inventory.readme.jsonl"),
    asJsonl(readmeRecords),
  ),
  writeFile(
    path.join(options.output, "inventory.catalog-only.jsonl"),
    asJsonl(catalogOnlyRecords),
  ),
  writeFile(
    path.join(options.output, "repositories.jsonl"),
    asJsonl(repositories),
  ),
  writeFile(
    path.join(options.output, "inventory-summary.json"),
    `${JSON.stringify(summary, null, 2)}\n`,
  ),
]);

console.log(JSON.stringify(summary, null, 2));
