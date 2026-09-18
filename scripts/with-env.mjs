import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

function parseEnvFile(filename) {
  if (!fs.existsSync(filename)) return {};
  const env = {};
  const lines = fs.readFileSync(filename, "utf8").split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const index = trimmed.indexOf("=");
    if (index <= 0) continue;

    const key = trimmed.slice(0, index).trim();
    let value = trimmed.slice(index + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }

  return env;
}

const command = process.argv.slice(2);
if (!command.length) {
  console.error("Usage: node scripts/with-env.mjs <command> [...args]");
  process.exit(1);
}

const root = process.cwd();
const fileEnv = {
  ...parseEnvFile(path.join(root, ".env")),
  ...parseEnvFile(path.join(root, ".env.local"))
};

const child = spawn(command[0], command.slice(1), {
  env: { ...fileEnv, ...process.env },
  shell: true,
  stdio: "inherit"
});

child.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  process.exit(code ?? 1);
});
