use dsh_codex_approval_protocol_engine::run;
use std::io::BufReader;
use std::process::ExitCode;

fn main() -> ExitCode {
    let stdin = std::io::stdin();
    let stdout = std::io::stdout();
    match run(BufReader::new(stdin.lock()), stdout.lock()) {
        Ok(()) => ExitCode::SUCCESS,
        Err(error) => {
            eprintln!("approval protocol sidecar I/O failure: {error}");
            ExitCode::FAILURE
        }
    }
}
