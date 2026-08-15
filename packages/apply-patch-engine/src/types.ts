/** Exact JSONL protocol types exported by the pinned apply-patch sidecar. */

export const APPLY_PATCH_PROTOCOL_VERSION = 1 as const;
export const PINNED_CODEX_REPOSITORY =
  "https://github.com/openai/codex" as const;
export const PINNED_CODEX_COMMIT =
  "086396f7f60347b74c82784d5dfaf4fb2d3bda12" as const;
export const PINNED_APPLY_PATCH_PACKAGE = "codex-apply-patch" as const;
export const PINNED_APPLY_PATCH_VERSION = "0.0.0" as const;
export const PINNED_APPLY_PATCH_TREE =
  "1601c43435739cfeca8c5ae4fe28e56b5efc4246" as const;
export const PINNED_APPLY_PATCH_LIB_BLOB =
  "5b5fac0683288b0e008ebf753dee0d588f625b77" as const;
export const PINNED_APPLY_PATCH_PARSER_BLOB =
  "c400d075a684fda29c10269aef1958a27faf90aa" as const;
export const PINNED_APPLY_PATCH_STREAMING_PARSER_BLOB =
  "ff1b2f82feec7bdf454f6cba61ad5f15611f5573" as const;
export const PINNED_APPLY_PATCH_INVOCATION_BLOB =
  "41ee8b539aa0c2be321e1e839a503ee4760393a7" as const;
export const PINNED_APPLY_PATCH_FILE_UPDATE_BLOB =
  "d700570264f2b72f356011064028dededa4a2a55" as const;
export const PINNED_APPLY_PATCH_TEXT_FILE_BLOB =
  "b7d598ca973ec73f0ed064d2360f4d218e2a792d" as const;
export const PINNED_APPLY_PATCH_SEEK_SEQUENCE_BLOB =
  "9934fa55e767cacf85db7e459a913e72c9d828a0" as const;
export const PINNED_CODEX_CARGO_LOCK_BLOB =
  "a8c2addc02055be48c345b65760a7a1b96cfbf28" as const;
export const APPLY_PATCH_FILESYSTEM = "LocalFileSystem::unsandboxed" as const;
export const APPLY_PATCH_SANDBOX = "none" as const;
export const APPLY_PATCH_SCOPE =
  "apply_patch semantic engine only; excludes Codex core approval, sandbox orchestration, hooks, lifecycle events, and TurnDiff" as const;
export const APPLY_PATCH_METHODS = Object.freeze([
  "hello",
  "parse",
  "stream_parse",
  "verify_patch",
  "verify_invocation",
  "apply_patch",
  "shutdown",
] as const);
export const APPLY_PATCH_MODES = Object.freeze([
  "normalize_to_lf",
  "preserve_line_endings",
] as const);

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue =
  JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };

export type ApplyPatchUpdateMode = (typeof APPLY_PATCH_MODES)[number];

export interface ApplyPatchHelloOutput {
  protocolVersion: number;
  engineVersion: string;
  codexRepository: string;
  codexCommit: string;
  codexApplyPatchPackage: string;
  codexApplyPatchVersion: string;
  codexApplyPatchTree: string;
  codexApplyPatchLibBlob: string;
  codexApplyPatchParserBlob: string;
  codexApplyPatchStreamingParserBlob: string;
  codexApplyPatchInvocationBlob: string;
  codexApplyPatchFileUpdateBlob: string;
  codexApplyPatchTextFileBlob: string;
  codexApplyPatchSeekSequenceBlob: string;
  codexCargoLockBlob: string;
  os: string;
  arch: string;
  pointerWidth: number;
  filesystem: string;
  sandbox: string;
  scope: string;
  methods: string[];
  modes: string[];
}

export interface ParsePatchParams {
  patch: string;
}

export interface StreamParsePatchParams {
  chunks: string[];
}

export interface VerifyPatchParams {
  patch: string;
  /** Absolute `file:` URI, not an operating-system path. */
  cwd: string;
  mode: ApplyPatchUpdateMode;
}

export interface VerifyInvocationParams {
  argv: string[];
  /** Absolute `file:` URI, not an operating-system path. */
  cwd: string;
  mode: ApplyPatchUpdateMode;
}

export type ApplyPatchParams = VerifyPatchParams;

export interface ApplyPatchSemanticError {
  category: "parse" | "apply" | "invocation";
  variant: string;
  message: string;
  detail?: string;
  lineNumber?: number;
}

export interface UpdateChunkProjection {
  changeContext: string | null;
  oldLines: string[];
  newLines: string[];
  contextLineIndices: Array<[number, number]>;
  isEndOfFile: boolean;
}

export type HunkProjection =
  | { kind: "AddFile"; path: string; contents: string }
  | { kind: "DeleteFile"; path: string }
  | {
      kind: "UpdateFile";
      path: string;
      movePath: string | null;
      chunks: UpdateChunkProjection[];
    };

export interface ParsePatchOutput {
  accepted: boolean;
  patch: string | null;
  environmentId: string | null;
  workdir: string | null;
  hunks: HunkProjection[];
  error: ApplyPatchSemanticError | null;
}

export interface StreamChunkProjection {
  index: number;
  environmentId: string | null;
  hunks: HunkProjection[];
}

export interface StreamParsePatchOutput {
  accepted: boolean;
  chunkResults: StreamChunkProjection[];
  environmentId: string | null;
  hunks: HunkProjection[];
  failedChunkIndex: number | null;
  error: ApplyPatchSemanticError | null;
}

export type PreviewChangeProjection =
  | { kind: "Add"; path: string; content: string }
  | { kind: "Delete"; path: string; content: string }
  | {
      kind: "Update";
      path: string;
      unifiedDiff: string;
      movePath: string | null;
      newContent: string;
    };

export interface ApplyPatchActionProjection {
  patch: string;
  cwd: string;
  mode: ApplyPatchUpdateMode;
  empty: boolean;
  changes: PreviewChangeProjection[];
}

export type VerificationClassification =
  "body" | "shell_parse_error" | "correctness_error" | "not_apply_patch";

export interface VerifyPatchOutput {
  classification: VerificationClassification;
  action: ApplyPatchActionProjection | null;
  error: ApplyPatchSemanticError | null;
}

export type DeltaChangeProjection =
  | {
      kind: "Add";
      path: string;
      content: string;
      overwrittenContent: string | null;
    }
  | { kind: "Delete"; path: string; content: string }
  | {
      kind: "Update";
      path: string;
      movePath: string | null;
      oldContent: string;
      overwrittenMoveContent: string | null;
      newContent: string;
    };

export interface AppliedPatchDeltaProjection {
  /** False means upstream reported an inexact/partially known committed delta. */
  exact: boolean;
  /** Upstream mutation order. Do not sort this array. */
  changes: DeltaChangeProjection[];
}

export interface ApplyPatchOutput {
  success: boolean;
  stdout: string;
  stderr: string;
  delta: AppliedPatchDeltaProjection;
  error: ApplyPatchSemanticError | null;
}

export interface ShutdownOutput {
  shutdown: true;
}

export interface ProtocolErrorBody {
  code: string;
  message: string;
}
