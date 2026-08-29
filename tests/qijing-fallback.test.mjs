import assert from "node:assert/strict";
import test, { after } from "node:test";
import { fileURLToPath } from "node:url";

import { createServer } from "vite";

const root = fileURLToPath(new URL("..", import.meta.url));
const previousKey = process.env.STEPFUN_API_KEY;
process.env.STEPFUN_API_KEY = "";

const vite = await createServer({
  appType: "custom",
  configFile: false,
  root,
  server: { middlewareMode: true, hmr: false },
});

after(async () => {
  await vite.close();
  if (previousKey === undefined) delete process.env.STEPFUN_API_KEY;
  else process.env.STEPFUN_API_KEY = previousKey;
});

test("builds a complete multi-day fallback plan when AI is unavailable", async () => {
  const { generatePlan } = await vite.ssrLoadModule("/app/lib/qijing-ai.server.ts");
  const plan = await generatePlan({
    wishes: ["山水大景", "贵州寻味"],
    wishesTouched: true,
    days: "4 天",
    arrival: "贵阳机场",
    departure: "贵阳北站",
    pace: "刚刚好",
    travelModes: ["高铁 + 打车"],
    changeHotel: false,
    maxTransfer: 60,
    interests: ["非遗手作"],
    boundaries: ["带长辈"],
    note: "",
  });

  assert.equal(plan.generatedBy, "fallback");
  assert.equal(plan.days.length, 4);
  assert.equal(plan.days[1].theme, "把一整天留给山水大景");
  assert.match(plan.days[3].items.at(-1).title, /贵阳北站/);
});
