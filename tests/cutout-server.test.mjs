import assert from "node:assert/strict";
import { createServer as createHttpServer } from "node:http";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { createServer as createViteServer } from "vite";

const root = fileURLToPath(new URL("..", import.meta.url));
const pixelPng = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M/wHwAF/gL+Xw2ZVQAAAABJRU5ErkJggg==";

test("sends a multipart StepFun edit request and accepts a successful image", async () => {
  let receivedType = "";
  let receivedBody = "";
  const upstream = createHttpServer((request, response) => {
    receivedType = String(request.headers["content-type"] || "");
    const chunks = [];
    request.on("data", chunk => chunks.push(chunk));
    request.on("end", () => {
      receivedBody = Buffer.concat(chunks).toString("utf8");
      response.writeHead(200, { "content-type": "application/json" });
      response.end(JSON.stringify({
        data: [{ b64_json: pixelPng, finish_reason: "success", seed: 7 }],
      }));
    });
  });
  await new Promise((resolve, reject) => {
    upstream.once("error", reject);
    upstream.listen(0, "127.0.0.1", resolve);
  });
  const address = upstream.address();
  assert.ok(address && typeof address === "object");

  const previous = {
    key: process.env.STEPFUN_API_KEY,
    base: process.env.STEPFUN_IMAGE_BASE_URL,
    model: process.env.STEPFUN_IMAGE_MODEL,
  };
  process.env.STEPFUN_API_KEY = "test-key-never-sent-to-the-client";
  process.env.STEPFUN_IMAGE_BASE_URL = `http://127.0.0.1:${address.port}/v1`;
  process.env.STEPFUN_IMAGE_MODEL = "step-image-edit-2";

  const vite = await createViteServer({ appType: "custom", configFile: false, root, server: { middlewareMode: true, hmr: false } });
  try {
    const { createStepFunCutoutPlate } = await vite.ssrLoadModule("/app/lib/qijing-cutout.server.ts");
    const result = await createStepFunCutoutPlate(`data:image/png;base64,${pixelPng}`, "测试主体");
    assert.equal(result.engine, "step-image-edit-2");
    assert.equal(result.seed, 7);
    assert.equal(result.image, `data:image/png;base64,${pixelPng}`);
    assert.match(receivedType, /^multipart\/form-data; boundary=/);
    assert.match(receivedBody, /name="model"\r\n\r\nstep-image-edit-2/);
    assert.match(receivedBody, /name="image"; filename="qijing-cutout.png"/);
    assert.match(receivedBody, /#FF00FF/);
    assert.doesNotMatch(receivedBody, /test-key-never-sent-to-the-client/);
  } finally {
    await vite.close();
    await new Promise(resolve => upstream.close(resolve));
    if (previous.key === undefined) delete process.env.STEPFUN_API_KEY; else process.env.STEPFUN_API_KEY = previous.key;
    if (previous.base === undefined) delete process.env.STEPFUN_IMAGE_BASE_URL; else process.env.STEPFUN_IMAGE_BASE_URL = previous.base;
    if (previous.model === undefined) delete process.env.STEPFUN_IMAGE_MODEL; else process.env.STEPFUN_IMAGE_MODEL = previous.model;
  }
});
