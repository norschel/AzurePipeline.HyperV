# Introduction 
Remote control one or many virtual machine(s) on a (remote) Hyper-V Server (without SCVMM). 
The Azure Pipelines task supports start and stop a virtual machine plus create, restore and delete Hyper-V snapshots. 

# Getting Started
Building the extension for publication in the Visual Studio Marketplace or uploading it to a local TFS/Azure DevOps Server can be done via the cross-platform Node CLI for Azure DevOps (TFX-CLI). Information on installing Node CLI for Azure DevOps and packaging and publishing Azure DevOps extensions can be found at [Node CLI for Azure DevOps](https://docs.microsoft.com/en-us/azure/devops/extend/publish/overview?view=vsts).

The task uses internally Powershell (version 4 or newer recommended) as well as the Windows Powershell cmdlets for Hyper-V.
The installation of the Hyper-V cmdlets is described in the readme of the extension. (more information can be found at [Task Store Readme](src/HyperVServer/Readme.md)).

Information about Microsoft Windows Hyper-V Powershell cmdlets can be found at [Hyper-V Commandlets](https://docs.microsoft.com/en-us/virtualization/hyper-v-on-windows/quick-start/try-hyper-v-powershell).

# Build and Test
Information on installing Node CLI for Azure DevOps and packaging and publishing Azure DevOps extensions can be found at [Node CLI for Azure DevOps](https://docs.microsoft.com/en-us/azure/devops/extend/publish/overview?view=vsts).

The [Azure Pipelines definition](build/azure-pipelines.yml) builds two VSIX artifacts with the same version: a private `hyperv-preview` extension (`Extension-Preview`) and a public `hyperv` extension (`Extension-AzD`).

## Release Pipeline

| Stage | Purpose |
| --- | --- |
| `Build` | Package the private preview and public production variants in parallel and upload both VSIX artifacts. |
| `PublishPreview` | Publish `hyperv-preview` privately to the Marketplace and wait for validation. |
| `HyperVProd` | After environment approval, publish and validate the already-built public `hyperv` artifact, then update the major Git tag. |

The CI trigger runs on `master`. Both publishing stages also explicitly require `refs/heads/master` and successful preceding stages, so manually queued builds from other branches do not publish extensions or update release tags.

The `HyperVProd` stage uses a deployment job targeting the `production-Marketplace-Orschel` environment. The approval check on that environment gates production without blocking the build or private preview. There is no `ManualValidation` task in the YAML. A failed preview validation or a rejected or expired environment approval prevents production publication and tagging.

## Pipeline Configuration

Configuration is maintained in the YAML `variables` block, not selected through run parameters:

| Variable | Current Value | Purpose |
| --- | --- | --- |
| `majorversion` | `8` | VSIX major version and release tag, currently `v8`. |
| `minorversion` | `0` | VSIX minor version. |
| `PublisherID` | `Orschel` | Publisher used when packaging the extensions. |
| `marketplaceServiceConnection` | `SecurePublishMarketplaceServiceConnection` | Fixed service connection used by all Marketplace publishing and validation tasks. |

The pipeline build number supplies the full extension version as `major.minor.revision`; the revision increments automatically. The build uses Node.js 20, and publishing uses Node.js 22 on Windows agents.

Before running the release pipeline:
- Install the Azure DevOps Extension Tasks extension providing the packaging, publishing and validation tasks.
- Configure and authorize the Marketplace service connection specified by the pipeline variable `marketplaceServiceConnection` (`SecurePublishMarketplaceServiceConnection`) with publishing access to `Orschel`.
- Create the `production-Marketplace-Orschel` environment under **Pipelines > Environments** and authorize this pipeline. Under **Approvals and checks**, add an **Approvals** check, select the production approvers, disable self-approval and set a 48-hour timeout. These settings are managed in Azure DevOps, not in YAML. Without this check, the environment does not require approval.
- Grant the checkout credentials permission to create and update Git tags, including any required GitHub tag ruleset permissions. No separate credentials are stored in YAML.
- Share the private preview with the Azure DevOps organizations that will test it through the Marketplace.

## Release Tags

Only after successful production validation, the pipeline updates the annotated major-only Git tag (for example, `v8`) to the released source commit. This is a moving tag for the latest production release of that major version, not an immutable tag per build. The VSIX version remains `major.minor.revision`. Tag updates use a lease to reject concurrent changes to the remote tag.

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
