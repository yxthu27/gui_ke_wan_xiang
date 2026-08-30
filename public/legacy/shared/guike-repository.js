(function (root, factory) {
  const repository = factory(root);
  if (typeof module === "object" && module.exports) module.exports = repository;
  root.GuikeRepository = repository;
})(typeof globalThis !== "undefined" ? globalThis : this, function (root) {
  "use strict";

  const STORAGE_KEY = "guike-state-v3";
  const EVENT_NAME = "guike:data-changed";
  const LEGACY = {
    plan: "guike-main-plan-v1",
    favorites: "guike-favorite-places-v1",
    savedJourneys: "guike-saved-journeys-v1",
    strollExtraPois: "guikesong-today-extra-pois"
  };

  function clone(value) {
    return value == null ? value : JSON.parse(JSON.stringify(value));
  }

  function array(value) { return Array.isArray(value) ? value : []; }

  function readJson(storage, key, fallback) {
    try {
      const value = JSON.parse(storage.getItem(key) || "null");
      return value == null ? fallback : value;
    } catch (_error) { return fallback; }
  }

  function defaultState() {
    return {
      schemaVersion: 3,
      revision: 0,
      updatedAt: new Date(0).toISOString(),
      lastSection: "all",
      draft: null,
      activePlan: null,
      favoritePlaces: [],
      savedJourneys: [],
      wanxiangItems: [],
      publishedJourneys: [],
      initialized: { wanxiang: false },
      stroll: { extraPois: [], visitedPoiIds: [] }
    };
  }

  function normalize(raw) {
    const next = Object.assign(defaultState(), raw && typeof raw === "object" ? raw : {});
    next.schemaVersion = 3;
    next.revision = Number(next.revision) || 0;
    next.favoritePlaces = array(next.favoritePlaces);
    next.savedJourneys = array(next.savedJourneys);
    next.wanxiangItems = array(next.wanxiangItems);
    next.publishedJourneys = array(next.publishedJourneys);
    next.initialized = Object.assign({ wanxiang: false }, next.initialized || {});
    next.stroll = Object.assign({ extraPois: [], visitedPoiIds: [] }, next.stroll || {});
    next.stroll.extraPois = array(next.stroll.extraPois);
    next.stroll.visitedPoiIds = array(next.stroll.visitedPoiIds);
    return next;
  }

  function storageOf(storage) {
    if (storage) return storage;
    try { return root.localStorage; } catch (_error) { return null; }
  }

  function migrate(storage) {
    const next = defaultState();
    next.activePlan = readJson(storage, LEGACY.plan, null);
    next.favoritePlaces = array(readJson(storage, LEGACY.favorites, []));
    next.savedJourneys = array(readJson(storage, LEGACY.savedJourneys, []));
    next.stroll.extraPois = array(readJson(storage, LEGACY.strollExtraPois, []));
    return next;
  }

  function read(storage) {
    const target = storageOf(storage);
    if (!target) return defaultState();
    const stored = readJson(target, STORAGE_KEY, null);
    if (stored) return normalize(stored);
    const migrated = migrate(target);
    try { target.setItem(STORAGE_KEY, JSON.stringify(migrated)); } catch (_error) { /* read-only fallback */ }
    return migrated;
  }

  function mirrorLegacy(storage, state, section) {
    const pairs = [
      ["plan", LEGACY.plan, state.activePlan],
      ["favorites", LEGACY.favorites, state.favoritePlaces],
      ["savedJourneys", LEGACY.savedJourneys, state.savedJourneys],
      ["stroll", LEGACY.strollExtraPois, state.stroll.extraPois]
    ];
    pairs.forEach(([domain, key, value]) => {
      if (section !== "all" && section !== domain) return;
      if (value == null) storage.removeItem(key);
      else storage.setItem(key, JSON.stringify(value));
    });
  }

  function emit(section, state) {
    if (!root.dispatchEvent || typeof root.CustomEvent !== "function") return;
    root.dispatchEvent(new root.CustomEvent(EVENT_NAME, { detail: { section, state: clone(state) } }));
  }

  function write(next, section, storage) {
    const target = storageOf(storage);
    const normalized = normalize(next);
    normalized.revision += 1;
    normalized.updatedAt = new Date().toISOString();
    normalized.lastSection = section || "all";
    if (!target) return normalized;
    target.setItem(STORAGE_KEY, JSON.stringify(normalized));
    mirrorLegacy(target, normalized, section || "all");
    emit(section || "all", normalized);
    return clone(normalized);
  }

  function sameData(left, right) {
    const clean = value => {
      const next = normalize(clone(value));
      delete next.revision;
      delete next.updatedAt;
      delete next.lastSection;
      return next;
    };
    return JSON.stringify(clean(left)) === JSON.stringify(clean(right));
  }

  function update(section, updater, storage) {
    const current = read(storage);
    const next = typeof updater === "function" ? updater(clone(current)) : Object.assign(current, updater || {});
    if (sameData(current, next || current)) return clone(current);
    return write(next || current, section, storage);
  }

  function upsert(list, entry) {
    const next = array(list).filter(item => item && item.id !== entry.id);
    next.unshift(clone(entry));
    return next;
  }

  function savePlan(plan, storage) { return update("plan", state => { state.activePlan = clone(plan); return state; }, storage); }
  function addPlaceToActivePlan(place, targetDate, storage) {
    return update("plan", state => {
      const today = targetDate || new Date().toISOString().slice(0, 10);
      const plan = state.activePlan || { version: 3, days: [] };
      plan.days = array(plan.days);
      let dayIndex = plan.days.findIndex(day => day.date === today);
      if (dayIndex < 0) dayIndex = 0;
      if (!plan.days[dayIndex]) plan.days.push({ id: `day-${today}`, date: today, city: "贵州", title: "随逛加入的行程", source: "stroll", places: [] });
      const day = plan.days[Math.max(0, dayIndex)];
      day.places = array(day.places);
      const normalized = {
        id: place.id || `place-${Date.now()}`,
        name: place.name || place.title || "待确认地点",
        time: place.time || "待定",
        description: place.description || "从随逛加入主规划。",
        lat: place.lat,
        lng: place.lng,
        source: place.source || "stroll"
      };
      if (!day.places.some(item => item.id === normalized.id || item.name === normalized.name)) day.places.push(normalized);
      if (plan.qijingPlan?.days?.[dayIndex]) {
        const qijingDay = plan.qijingPlan.days[dayIndex];
        qijingDay.items = array(qijingDay.items);
        if (!qijingDay.items.some(item => item.id === normalized.id || item.location === normalized.name || item.title === normalized.name)) {
          qijingDay.items.push({ id: normalized.id, time: normalized.time, title: normalized.name, location: normalized.name, description: normalized.description, durationMinutes: 60 });
        }
      }
      state.activePlan = plan;
      return state;
    }, storage);
  }
  function saveDraft(draft, storage) { return update("draft", state => { state.draft = clone(draft); return state; }, storage); }
  function setFavoritePlaces(items, storage) { return update("favorites", state => { state.favoritePlaces = array(items); return state; }, storage); }
  function upsertFavorite(place, storage) { return update("favorites", state => { state.favoritePlaces = upsert(state.favoritePlaces, place); return state; }, storage); }
  function removeFavorite(id, storage) { return update("favorites", state => { state.favoritePlaces = state.favoritePlaces.filter(item => item.id !== id); return state; }, storage); }
  function setSavedJourneys(items, storage) { return update("savedJourneys", state => { state.savedJourneys = array(items); return state; }, storage); }
  function upsertSavedJourney(item, storage) { return update("savedJourneys", state => { state.savedJourneys = upsert(state.savedJourneys, item); return state; }, storage); }
  function removeSavedJourney(id, storage) { return update("savedJourneys", state => { state.savedJourneys = state.savedJourneys.filter(item => item.id !== id); return state; }, storage); }
  function setWanxiangItems(items, storage) { return update("wanxiang", state => { state.wanxiangItems = array(items); state.initialized.wanxiang = true; return state; }, storage); }
  function setPublishedJourneys(items, storage) { return update("publishedJourneys", state => { state.publishedJourneys = array(items); return state; }, storage); }
  function upsertPublishedJourney(item, storage) { return update("publishedJourneys", state => { state.publishedJourneys = upsert(state.publishedJourneys, item); return state; }, storage); }
  function setStroll(stroll, storage) { return update("stroll", state => { state.stroll = Object.assign(state.stroll, clone(stroll || {})); return state; }, storage); }

  function subscribe(handler) {
    if (!root.addEventListener) return function () {};
    const local = event => handler(event.detail?.state || read(), event.detail?.section || "all");
    const external = event => {
      if (event.key !== STORAGE_KEY) return;
      const state = read();
      handler(state, state.lastSection || "all");
    };
    root.addEventListener(EVENT_NAME, local);
    root.addEventListener("storage", external);
    return function () {
      root.removeEventListener(EVENT_NAME, local);
      root.removeEventListener("storage", external);
    };
  }

  return {
    STORAGE_KEY, EVENT_NAME, LEGACY, defaultState, normalize, read, write, update, subscribe,
    savePlan, addPlaceToActivePlan, saveDraft, setFavoritePlaces, upsertFavorite, removeFavorite,
    setSavedJourneys, upsertSavedJourney, removeSavedJourney,
    setWanxiangItems, setPublishedJourneys, upsertPublishedJourney, setStroll
  };
});
