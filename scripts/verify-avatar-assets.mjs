import { readdir } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const roots = ["public", "dist"].map(name => path.join(projectRoot, name));

async function findVrm(directory) {
  try {
    const found = [];
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const target = path.join(directory, entry.name);
      if (entry.isDirectory()) found.push(...await findVrm(target));
      else if (/\.vrm$/i.test(entry.name)) found.push(path.relative(projectRoot, target));
    }
    return found;
  } catch (error) {
    if (error?.code === "ENOENT") return [];
    throw error;
  }
}

const forbidden = (await Promise.all(roots.map(findVrm))).flat();
if (forbidden.length) {
  console.error(`未通过数字人资产授权门禁：公开目录中发现 ${forbidden.join(", ")}`);
  process.exit(1);
}
console.log("Avatar asset policy: poster-only mode, no public VRM assets.");
