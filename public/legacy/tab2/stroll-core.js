(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }
  root.GuikeStrollCore = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const EARTH_M = 6371000;
  const CROWD_LABEL = { idle: "空闲", ok: "适中", busy: "拥挤" };
  const KIND_LABEL = { food: "美食", sight: "景点", event: "活动" };
  // 人流档位换算成热度基准分，与人格的人潮偏好值比大小
  const CROWD_HEAT = { idle: 20, ok: 55, busy: 85 };
  const PACE_HEAT = { slow: 20, balanced: 55, full: 85 };
  const MODE_GUEST = "guest";
  const MODE_GLOBAL = "global";
  const PERSONA_LABEL = {
    yunshang: { name: "云上", species: "黔金丝猴" },
    huotang: { name: "火塘", species: "雷山髭蟾" },
    benliu: { name: "奔流", species: "贵州拟小鲵" },
    ganchang: { name: "赶场", species: "苗族女子" },
  };
  const INTEREST_LABEL = {
    historyMuseum: "历史博物",
    intangibleCraft: "非遗手作",
    coffee: "咖啡",
    localFood: "地方小吃",
    landscape: "山水观景",
    photography: "摄影",
    village: "村寨",
    hiking: "徒步",
    nightlife: "夜生活",
    market: "市集",
    musicArt: "音乐美术",
    familyFun: "亲子游玩",
  };
  const WISH_LABEL = {
    cityLife: "城市烟火",
    grandLandscape: "山水大景",
    villageSlowTravel: "村寨慢游",
    intangibleHeritage: "非遗风物",
    outdoorAdventure: "去野一下",
    guizhouTaste: "贵州寻味",
  };
  const OFFICIAL_TAG_LABEL = {
    petFriendly: "宠物友好",
    largeTable: "支持大桌",
    kidsMeal: "儿童餐",
    dianpingAboveFour: "大众点评高于4分",
  };
  const EVENT_WINDOW_DAYS = 7;
  const POSTER_PREFIX = "img/";
  const PREVIEW_TAG_LIMIT = 3;
  const GUEST_TAG_LIMIT = 1;
  const GUEST_PIN_LIMIT = 10;
  const ACTIVITY_POSTER_IDS = ["shengbo", "concert", "shudian", "museum"];

  function toRad(deg) {
    return (deg * Math.PI) / 180;
  }

  function haversineMeters(a, b) {
    const dLat = toRad(b.lat - a.lat);
    const dLng = toRad(b.lng - a.lng);
    const lat1 = toRad(a.lat);
    const lat2 = toRad(b.lat);
    const h =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
    return 2 * EARTH_M * Math.asin(Math.min(1, Math.sqrt(h)));
  }

  function formatDistance(meters) {
    if (meters < 1000) return `距你 ${Math.round(meters)} 米`;
    return `距你 ${(meters / 1000).toFixed(1)} 公里`;
  }

  function isoDate(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  function addDays(iso, days) {
    const date = new Date(`${iso}T00:00:00`);
    date.setDate(date.getDate() + days);
    return isoDate(date);
  }

  // 时间窗口：有出行日期就用出行日期，没有就从当天算七天
  function resolveWindow(session, now) {
    const trip = session.answers.trip;
    if (trip.startDate && trip.endDate) {
      return { start: trip.startDate, end: trip.endDate };
    }
    const base = session.context.demoDate || isoDate(now);
    return { start: base, end: addDays(base, EVENT_WINDOW_DAYS) };
  }

  function eventInWindow(event, window) {
    return event.startDate <= window.end && event.endDate >= window.start;
  }

  // 窗口外的活动整个不渲染；美食与景点不受窗口影响
  function isRenderable(poi, window) {
    if (!poi.event) return true;
    return eventInWindow(poi.event, window);
  }

  function isStarred(poi, window) {
    return Boolean(poi.event) && eventInWindow(poi.event, window);
  }

  function categoryById(data, id) {
    const found = data.categories.find((c) => c.id === id);
    if (!found) throw new Error(`缺少品类 ${id}`);
    return found;
  }

  function poiById(data, id) {
    const found = data.pois.find((p) => p.id === id);
    if (!found) throw new Error(`缺少地点 ${id}`);
    return found;
  }

  function allBoundaries(session) {
    const boundaries = session.answers.boundaries;
    return {
      dietary: [...boundaries.dietary, ...boundaries.custom.matchedTags],
      companions: boundaries.companions,
      experience: boundaries.experience,
      itinerary: boundaries.itinerary,
    };
  }

  // 安全类边界直接排除；未知的清真与过敏原信息不能当作安全
  function hardBoundaryReasons(poi, session) {
    const { dietary } = allBoundaries(session);
    const isFood = poi.spiceLevel !== null && poi.spiceLevel !== undefined;
    const reasons = [];
    if (isFood && dietary.includes("halal") && poi.halal !== true) reasons.push("未确认清真认证");
    if (
      isFood &&
      dietary.includes("seafoodAllergy") &&
      (poi.allergenTags === null || poi.allergenTags.includes("seafood"))
    ) {
      reasons.push("海鲜过敏原信息未确认");
    }
    if (
      isFood &&
      dietary.includes("nutAllergy") &&
      (poi.allergenTags === null || poi.allergenTags.includes("nuts"))
    ) {
      reasons.push("坚果过敏原信息未确认");
    }
    return reasons;
  }

  function softBoundaryReasons(poi, session) {
    const { dietary, companions, experience, itinerary } = allBoundaries(session);
    const isFood = poi.spiceLevel !== null && poi.spiceLevel !== undefined;
    const reasons = [];
    if (dietary.includes("noSpicy") && ["medium", "hot"].includes(poi.spiceLevel)) {
      reasons.push(poi.boundaryNotes.noSpicy || "口味偏辣");
    }
    if (isFood && dietary.includes("vegetarian") && poi.vegetarianAvailable !== true) {
      reasons.push("素食选项未确认");
    }
    if (isFood && dietary.includes("noBeef") && poi.containsBeef !== false) {
      reasons.push("牛肉食材信息需确认");
    }
    if (isFood && dietary.includes("noPork") && poi.containsPork !== false) {
      reasons.push("猪肉食材信息需确认");
    }
    if (companions.includes("withKids") && poi.kidFriendly !== true) {
      reasons.push("亲子设施信息未确认");
    }
    if (companions.includes("withElderly") && (poi.elderlyFriendly === false || poi.walkingIntensity === "high")) {
      reasons.push("步行强度较高，或尚未确认适老");
    }
    if (companions.includes("limitedMobility") && poi.stepFree !== true) {
      reasons.push("无障碍信息未确认");
    }
    if (experience.includes("avoidClimbing") && poi.walkingIntensity === "high") {
      reasons.push(poi.boundaryNotes.avoidClimbing || "包含较多爬升");
    }
    if (experience.includes("avoidCrowds") && poi.crowd === "busy") {
      reasons.push("当前运营档位为拥挤");
    }
    if (experience.includes("avoidHeights") && poi.hasHeights) {
      reasons.push(poi.boundaryNotes.avoidHeights || "包含登高或临空");
    }
    if (experience.includes("avoidWater") && poi.hasWater) {
      reasons.push(poi.boundaryNotes.avoidWater || "临水或需过桥");
    }
    if (experience.includes("avoidNightlife") && poi.nightlife) {
      reasons.push(poi.boundaryNotes.avoidNightlife || "偏夜间场次");
    }
    if (itinerary.includes("noEarlyStart") && poi.earlyStart) {
      reasons.push("需要赶早出发");
    }
    if (itinerary.includes("returnBeforeNight") && poi.lateNight) {
      reasons.push(poi.boundaryNotes.returnBeforeNight || "结束时间已入夜");
    }
    return reasons;
  }

  function conflictsBoundary(poi, session) {
    return hardBoundaryReasons(poi, session).length > 0 || softBoundaryReasons(poi, session).length > 0;
  }

  // 命中画像：品类兴趣与六问风物有交集，或品类心愿与六问心愿有交集
  function matchesInterest(poi, category, session) {
    if (!session.planned) return false;
    const interestTags = new Set([...(category.interestTags || []), ...(poi.interestTags || [])]);
    const wishTags = new Set([...(category.wishTags || []), ...(poi.wishTags || [])]);
    const hitInterest = session.answers.interests.some((t) => interestTags.has(t));
    const hitWish = session.answers.wishes.some((t) => wishTags.has(t));
    return hitInterest || hitWish;
  }

  function shouldGlow(poi, category, session) {
    if (!matchesInterest(poi, category, session)) return false;
    return !conflictsBoundary(poi, session);
  }

  function isTodayItinerary(poi, session) {
    return session.itinerary.todayPoiIds.includes(poi.id);
  }

  function withKids(session) {
    return session.answers.boundaries.companions.includes("withKids");
  }

  function isVisited(poi, session) {
    return session.itinerary.visitedPoiIds.includes(poi.id);
  }

  function showsKidBadge(poi, session) {
    return withKids(session) && poi.kidFriendly === true;
  }

  function isPosterImage(image) {
    return String(image).startsWith(POSTER_PREFIX);
  }

  function takeTags(list, max) {
    const seen = new Set();
    const out = [];
    for (const tag of list) {
      if (!tag || seen.has(tag)) continue;
      seen.add(tag);
      out.push(tag);
      if (out.length >= max) break;
    }
    return out;
  }

  function hasConcert(poi, category) {
    const title = poi.event ? poi.event.title : "";
    return /concert|caodi|音乐会|演唱会|乐队/.test(`${category.id} ${category.name} ${title}`);
  }

  function customBits(session) {
    const custom = session.answers.boundaries.custom;
    return [...custom.matchedTags, custom.text].map((item) => String(item));
  }

  function wantsPet(session) {
    return customBits(session).some((item) => /宠物|pet/i.test(item));
  }

  function wantsLargeTable(session) {
    return customBits(session).some((item) => /大桌|包间|拼桌/.test(item));
  }

  function wantsHighRating(session) {
    return customBits(session).some((item) => /点评|大众点评|好评|评分/.test(item));
  }

  function officialTagApplies(poi, key) {
    if (key === "petFriendly") return poi.petFriendly === true;
    if (key === "largeTable") return poi.largeTable === true;
    if (key === "kidsMeal") return poi.kidsMeal === true;
    if (key === "dianpingAboveFour") return typeof poi.dianpingScore === "number" && poi.dianpingScore > 4;
    throw new Error(`未知官方标签 ${key}`);
  }

  function officialReasonTags(poi, category) {
    if (!Array.isArray(category.officialTags)) throw new Error(`品类 ${category.id} 缺少 officialTags`);
    const tags = [];
    for (const key of category.officialTags) {
      if (!officialTagApplies(poi, key)) continue;
      const label = OFFICIAL_TAG_LABEL[key];
      if (!label) throw new Error(`未知官方标签 ${key}`);
      tags.push(label);
    }
    return tags;
  }

  function guestReasonTags(poi, category, session) {
    const { dietary, companions, experience, itinerary } = allBoundaries(session);
    const interestTags = new Set([...(category.interestTags || []), ...(poi.interestTags || [])]);
    const wishTags = new Set([...(category.wishTags || []), ...(poi.wishTags || [])]);
    const tags = [];

    if (dietary.includes("noSpicy") && ["none", "mild"].includes(poi.spiceLevel)) tags.push("不吃辣");
    if (dietary.includes("vegetarian") && poi.vegetarianAvailable === true) tags.push("有素食");
    if (dietary.includes("halal") && poi.halal === true) tags.push("清真");
    if (dietary.includes("noBeef") && poi.containsBeef === false) tags.push("不含牛肉");
    if (dietary.includes("noPork") && poi.containsPork === false) tags.push("不含猪肉");
    if (wantsPet(session) && poi.petFriendly === true) tags.push("宠物友好");
    if (wantsLargeTable(session) && poi.largeTable === true) tags.push("支持大桌");
    if (companions.includes("withKids") && poi.kidsMeal === true) tags.push("儿童餐");
    if (wantsHighRating(session) && officialTagApplies(poi, "dianpingAboveFour")) tags.push("大众点评高于4分");
    if (
      hasConcert(poi, category) &&
      (session.answers.interests.includes("musicArt") || session.answers.wishes.includes("cityLife"))
    ) {
      tags.push("有音乐会");
    }
    if (companions.includes("withKids") && poi.kidFriendly === true) tags.push("适合亲子");
    if (companions.includes("withElderly") && poi.elderlyFriendly === true) tags.push("适合长辈");
    if (companions.includes("limitedMobility") && poi.stepFree === true) tags.push("无障碍");
    if (
      ["friends", "couple", "withKids", "withElderly"].some((item) => companions.includes(item)) &&
      poi.kidFriendly === true &&
      poi.elderlyFriendly === true
    ) {
      tags.push("儿童老人友好");
    }
    if (experience.includes("avoidCrowds") && poi.crowd === "idle") tags.push("人少清静");
    if (experience.includes("avoidClimbing") && poi.walkingIntensity === "low") tags.push("少爬山");
    if (itinerary.includes("noEarlyStart") && !poi.earlyStart) tags.push("不用赶早");
    if (itinerary.includes("returnBeforeNight") && !poi.lateNight) tags.push("天黑前能回");
    if (isTodayItinerary(poi, session)) tags.push("今日行程");
    for (const key of session.answers.interests) {
      if (!interestTags.has(key)) continue;
      if (key === "musicArt" && tags.includes("有音乐会")) continue;
      tags.push(INTEREST_LABEL[key]);
    }
    for (const key of session.answers.wishes) {
      if (wishTags.has(key)) tags.push(WISH_LABEL[key]);
    }
    return takeTags(tags, GUEST_TAG_LIMIT);
  }

  function publicReasonTags(poi, category) {
    const official = officialReasonTags(poi, category);
    const highlights = poi.highlights && poi.highlights.length > 0 ? poi.highlights : category.highlights || [];
    const crowd = CROWD_LABEL[poi.crowd];
    const lead = official.length > 0 ? official : highlights;
    return takeTags([...lead.slice(0, PREVIEW_TAG_LIMIT - 1), crowd], PREVIEW_TAG_LIMIT);
  }

  function previewTags(poi, category, session, mode) {
    if (mode === MODE_GUEST && session.planned) {
      const personal = guestReasonTags(poi, category, session);
      if (personal.length > 0) return personal;
    }
    return publicReasonTags(poi, category);
  }

  function crowdHeat(poi) {
    const heat = CROWD_HEAT[poi.crowd];
    if (heat === undefined) throw new Error(`未知人流档位 ${poi.crowd}`);
    return heat;
  }

  // 热度基准分与人潮偏好值之差，越小越靠前
  function paceGap(poi, session) {
    const target = PACE_HEAT[session.answers.pace];
    if (target === undefined) throw new Error(`未知步速 ${session.answers.pace}`);
    return Math.abs(crowdHeat(poi) - target);
  }

  function avatarKey(session, mode) {
    if (mode !== MODE_GUEST || !session.planned) return "traveler";
    const persona = session.derived.persona;
    if (!PERSONA_LABEL[persona]) throw new Error(`未知人格 ${persona}`);
    return persona;
  }

  function amapWalkUrl(key, from, to) {
    if (!key) throw new Error("路线服务未配置：把高德 Web 服务 key 填进 config.js");
    const origin = `${from.lng.toFixed(6)},${from.lat.toFixed(6)}`;
    const destination = `${to.lng.toFixed(6)},${to.lat.toFixed(6)}`;
    return `https://restapi.amap.com/v5/direction/walking?key=${key}&origin=${origin}&destination=${destination}&show_fields=polyline`;
  }

  // 高德把折线写成 "lng,lat;lng,lat"，逐段拼成 Leaflet 的 [lat, lng]
  function parseWalkPolyline(steps) {
    const points = [];
    for (const step of steps) {
      for (const pair of step.polyline.split(";")) {
        const [lng, lat] = pair.split(",").map(Number);
        if (Number.isNaN(lat) || Number.isNaN(lng)) throw new Error(`折线坐标读不出来：${pair}`);
        points.push([lat, lng]);
      }
    }
    return points;
  }

  // 折线的累计长度，供按时间比例取点
  function buildTrack(points) {
    const spans = [];
    let total = 0;
    for (let i = 1; i < points.length; i += 1) {
      total += haversineMeters(
        { lat: points[i - 1][0], lng: points[i - 1][1] },
        { lat: points[i][0], lng: points[i][1] }
      );
      spans.push(total);
    }
    return { spans, total };
  }

  function pointAtRatio(points, track, ratio) {
    const walked = track.total * Math.min(1, Math.max(0, ratio));
    let i = track.spans.findIndex((d) => d >= walked);
    if (i < 0) i = track.spans.length - 1;
    const before = i === 0 ? 0 : track.spans[i - 1];
    const segment = track.spans[i] - before;
    const t = segment === 0 ? 0 : (walked - before) / segment;
    const a = points[i];
    const b = points[i + 1];
    return {
      lat: a[0] + (b[0] - a[0]) * t,
      lng: a[1] + (b[1] - a[1]) * t,
      facingLeft: b[1] < a[1],
    };
  }

  function poisInBounds(pois, bounds) {
    return pois.filter(
      (p) =>
        p.lat <= bounds.north &&
        p.lat >= bounds.south &&
        p.lng <= bounds.east &&
        p.lng >= bounds.west
    );
  }

  function enrichPoi(poi, category, origin, session, context) {
    const meters = haversineMeters(origin, poi);
    const hardReasons = hardBoundaryReasons(poi, session);
    const softReasons = softBoundaryReasons(poi, session);
    const recommended = matchesInterest(poi, category, session) || isTodayItinerary(poi, session);
    const active = context.mode === MODE_GUEST ? recommended && hardReasons.length === 0 : true;
    return {
      ...poi,
      category,
      kind: category.kind,
      meters,
      distanceText: formatDistance(meters),
      glow: context.mode === MODE_GUEST && shouldGlow(poi, category, session),
      today: isTodayItinerary(poi, session),
      crowdLabel: CROWD_LABEL[poi.crowd],
      kindLabel: KIND_LABEL[category.kind],
      boundaryHit: hardReasons.length > 0 || softReasons.length > 0,
      hardBlocked: hardReasons.length > 0,
      boundaryReasons: hardReasons.concat(softReasons),
      active,
      starred: isStarred(poi, context.window),
      heat: crowdHeat(poi),
      gap: paceGap(poi, session),
      visited: isVisited(poi, session),
      kidBadge: showsKidBadge(poi, session),
      reasonTags: previewTags(poi, category, session, context.mode),
    };
  }

  // 贵客模式：带小朋友时亲子点优先，再按步速差值；全局模式按距离
  function sortPois(list, mode, session) {
    const sorted = list.slice();
    if (mode === MODE_GUEST) {
      const kidsFirst = session && withKids(session);
      sorted.sort((a, b) => {
        if (kidsFirst) {
          const kidDiff = Number(b.kidBadge) - Number(a.kidBadge);
          if (kidDiff !== 0) return kidDiff;
        }
        return a.gap - b.gap || a.meters - b.meters;
      });
    } else {
      sorted.sort((a, b) => a.meters - b.meters);
    }
    return sorted;
  }

  // 贵客模式只保留与画像或当天路书相关、尚未推荐过的点，画面最多十个；全局模式保留视野内全部可渲染点
  function viewportPois(data, bounds, origin, session, context) {
    const raw = poisInBounds(data.pois, bounds).filter((p) => isRenderable(p, context.window));
    const list = raw.map((p) => enrichPoi(p, categoryById(data, p.categoryId), origin, session, context));
    const sorted = sortPois(list, context.mode, session);
    if (context.mode !== MODE_GUEST) return sorted;
    const picked = sorted.filter((p) => p.active && !p.visited);
    const today = picked.filter((p) => p.today);
    const rest = picked.filter((p) => !p.today);
    return today.concat(rest).slice(0, GUEST_PIN_LIMIT);
  }

  // 木柜富集卡：一品类一张，星标活动排最前
  function viewportCards(data, bounds, origin, session, context) {
    const pool = viewportPois(data, bounds, origin, session, context).filter(
      (p) => context.mode !== MODE_GUEST || p.active
    );
    const seen = new Set();
    const cards = [];
    for (const poi of pool) {
      if (seen.has(poi.categoryId)) continue;
      seen.add(poi.categoryId);
      cards.push({ category: poi.category, poi, starred: poi.starred });
    }
    cards.sort((a, b) => Number(b.starred) - Number(a.starred));
    return cards;
  }

  function collectId(collectedIds, id) {
    if (!id) throw new Error("缺少收藏对象");
    if (collectedIds.includes(id)) return collectedIds.slice();
    return collectedIds.concat([id]);
  }

  function releaseCollected(collectedIds, id) {
    if (!collectedIds.includes(id)) throw new Error(`柜子里没有 ${id}`);
    return collectedIds.filter((item) => item !== id);
  }

  function firstRenderablePoi(data, categoryId, window) {
    return data.pois.find((item) => item.categoryId === categoryId && isRenderable(item, window)) || null;
  }

  // 贵客贴只挂实拍海报；简笔画不进柜子。贵客模式只留已推荐的场景与美食，全局再补上全部贵客帖图
  function cabinetCards(data, bounds, origin, session, context) {
    const cards = viewportCards(data, bounds, origin, session, context)
      .filter((card) => isPosterImage(card.category.image))
      .slice();
    const seen = new Set(cards.map((card) => card.category.id));
    for (const id of ACTIVITY_POSTER_IDS) {
      if (seen.has(id)) continue;
      const category = categoryById(data, id);
      const sample = firstRenderablePoi(data, id, context.window);
      if (!sample) continue;
      const enriched = enrichPoi(sample, category, origin, session, context);
      if (context.mode === MODE_GUEST && !enriched.active) continue;
      seen.add(id);
      cards.push({ category, poi: enriched, starred: enriched.starred });
    }
    if (context.mode === MODE_GUEST) {
      cards.sort((a, b) => Number(b.starred) - Number(a.starred));
      return cards;
    }
    for (const category of data.categories) {
      if (!isPosterImage(category.image) || seen.has(category.id)) continue;
      seen.add(category.id);
      cards.push({ category, poi: null, starred: false });
    }
    return cards;
  }

  return {
    CROWD_LABEL,
    KIND_LABEL,
    CROWD_HEAT,
    PACE_HEAT,
    PERSONA_LABEL,
    INTEREST_LABEL,
    WISH_LABEL,
    OFFICIAL_TAG_LABEL,
    MODE_GUEST,
    MODE_GLOBAL,
    GUEST_PIN_LIMIT,
    GUEST_TAG_LIMIT,
    ACTIVITY_POSTER_IDS,
    haversineMeters,
    formatDistance,
    isoDate,
    addDays,
    resolveWindow,
    eventInWindow,
    isRenderable,
    isStarred,
    categoryById,
    poiById,
    conflictsBoundary,
    hardBoundaryReasons,
    softBoundaryReasons,
    matchesInterest,
    shouldGlow,
    isTodayItinerary,
    withKids,
    isVisited,
    showsKidBadge,
    isPosterImage,
    hasConcert,
    wantsPet,
    wantsLargeTable,
    wantsHighRating,
    officialTagApplies,
    officialReasonTags,
    guestReasonTags,
    publicReasonTags,
    previewTags,
    crowdHeat,
    paceGap,
    avatarKey,
    amapWalkUrl,
    parseWalkPolyline,
    buildTrack,
    pointAtRatio,
    poisInBounds,
    enrichPoi,
    sortPois,
    viewportPois,
    viewportCards,
    cabinetCards,
    collectId,
    releaseCollected,
  };
});
