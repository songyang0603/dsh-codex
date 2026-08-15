import type {
  ApplyPatchActionProjection,
  ApplyPatchOutput,
  ApplyPatchSemanticError,
  ApplyPatchUpdateMode,
  AppliedPatchDeltaProjection,
  DeltaChangeProjection,
  HunkProjection,
  ParsePatchOutput,
  PreviewChangeProjection,
  StreamChunkProjection,
  StreamParsePatchOutput,
  UpdateChunkProjection,
  VerificationClassification,
  VerifyPatchOutput,
} from "./types.js";

export class ApplyPatchProtocolShapeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ApplyPatchProtocolShapeError";
  }
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function fail(path: string, expectation: string): never {
  throw new ApplyPatchProtocolShapeError(
    `Codex apply-patch response ${path} ${expectation}`,
  );
}

function exactKeys(
  value: Record<string, unknown>,
  path: string,
  required: readonly string[],
  optional: readonly string[] = [],
): void {
  const allowed = new Set([...required, ...optional]);
  for (const key of required) {
    if (!Object.hasOwn(value, key)) fail(path, `is missing ${key}`);
  }
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) fail(path, `contains unknown field ${key}`);
  }
}

function record(value: unknown, path: string): Record<string, unknown> {
  if (!isRecord(value)) fail(path, "must be an object");
  return value;
}

function string(value: unknown, path: string): string {
  if (typeof value !== "string") fail(path, "must be a string");
  return value;
}

function boolean(value: unknown, path: string): boolean {
  if (typeof value !== "boolean") fail(path, "must be a boolean");
  return value;
}

function index(value: unknown, path: string): number {
  if (!Number.isSafeInteger(value) || (value as number) < 0) {
    fail(path, "must be a non-negative safe integer");
  }
  return value as number;
}

function nullableString(value: unknown, path: string): string | null {
  return value === null ? null : string(value, path);
}

function stringArray(value: unknown, path: string): string[] {
  if (!Array.isArray(value)) fail(path, "must be an array");
  return value.map((entry, entryIndex) =>
    string(entry, `${path}[${entryIndex}]`),
  );
}

function mode(value: unknown, path: string): ApplyPatchUpdateMode {
  if (value !== "normalize_to_lf" && value !== "preserve_line_endings") {
    fail(path, "must be a supported update mode");
  }
  return value;
}

function semanticError(value: unknown, path: string): ApplyPatchSemanticError {
  const item = record(value, path);
  exactKeys(
    item,
    path,
    ["category", "variant", "message"],
    ["detail", "lineNumber"],
  );
  if (
    item.category !== "parse" &&
    item.category !== "apply" &&
    item.category !== "invocation"
  ) {
    fail(`${path}.category`, "must be parse, apply, or invocation");
  }
  const output: ApplyPatchSemanticError = {
    category: item.category,
    variant: string(item.variant, `${path}.variant`),
    message: string(item.message, `${path}.message`),
  };
  if (item.detail !== undefined) {
    output.detail = string(item.detail, `${path}.detail`);
  }
  if (item.lineNumber !== undefined) {
    output.lineNumber = index(item.lineNumber, `${path}.lineNumber`);
  }
  return output;
}

function nullableError(
  value: unknown,
  path: string,
): ApplyPatchSemanticError | null {
  return value === null ? null : semanticError(value, path);
}

function updateChunk(value: unknown, path: string): UpdateChunkProjection {
  const item = record(value, path);
  exactKeys(item, path, [
    "changeContext",
    "oldLines",
    "newLines",
    "contextLineIndices",
    "isEndOfFile",
  ]);
  if (!Array.isArray(item.contextLineIndices)) {
    fail(`${path}.contextLineIndices`, "must be an array");
  }
  const contextLineIndices = item.contextLineIndices.map(
    (entry, entryIndex) => {
      if (!Array.isArray(entry) || entry.length !== 2) {
        fail(`${path}.contextLineIndices[${entryIndex}]`, "must be a pair");
      }
      return [
        index(entry[0], `${path}.contextLineIndices[${entryIndex}][0]`),
        index(entry[1], `${path}.contextLineIndices[${entryIndex}][1]`),
      ] as [number, number];
    },
  );
  return {
    changeContext: nullableString(item.changeContext, `${path}.changeContext`),
    oldLines: stringArray(item.oldLines, `${path}.oldLines`),
    newLines: stringArray(item.newLines, `${path}.newLines`),
    contextLineIndices,
    isEndOfFile: boolean(item.isEndOfFile, `${path}.isEndOfFile`),
  };
}

function hunk(value: unknown, path: string): HunkProjection {
  const item = record(value, path);
  const kind = item.kind;
  if (kind === "AddFile") {
    exactKeys(item, path, ["kind", "path", "contents"]);
    return {
      kind,
      path: string(item.path, `${path}.path`),
      contents: string(item.contents, `${path}.contents`),
    };
  }
  if (kind === "DeleteFile") {
    exactKeys(item, path, ["kind", "path"]);
    return { kind, path: string(item.path, `${path}.path`) };
  }
  if (kind === "UpdateFile") {
    exactKeys(item, path, ["kind", "path", "movePath", "chunks"]);
    if (!Array.isArray(item.chunks)) fail(`${path}.chunks`, "must be an array");
    return {
      kind,
      path: string(item.path, `${path}.path`),
      movePath: nullableString(item.movePath, `${path}.movePath`),
      chunks: item.chunks.map((entry, entryIndex) =>
        updateChunk(entry, `${path}.chunks[${entryIndex}]`),
      ),
    };
  }
  return fail(`${path}.kind`, "has an unknown hunk kind");
}

function hunks(value: unknown, path: string): HunkProjection[] {
  if (!Array.isArray(value)) fail(path, "must be an array");
  return value.map((entry, entryIndex) =>
    hunk(entry, `${path}[${entryIndex}]`),
  );
}

export function validateParsePatchOutput(value: unknown): ParsePatchOutput {
  const item = record(value, "parse result");
  exactKeys(item, "parse result", [
    "accepted",
    "patch",
    "environmentId",
    "workdir",
    "hunks",
    "error",
  ]);
  const output: ParsePatchOutput = {
    accepted: boolean(item.accepted, "parse result.accepted"),
    patch: nullableString(item.patch, "parse result.patch"),
    environmentId: nullableString(
      item.environmentId,
      "parse result.environmentId",
    ),
    workdir: nullableString(item.workdir, "parse result.workdir"),
    hunks: hunks(item.hunks, "parse result.hunks"),
    error: nullableError(item.error, "parse result.error"),
  };
  if (output.accepted !== (output.error === null && output.patch !== null)) {
    fail("parse result", "has an inconsistent accepted/error/patch state");
  }
  return output;
}

function streamChunk(value: unknown, path: string): StreamChunkProjection {
  const item = record(value, path);
  exactKeys(item, path, ["index", "environmentId", "hunks"]);
  return {
    index: index(item.index, `${path}.index`),
    environmentId: nullableString(item.environmentId, `${path}.environmentId`),
    hunks: hunks(item.hunks, `${path}.hunks`),
  };
}

export function validateStreamParsePatchOutput(
  value: unknown,
): StreamParsePatchOutput {
  const item = record(value, "stream_parse result");
  exactKeys(item, "stream_parse result", [
    "accepted",
    "chunkResults",
    "environmentId",
    "hunks",
    "failedChunkIndex",
    "error",
  ]);
  if (!Array.isArray(item.chunkResults)) {
    fail("stream_parse result.chunkResults", "must be an array");
  }
  const output: StreamParsePatchOutput = {
    accepted: boolean(item.accepted, "stream_parse result.accepted"),
    chunkResults: item.chunkResults.map((entry, entryIndex) =>
      streamChunk(entry, `stream_parse result.chunkResults[${entryIndex}]`),
    ),
    environmentId: nullableString(
      item.environmentId,
      "stream_parse result.environmentId",
    ),
    hunks: hunks(item.hunks, "stream_parse result.hunks"),
    failedChunkIndex:
      item.failedChunkIndex === null
        ? null
        : index(item.failedChunkIndex, "stream_parse result.failedChunkIndex"),
    error: nullableError(item.error, "stream_parse result.error"),
  };
  if (
    output.accepted !==
    (output.error === null && output.failedChunkIndex === null)
  ) {
    fail("stream_parse result", "has an inconsistent terminal state");
  }
  return output;
}

function previewChange(value: unknown, path: string): PreviewChangeProjection {
  const item = record(value, path);
  if (item.kind === "Add" || item.kind === "Delete") {
    exactKeys(item, path, ["kind", "path", "content"]);
    return {
      kind: item.kind,
      path: string(item.path, `${path}.path`),
      content: string(item.content, `${path}.content`),
    };
  }
  if (item.kind === "Update") {
    exactKeys(item, path, [
      "kind",
      "path",
      "unifiedDiff",
      "movePath",
      "newContent",
    ]);
    return {
      kind: item.kind,
      path: string(item.path, `${path}.path`),
      unifiedDiff: string(item.unifiedDiff, `${path}.unifiedDiff`),
      movePath: nullableString(item.movePath, `${path}.movePath`),
      newContent: string(item.newContent, `${path}.newContent`),
    };
  }
  return fail(`${path}.kind`, "has an unknown preview change kind");
}

function action(value: unknown, path: string): ApplyPatchActionProjection {
  const item = record(value, path);
  exactKeys(item, path, ["patch", "cwd", "mode", "empty", "changes"]);
  if (!Array.isArray(item.changes)) fail(`${path}.changes`, "must be an array");
  return {
    patch: string(item.patch, `${path}.patch`),
    cwd: string(item.cwd, `${path}.cwd`),
    mode: mode(item.mode, `${path}.mode`),
    empty: boolean(item.empty, `${path}.empty`),
    changes: item.changes.map((entry, entryIndex) =>
      previewChange(entry, `${path}.changes[${entryIndex}]`),
    ),
  };
}

function classification(value: unknown): VerificationClassification {
  if (
    value !== "body" &&
    value !== "shell_parse_error" &&
    value !== "correctness_error" &&
    value !== "not_apply_patch"
  ) {
    fail("verification result.classification", "is unknown");
  }
  return value;
}

export function validateVerifyPatchOutput(value: unknown): VerifyPatchOutput {
  const item = record(value, "verification result");
  exactKeys(item, "verification result", ["classification", "action", "error"]);
  const output: VerifyPatchOutput = {
    classification: classification(item.classification),
    action:
      item.action === null
        ? null
        : action(item.action, "verification result.action"),
    error: nullableError(item.error, "verification result.error"),
  };
  const valid =
    (output.classification === "body" &&
      output.action !== null &&
      output.error === null) ||
    (output.classification === "not_apply_patch" &&
      output.action === null &&
      output.error === null) ||
    ((output.classification === "shell_parse_error" ||
      output.classification === "correctness_error") &&
      output.action === null &&
      output.error !== null);
  if (!valid) fail("verification result", "has an inconsistent classification");
  return output;
}

function deltaChange(value: unknown, path: string): DeltaChangeProjection {
  const item = record(value, path);
  if (item.kind === "Add") {
    exactKeys(item, path, ["kind", "path", "content", "overwrittenContent"]);
    return {
      kind: item.kind,
      path: string(item.path, `${path}.path`),
      content: string(item.content, `${path}.content`),
      overwrittenContent: nullableString(
        item.overwrittenContent,
        `${path}.overwrittenContent`,
      ),
    };
  }
  if (item.kind === "Delete") {
    exactKeys(item, path, ["kind", "path", "content"]);
    return {
      kind: item.kind,
      path: string(item.path, `${path}.path`),
      content: string(item.content, `${path}.content`),
    };
  }
  if (item.kind === "Update") {
    exactKeys(item, path, [
      "kind",
      "path",
      "movePath",
      "oldContent",
      "overwrittenMoveContent",
      "newContent",
    ]);
    return {
      kind: item.kind,
      path: string(item.path, `${path}.path`),
      movePath: nullableString(item.movePath, `${path}.movePath`),
      oldContent: string(item.oldContent, `${path}.oldContent`),
      overwrittenMoveContent: nullableString(
        item.overwrittenMoveContent,
        `${path}.overwrittenMoveContent`,
      ),
      newContent: string(item.newContent, `${path}.newContent`),
    };
  }
  return fail(`${path}.kind`, "has an unknown delta change kind");
}

function delta(value: unknown, path: string): AppliedPatchDeltaProjection {
  const item = record(value, path);
  exactKeys(item, path, ["exact", "changes"]);
  if (!Array.isArray(item.changes)) fail(`${path}.changes`, "must be an array");
  return {
    exact: boolean(item.exact, `${path}.exact`),
    changes: item.changes.map((entry, entryIndex) =>
      deltaChange(entry, `${path}.changes[${entryIndex}]`),
    ),
  };
}

export function validateApplyPatchOutput(value: unknown): ApplyPatchOutput {
  const item = record(value, "apply_patch result");
  exactKeys(item, "apply_patch result", [
    "success",
    "stdout",
    "stderr",
    "delta",
    "error",
  ]);
  const output: ApplyPatchOutput = {
    success: boolean(item.success, "apply_patch result.success"),
    stdout: string(item.stdout, "apply_patch result.stdout"),
    stderr: string(item.stderr, "apply_patch result.stderr"),
    delta: delta(item.delta, "apply_patch result.delta"),
    error: nullableError(item.error, "apply_patch result.error"),
  };
  if (output.success !== (output.error === null)) {
    fail("apply_patch result", "has an inconsistent success/error state");
  }
  return output;
}
