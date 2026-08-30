import { spawn } from "node:child_process";
import { cp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repository = process.env.GITHUB_REPOSITORY || "yxthu27/gui_ke_wan_xiang";
const [owner = "", repositoryName = "gui_ke_wan_xiang"] = repository.split("/");
const isUserSite = repositoryName.toLowerCase() === `${owner.toLowerCase()}.github.io`;
const basePath = (process.env.GITHUB_PAGES_BASE_PATH ?? (isUserSite ? "" : `/${repositoryName}`)).replace(/\/$/, "");
const vinextCli = path.join(projectRoot, "node_modules", "vinext", "dist", "cli.js");

const buildEnvironment = {
  ...process.env,
  GITHUB_PAGES: "true",
  NEXT_PUBLIC_BASE_PATH: basePath,
  NEXT_PUBLIC_STATIC_EXPORT: "true",
  WRANGLER_WRITE_LOGS: "false",
  WRANGLER_LOG_PATH: ".wrangler/logs",
  MINIFLARE_REGISTRY_PATH: ".wrangler/registry",
};

if (process.env.NEXT_PUBLIC_QIJING_API_BASE_URL && !/^https:\/\//i.test(process.env.NEXT_PUBLIC_QIJING_API_BASE_URL)) {
  throw new Error("QIJING_API_BASE_URL must use HTTPS for GitHub Pages deployments.");
}

await new Promise((resolve, reject) => {
  const child = spawn(process.execPath, [vinextCli, "build"], {
    cwd: projectRoot,
    env: buildEnvironment,
    stdio: "inherit",
  });
  child.on("error", reject);
  child.on("exit", code => {
    // vinext 0.0.50 can hit a libuv shutdown assertion on Windows after a
    // successful prerender. Linux (the deployment environment) exits cleanly.
    const knownWindowsShutdownCode = process.platform === "win32" && code === 3221226505;
    if (code === 0 || knownWindowsShutdownCode) resolve();
    else reject(new Error(`GitHub Pages build failed with exit code ${code ?? 1}`));
  });
});

const outputDirectory = path.join(projectRoot, "dist", "client");
const indexPath = path.join(outputDirectory, "index.html");

async function rewriteCssAssetPaths(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const filePath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      await rewriteCssAssetPaths(filePath);
      continue;
    }
    if (!entry.name.endsWith(".css")) continue;
    const css = await readFile(filePath, "utf8");
    const rewritten = css
      .replaceAll("url('/assets/", `url('${basePath}/assets/`)
      .replaceAll('url("/assets/', `url("${basePath}/assets/`)
      .replaceAll("url(/assets/", `url(${basePath}/assets/`);
    if (rewritten !== css) await writeFile(filePath, rewritten);
  }
}

async function rewriteStaticReferences(directory) {
  const rootReferences = ["/assets/", "/legacy/", "/tabbar-icons/", "/favicon.svg"];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const filePath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      await rewriteStaticReferences(filePath);
      continue;
    }
    if (!entry.name.endsWith(".html") && !entry.name.endsWith(".rsc")) continue;
    const source = await readFile(filePath, "utf8");
    const rewritten = rootReferences.reduce((content, reference) => content
      .replaceAll(`"${reference}`, `"${basePath}${reference}`)
      .replaceAll(`'${reference}`, `'${basePath}${reference}`), source);
    if (rewritten !== source) await writeFile(filePath, rewritten);
  }
}

await rewriteCssAssetPaths(outputDirectory);
await rewriteStaticReferences(outputDirectory);
const indexHtml = await readFile(indexPath, "utf8");
await writeFile(path.join(outputDirectory, ".nojekyll"), "");
await writeFile(path.join(outputDirectory, "404.html"), indexHtml);

async function collectFiles(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const filePath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await collectFiles(filePath));
    else files.push(filePath);
  }
  return files;
}

const requiredFiles = [
  "index.html",
  "spec/index.html",
  ".nojekyll",
  "404.html",
  "legacy/tab2/index.html",
  "legacy/tab34/index-guike-personal.html",
];
for (const requiredFile of requiredFiles) {
  await readFile(path.join(outputDirectory, requiredFile));
}

const rootReferencePattern = /(?:["']\/(?:assets|legacy|tabbar-icons)\/|url\(["']?\/assets\/|["']\/favicon\.svg)/g;
for (const filePath of await collectFiles(outputDirectory)) {
  if (!/\.(?:html|css|rsc|js)$/.test(filePath)) continue;
  const content = await readFile(filePath, "utf8");
  if (rootReferencePattern.test(content)) {
    throw new Error(`Root-relative asset reference remains in ${path.relative(outputDirectory, filePath)}`);
  }
  rootReferencePattern.lastIndex = 0;
  if (content.includes("STEPFUN_API_KEY")) {
    throw new Error(`Server secret name leaked into ${path.relative(outputDirectory, filePath)}`);
  }
}

// Keep a conventional folder name for local inspection without changing the
// artifact directory expected by the GitHub Pages workflow.
const previewDirectory = path.join(projectRoot, "dist", "github-pages");
await rm(previewDirectory, { recursive: true, force: true });
await mkdir(previewDirectory, { recursive: true });
await cp(outputDirectory, previewDirectory, { recursive: true, force: true });

console.log(`GitHub Pages artifact: dist/client (base path: ${basePath || "/"})`);
