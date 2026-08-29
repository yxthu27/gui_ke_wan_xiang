import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

test("keeps the StepFun API key on the server and falls back locally", async () => {
  const [route, server, client] = await Promise.all([
    readFile(new URL("app/api/qijing/cutout/route.ts", root), "utf8"),
    readFile(new URL("app/lib/qijing-cutout.server.ts", root), "utf8"),
    readFile(new URL("public/legacy/tab34/shared/background-removal-client.js", root), "utf8"),
  ]);

  assert.match(route, /createStepFunCutoutPlate/);
  assert.match(server, /process\.env\.STEPFUN_API_KEY/);
  assert.match(server, /\/images\/edits/);
  assert.doesNotMatch(client, /STEPFUN_API_KEY/);
  assert.match(client, /\/api\/qijing\/cutout/);
  assert.match(client, /removeBackgroundLocal/);
});

test("derives alpha from an edge-connected chroma field and preserves original RGB", async () => {
  const client = await readFile(new URL("public/legacy/tab34/shared/background-removal-client.js", root), "utf8");
  assert.match(client, /const background = new Uint8Array/);
  assert.match(client, /context\.drawImage\(original/);
  assert.match(client, /outputImage\.data\[offset \+ 3\]/);
});
