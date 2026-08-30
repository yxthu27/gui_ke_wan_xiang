import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const root = fileURLToPath(new URL("..", import.meta.url));
const source = await readFile(new URL("../public/legacy/shared/guike-repository.js", import.meta.url), "utf8");

class MemoryStorage {
  values = new Map();
  getItem(key) { return this.values.has(key) ? this.values.get(key) : null; }
  setItem(key, value) { this.values.set(key, String(value)); }
  removeItem(key) { this.values.delete(key); }
}

function createRepository(seed = {}) {
  const localStorage = new MemoryStorage();
  Object.entries(seed).forEach(([key, value]) => localStorage.setItem(key, JSON.stringify(value)));
  const listeners = new Map();
  class CustomEvent {
    constructor(type, init) { this.type = type; this.detail = init?.detail; }
  }
  const context = {
    localStorage,
    CustomEvent,
    addEventListener(type, handler) { listeners.set(type, [...(listeners.get(type) || []), handler]); },
    removeEventListener(type, handler) { listeners.set(type, (listeners.get(type) || []).filter(item => item !== handler)); },
    dispatchEvent(event) { (listeners.get(event.type) || []).forEach(handler => handler(event)); },
  };
  vm.runInNewContext(source, context, { filename: "guike-repository.js" });
  return { repository: context.GuikeRepository, localStorage };
}

test("migrates legacy page stores into one versioned state", () => {
  const plan = { days: [{ id: "day-1", places: [{ name: "青云市集" }] }] };
  const favorite = { id: "stroll-market", name: "青云市集" };
  const { repository } = createRepository({
    "guike-main-plan-v1": plan,
    "guike-favorite-places-v1": [favorite],
  });
  const state = repository.read();
  assert.equal(state.schemaVersion, 3);
  assert.equal(state.activePlan.days[0].places[0].name, "青云市集");
  assert.equal(state.favoritePlaces[0].id, "stroll-market");
});

test("keeps plan, collections, publishing and stroll state in one repository", () => {
  const { repository, localStorage } = createRepository();
  repository.savePlan({ days: [{ id: "day-1", places: [] }] });
  repository.upsertFavorite({ id: "place-1", name: "省博" });
  repository.upsertSavedJourney({ id: "saved-1", author: "阿木" });
  repository.setWanxiangItems([{ id: "wx-1", customName: "一片山风" }]);
  repository.upsertPublishedJourney({ id: "pub-1", title: "今日贵客帖" });
  repository.setStroll({ extraPois: [{ id: "poi-1" }], visitedPoiIds: ["poi-2"] });
  repository.addPlaceToActivePlan({ id: "poi-1", name: "青云市集" });

  const state = repository.read();
  assert.equal(state.activePlan.days[0].id, "day-1");
  assert.equal(state.activePlan.days[0].places[0].name, "青云市集");
  assert.equal(state.favoritePlaces[0].name, "省博");
  assert.equal(state.savedJourneys[0].author, "阿木");
  assert.equal(state.initialized.wanxiang, true);
  assert.equal(state.wanxiangItems[0].customName, "一片山风");
  assert.equal(state.publishedJourneys[0].id, "pub-1");
  assert.deepEqual(Array.from(state.stroll.visitedPoiIds), ["poi-2"]);
  assert.equal(JSON.parse(localStorage.getItem("guike-main-plan-v1")).days[0].id, "day-1");

  repository.removeFavorite("place-1");
  repository.removeSavedJourney("saved-1");
  assert.equal(repository.read().favoritePlaces.length, 0);
  assert.equal(repository.read().savedJourneys.length, 0);
});

test("does not emit or revise state for an unchanged write", () => {
  const { repository } = createRepository();
  const draft = { wishes: ["山水大景"], days: "4 天" };
  const first = repository.saveDraft(draft);
  const second = repository.saveDraft(draft);
  assert.equal(second.revision, first.revision);
  assert.equal(second.updatedAt, first.updatedAt);
});

test("all four product surfaces load the shared repository", async () => {
  const files = await Promise.all([
    readFile(`${root}/app/qijing-client.tsx`, "utf8"),
    readFile(`${root}/public/legacy/tab2/stroll.js`, "utf8"),
    readFile(`${root}/public/legacy/tab34/personal-tab/personal-tab.js`, "utf8"),
    readFile(`${root}/public/legacy/tab34/plaza-tab/plaza-tab.js`, "utf8"),
  ]);
  files.forEach(content => assert.match(content, /GuikeRepository|getGuikeRepository/));
});
