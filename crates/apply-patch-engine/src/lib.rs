use codex_apply_patch::AppliedPatchChange;
use codex_apply_patch::AppliedPatchDelta;
use codex_apply_patch::AppliedPatchFileChange;
use codex_apply_patch::ApplyPatchAction;
use codex_apply_patch::ApplyPatchError;
use codex_apply_patch::ApplyPatchFileChange;
use codex_apply_patch::ApplyPatchFileUpdateMode;
use codex_apply_patch::Hunk;
use codex_apply_patch::MaybeApplyPatchVerified;
use codex_apply_patch::ParseError;
use codex_apply_patch::StreamingPatchParser;
use codex_apply_patch::UpdateFileChunk;
use codex_exec_server::LocalFileSystem;
use codex_utils_path_uri::PathUri;
use serde::Deserialize;
use serde::Serialize;
use serde_json::Value;
use serde_json::json;
use std::io::BufRead;
use std::io::Write;

pub const PROTOCOL_VERSION: u32 = 1;
pub const CODEX_REPOSITORY: &str = "https://github.com/openai/codex";
pub const CODEX_COMMIT: &str = "086396f7f60347b74c82784d5dfaf4fb2d3bda12";
pub const CODEX_APPLY_PATCH_PACKAGE: &str = "codex-apply-patch";
pub const CODEX_APPLY_PATCH_VERSION: &str = "0.0.0";
pub const CODEX_APPLY_PATCH_TREE: &str = "1601c43435739cfeca8c5ae4fe28e56b5efc4246";
pub const CODEX_APPLY_PATCH_LIB_BLOB: &str = "5b5fac0683288b0e008ebf753dee0d588f625b77";
pub const CODEX_APPLY_PATCH_PARSER_BLOB: &str = "c400d075a684fda29c10269aef1958a27faf90aa";
pub const CODEX_APPLY_PATCH_STREAMING_PARSER_BLOB: &str =
    "ff1b2f82feec7bdf454f6cba61ad5f15611f5573";
pub const CODEX_APPLY_PATCH_INVOCATION_BLOB: &str = "41ee8b539aa0c2be321e1e839a503ee4760393a7";
pub const CODEX_APPLY_PATCH_FILE_UPDATE_BLOB: &str = "d700570264f2b72f356011064028dededa4a2a55";
pub const CODEX_APPLY_PATCH_TEXT_FILE_BLOB: &str = "b7d598ca973ec73f0ed064d2360f4d218e2a792d";
pub const CODEX_APPLY_PATCH_SEEK_SEQUENCE_BLOB: &str = "9934fa55e767cacf85db7e459a913e72c9d828a0";
pub const CODEX_CARGO_LOCK_BLOB: &str = "a8c2addc02055be48c345b65760a7a1b96cfbf28";

const METHODS: [&str; 7] = [
    "hello",
    "parse",
    "stream_parse",
    "verify_patch",
    "verify_invocation",
    "apply_patch",
    "shutdown",
];

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct Request {
    protocol_version: u32,
    id: Value,
    method: String,
    #[serde(default)]
    params: Value,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct Response {
    protocol_version: u32,
    id: Value,
    #[serde(skip_serializing_if = "Option::is_none")]
    result: Option<Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    error: Option<RpcError>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct RpcError {
    code: &'static str,
    message: String,
}

#[derive(Debug)]
struct RpcFault {
    code: &'static str,
    message: String,
}

impl RpcFault {
    fn invalid_params(message: impl Into<String>) -> Self {
        Self {
            code: "invalid_params",
            message: message.into(),
        }
    }
}

enum Dispatch {
    Continue(Value),
    Shutdown(Value),
}

#[derive(Clone, Copy, Debug, Deserialize, Serialize)]
#[serde(rename_all = "snake_case")]
enum UpdateMode {
    NormalizeToLf,
    PreserveLineEndings,
}

impl From<UpdateMode> for ApplyPatchFileUpdateMode {
    fn from(value: UpdateMode) -> Self {
        match value {
            UpdateMode::NormalizeToLf => Self::NormalizeToLf,
            UpdateMode::PreserveLineEndings => Self::PreserveLineEndings,
        }
    }
}

#[derive(Debug, Deserialize)]
#[serde(deny_unknown_fields)]
struct EmptyParams {}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct ParseParams {
    patch: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct StreamParseParams {
    chunks: Vec<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct VerifyPatchParams {
    patch: String,
    cwd: String,
    mode: UpdateMode,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct VerifyInvocationParams {
    argv: Vec<String>,
    cwd: String,
    mode: UpdateMode,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct ApplyPatchParams {
    patch: String,
    cwd: String,
    mode: UpdateMode,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct Hello {
    protocol_version: u32,
    engine_version: &'static str,
    codex_repository: &'static str,
    codex_commit: &'static str,
    codex_apply_patch_package: &'static str,
    codex_apply_patch_version: &'static str,
    codex_apply_patch_tree: &'static str,
    codex_apply_patch_lib_blob: &'static str,
    codex_apply_patch_parser_blob: &'static str,
    codex_apply_patch_streaming_parser_blob: &'static str,
    codex_apply_patch_invocation_blob: &'static str,
    codex_apply_patch_file_update_blob: &'static str,
    codex_apply_patch_text_file_blob: &'static str,
    codex_apply_patch_seek_sequence_blob: &'static str,
    codex_cargo_lock_blob: &'static str,
    os: &'static str,
    arch: &'static str,
    pointer_width: u32,
    filesystem: &'static str,
    sandbox: &'static str,
    scope: &'static str,
    methods: [&'static str; 7],
    modes: [&'static str; 2],
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct ParseProjection {
    accepted: bool,
    patch: Option<String>,
    environment_id: Option<String>,
    workdir: Option<String>,
    hunks: Vec<HunkProjection>,
    error: Option<SemanticError>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct StreamParseProjection {
    accepted: bool,
    chunk_results: Vec<StreamChunkProjection>,
    environment_id: Option<String>,
    hunks: Vec<HunkProjection>,
    failed_chunk_index: Option<usize>,
    error: Option<SemanticError>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct StreamChunkProjection {
    index: usize,
    environment_id: Option<String>,
    hunks: Vec<HunkProjection>,
}

#[derive(Debug, Serialize)]
#[serde(tag = "kind")]
#[allow(
    clippy::enum_variant_names,
    reason = "wire variants intentionally preserve upstream Hunk variant names"
)]
enum HunkProjection {
    AddFile {
        path: String,
        contents: String,
    },
    DeleteFile {
        path: String,
    },
    UpdateFile {
        path: String,
        #[serde(rename = "movePath")]
        move_path: Option<String>,
        chunks: Vec<UpdateChunkProjection>,
    },
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct UpdateChunkProjection {
    change_context: Option<String>,
    old_lines: Vec<String>,
    new_lines: Vec<String>,
    context_line_indices: Vec<(usize, usize)>,
    is_end_of_file: bool,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct SemanticError {
    category: &'static str,
    variant: &'static str,
    message: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    detail: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    line_number: Option<usize>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct VerificationProjection {
    classification: &'static str,
    action: Option<ActionProjection>,
    error: Option<SemanticError>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct ActionProjection {
    patch: String,
    cwd: String,
    mode: UpdateMode,
    empty: bool,
    changes: Vec<PreviewChangeProjection>,
}

#[derive(Debug, Serialize)]
#[serde(tag = "kind")]
enum PreviewChangeProjection {
    Add {
        path: String,
        content: String,
    },
    Delete {
        path: String,
        content: String,
    },
    Update {
        path: String,
        #[serde(rename = "unifiedDiff")]
        unified_diff: String,
        #[serde(rename = "movePath")]
        move_path: Option<String>,
        #[serde(rename = "newContent")]
        new_content: String,
    },
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct ApplyProjection {
    success: bool,
    stdout: String,
    stderr: String,
    delta: DeltaProjection,
    error: Option<SemanticError>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct DeltaProjection {
    exact: bool,
    changes: Vec<DeltaChangeProjection>,
}

#[derive(Debug, Serialize)]
#[serde(tag = "kind")]
enum DeltaChangeProjection {
    Add {
        path: String,
        content: String,
        #[serde(rename = "overwrittenContent")]
        overwritten_content: Option<String>,
    },
    Delete {
        path: String,
        content: String,
    },
    Update {
        path: String,
        #[serde(rename = "movePath")]
        move_path: Option<String>,
        #[serde(rename = "oldContent")]
        old_content: String,
        #[serde(rename = "overwrittenMoveContent")]
        overwritten_move_content: Option<String>,
        #[serde(rename = "newContent")]
        new_content: String,
    },
}

pub async fn run<R: BufRead, W: Write>(mut input: R, mut output: W) -> std::io::Result<()> {
    loop {
        let mut bytes = Vec::new();
        let read = input.read_until(b'\n', &mut bytes)?;
        if read == 0 {
            return Ok(());
        }
        while matches!(bytes.last(), Some(b'\n' | b'\r')) {
            bytes.pop();
        }
        if bytes.iter().all(u8::is_ascii_whitespace) {
            continue;
        }

        let (response, shutdown) = match std::str::from_utf8(&bytes) {
            Ok(line) => handle_line(line).await,
            Err(error) => (
                error_response(
                    Value::Null,
                    "invalid_request",
                    format!("request line is not valid UTF-8: {error}"),
                ),
                false,
            ),
        };

        serde_json::to_writer(&mut output, &response).map_err(std::io::Error::other)?;
        output.write_all(b"\n")?;
        output.flush()?;
        if shutdown {
            return Ok(());
        }
    }
}

async fn handle_line(line: &str) -> (Response, bool) {
    let request = match serde_json::from_str::<Request>(line) {
        Ok(request) => request,
        Err(error) => {
            return (
                error_response(Value::Null, "invalid_request", error.to_string()),
                false,
            );
        }
    };
    handle_request(request).await
}

async fn handle_request(request: Request) -> (Response, bool) {
    let id = request.id;
    if !matches!(id, Value::Null | Value::String(_) | Value::Number(_)) {
        return (
            error_response(
                Value::Null,
                "invalid_request",
                "id must be a string, number, or null",
            ),
            false,
        );
    }
    if request.protocol_version != PROTOCOL_VERSION {
        return (
            error_response(
                id,
                "protocol_mismatch",
                format!(
                    "expected protocol version {PROTOCOL_VERSION}, got {}",
                    request.protocol_version
                ),
            ),
            false,
        );
    }

    match dispatch(&request.method, request.params).await {
        Ok(Dispatch::Continue(result)) => (success_response(id, result), false),
        Ok(Dispatch::Shutdown(result)) => (success_response(id, result), true),
        Err(error) => (error_response(id, error.code, error.message), false),
    }
}

async fn dispatch(method: &str, params: Value) -> Result<Dispatch, RpcFault> {
    let result = match method {
        "hello" => {
            decode_params::<EmptyParams>(params)?;
            serde_json::to_value(hello()).expect("hello projection is serializable")
        }
        "parse" => {
            let params = decode_params::<ParseParams>(params)?;
            serde_json::to_value(parse_projection(&params.patch))
                .expect("parse projection is serializable")
        }
        "stream_parse" => {
            let params = decode_params::<StreamParseParams>(params)?;
            serde_json::to_value(stream_parse_projection(&params.chunks))
                .expect("stream parse projection is serializable")
        }
        "verify_patch" => {
            let params = decode_params::<VerifyPatchParams>(params)?;
            let cwd = parse_cwd(&params.cwd)?;
            let fs = LocalFileSystem::unsandboxed();
            let result = match codex_apply_patch::parse_patch(&params.patch) {
                Ok(args) => {
                    let verified = codex_apply_patch::verify_apply_patch_args_with_mode(
                        args,
                        &cwd,
                        params.mode.into(),
                        &fs,
                        None,
                    )
                    .await;
                    verification_projection(verified)
                }
                Err(error) => VerificationProjection {
                    classification: "correctness_error",
                    action: None,
                    error: Some(parse_error_projection(error)),
                },
            };
            serde_json::to_value(result).expect("verification projection is serializable")
        }
        "verify_invocation" => {
            let params = decode_params::<VerifyInvocationParams>(params)?;
            let cwd = parse_cwd(&params.cwd)?;
            let fs = LocalFileSystem::unsandboxed();
            let verified = codex_apply_patch::maybe_parse_apply_patch_verified_with_mode(
                &params.argv,
                &cwd,
                params.mode.into(),
                &fs,
                None,
            )
            .await;
            serde_json::to_value(verification_projection(verified))
                .expect("verification projection is serializable")
        }
        "apply_patch" => {
            let params = decode_params::<ApplyPatchParams>(params)?;
            let cwd = parse_cwd(&params.cwd)?;
            let fs = LocalFileSystem::unsandboxed();
            let mut stdout = Vec::new();
            let mut stderr = Vec::new();
            let applied = codex_apply_patch::apply_patch_with_mode(
                &params.patch,
                params.mode.into(),
                &cwd,
                &mut stdout,
                &mut stderr,
                &fs,
                None,
            )
            .await;
            let projection = match applied {
                Ok(delta) => ApplyProjection {
                    success: true,
                    stdout: String::from_utf8_lossy(&stdout).into_owned(),
                    stderr: String::from_utf8_lossy(&stderr).into_owned(),
                    delta: delta_projection(&delta),
                    error: None,
                },
                Err(failure) => {
                    let (error, delta) = failure.into_parts();
                    ApplyProjection {
                        success: false,
                        stdout: String::from_utf8_lossy(&stdout).into_owned(),
                        stderr: String::from_utf8_lossy(&stderr).into_owned(),
                        delta: delta_projection(&delta),
                        error: Some(apply_error_projection(error)),
                    }
                }
            };
            serde_json::to_value(projection).expect("apply projection is serializable")
        }
        "shutdown" => {
            decode_params::<EmptyParams>(params)?;
            return Ok(Dispatch::Shutdown(json!({ "shutdown": true })));
        }
        _ => {
            return Err(RpcFault {
                code: "method_not_found",
                message: format!("unknown method {method:?}"),
            });
        }
    };
    Ok(Dispatch::Continue(result))
}

fn hello() -> Hello {
    Hello {
        protocol_version: PROTOCOL_VERSION,
        engine_version: env!("CARGO_PKG_VERSION"),
        codex_repository: CODEX_REPOSITORY,
        codex_commit: CODEX_COMMIT,
        codex_apply_patch_package: CODEX_APPLY_PATCH_PACKAGE,
        codex_apply_patch_version: CODEX_APPLY_PATCH_VERSION,
        codex_apply_patch_tree: CODEX_APPLY_PATCH_TREE,
        codex_apply_patch_lib_blob: CODEX_APPLY_PATCH_LIB_BLOB,
        codex_apply_patch_parser_blob: CODEX_APPLY_PATCH_PARSER_BLOB,
        codex_apply_patch_streaming_parser_blob: CODEX_APPLY_PATCH_STREAMING_PARSER_BLOB,
        codex_apply_patch_invocation_blob: CODEX_APPLY_PATCH_INVOCATION_BLOB,
        codex_apply_patch_file_update_blob: CODEX_APPLY_PATCH_FILE_UPDATE_BLOB,
        codex_apply_patch_text_file_blob: CODEX_APPLY_PATCH_TEXT_FILE_BLOB,
        codex_apply_patch_seek_sequence_blob: CODEX_APPLY_PATCH_SEEK_SEQUENCE_BLOB,
        codex_cargo_lock_blob: CODEX_CARGO_LOCK_BLOB,
        os: std::env::consts::OS,
        arch: std::env::consts::ARCH,
        pointer_width: usize::BITS,
        filesystem: "LocalFileSystem::unsandboxed",
        sandbox: "none",
        scope: "apply_patch semantic engine only; excludes Codex core approval, sandbox orchestration, hooks, lifecycle events, and TurnDiff",
        methods: METHODS,
        modes: ["normalize_to_lf", "preserve_line_endings"],
    }
}

fn decode_params<T: for<'de> Deserialize<'de>>(value: Value) -> Result<T, RpcFault> {
    serde_json::from_value(value).map_err(|error| RpcFault::invalid_params(error.to_string()))
}

fn parse_cwd(value: &str) -> Result<PathUri, RpcFault> {
    PathUri::parse(value).map_err(|error| {
        RpcFault::invalid_params(format!("cwd must be a valid file: URI: {error}"))
    })
}

fn parse_projection(patch: &str) -> ParseProjection {
    match codex_apply_patch::parse_patch(patch) {
        Ok(args) => ParseProjection {
            accepted: true,
            patch: Some(args.patch),
            environment_id: args.environment_id,
            workdir: args.workdir,
            hunks: args.hunks.iter().map(hunk_projection).collect(),
            error: None,
        },
        Err(error) => ParseProjection {
            accepted: false,
            patch: None,
            environment_id: None,
            workdir: None,
            hunks: Vec::new(),
            error: Some(parse_error_projection(error)),
        },
    }
}

fn stream_parse_projection(chunks: &[String]) -> StreamParseProjection {
    let mut parser = StreamingPatchParser::default();
    let mut chunk_results = Vec::with_capacity(chunks.len());
    for (index, chunk) in chunks.iter().enumerate() {
        match parser.push_delta(chunk) {
            Ok(hunks) => chunk_results.push(StreamChunkProjection {
                index,
                environment_id: parser.environment_id().map(str::to_owned),
                hunks: hunks.iter().map(hunk_projection).collect(),
            }),
            Err(error) => {
                return StreamParseProjection {
                    accepted: false,
                    chunk_results,
                    environment_id: parser.environment_id().map(str::to_owned),
                    hunks: Vec::new(),
                    failed_chunk_index: Some(index),
                    error: Some(parse_error_projection(error)),
                };
            }
        }
    }
    match parser.finish() {
        Ok(hunks) => StreamParseProjection {
            accepted: true,
            chunk_results,
            environment_id: parser.environment_id().map(str::to_owned),
            hunks: hunks.iter().map(hunk_projection).collect(),
            failed_chunk_index: None,
            error: None,
        },
        Err(error) => StreamParseProjection {
            accepted: false,
            chunk_results,
            environment_id: parser.environment_id().map(str::to_owned),
            hunks: Vec::new(),
            failed_chunk_index: Some(chunks.len()),
            error: Some(parse_error_projection(error)),
        },
    }
}

fn hunk_projection(hunk: &Hunk) -> HunkProjection {
    match hunk {
        Hunk::AddFile { path, contents } => HunkProjection::AddFile {
            path: path.to_string_lossy().into_owned(),
            contents: contents.clone(),
        },
        Hunk::DeleteFile { path } => HunkProjection::DeleteFile {
            path: path.to_string_lossy().into_owned(),
        },
        Hunk::UpdateFile {
            path,
            move_path,
            chunks,
        } => HunkProjection::UpdateFile {
            path: path.to_string_lossy().into_owned(),
            move_path: move_path
                .as_ref()
                .map(|path| path.to_string_lossy().into_owned()),
            chunks: chunks.iter().map(update_chunk_projection).collect(),
        },
    }
}

fn update_chunk_projection(chunk: &UpdateFileChunk) -> UpdateChunkProjection {
    UpdateChunkProjection {
        change_context: chunk.change_context.clone(),
        old_lines: chunk.old_lines.clone(),
        new_lines: chunk.new_lines.clone(),
        context_line_indices: chunk.context_line_indices.clone(),
        is_end_of_file: chunk.is_end_of_file,
    }
}

fn verification_projection(value: MaybeApplyPatchVerified) -> VerificationProjection {
    match value {
        MaybeApplyPatchVerified::Body(action) => VerificationProjection {
            classification: "body",
            action: Some(action_projection(&action)),
            error: None,
        },
        MaybeApplyPatchVerified::ShellParseError(error) => VerificationProjection {
            classification: "shell_parse_error",
            action: None,
            error: Some(SemanticError {
                category: "invocation",
                variant: "ExtractHeredocError",
                message: format!("{error:?}"),
                detail: None,
                line_number: None,
            }),
        },
        MaybeApplyPatchVerified::CorrectnessError(error) => VerificationProjection {
            classification: "correctness_error",
            action: None,
            error: Some(apply_error_projection(error)),
        },
        MaybeApplyPatchVerified::NotApplyPatch => VerificationProjection {
            classification: "not_apply_patch",
            action: None,
            error: None,
        },
    }
}

fn action_projection(action: &ApplyPatchAction) -> ActionProjection {
    let mut changes = action
        .changes()
        .iter()
        .map(|(path, change)| preview_change_projection(path, change))
        .collect::<Vec<_>>();
    changes.sort_by(|left, right| preview_path(left).cmp(preview_path(right)));
    ActionProjection {
        patch: action.patch.clone(),
        cwd: action.cwd.to_string(),
        mode: match action.update_file_mode() {
            ApplyPatchFileUpdateMode::NormalizeToLf => UpdateMode::NormalizeToLf,
            ApplyPatchFileUpdateMode::PreserveLineEndings => UpdateMode::PreserveLineEndings,
        },
        empty: action.is_empty(),
        changes,
    }
}

fn preview_change_projection(
    path: &PathUri,
    change: &ApplyPatchFileChange,
) -> PreviewChangeProjection {
    match change {
        ApplyPatchFileChange::Add { content } => PreviewChangeProjection::Add {
            path: path.to_string(),
            content: content.clone(),
        },
        ApplyPatchFileChange::Delete { content } => PreviewChangeProjection::Delete {
            path: path.to_string(),
            content: content.clone(),
        },
        ApplyPatchFileChange::Update {
            unified_diff,
            move_path,
            new_content,
        } => PreviewChangeProjection::Update {
            path: path.to_string(),
            unified_diff: unified_diff.clone(),
            move_path: move_path.as_ref().map(ToString::to_string),
            new_content: new_content.clone(),
        },
    }
}

fn preview_path(change: &PreviewChangeProjection) -> &str {
    match change {
        PreviewChangeProjection::Add { path, .. }
        | PreviewChangeProjection::Delete { path, .. }
        | PreviewChangeProjection::Update { path, .. } => path,
    }
}

fn delta_projection(delta: &AppliedPatchDelta) -> DeltaProjection {
    DeltaProjection {
        exact: delta.is_exact(),
        changes: delta
            .changes()
            .iter()
            .map(delta_change_projection)
            .collect(),
    }
}

fn delta_change_projection(change: &AppliedPatchChange) -> DeltaChangeProjection {
    let path = change.path.to_string();
    match &change.change {
        AppliedPatchFileChange::Add {
            content,
            overwritten_content,
        } => DeltaChangeProjection::Add {
            path,
            content: content.clone(),
            overwritten_content: overwritten_content.clone(),
        },
        AppliedPatchFileChange::Delete { content } => DeltaChangeProjection::Delete {
            path,
            content: content.clone(),
        },
        AppliedPatchFileChange::Update {
            move_path,
            old_content,
            overwritten_move_content,
            new_content,
        } => DeltaChangeProjection::Update {
            path,
            move_path: move_path.as_ref().map(ToString::to_string),
            old_content: old_content.clone(),
            overwritten_move_content: overwritten_move_content.clone(),
            new_content: new_content.clone(),
        },
    }
}

fn parse_error_projection(error: ParseError) -> SemanticError {
    match error {
        ParseError::InvalidPatchError(detail) => SemanticError {
            category: "parse",
            variant: "InvalidPatchError",
            message: format!("invalid patch: {detail}"),
            detail: Some(detail),
            line_number: None,
        },
        ParseError::InvalidHunkError {
            message: detail,
            line_number,
        } => SemanticError {
            category: "parse",
            variant: "InvalidHunkError",
            message: format!("invalid hunk at line {line_number}, {detail}"),
            detail: Some(detail),
            line_number: Some(line_number),
        },
    }
}

fn apply_error_projection(error: ApplyPatchError) -> SemanticError {
    match error {
        ApplyPatchError::ParseError(error) => parse_error_projection(error),
        ApplyPatchError::IoError(error) => SemanticError {
            category: "apply",
            variant: "IoError",
            message: error.to_string(),
            detail: None,
            line_number: None,
        },
        ApplyPatchError::ComputeReplacements(detail) => SemanticError {
            category: "apply",
            variant: "ComputeReplacements",
            message: detail.clone(),
            detail: Some(detail),
            line_number: None,
        },
        ApplyPatchError::PathUri(error) => SemanticError {
            category: "apply",
            variant: "PathUri",
            message: error.to_string(),
            detail: None,
            line_number: None,
        },
        ApplyPatchError::ImplicitInvocation => SemanticError {
            category: "invocation",
            variant: "ImplicitInvocation",
            message: error.to_string(),
            detail: None,
            line_number: None,
        },
    }
}

fn success_response(id: Value, result: Value) -> Response {
    Response {
        protocol_version: PROTOCOL_VERSION,
        id,
        result: Some(result),
        error: None,
    }
}

fn error_response(id: Value, code: &'static str, message: impl Into<String>) -> Response {
    Response {
        protocol_version: PROTOCOL_VERSION,
        id,
        result: None,
        error: Some(RpcError {
            code,
            message: message.into(),
        }),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Cursor;

    fn request(id: u64, method: &str, params: Value) -> String {
        json!({
            "protocolVersion": PROTOCOL_VERSION,
            "id": id,
            "method": method,
            "params": params,
        })
        .to_string()
    }

    #[tokio::test]
    async fn parse_projects_exact_hunk_shape_and_error_variant() {
        let parsed =
            parse_projection("*** Begin Patch\n*** Add File: b.txt\n+hello\n*** End Patch");
        let value = serde_json::to_value(parsed).unwrap();
        assert_eq!(value["accepted"], true);
        assert_eq!(value["hunks"][0]["kind"], "AddFile");
        assert_eq!(value["hunks"][0]["contents"], "hello\n");

        let invalid = parse_projection("not a patch");
        let value = serde_json::to_value(invalid).unwrap();
        assert_eq!(value["accepted"], false);
        assert_eq!(value["error"]["variant"], "InvalidPatchError");
    }

    #[tokio::test]
    async fn stream_parse_reports_each_snapshot_and_finish_state() {
        let projected = stream_parse_projection(&[
            "*** Begin Patch\n*** Add File: a.txt\n+one".to_string(),
            "\n*** End Patch".to_string(),
        ]);
        let value = serde_json::to_value(projected).unwrap();
        assert_eq!(value["accepted"], true);
        assert_eq!(value["chunkResults"].as_array().unwrap().len(), 2);
        assert_eq!(value["hunks"][0]["contents"], "one\n");
    }

    #[tokio::test]
    async fn protocol_error_does_not_terminate_following_request() {
        let input = format!(
            "{{not-json}}\n{}\n{}\n",
            request(2, "hello", json!({})),
            request(3, "shutdown", json!({}))
        );
        let mut output = Vec::new();
        run(Cursor::new(input), &mut output).await.unwrap();
        let responses = String::from_utf8(output)
            .unwrap()
            .lines()
            .map(|line| serde_json::from_str::<Value>(line).unwrap())
            .collect::<Vec<_>>();
        assert_eq!(responses.len(), 3);
        assert_eq!(responses[0]["error"]["code"], "invalid_request");
        assert_eq!(
            responses[1]["result"]["filesystem"],
            "LocalFileSystem::unsandboxed"
        );
        assert_eq!(responses[2]["result"]["shutdown"], true);
    }
}
