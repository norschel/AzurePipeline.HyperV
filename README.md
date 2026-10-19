# Introduction 
Remote control one or many virtual machine(s) on a (remote) Hyper-V Server (without SCVMM). 
The Azure Pipelines task supports start, shutdown and turn off of virtual machines plus create, restore and delete Hyper-V snapshots. 

The task connects to the Hyper-V server in one of two modes:
- **PowerShell remoting** (default): runs on Windows agents only and uses the Hyper-V PowerShell cmdlets installed on the agent.
- **SSH mode**: runs on Windows, Linux and macOS agents. The core script is copied to the Hyper-V server via SSH and executed there with Windows PowerShell, so the server needs an OpenSSH server and the Hyper-V cmdlets.

# Getting Started
The task is a Node 20 task (`index.ts`) that executes the PowerShell core script `HyperVServer.ps1` either locally or via SSH. The script uses Windows PowerShell as well as the Windows PowerShell cmdlets for Hyper-V.
The requirements and installation of the Hyper-V cmdlets are described in the readme of the extension (more information can be found at [Task Store Readme](src/HyperVServer/Readme.md)).

Information about Microsoft Windows Hyper-V Powershell cmdlets can be found at [Hyper-V Commandlets](https://docs.microsoft.com/en-us/virtualization/hyper-v-on-windows/quick-start/try-hyper-v-powershell).

# Build and Test
Build the task from `src/HyperVServer`:

```sh
npm install
npm run build   # tsc, then ncc bundles index.js into HyperVServer/index.js
```

Packaging and publishing is done by the [Azure Pipelines definition](build/azure-pipelines.yml) with the `azdo-marketplace@6` task. Information on packaging and publishing Azure DevOps extensions can be found at [Publish extensions](https://learn.microsoft.com/en-us/azure/devops/extend/publish/overview).

The pipeline builds three VSIX variants with the same version:

| Variant | Extension ID | Visibility | Artifact |
| --- | --- | --- | --- |
| Dev | `hyperv-dev` | private | `Extension-Dev` |
| Prerelease | `hyperv-releasepreview` | public | `Extension-ReleasePreview` |
| Public | `hyperv` | public | `Extension-AzD` |

Each variant patches `task.json` with its own task name suffix and a stable task ID, so all variants can be installed side by side in the same organization.

## Release Pipeline

| Stage | Purpose |
| --- | --- |
| `Build` | Package all three variants in parallel and upload the VSIX artifacts. |
| `PublishDev` | Publish `hyperv-dev` privately to the Marketplace and wait for validation. |
| `PublishPrerelease` | After approval on the `HyperV-Prerelease-Oschel` environment, publish and validate `hyperv-releasepreview` and create a GitHub pre-release `v<version>`. |
| `PublishPublic` | After approval on the `HyperV-Prod-Oschel` environment, publish and validate `hyperv`, promote the GitHub release to a regular release and update the major Git tag. |

The CI trigger runs on `master`. All publishing stages also explicitly require `refs/heads/master` and successful preceding stages, so manually queued builds from other branches do not publish extensions or update release tags. A failed validation or a rejected or expired environment approval stops all following stages.

## Pipeline Configuration

Configuration is maintained in the YAML `variables` block, not selected through run parameters:

| Variable | Current Value | Purpose |
| --- | --- | --- |
| `majorversion` | `9` | VSIX major version and release tag, currently `v9`. |
| `minorversion` | `1` | VSIX minor version. |
| `PublisherID` | `Orschel` | Publisher used when packaging the extensions. |
| `marketplaceServiceConnection` | `Marketplace-Orschel` | Service connection used by all Marketplace publishing and validation tasks. |

The pipeline build number supplies the full extension version as `major.minor.revision`; the revision increments automatically. The build runs on `windows-latest`, publishing on `ubuntu-latest`.

Before running the release pipeline:
- Install the Azure DevOps Extension Tasks extension providing the `azdo-marketplace` task.
- Configure and authorize the Marketplace service connection `Marketplace-Orschel` with publishing access to `Orschel`.
- Configure and authorize the `GitHub` service connection used to create and promote GitHub releases.
- Create the `HyperV-Prerelease-Oschel` and `HyperV-Prod-Oschel` environments under **Pipelines > Environments**, authorize this pipeline and add an **Approvals** check to each. These settings are managed in Azure DevOps, not in YAML. Without this check, the environment does not require approval.
- Grant the checkout credentials permission to create and update Git tags, including any required GitHub tag ruleset permissions. No separate credentials are stored in YAML.
- Share the private `hyperv-dev` extension with the Azure DevOps organizations that will test it.

## Release Tags

The `PublishPrerelease` stage creates a GitHub pre-release with the tag `v<major>.<minor>.<revision>`; `PublishPublic` promotes the same release to a regular release.

Only after successful production validation, the pipeline also updates the annotated major-only Git tag (for example, `v9`) to the released source commit. This is a moving tag for the latest production release of that major version, not an immutable tag per build. Tag updates use a lease to reject concurrent changes to the remote tag.

## Testing

The task is primarily tested manually because different Hyper-V hypervisor/host os versions and the appropriate Hyper-V cmdlets are required. Especially in older versions Hyper-V commandlets are not always backward-compatible (Pre - Windows 10).

# Build and Release Status
<ToDo Status Badge>

Release Management - Preview
<ToDo Status Badge>

Release Management - Public
<ToDo Status Badge>

# Contribute
Contributions to the Hyper-V Azure Pipelines task are welcome. Some ways to contribute are to try things out, file issues and make pull-requests.

# Information about this forked version
This HyperV Azure DevOps pipeline task is based on AIT.BuildSuite.HyperV repository. 
In the future (from April 2023), the extension will be maintained under its own publisher (Orschel instead of AIT GmbH).
AIT will discontinue further maintenance.
