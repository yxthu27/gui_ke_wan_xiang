import assert from "node:assert/strict";
import test, { after } from "node:test";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";

const root = fileURLToPath(new URL("..", import.meta.url));
const vite = await createServer({ appType: "custom", configFile: false, root, server: { middlewareMode: true, hmr: false } });
after(() => vite.close());

test("keeps avatar state transitions deterministic without loading a VRM", async () => {
  const { nextAvatarState } = await vite.ssrLoadModule("/app/components/avatar/avatar-state-machine.ts");
  assert.equal(nextAvatarState("loading", "READY"), "idle");
  assert.equal(nextAvatarState("idle", "LISTEN"), "listening");
  assert.equal(nextAvatarState("listening", "THINK"), "thinking");
  assert.equal(nextAvatarState("thinking", "SPEAK"), "speaking");
  assert.equal(nextAvatarState("speaking", "FAIL"), "error");
  assert.equal(nextAvatarState("idle", "DISABLE"), "disabled");
});
