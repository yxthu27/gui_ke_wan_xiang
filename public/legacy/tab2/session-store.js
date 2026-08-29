(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }
  root.GuikeSessionStore = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const STORAGE_KEY = "guikesong-session";
  const PERSONAS = ["yunshang", "huotang", "benliu", "ganchang"];
  const PACES = ["slow", "balanced", "full"];

  function requireObject(value, name) {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      throw new Error(`画像缺少对象 ${name}`);
    }
    return value;
  }

  function requireArray(value, name) {
    if (!Array.isArray(value)) throw new Error(`画像缺少数组 ${name}`);
    return value;
  }

  function validate(session) {
    requireObject(session, "session");
    if (session.schemaVersion !== 2) throw new Error(`画像版本无法识别：${session.schemaVersion}`);
    if (typeof session.planned !== "boolean") throw new Error("画像缺少 planned");
    const answers = requireObject(session.answers, "answers");
    requireArray(answers.wishes, "wishes");
    requireObject(answers.trip, "trip");
    if (!PACES.includes(answers.pace)) throw new Error(`未知步速 ${answers.pace}`);
    requireObject(answers.mobility, "mobility");
    requireArray(answers.interests, "interests");
    const boundaries = requireObject(answers.boundaries, "boundaries");
    requireArray(boundaries.dietary, "dietary");
    requireArray(boundaries.companions, "companions");
    requireArray(boundaries.experience, "experience");
    requireArray(boundaries.itinerary, "itinerary");
    requireObject(boundaries.custom, "custom");
    const derived = requireObject(session.derived, "derived");
    if (!PERSONAS.includes(derived.persona)) throw new Error(`未知人格 ${derived.persona}`);
    const itinerary = requireObject(session.itinerary, "itinerary");
    requireArray(itinerary.todayPoiIds, "todayPoiIds");
    requireArray(itinerary.visitedPoiIds, "visitedPoiIds");
    const context = requireObject(session.context, "context");
    requireObject(context.demoLocation, "demoLocation");
    if (!context.demoDate) throw new Error("画像缺少 demoDate");
    return session;
  }

  function clone(session) {
    return JSON.parse(JSON.stringify(validate(session)));
  }

  function readLocal(storage) {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return validate(JSON.parse(raw));
  }

  function writeLocal(storage, session) {
    storage.setItem(STORAGE_KEY, JSON.stringify(validate(session)));
    return session;
  }

  function withKids(session) {
    return validate(session).answers.boundaries.companions.includes("withKids");
  }

  function visitedPoiIds(session) {
    return validate(session).itinerary.visitedPoiIds.slice();
  }

  function markVisited(session, poiId, storage) {
    if (!poiId) throw new Error("缺少点位 id");
    const next = clone(session);
    if (!next.itinerary.visitedPoiIds.includes(poiId)) {
      next.itinerary.visitedPoiIds.push(poiId);
    }
    writeLocal(storage, next);
    return next;
  }

  async function load(fetchJson, storage) {
    const cached = readLocal(storage);
    if (cached) return cached;
    const file = validate(await fetchJson("session.json"));
    writeLocal(storage, file);
    return file;
  }

  return {
    STORAGE_KEY,
    validate,
    clone,
    readLocal,
    writeLocal,
    withKids,
    visitedPoiIds,
    markVisited,
    load,
  };
});
