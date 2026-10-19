# Copilot Instructions – Hyper-V Azure Pipelines Extension

## Project overview
Azure DevOps extension (publisher `Orschel`) providing the `HyperVServer` pipeline task to remote-control Hyper-V VMs without SCVMM: start, shutdown, turn off, and create/restore/remove snapshots (checkpoints).

## Layout
- [src/HyperVServer/index.ts](../src/HyperVServer/index.ts) – Node task entry point. Reads task inputs via `azure-pipelines-task-lib` and runs in one of two modes:
  - PowerShell remoting (default, Windows agents only): spawns `HyperVServer.ps1` locally.
  - SSH mode (`SSHMode = true`, any OS): uses [PowerShellSshClient.ts](../src/HyperVServer/PowerShellSshClient.ts) (`ssh2`) to run the script on the Hyper-V host.
- [src/HyperVServer/HyperVServer/](../src/HyperVServer/HyperVServer/) – the packaged task folder:
  - `task.json` – task manifest (inputs, `Node20_1` execution, `index.js` target).
  - `HyperVServer.ps1` – core Hyper-V logic using Hyper-V cmdlets (`Get-VM`, `Start-VM`, `Checkpoint-VM`, ...).
  - `Logging.ps1` – logging helpers (`write-LogSectionStart`, `write-LogInfo`, ...); use these instead of raw `Write-Host`.
  - `index.js`, `exec-child.js`, `build/`, `lib/` – **generated** ncc bundle output and native binaries. Do not edit by hand.
- [src/HyperVServer/vss-extension.json](../src/HyperVServer/vss-extension.json) – extension manifest.
- [build/azure-pipelines.yml](../build/azure-pipelines.yml) – CI/CD pipeline (authoritative over README when they differ).
- [build/CommunityAnalyzerRules/](../build/CommunityAnalyzerRules/) – custom PSScriptAnalyzer rules.

## Build
From `src/HyperVServer`:
```sh
npm install
npm run build   # tsc, then ncc bundles index.js into HyperVServer/index.js
```
There are no automated tests; the task is tested manually against real Hyper-V hosts (cmdlet behavior differs between Windows/Hyper-V versions).

## Conventions
- Edit `.ts` sources, never the compiled/bundled `.js` files.
- Task inputs: when adding/renaming an input, update `task.json`, `index.ts` (both the PowerShell argument builder and the SSH path), and the `param()` block in `HyperVServer.ps1` together. Keep backward-compatible input aliases (e.g. `Action`/`Command`, `Computername`/`Hostname`, `SnapshotName`/`CheckpointName`).
- Optional script arguments are only passed when non-empty (`addOptionalScriptArgument`).
- `HyperVServer.ps1` must stay compatible with Windows PowerShell 5.1 and PowerShell 7; avoid PS7-only syntax.
- Non-zero exit codes from the PowerShell process must fail the task.
- Never log secrets (SSH passwords/private keys); use task-lib secret handling.
- `task.json` `version` and `id`/`name` are patched by the pipeline per variant — don't bump them manually for releases.

## Documentation
Two READMEs must be kept in sync whenever a change is important (new/changed actions or inputs, SSH/platform support, requirements, breaking changes, version/release process):
- [src/HyperVServer/Readme.md](../src/HyperVServer/Readme.md) – shown on the Azure DevOps Marketplace (packaged via `vss-extension.json`). User-facing only: requirements, configuration, changelog, privacy. Add a `Changes since x.y.z` changelog entry for user-visible changes; no build/pipeline internals.
- [README.md](../README.md) – repository/developer README: overview, build, release pipeline, configuration variables, testing.

Update both in the same change when the information applies to both (e.g. feature descriptions, requirements, supported platforms); otherwise update only the relevant one.

## Pipeline / release
- Version: `$(majorversion).$(minorversion).$(Rev:r)` from pipeline variables.
- `Build` stage packages three variants via a matrix (`Dev` private, `Prerelease` public, `Public` public). Each variant patches `task.json` with a name suffix and its own stable task ID. Never change existing task IDs.
- `properties.name` of the task contribution in `vss-extension.json` is the task folder path (`HyperVServer`) and must not be suffixed.
- When writing `task.json` from PowerShell, write UTF-8 **without BOM** (tfx rejects BOMs).
- Publishing (Dev → Prerelease → Public) runs only on `refs/heads/master` and is gated by environment approvals; use the `azdo-marketplace@6` task.
