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

The Build folder in the GIT Repo also contains a Yaml definition for Azure Pipelines based CI-build (output is a VSIX file).
The subsequent Azure Pipelines release process changes the extension name and ID once again so that an independent internal test version (preview) can be generated. The version number remains unchanged in the following phases.

The task is primarily tested manually because different Hyper-V hypervisor/host os versions and the appropriate Hyper-V cmdlets are required. Especially in older versions Hyper-V commandlets are not always backward-compatible (Pre - Windows 10).

# Build and Release Status

[![Build Status](https://dev.azure.com/orschel/GitHub/_apis/build/status/norschel.AzurePipeline.HyperV?branchName=refs%2Fpull%2F1%2Fmerge)](https://dev.azure.com/orschel/GitHub/_build/latest?definitionId=58&branchName=refs%2Fpull%2F1%2Fmerge)

Release Management - Preview [![RM Status - Preview Stage](https://vsrm.dev.azure.com/ait-public/_apis/public/Release/badge/3dcbbf76-dfb1-4f85-8bde-1d140be6ee91/1/1)](https://vsrm.dev.azure.com/ait-public/_apis/public/Release/badge/3dcbbf76-dfb1-4f85-8bde-1d140be6ee91/1/1)

Release Management - Public [![RM Status - Preview Stage](https://vsrm.dev.azure.com/ait-public/_apis/public/Release/badge/3dcbbf76-dfb1-4f85-8bde-1d140be6ee91/1/2)](https://vsrm.dev.azure.com/ait-public/_apis/public/Release/badge/3dcbbf76-dfb1-4f85-8bde-1d140be6ee91/1/2)

# Contribute
Contributions to the Hyper-V Azure Pipelines task are welcome. Some ways to contribute are to try things out, file issues and make pull-requests.
