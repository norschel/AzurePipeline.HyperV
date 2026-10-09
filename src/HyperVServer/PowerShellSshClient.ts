import path from "path";
import { Client, ClientChannel, ConnectConfig, SFTPWrapper } from "ssh2";

var _disconnected = false;

export class PowerShellSSHClient {
  private readonly client: Client;

  constructor(private readonly config: ConnectConfig, private readonly pwsh: string = "pwsh") {
    this.client = new Client();
  }

  async executeScript(scriptPath: string, scriptArguments: string[]): Promise<string> {
    console.log("### SSH Tunnel - Executing script:" + scriptPath);
    const conn = await this.connect();

    console.log("### SSH Tunnel - Retrieving remote temp folder");
    var remoteTempFolder = await this.sendCommand(`${this.pwsh} -NoProfile -Command "[System.IO.Path]::GetTempPath()"`, conn);
    remoteTempFolder = remoteTempFolder.trim();
    console.log("### SSH Tunnel - Remote temp folder: " + remoteTempFolder);

    var remoteScriptPath = String.prototype.concat(remoteTempFolder, '\\HyperVServer.ps1');
    console.log("### SSH Tunnel - Remote script path: " + remoteScriptPath);
    await this.uploadFile(conn, scriptPath, remoteScriptPath);

    // we need to upload the logging lib into ps folder because of relative paths which are different in PS-Mode
    var remoteLogScriptPath = String.prototype.concat(remoteTempFolder, '\\Logging.ps1');
    console.log("### SSH Tunnel - Remote script path: " + remoteLogScriptPath);

    // figure out the logging lib path based on the script path
    var logScriptPath = path.join(path.dirname(scriptPath), "Logging.ps1");
    await this.uploadFile(conn, logScriptPath, remoteLogScriptPath);

    var result = await this.sendCommand(this.createPowerShellCommand(remoteScriptPath, scriptArguments), conn);
    result = result.trim();
    //console.log("### SSH Tunnel - Script result: ");
    //console.log(result);
    await this.disconnect(conn);
    console.log("### SSH Tunnel - Script executed");
    return result;
  }

  private async connect(): Promise<Client> {
    return new Promise((resolve, reject) => {
      this.client
        .on('ready', () => {
          console.log("### SSH Tunnel - Connection ready");
          resolve(this.client);
        })
        .on('error', (err: Error) => {
          if (!_disconnected) {
            console.log("### SSH Tunnel - Connection error");
            console.log(err);
            reject(err);
          }
        })
        /*.on('keyboard-interactive', function (this: any, name, descr, lang, prompts, finish) {
        console.log("### SSH Tunnel - Warning: KEYBOARD INTERACTIVE is used. It's not secure.");
        var password = this.config.password;
        return finish([password])
        })*/
        .connect(this.config);
      _disconnected = false;
      console.log("### SSH Tunnel - Connected");
    });
  }

  async uploadFile(conn: Client, localPath: string, remotePath: string): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      conn.sftp((err: Error | undefined, sftp: SFTPWrapper) => {
        console.log("### SSH Tunnel - Initiating SFTP connection");
        if (err) {
          console.log("### SSH Tunnel - SFTP connection error");
          reject(err);
          return;
        }
        console.log("### SSH Tunnel - SFTP connection established");

        console.log("### SSH Tunnel - Uploading file " + localPath + " to " + remotePath);
        sftp.fastPut(localPath, remotePath, {}, (err: Error | null | undefined) => {
          if (err) {
            console.log("### SSH Tunnel - File upload error");
            reject(err);
            return;
          }
          console.log("### SSH Tunnel - File uploaded");
          resolve();
        });
      });
    }
    );
  }

  private async sendCommand(command: string, conn: Client): Promise<string> {
    return new Promise((resolve, reject) => {
      console.log("### SSH Tunnel - Trying to execute command: " + command);
      conn.exec(command, (err: Error | undefined, stream: ClientChannel) => {
        if (err) {
          console.log("### SSH Tunnel - Command error");
          void this.disconnect(conn);
          reject(err);
          return;
        }
        console.log("### SSH Tunnel - Command executing");
        var result = '';
        stream
          .on('close', (code: number | undefined, signal: string | undefined) => {
            console.log("### SSH Tunnel - Command executed");
            if (code != undefined && code !== 0) {
              console.log("### SSH Tunnel - Error executing command via PowerShell. Exit code: " + code + " Signal: " + signal);
              reject(new Error("Error executing command via PowerShell. Exit code:" + code + " Signal:" + signal));
              return;
            }
            console.log("### SSH Tunnel - Successfull executed script via PowerShell. Exit code:" + code + " signal:" + signal);
            resolve(result);
          })
          .on('data', (data: Buffer | string) => {
            const text = data.toString();
            result += text;
            console.log(text.trimEnd());
          })
          .stderr.on('data', (data: Buffer | string) => {
            console.log('(SSH-Error) ' + data.toString().trim());
            //reject(data.toString().trim());
          });
      });
    });
  }

  private async disconnect(conn: Client): Promise<void> {
    return new Promise((resolve) => {
      console.log("### SSH Tunnel - Disconnecting");
      conn.once("close", () => resolve());
      conn.end();
      _disconnected = true;
    });
  }

  private createPowerShellCommand(scriptPath: string, scriptArguments: string[]): string {
    const commandParts = [this.pwsh, "-File", this.quotePowerShellArgument(scriptPath)];
    for (const argument of scriptArguments) {
      commandParts.push(argument.startsWith("-") ? argument : this.quotePowerShellArgument(argument));
    }

    return commandParts.join(" ");
  }

  private quotePowerShellArgument(value: string): string {
    return `'${value.replace(/'/g, "''")}'`;
  }
}