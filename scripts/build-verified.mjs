import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

if (process.platform !== "win32") {
  const child = spawn("bash", ["scripts/build-verified.sh"], {
    cwd: projectRoot,
    env: process.env,
    stdio: "inherit",
  });
  child.on("exit", code => process.exit(code ?? 1));
} else {
  const viteCli = path.join(projectRoot, "node_modules", "vite", "bin", "vite.js");
  if (!existsSync(viteCli)) {
    console.error("Vite is unavailable. Run npm install before building.");
    process.exit(69);
  }
  const child = spawn(process.execPath, [viteCli, "build"], {
    cwd: projectRoot,
    env: {
      ...process.env,
      WRANGLER_WRITE_LOGS: "false",
      WRANGLER_LOG_PATH: ".wrangler/logs",
      MINIFLARE_REGISTRY_PATH: ".wrangler/registry",
    },
    stdio: "inherit",
  });
  const timeout = setTimeout(() => {
    console.error("Build exceeded the 3 minute limit.");
    child.kill("SIGTERM");
  }, 180_000);
  child.on("exit", code => {
    clearTimeout(timeout);
    process.exit(code ?? 1);
  });
}
