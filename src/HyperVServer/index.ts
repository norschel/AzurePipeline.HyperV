import path from "path";
import { spawn } from "child_process";
import { getInput, debug, setResult, TaskResult } from "azure-pipelines-task-lib/task";
import { hostname, platform } from "os";
import { PowerShellSSHClient } from "./PowerShellSshClient";

async function main() {
  // https://stackoverflow.com/questions/8683895/how-do-i-determine-the-current-operating-system-with-node-js
  
  // startGroup("Hyper-V action general information");
  console.log(`Starting the HyperV action on Hyper-V host ${hostname()} using the platform ${platform()}`);
  var isSshModeEnabled = getBoolean(getInput("SSHMode", false));

  // we check if ssh mode is enabled
  // if it is enabled, we will use ssh to execute the commands on the remote machine
  // ssh works on all platforms (Windows, Mac, Linux)

  // if ssh mode is not enabled, we will use PowerShell to execute the commands on the remote machine
  // PowerShell works only on Windows
  if (!isSshModeEnabled) {
    console.log("SSH mode is not enabled. Using PowerShell remote protocol.");
    await executeInPowerShellRemoteMode();
  }
  else {
    console.log("SSH mode is enabled. Using SSH protocol.");
    // ssh mode is enabled
    await executeInSSHMode();
  }
}

async function executeInPowerShellRemoteMode() {
  if (process.platform !== "win32") {
    throw new Error("Connecting via PowerShell remote protocol is only supported on Windows. Please enable SSH mode.");
  }

  console.log("Starting executing PowerShell commands.");
  // https://www.freecodecamp.org/news/node-js-child-processes-everything-you-need-to-know-e69498fe970a/
  // https://nodejs.org/api/child_process.html
  // https://2ality.com/2018/05/child-process-streams.html
  const pwshHyperV = spawn(getPwsh(), [
    "-File",
    getLocalScriptPath("HyperVServer.ps1"),
    ...createHyperVScriptArguments(),
  ], {
    stdio: "inherit",
  });

  await new Promise<void>((resolve, reject) => {
    pwshHyperV.on("error", reject);
    pwshHyperV.on("close", (code) => {
      console.log(`PowerShell process exited with code ${code}`);
      if (code != null && code !== 0) {
        reject(new Error(`PowerShell process exited with code ${code}`));
        return;
      }

      resolve();
    });
  });

  console.log("### DONE");
}

function createHyperVScriptArguments(): string[] {
  var action = getInput("Action", false) || getInput("Command", true) || "";
  var vmName = getInput("VMName", true) || "";
  var computername = getInput("Computername", false) || getInput("Hostname", true) || "";

  var checkpointName = getInput("SnapshotName", false) || getInput("CheckpointName", false);
  var StartVMWaitTimeBasedCheckInterval = getInput(
    "StartVMWaitTimeBasedCheckInterval",
    false );
  var StartVMStatusCheckType = getInput("StartVMStatusCheckType",
    false);
  var HyperV_StartVMWaitingNumberOfStatusNotifications = getInput(
    "HyperV_StartVMWaitingNumberOfStatusNotifications",
    false);
  var HyperV_StartVMAppHealthyHeartbeatTimeout = getInput(
    "HyperV_StartVMAppHealthyHeartbeatTimeout",
    false);
  var HyperV_PsModuleVersion = getInput("HyperV_PsModuleVersion", false);

  const hyperVCmd = [
    "-Computername", computername,
    "-Action", action,
    "-VMName", vmName,
  ];

  addOptionalScriptArgument(hyperVCmd, "-CheckpointName", checkpointName);
  addOptionalScriptArgument(hyperVCmd, "-StartVMWaitTimeBasedCheckInterval", StartVMWaitTimeBasedCheckInterval);
  addOptionalScriptArgument(hyperVCmd, "-StartVMStatusCheckType", StartVMStatusCheckType);
  addOptionalScriptArgument(hyperVCmd, "-HyperV_StartVMWaitingNumberOfStatusNotifications", HyperV_StartVMWaitingNumberOfStatusNotifications);
  addOptionalScriptArgument(hyperVCmd, "-HyperV_StartVMAppHealthyHeartbeatTimeout", HyperV_StartVMAppHealthyHeartbeatTimeout);
  addOptionalScriptArgument(hyperVCmd, "-HyperV_PsModuleVersion", HyperV_PsModuleVersion);

  debug("### HyperV command script parameter: " + hyperVCmd.join(" "));
  return hyperVCmd;
}

function addOptionalScriptArgument(scriptArguments: string[], parameterName: string, value: string | undefined | null): void {
  if (!isEmpty(value)) {
    scriptArguments.push(parameterName, value!.trim());
  }
}

async function executeInSSHMode() {
  var sshPrivatekey = getInput("SSHPrivateKey", false);
  var sshHost = getInput("SSHHostName", false) || getInput("Computername", true) || "";
  var sshUsername = getInput("SSHUsername", true);
  var sshPort = Number.parseInt(getInput("SSHPort", false) || "22", 10);
  if (Number.isNaN(sshPort)) {
    throw new Error("SSH port is not a valid number.");
  }

  // we use username and password if private key is not provided (default)
  var ssh: PowerShellSSHClient;
  if (isEmpty(sshPrivatekey)) {
    console.log("### Connecting via SSH with username and password");

    var sshPassword = getInput("SSHPassword", true);
    if (isEmpty(sshPassword)) {
      throw new Error("SSH password is required if no private key is provided.");
    }

    ssh = new PowerShellSSHClient({
      host: sshHost,
      port: sshPort,
      username: sshUsername,
      password: sshPassword,
    }, getPwsh());
  }
  else {
    console.log("### Connecting via SSH with private key");
    ssh = new PowerShellSSHClient({
      host: sshHost,
      port: sshPort,
      username: sshUsername,
      privateKey: sshPrivatekey,
    }, getPwsh());
  }

  var scriptArguments = createHyperVScriptArguments();
  // endGroup();
  var result = await ssh.executeScript(getLocalScriptPath("HyperVServer.ps1"), scriptArguments);
  result = result.trim();
  debug("### Result: " + result);
  console.log("### Done");
}

//source: https://stackoverflow.com/questions/1812245/what-is-the-best-way-to-test-for-an-empty-string-with-jquery-out-of-the-box
function isEmpty(value: string | undefined | null): boolean {
  return (
    (typeof value == "string" && !value.trim()) ||
    typeof value == "undefined" ||
    value === null
  );
}

function getBoolean(value: string | undefined | null): boolean {
  if (typeof value !== "string") {
    return false;
  }

  value = value.toLowerCase().trim();
  switch (value) {
    case "true":
    case "1":
    case "on":
    case "yes":
      return true;
    default:
      return false;
  }
}

function getPwsh(): string {
  return "powershell.exe";
}

function getLocalScriptPath(fileName: string): string {
  return path.join(__dirname, fileName);
}

if (require.main === module) {
  main().catch((error) => {
    const message = error instanceof Error ? error.message : String(error);
    setResult(TaskResult.Failed, message);
    process.exitCode = 1;
  });
}