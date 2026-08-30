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

const baseDraft = {
  wishes: ["山水大景", "贵州寻味"], wishesTouched: true, days: "4 天",
  arrival: "贵阳机场", departure: "贵阳北站", pace: "刚刚好",
  travelModes: ["公共交通"], changeHotel: false, maxTransfer: 60,
  interests: ["地方小吃"], boundaries: ["带长辈"], note: "", supplements: [],
};

test("places departure exactly once on the final day for every supported duration", async () => {
  const { createFallbackPlan } = await vite.ssrLoadModule("/app/lib/qijing-planner.ts");
  for (let count = 1; count <= 7; count += 1) {
    const plan = createFallbackPlan({ ...baseDraft, days: `${count} 天` });
    const departures = plan.days.flatMap(day => day.items.filter(item => item.location === baseDraft.departure).map(item => day.day));
    assert.equal(plan.days.length, count);
    assert.deepEqual(departures, [count]);
    assert.equal(plan.days.at(-1).items.at(-1).location, baseDraft.departure);
  }
});

test("keeps supplement text and merges locally understood boundaries", async () => {
  const { applySupplement } = await vite.ssrLoadModule("/app/lib/qijing-planner.ts");
  const next = applySupplement(baseDraft, "wish", "我不想赶早，也想看看瀑布");
  assert.equal(next.note, "");
  assert.equal(next.supplements.at(-1).text, "我不想赶早，也想看看瀑布");
  assert.ok(next.boundaries.includes("带长辈"));
  assert.ok(next.boundaries.includes("不赶早"));
  assert.ok(next.wishes.includes("山水大景"));
});

test("does not invent map stops and applies supported local removal", async () => {
  const { createFallbackPlan, refineFallbackPlan, routeStops } = await vite.ssrLoadModule("/app/lib/qijing-planner.ts");
  const draft = { ...baseDraft, wishes: ["山水大景"] };
  const plan = createFallbackPlan(draft);
  const before = routeStops(plan.days[0]);
  assert.equal(before.length, plan.days[0].items.length);
  const refined = refineFallbackPlan(plan, draft, "删除第一天的青云市集");
  assert.equal(refined.appliedChanges.length, 1);
  assert.ok(!refined.plan.days[0].items.some(item => item.location === "青云市集"));
});

test("only marks locations that actually represent a selected wish", async () => {
  const { createFallbackPlan } = await vite.ssrLoadModule("/app/lib/qijing-planner.ts");
  const plan = createFallbackPlan({ ...baseDraft, wishes: ["山水大景"] });
  const waterfall = plan.days.flatMap(day => day.items).find(item => item.location === "黄果树瀑布");
  const village = plan.days.flatMap(day => day.items).find(item => item.location === "黔东南村寨");
  assert.deepEqual(waterfall.wishRefs, ["山水大景"]);
  assert.equal(village?.lockedWish, false);
});
