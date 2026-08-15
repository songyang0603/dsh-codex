use super::*;

use codex_exec_server::LOCAL_FS;
use serde_json::Map;
use serde_json::Value;
use serde_json::json;
use std::collections::BTreeMap;
use std::fs;
use std::path::Path;
use std::path::PathBuf;

const CODEX_COMMIT: &str = "086396f7f60347b74c82784d5dfaf4fb2d3bda12";
const APPLY_PATCH_TREE: &str = "1601c43435739cfeca8c5ae4fe28e56b5efc4246";
const EXEC_SERVER_TREE: &str = "51751785508060e633f0e0472fa0d2572787b36a";
const FILE_SYSTEM_TREE: &str = "971c42b87f1e8e94411d6b63a854b1404df45d1d";
const PATH_URI_TREE: &str = "02fceb44b126b04efe3d4d2087284d092fa02f13";
const CARGO_LOCK_BLOB: &str = "a8c2addc02055be48c345b65760a7a1b96cfbf28";

fn required_string<'a>(value: &'a Value, key: &str, case_id: &str) -> anyhow::Result<&'a str> {
    value
        .get(key)
        .and_then(Value::as_str)
        .ok_or_else(|| anyhow::anyhow!("{case_id}: {key} must be a string"))
}

fn materialize(text: &str, root: &Path) -> String {
    text.replace("$ROOT", &root.to_string_lossy())
}

fn decode_hex(text: &str) -> anyhow::Result<Vec<u8>> {
    if !text.len().is_multiple_of(2) {
        anyhow::bail!("hex input must contain an even number of digits");
    }
    text.as_bytes()
        .chunks_exact(2)
        .map(|pair| {
            let pair = std::str::from_utf8(pair)?;
            u8::from_str_radix(pair, 16).map_err(anyhow::Error::from)
        })
        .collect()
}

fn encode_hex(bytes: &[u8]) -> String {
    let mut output = String::with_capacity(bytes.len() * 2);
    for byte in bytes {
        use std::fmt::Write as _;
        write!(&mut output, "{byte:02x}").expect("write to String");
    }
    output
}

#[cfg(unix)]
fn set_mode(path: &Path, mode: &str) -> anyhow::Result<()> {
    use std::os::unix::fs::PermissionsExt;
    let parsed = u32::from_str_radix(mode, 8)?;
    fs::set_permissions(path, fs::Permissions::from_mode(parsed))?;
    Ok(())
}

#[cfg(not(unix))]
fn set_mode(_path: &Path, _mode: &str) -> anyhow::Result<()> {
    Ok(())
}

fn create_fixture(root: &Path, fixture: &Value, case_id: &str) -> anyhow::Result<()> {
    let relative = required_string(fixture, "path", case_id)?;
    let path = root.join(relative);
    let kind = required_string(fixture, "kind", case_id)?;
    match kind {
        "directory" => fs::create_dir_all(&path)?,
        "file" => {
            if let Some(parent) = path.parent() {
                fs::create_dir_all(parent)?;
            }
            let bytes = fixture
                .get("bytesHex")
                .and_then(Value::as_str)
                .map(decode_hex)
                .transpose()?
                .unwrap_or_default();
            fs::write(&path, bytes)?;
        }
        "symlink" => {
            #[cfg(unix)]
            {
                use std::os::unix::fs::symlink;
                if let Some(parent) = path.parent() {
                    fs::create_dir_all(parent)?;
                }
                let target = required_string(fixture, "target", case_id)?;
                symlink(materialize(target, root), &path)?;
            }
            #[cfg(not(unix))]
            anyhow::bail!("{case_id}: symlink fixtures require Unix");
        }
        other => anyhow::bail!("{case_id}: unsupported fixture kind {other}"),
    }
    if kind != "symlink"
        && let Some(mode) = fixture.get("mode").and_then(Value::as_str)
    {
        set_mode(&path, mode)?;
    }
    Ok(())
}

fn setup_case(case: &Value, case_id: &str) -> anyhow::Result<tempfile::TempDir> {
    let temp = tempfile::Builder::new()
        .prefix("dsh-codex-apply-patch-case.")
        .tempdir()?;
    fs::create_dir(temp.path().join("work"))?;
    fs::create_dir(temp.path().join("abs"))?;
    fs::create_dir(temp.path().join("outside-project"))?;
    fs::create_dir(temp.path().join("symlink-targets"))?;
    if let Some(fixtures) = case.get("fixtures") {
        let fixtures = fixtures
            .as_array()
            .ok_or_else(|| anyhow::anyhow!("{case_id}: fixtures must be an array"))?;
        for fixture in fixtures {
            create_fixture(temp.path(), fixture, case_id)?;
        }
    }
    Ok(temp)
}

#[cfg(unix)]
fn permission_mode(metadata: &fs::Metadata) -> String {
    use std::os::unix::fs::PermissionsExt;
    format!("{:04o}", metadata.permissions().mode() & 0o7777)
}

#[cfg(not(unix))]
fn permission_mode(metadata: &fs::Metadata) -> String {
    if metadata.permissions().readonly() {
        "readonly".to_string()
    } else {
        "writable".to_string()
    }
}

fn snapshot(root: &Path) -> anyhow::Result<Vec<Value>> {
    fn visit(base: &Path, directory: &Path, entries: &mut BTreeMap<PathBuf, Value>) -> anyhow::Result<()> {
        let mut children = fs::read_dir(directory)?.collect::<Result<Vec<_>, _>>()?;
        children.sort_by_key(fs::DirEntry::file_name);
        for child in children {
            let path = child.path();
            let relative = path.strip_prefix(base)?.to_path_buf();
            let metadata = fs::symlink_metadata(&path)?;
            let file_type = metadata.file_type();
            let value = if file_type.is_symlink() {
                json!({
                    "path": relative.to_string_lossy(),
                    "kind": "symlink",
                    "mode": permission_mode(&metadata),
                    "target": fs::read_link(&path)?.to_string_lossy(),
                })
            } else if file_type.is_dir() {
                let value = json!({
                    "path": relative.to_string_lossy(),
                    "kind": "directory",
                    "mode": permission_mode(&metadata),
                });
                entries.insert(relative.clone(), value);
                visit(base, &path, entries)?;
                continue;
            } else if file_type.is_file() {
                json!({
                    "path": relative.to_string_lossy(),
                    "kind": "file",
                    "mode": permission_mode(&metadata),
                    "bytesHex": encode_hex(&fs::read(&path)?),
                })
            } else {
                json!({
                    "path": relative.to_string_lossy(),
                    "kind": "other",
                    "mode": permission_mode(&metadata),
                })
            };
            entries.insert(relative, value);
        }
        Ok(())
    }

    let mut entries = BTreeMap::new();
    visit(root, root, &mut entries)?;
    Ok(entries.into_values().collect())
}

fn serialize_chunk(chunk: &UpdateFileChunk) -> Value {
    json!({
        "changeContext": chunk.change_context,
        "oldLines": chunk.old_lines,
        "newLines": chunk.new_lines,
        "contextLineIndices": chunk.context_line_indices,
        "isEndOfFile": chunk.is_end_of_file,
    })
}

fn serialize_hunks(hunks: &[Hunk]) -> Value {
    Value::Array(
        hunks
            .iter()
            .map(|hunk| match hunk {
                Hunk::AddFile { path, contents } => json!({
                    "kind": "AddFile",
                    "path": path.to_string_lossy(),
                    "contents": contents,
                }),
                Hunk::DeleteFile { path } => json!({
                    "kind": "DeleteFile",
                    "path": path.to_string_lossy(),
                }),
                Hunk::UpdateFile {
                    path,
                    move_path,
                    chunks,
                } => json!({
                    "kind": "UpdateFile",
                    "path": path.to_string_lossy(),
                    "movePath": move_path.as_ref().map(|path| path.to_string_lossy()),
                    "chunks": chunks.iter().map(serialize_chunk).collect::<Vec<_>>(),
                }),
            })
            .collect(),
    )
}

fn serialize_parse_error(error: &ParseError) -> Value {
    match error {
        ParseError::InvalidPatchError(detail) => json!({
            "category": "parse",
            "variant": "InvalidPatchError",
            "message": format!("invalid patch: {detail}"),
            "detail": detail,
        }),
        ParseError::InvalidHunkError {
            message: detail,
            line_number,
        } => json!({
            "category": "parse",
            "variant": "InvalidHunkError",
            "message": format!("invalid hunk at line {line_number}, {detail}"),
            "detail": detail,
            "lineNumber": line_number,
        }),
    }
}

fn serialize_error(error: &ApplyPatchError) -> Value {
    match error {
        ApplyPatchError::ParseError(error) => serialize_parse_error(error),
        ApplyPatchError::IoError(error) => json!({
            "category": "apply",
            "variant": "IoError",
            "message": error.to_string(),
        }),
        ApplyPatchError::ComputeReplacements(detail) => json!({
            "category": "apply",
            "variant": "ComputeReplacements",
            "message": detail,
            "detail": detail,
        }),
        ApplyPatchError::PathUri(error) => json!({
            "category": "apply",
            "variant": "PathUri",
            "message": error.to_string(),
        }),
        ApplyPatchError::ImplicitInvocation => json!({
            "category": "invocation",
            "variant": "ImplicitInvocation",
            "message": error.to_string(),
        }),
    }
}

fn serialize_delta(delta: &AppliedPatchDelta) -> Value {
    let changes = delta
        .changes()
        .iter()
        .map(|change| {
            match &change.change {
                AppliedPatchFileChange::Add {
                    content,
                    overwritten_content,
                } => json!({
                    "kind": "Add",
                    "path": change.path.to_string(),
                    "content": content,
                    "overwrittenContent": overwritten_content,
                }),
                AppliedPatchFileChange::Delete { content } => json!({
                    "kind": "Delete",
                    "path": change.path.to_string(),
                    "content": content,
                }),
                AppliedPatchFileChange::Update {
                    move_path,
                    old_content,
                    overwritten_move_content,
                    new_content,
                } => json!({
                    "kind": "Update",
                    "path": change.path.to_string(),
                    "movePath": move_path.as_ref().map(ToString::to_string),
                    "oldContent": old_content,
                    "overwrittenMoveContent": overwritten_move_content,
                    "newContent": new_content,
                }),
            }
        })
        .collect::<Vec<_>>();
    json!({ "exact": delta.is_exact(), "changes": changes })
}

fn mode_from_case(case: &Value, case_id: &str) -> anyhow::Result<ApplyPatchFileUpdateMode> {
    match case.get("mode").and_then(Value::as_str).unwrap_or("normalizeToLf") {
        "normalizeToLf" => Ok(ApplyPatchFileUpdateMode::NormalizeToLf),
        "preserveLineEndings" => Ok(ApplyPatchFileUpdateMode::PreserveLineEndings),
        other => anyhow::bail!("{case_id}: unsupported mode {other}"),
    }
}

fn serialize_action(action: &ApplyPatchAction) -> Value {
    let mut changes = action
        .changes()
        .iter()
        .map(|(path, change)| {
            let value = match change {
                ApplyPatchFileChange::Add { content } => {
                    json!({ "kind": "Add", "path": path.to_string(), "content": content })
                }
                ApplyPatchFileChange::Delete { content } => {
                    json!({ "kind": "Delete", "path": path.to_string(), "content": content })
                }
                ApplyPatchFileChange::Update {
                    unified_diff,
                    move_path,
                    new_content,
                } => json!({
                    "kind": "Update",
                    "path": path.to_string(),
                    "unifiedDiff": unified_diff,
                    "movePath": move_path.as_ref().map(ToString::to_string),
                    "newContent": new_content,
                }),
            };
            value
        })
        .collect::<Vec<_>>();
    changes.sort_by(|left, right| {
        left.get("path")
            .and_then(Value::as_str)
            .cmp(&right.get("path").and_then(Value::as_str))
    });
    json!({
        "patch": action.patch,
        "cwd": action.cwd.to_string(),
        "mode": match action.update_file_mode() {
            ApplyPatchFileUpdateMode::NormalizeToLf => "normalize_to_lf",
            ApplyPatchFileUpdateMode::PreserveLineEndings => "preserve_line_endings",
        },
        "empty": action.is_empty(),
        "changes": changes,
    })
}

fn serialize_verified(result: MaybeApplyPatchVerified) -> Value {
    match result {
        MaybeApplyPatchVerified::Body(action) => {
            json!({ "classification": "body", "action": serialize_action(&action), "error": null })
        }
        MaybeApplyPatchVerified::ShellParseError(error) => json!({
            "classification": "shell_parse_error",
            "action": null,
            "error": {
                "category": "invocation",
                "variant": "ExtractHeredocError",
                "message": format!("{error:?}"),
            },
        }),
        MaybeApplyPatchVerified::CorrectnessError(error) => json!({
            "classification": "correctness_error",
            "action": null,
            "error": serialize_error(&error),
        }),
        MaybeApplyPatchVerified::NotApplyPatch => json!({
            "classification": "not_apply_patch",
            "action": null,
            "error": null,
        }),
    }
}

fn run_parse(case: &Value, root: &Path, case_id: &str) -> Value {
    let patch = materialize(
        required_string(case, "patch", case_id).expect("validated patch"),
        root,
    );
    match parse_patch(&patch) {
        Ok(args) => json!({
            "accepted": true,
            "patch": Some(args.patch),
            "environmentId": args.environment_id,
            "workdir": args.workdir,
            "hunks": serialize_hunks(&args.hunks),
            "error": null,
        }),
        Err(error) => json!({
            "accepted": false,
            "patch": null,
            "environmentId": null,
            "workdir": null,
            "hunks": [],
            "error": serialize_parse_error(&error),
        }),
    }
}

fn run_stream(case: &Value, root: &Path, case_id: &str) -> anyhow::Result<Value> {
    let chunks = case
        .get("chunks")
        .and_then(Value::as_array)
        .ok_or_else(|| anyhow::anyhow!("{case_id}: chunks must be an array"))?;
    let mut parser = StreamingPatchParser::default();
    let mut chunk_results = Vec::new();
    for (index, chunk) in chunks.iter().enumerate() {
        let chunk = materialize(
            chunk
                .as_str()
                .ok_or_else(|| anyhow::anyhow!("{case_id}: stream chunk must be a string"))?,
            root,
        );
        match parser.push_delta(&chunk) {
            Ok(hunks) => chunk_results.push(json!({
                "index": index,
                "hunks": serialize_hunks(&hunks),
                "environmentId": parser.environment_id(),
            })),
            Err(error) => {
                return Ok(json!({
                    "accepted": false,
                    "chunkResults": chunk_results,
                    "environmentId": parser.environment_id(),
                    "hunks": [],
                    "failedChunkIndex": index,
                    "error": serialize_parse_error(&error),
                }));
            }
        }
    }
    Ok(match parser.finish() {
        Ok(hunks) => json!({
            "accepted": true,
            "chunkResults": chunk_results,
            "environmentId": parser.environment_id(),
            "hunks": serialize_hunks(&hunks),
            "failedChunkIndex": null,
            "error": null,
        }),
        Err(error) => json!({
            "accepted": false,
            "chunkResults": chunk_results,
            "environmentId": parser.environment_id(),
            "hunks": [],
            "failedChunkIndex": chunks.len(),
            "error": serialize_parse_error(&error),
        }),
    })
}

async fn run_case(case: &Value, root: &Path, case_id: &str) -> anyhow::Result<Value> {
    let operation = required_string(case, "operation", case_id)?;
    let cwd = PathUri::from_host_native_path(root.join("work"))?;
    let mode = mode_from_case(case, case_id)?;
    match operation {
        "parse" => Ok(run_parse(case, root, case_id)),
        "stream" => run_stream(case, root, case_id),
        "invocation" => {
            let argv = case
                .get("argv")
                .and_then(Value::as_array)
                .ok_or_else(|| anyhow::anyhow!("{case_id}: argv must be an array"))?
                .iter()
                .map(|value| {
                    value
                        .as_str()
                        .map(|value| materialize(value, root))
                        .ok_or_else(|| anyhow::anyhow!("{case_id}: argv member must be a string"))
                })
                .collect::<anyhow::Result<Vec<_>>>()?;
            Ok(serialize_verified(
                maybe_parse_apply_patch_verified_with_mode(
                    &argv,
                    &cwd,
                    mode,
                    LOCAL_FS.as_ref(),
                    /*sandbox*/ None,
                )
                .await,
            ))
        }
        "verify" => {
            let patch = materialize(required_string(case, "patch", case_id)?, root);
            match parse_patch(&patch) {
                Ok(args) => Ok(serialize_verified(
                    verify_apply_patch_args_with_mode(
                        args,
                        &cwd,
                        mode,
                        LOCAL_FS.as_ref(),
                        /*sandbox*/ None,
                    )
                    .await,
                )),
                Err(error) => Ok(serialize_verified(MaybeApplyPatchVerified::CorrectnessError(
                    error.into(),
                ))),
            }
        }
        "apply" => {
            let patch = materialize(required_string(case, "patch", case_id)?, root);
            let mut stdout = Vec::new();
            let mut stderr = Vec::new();
            let result = apply_patch_with_mode(
                &patch,
                mode,
                &cwd,
                &mut stdout,
                &mut stderr,
                LOCAL_FS.as_ref(),
                /*sandbox*/ None,
            )
            .await;
            let outcome = match result {
                Ok(delta) => json!({
                    "success": true,
                    "stdout": String::from_utf8_lossy(&stdout),
                    "stderr": String::from_utf8_lossy(&stderr),
                    "delta": serialize_delta(&delta),
                    "error": null,
                }),
                Err(failure) => {
                    let (error, delta) = failure.into_parts();
                    json!({
                        "success": false,
                        "stdout": String::from_utf8_lossy(&stdout),
                        "stderr": String::from_utf8_lossy(&stderr),
                        "delta": serialize_delta(&delta),
                        "error": serialize_error(&error),
                    })
                }
            };
            Ok(outcome)
        }
        other => anyhow::bail!("{case_id}: unsupported operation {other}"),
    }
}

fn validate_case(case: &Value, seen: &mut std::collections::HashSet<String>) -> anyhow::Result<String> {
    let object = case
        .as_object()
        .ok_or_else(|| anyhow::anyhow!("corpus record must be an object"))?;
    if object.get("schemaVersion").and_then(Value::as_u64) != Some(1) {
        anyhow::bail!("corpus schemaVersion must be exactly 1");
    }
    let id = required_string(case, "id", "unknown")?.to_string();
    if !seen.insert(id.clone()) {
        anyhow::bail!("duplicate corpus case id: {id}");
    }
    required_string(case, "operation", &id)?;
    Ok(id)
}

#[tokio::test(flavor = "current_thread")]
#[ignore = "run only through conformance/apply-patch-engine/run-oracle.sh"]
async fn dsh_codex_apply_patch_engine_conformance_oracle() -> anyhow::Result<()> {
    let corpus_path = std::env::var("DSH_CODEX_APPLY_PATCH_ENGINE_ORACLE_CORPUS")?;
    let output_path = std::env::var("DSH_CODEX_APPLY_PATCH_ENGINE_ORACLE_OUTPUT")?;
    let corpus = fs::read_to_string(&corpus_path)?;
    let mut seen = std::collections::HashSet::new();
    let mut output = String::new();

    for (index, line) in corpus.lines().enumerate() {
        if line.trim().is_empty() {
            anyhow::bail!("blank corpus line at {}", index + 1);
        }
        let case: Value = serde_json::from_str(line)?;
        let case_id = validate_case(&case, &mut seen)?;
        let operation = required_string(&case, "operation", &case_id)?.to_string();
        let requires_unix = case
            .get("requiresUnix")
            .and_then(Value::as_bool)
            .unwrap_or(false);
        let temp = setup_case(&case, &case_id)?;
        let pre_snapshot = snapshot(temp.path())?;
        let result = if requires_unix && !cfg!(unix) {
            json!({ "skipped": true, "reason": "requires_unix" })
        } else {
            run_case(&case, temp.path(), &case_id).await?
        };
        let post_snapshot = snapshot(temp.path())?;
        let mut identity = Map::new();
        identity.insert("codexCommit".to_string(), json!(CODEX_COMMIT));
        identity.insert("applyPatchTree".to_string(), json!(APPLY_PATCH_TREE));
        identity.insert("execServerTree".to_string(), json!(EXEC_SERVER_TREE));
        identity.insert("fileSystemTree".to_string(), json!(FILE_SYSTEM_TREE));
        identity.insert("pathUriTree".to_string(), json!(PATH_URI_TREE));
        identity.insert("cargoLockBlob".to_string(), json!(CARGO_LOCK_BLOB));
        identity.insert("os".to_string(), json!(std::env::consts::OS));
        identity.insert("arch".to_string(), json!(std::env::consts::ARCH));
        identity.insert("pointerWidth".to_string(), json!(usize::BITS));
        let record = json!({
            "schemaVersion": 1,
            "id": case_id,
            "operation": operation,
            "evidence": "pinned_upstream",
            "identity": identity,
            "caseRoot": temp.path().to_string_lossy(),
            "preSnapshot": pre_snapshot,
            "result": result,
            "postSnapshot": post_snapshot,
        });
        output.push_str(&serde_json::to_string(&record)?);
        output.push('\n');
    }

    if seen.is_empty() {
        anyhow::bail!("corpus is empty");
    }
    fs::write(output_path, output)?;
    Ok(())
}
