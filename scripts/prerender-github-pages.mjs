import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const workerUrl = new URL("../dist/server/index.js", import.meta.url);
workerUrl.searchParams.set("prerender", `${process.pid}-${Date.now()}`);

const { default: worker } = await import(workerUrl.href);

async function render(pathname) {
  let current = pathname;
  for (let hop = 0; hop < 5; hop += 1) {
    const response = await worker.fetch(
      new Request(`http://localhost${current}`, {
        headers: { accept: "text/html" },
        redirect: "manual",
      }),
      {
        ASSETS: {
          fetch: async () => new Response("Not found", { status: 404 }),
        },
      },
      {
        waitUntil() {},
        passThroughOnException() {},
      },
    );

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location) {
        throw new Error(`预渲染 ${current} 返回 ${response.status} 但没有 Location`);
      }
      current = new URL(location, `http://localhost${current}`).pathname;
      continue;
    }

    if (!response.ok) {
      throw new Error(`预渲染失败 ${current}：HTTP ${response.status}`);
    }

    const html = await response.text();
    if (!html.includes("<html")) {
      throw new Error(`预渲染 ${current} 没有返回 HTML`);
    }
    return html;
  }
  throw new Error(`预渲染 ${pathname} 重定向次数过多`);
}

const html = await render("/");
const outFile = path.join(projectRoot, "dist/client/index.html");
await writeFile(outFile, html);
console.log(`已写入 ${outFile}，长度 ${html.length}`);
