import assert from "node:assert/strict";
import test, { after } from "node:test";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";

const root = fileURLToPath(new URL("..", import.meta.url));
const vite = await createServer({ appType: "custom", configFile: false, root, server: { middlewareMode: true, hmr: false } });
after(() => vite.close());

test("merges Chinese speech transcripts without losing typed text", async () => {
  const { mergeSpeechTranscript } = await vite.ssrLoadModule("/app/lib/browser-speech.ts");
  assert.equal(mergeSpeechTranscript("", " 想去看瀑布 "), "想去看瀑布");
  assert.equal(mergeSpeechTranscript("不赶早", "少走台阶"), "不赶早，少走台阶");
  assert.equal(mergeSpeechTranscript("不赶早。", "少走台阶"), "不赶早。少走台阶");
});

test("turns microphone failures into actionable messages", async () => {
  const { speechRecognitionErrorMessage } = await vite.ssrLoadModule("/app/lib/browser-speech.ts");
  assert.match(speechRecognitionErrorMessage("not-allowed"), /麦克风权限/);
  assert.match(speechRecognitionErrorMessage("no-speech"), /没有听清/);
  assert.match(speechRecognitionErrorMessage("network"), /文字输入/);
});
