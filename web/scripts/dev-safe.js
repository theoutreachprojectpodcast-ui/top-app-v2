const { spawn } = require("node:child_process");

const MAX_RETRIES = 1;
let retries = 0;

function killPid(pid) {
  return new Promise((resolve) => {
    const isWin = process.platform === "win32";
    const cmd = isWin ? "taskkill" : "kill";
    const args = isWin ? ["/PID", String(pid), "/F"] : ["-9", String(pid)];
    const child = spawn(cmd, args, { stdio: "inherit", shell: isWin });
    child.on("close", () => resolve());
    child.on("error", () => resolve());
  });
}

function runDev() {
  return new Promise((resolve) => {
    let output = "";
    const child = spawn("next", ["dev"], {
      stdio: ["inherit", "pipe", "pipe"],
      shell: true,
      env: process.env,
    });

    child.stdout.on("data", (chunk) => {
      const text = chunk.toString();
      output += text;
      process.stdout.write(text);
    });

    child.stderr.on("data", (chunk) => {
      const text = chunk.toString();
      output += text;
      process.stderr.write(text);
    });

    child.on("close", async (code) => {
      const duplicate = /Another next dev server is already running\./i.test(output);
      const pidMatch = output.match(/PID:\s+(\d+)/i);
      if (duplicate && pidMatch && retries < MAX_RETRIES) {
        retries += 1;
        const pid = Number(pidMatch[1]);
        console.log(`\nDetected duplicate dev server (PID ${pid}). Restarting cleanly...`);
        await killPid(pid);
        return resolve(runDev());
      }
      process.exit(code ?? 0);
    });
  });
}

runDev();

