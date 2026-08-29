import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const eslintCli = path.join(projectRoot, "node_modules", "eslint", "bin", "eslint.js");

if (!existsSync(eslintCli)) {
  console.error("ESLint is unavailable. Run npm install before linting.");
  process.exit(69);
}

const child = spawn(process.execPath, [eslintCli, ".", "--ignore-pattern", "dist", "--ignore-pattern", ".next"], {
  cwd: projectRoot,
  env: process.env,
  stdio: "inherit",
});
child.on("error", error => {
  console.error(error.message);
  process.exit(1);
});
child.on("exit", code => process.exit(code ?? 1));
