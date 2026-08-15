use dsh_codex_apply_patch_engine::run;
use std::io::BufReader;
use std::process::ExitCode;

#[tokio::main]
async fn main() -> ExitCode {
    let stdin = std::io::stdin();
    let stdout = std::io::stdout();
    match run(BufReader::new(stdin.lock()), stdout.lock()).await {
        Ok(()) => ExitCode::SUCCESS,
        Err(error) => {
            eprintln!("apply_patch semantic engine sidecar I/O failure: {error}");
            ExitCode::FAILURE
        }
    }
}
