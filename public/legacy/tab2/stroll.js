(function () {
  const core = window.GuikeStrollCore;
  if (!core) throw new Error("缺少 GuikeStrollCore");
  if (!window.gcoord) throw new Error("缺少 gcoord");
  if (!window.GuikeConfig) throw new Error("缺少 GuikeConfig");

  function loadScript(src) {
    if (document.querySelector(`script[src="${src}"]`)) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const el = document.createElement("script");
      el.src = src;
      el.onload = resolve;
      el.onerror = () => reject(new Error(`无法加载 ${src}`));
      document.head.appendChild(el);
    });
  }

  async function pageModules() {
    if (!window.GuikeSessionStore) await loadScript("session-store.js");
    if (!window.GuikeDetailView) await loadScript("detail-view.js");
    if (!window.GuikeSessionStore) throw new Error("缺少 GuikeSessionStore");
    if (!window.GuikeDetailView) throw new Error("缺少 GuikeDetailView");
    return {
      store: window.GuikeSessionStore,
      detailView: window.GuikeDetailView,
    };
  }

  let store;
  let detailView;
  const STORAGE_RUNTIME = "guikesong-stroll-runtime";
  const STORAGE_ITINERARY = "guikesong-today-extra-pois";
  const DEFAULT_ZOOM = 15;
  const MIN_ZOOM = 13;
  const MAX_ZOOM = 17;
  const WALK_MS = 2000;

  const state = {
    data: null,
    session: null,
    window: null,
    mode: core.MODE_GLOBAL,
    origin: null,
    demo: true,
    map: null,
    markers: new Map(),
    avatarMarker: null,
    routeLine: null,
    routePath: null,
    routeStage: "idle",
    routeMessage: "",
    walking: false,
    previewId: null,
    focusCategoryId: null,
    pendingId: null,
    goingId: null,
    collectedIds: [],
    poppedStars: new Set(),
    cabinetOpen: false,
    posterPoiId: null,
    favorHintTimer: 0,
    inited: false,
  };

  function $(id) {
    const el = document.getElementById(id);
    if (!el) throw new Error(`缺少节点 ${id}`);
    return el;
  }

  function ensureCabinetChrome() {
    const dock = document.querySelector(".stroll-dock");
    if (!dock) throw new Error("缺少节点 stroll-dock");
    dock.id = "stroll-dock";
    const cabinet = dock.querySelector(".stroll-cabinet");
    if (!cabinet) throw new Error("缺少节点 stroll-cabinet");
    cabinet.id = "stroll-cabinet";
    cabinet.setAttribute("aria-label", "贵客贴");
    if (document.getElementById("stroll-tie")) return;
    const tie = document.createElement("button");
    tie.type = "button";
    tie.className = "stroll-tie";
    tie.id = "stroll-tie";
    tie.setAttribute("aria-controls", "stroll-cabinet");
    cabinet.before(tie);
  }

  function applyCabinet() {
    const dock = $("stroll-dock");
    const tie = $("stroll-tie");
    const cabinet = $("stroll-cabinet");
    dock.classList.toggle("is-folded", !state.cabinetOpen);
    tie.setAttribute("aria-expanded", String(state.cabinetOpen));
    cabinet.setAttribute("aria-hidden", String(!state.cabinetOpen));
    const mark = state.cabinetOpen ? "▽" : "△";
    const hint = state.cabinetOpen ? "收起贵客贴" : "打开贵客贴";
    tie.setAttribute("aria-label", hint);
    tie.innerHTML = `<i class="stroll-tie-mark" aria-hidden="true">${mark}</i><span>贵客贴</span>`;
    if (!state.map) return;
    state.map.invalidateSize();
    placePreview();
  }

  function toggleCabinet() {
    state.cabinetOpen = !state.cabinetOpen;
    saveRuntime();
    applyCabinet();
  }

  function loadRuntime() {
    const raw = localStorage.getItem(STORAGE_RUNTIME);
    if (!raw) return;
    const saved = JSON.parse(raw);
    state.collectedIds = saved.collectedIds || [];
    state.cabinetOpen = false;
  }

  function saveRuntime() {
    localStorage.setItem(
      STORAGE_RUNTIME,
      JSON.stringify({
        collectedIds: state.collectedIds,
      })
    );
  }

  function writeItinerary(poi) {
    const raw = localStorage.getItem(STORAGE_ITINERARY);
    const list = raw ? JSON.parse(raw) : [];
    if (list.some((x) => x.id === poi.id)) return;
    list.push({
      id: poi.id,
      name: poi.name,
      lat: poi.lat,
      lng: poi.lng,
      categoryId: poi.categoryId,
    });
    localStorage.setItem(STORAGE_ITINERARY, JSON.stringify(list));
  }

  async function loadJson(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`无法读取 ${url}`);
    return res.json();
  }

  // 手机定位是 WGS-84，高德瓦片与高德接口是 GCJ-02，落图前先换算
  function toGcj(point) {
    const [lng, lat] = gcoord.transform([point.lng, point.lat], gcoord.WGS84, gcoord.GCJ02);
    return { lat, lng };
  }

  function resolveOrigin(session) {
    return new Promise((resolve) => {
      const demo = { origin: session.context.demoLocation, demo: true };
      if (!navigator.geolocation) {
        resolve(demo);
        return;
      }
      let settled = false;
      const finish = (value) => {
        if (settled) return;
        settled = true;
        resolve(value);
      };
      const timer = setTimeout(() => finish(demo), 1200);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          clearTimeout(timer);
          const here = toGcj({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          const far = core.haversineMeters(here, session.context.demoLocation);
          if (far > 80000) finish(demo);
          else finish({ origin: here, demo: false });
        },
        () => {
          clearTimeout(timer);
          finish(demo);
        },
        { enableHighAccuracy: true, timeout: 1000, maximumAge: 0 }
      );
    });
  }

  function watchOrigin() {
    if (state.demo || !navigator.geolocation) return;
    navigator.geolocation.watchPosition(
      (pos) => {
        if (state.walking) return;
        state.origin = toGcj({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        state.avatarMarker.setLatLng([state.origin.lat, state.origin.lng]);
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 5000 }
    );
  }

  function context() {
    return { mode: state.mode, window: state.window };
  }

  function mapBounds() {
    const b = state.map.getBounds();
    return {
      north: b.getNorth(),
      south: b.getSouth(),
      east: b.getEast(),
      west: b.getWest(),
    };
  }

  function wrapPoi(poi) {
    const category = core.categoryById(state.data, poi.categoryId);
    return core.enrichPoi(poi, category, state.origin, state.session, context());
  }

  function visiblePois() {
    return core.viewportPois(state.data, mapBounds(), state.origin, state.session, context());
  }

  /* 地图标记 */

  function pinHtml(poi) {
    const guest = state.mode === core.MODE_GUEST;
    const bits = ["stroll-pin", `kind-${poi.kind}`];
    if (guest && poi.glow) bits.push("is-glow");
    if (guest && poi.today) bits.push("is-today");
    if (state.focusCategoryId) {
      bits.push(poi.categoryId === state.focusCategoryId ? "is-focus" : "is-dim");
    }
    const today = guest && poi.today ? `<span class="stroll-pin-badge">今</span>` : "";
    const kid = guest && poi.kidBadge ? `<span class="stroll-pin-kid">亲子</span>` : "";
    let star = "";
    if (guest && poi.starred && poi.active) {
      const pop = state.poppedStars.has(poi.id) ? "" : " is-pop";
      state.poppedStars.add(poi.id);
      star = `<span class="stroll-pin-star${pop}">★</span>`;
    }
    const name = `<span class="stroll-pin-name">${poi.name}</span>`;
    return `<div class="${bits.join(" ")}" data-poi-id="${poi.id}">
      ${today}${kid}${star}
      <span class="stroll-pin-drop"></span>
      ${name}
    </div>`;
  }

  function clearMarkers() {
    for (const marker of state.markers.values()) {
      state.map.removeLayer(marker);
    }
    state.markers.clear();
  }

  function renderMarkers() {
    clearMarkers();
    const list = visiblePois();
    list.forEach((poi, index) => {
      const icon = L.divIcon({
        className: "",
        html: pinHtml(poi),
        iconSize: [76, 52],
        iconAnchor: [38, 24],
      });
      const marker = L.marker([poi.lat, poi.lng], {
        icon,
        keyboard: poi.active,
        title: poi.name,
        alt: poi.name,
        interactive: poi.active,
        zIndexOffset: poi.active ? list.length - index : -100,
      }).addTo(state.map);
      if (poi.active) {
        marker.on("click", (ev) => {
          L.DomEvent.stopPropagation(ev);
          onPinTap(poi.id);
        });
      }
      state.markers.set(poi.id, marker);
    });
    if (state.previewId && !state.markers.has(state.previewId)) {
      closePreview();
    }
  }

  /* 模式与引导 */

  function renderModes() {
    for (const btn of $("stroll-modes").querySelectorAll("[data-mode]")) {
      const on = btn.getAttribute("data-mode") === state.mode;
      btn.classList.toggle("is-on", on);
      btn.setAttribute("aria-selected", String(on));
    }
    $("stroll-mode-dot").hidden = state.session.planned;

    const guide = $("stroll-guide");
    if (state.mode === core.MODE_GUEST && !state.session.planned) {
      guide.hidden = false;
      guide.innerHTML = `
        <button type="button" class="stroll-guide-card" data-goto-plan>
          <strong>还没有你的贵客卡</strong>
          <span>去答四题心境，这里就换成你的口味</span>
          <em>去贵客卡</em>
        </button>
      `;
    } else {
      guide.hidden = true;
      guide.innerHTML = "";
    }
  }

  function switchMode(mode) {
    if (state.mode === mode) return;
    state.mode = mode;
    state.focusCategoryId = null;
    closePreview();
    closeDetail();
    updateAvatarIcon();
    renderModes();
    renderMarkers();
    renderDock();
  }

  /* IP 小人 */

  function avatarHtml(key) {
    const painted = key !== "traveler";
    const stand = painted ? "img/guest-stand.png" : `img/${key}-stand.svg`;
    const walk = painted ? "img/guest-walk.png" : `img/${key}-walk.svg`;
    return `<div class="stroll-avatar">
      <img class="stroll-avatar-frame is-stand" src="${stand}" alt="">
      <img class="stroll-avatar-frame is-walk" src="${walk}" alt="">
    </div>`;
  }

  function avatarIcon() {
    return L.divIcon({
      className: "",
      html: avatarHtml(core.avatarKey(state.session, state.mode)),
      iconSize: [72, 72],
      iconAnchor: [36, 68],
    });
  }

  function updateAvatarIcon() {
    state.avatarMarker.setIcon(avatarIcon());
  }

  function avatarEl() {
    const icon = state.avatarMarker.getElement();
    return icon ? icon.querySelector(".stroll-avatar") : null;
  }

  /* 路线与行走 */

  async function fetchWalkRoute(from, to) {
    const url = core.amapWalkUrl(window.GuikeConfig.amapWebKey, from, to);
    const res = await fetch(url);
    if (!res.ok) throw new Error("这一段路线没取到，换一家试试");
    const json = await res.json();
    if (json.status !== "1") throw new Error(`高德路径规划返回 ${json.info}`);
    const paths = json.route && json.route.paths;
    if (!paths || paths.length === 0) throw new Error("这一段路线没取到，换一家试试");
    const points = core.parseWalkPolyline(paths[0].steps);
    if (points.length < 2) throw new Error("这一段路线没取到，换一家试试");
    return points;
  }

  function removeRouteLine() {
    if (state.routeLine) {
      state.map.removeLayer(state.routeLine);
      state.routeLine = null;
    }
  }

  function clearRoute() {
    removeRouteLine();
    state.routePath = null;
  }

  function drawRoute(points) {
    clearRoute();
    state.routePath = points;
    state.routeLine = L.polyline(points, {
      color: "#4a6455",
      weight: 4,
      opacity: 0.95,
      lineJoin: "round",
      className: "stroll-route-line",
    }).addTo(state.map);
  }

  // 小人沿真实折线走一遍，点击任意处跳到终点
  function walkAvatar(points) {
    return new Promise((resolve) => {
      const track = core.buildTrack(points);
      if (track.total === 0) {
        resolve();
        return;
      }

      const el = avatarEl();
      if (el) el.classList.add("is-walking");
      state.walking = true;
      const root = $("stroll-root");
      const started = performance.now();
      let frame = 0;
      let done = false;

      const finish = () => {
        if (done) return;
        done = true;
        cancelAnimationFrame(frame);
        root.removeEventListener("click", skip, true);
        state.walking = false;
        const node = avatarEl();
        if (node) {
          node.classList.remove("is-walking");
          node.classList.remove("is-left");
        }
        state.avatarMarker.setLatLng([state.origin.lat, state.origin.lng]);
        resolve();
      };

      function skip(ev) {
        ev.stopPropagation();
        ev.preventDefault();
        finish();
      }

      const step = (now) => {
        const ratio = Math.min(1, (now - started) / WALK_MS);
        const at = core.pointAtRatio(points, track, ratio);
        state.avatarMarker.setLatLng([at.lat, at.lng]);
        const node = avatarEl();
        if (node) node.classList.toggle("is-left", at.facingLeft);
        if (ratio >= 1) {
          finish();
          return;
        }
        frame = requestAnimationFrame(step);
      };

      root.addEventListener("click", skip, true);
      frame = requestAnimationFrame(step);
    });
  }

  function openAmap(poi) {
    const url = `https://uri.amap.com/navigation?to=${poi.lng},${poi.lat},${encodeURIComponent(
      poi.name
    )}&mode=walk&src=guikewanxiang`;
    window.open(url, "_blank", "noopener");
  }

  async function startRoute(poi, animate) {
    state.routeStage = "loading";
    state.routeMessage = "";
    clearRoute();
    renderDock();
    let points;
    try {
      points = await fetchWalkRoute(state.origin, poi);
    } catch (err) {
      state.routeStage = "error";
      state.routeMessage = err.message;
      renderDock();
      return;
    }
    if (state.goingId !== poi.id) return;
    drawRoute(points);
    if (animate) {
      state.routeStage = "walking";
      renderDock();
      await walkAvatar(points);
      if (state.goingId !== poi.id) return;
    }
    state.routeStage = "ready";
    renderDock();
  }

  /* 预览与详情 */

  function closePreview() {
    state.previewId = null;
    const box = $("stroll-preview");
    box.hidden = true;
    box.innerHTML = "";
  }

  function placePreview() {
    const box = $("stroll-preview");
    if (!state.previewId) return;
    const poi = wrapPoi(core.poiById(state.data, state.previewId));
    const pt = state.map.latLngToContainerPoint([poi.lat, poi.lng]);
    const mapEl = $("stroll-map");
    const w = box.offsetWidth || 220;
    box.style.left = `${Math.max(8, Math.min(pt.x - w / 2, mapEl.clientWidth - w - 8))}px`;
    box.style.top = `${Math.max(8, pt.y - 96)}px`;
  }

  function openPreview(id) {
    const poi = wrapPoi(core.poiById(state.data, id));
    state.previewId = id;
    const box = $("stroll-preview");
    const tags = (poi.reasonTags || [])
      .map((text) => `<button type="button" class="stroll-tag" data-open-detail="${poi.id}">${text}</button>`)
      .join("");
    const when = poi.event ? `<div class="stroll-when">★ ${poi.event.timeText}</div>` : "";
    box.innerHTML = `<div class="stroll-preview-tags">${tags}</div>${when}`;
    box.hidden = false;
    placePreview();
  }

  function onPinTap(id) {
    if (state.previewId === id) {
      openDetail(id);
      return;
    }
    openPreview(id);
  }

  function closeDetail() {
    const sheet = $("stroll-sheet");
    sheet.hidden = true;
    sheet.innerHTML = "";
    sheet.className = "stroll-sheet";
  }

  function openDetail(id) {
    state.session = store.markVisited(state.session, id, window.localStorage);
    const poi = wrapPoi(core.poiById(state.data, id));
    closePreview();
    const sheet = $("stroll-sheet");
    const note = poi.boundaryHit
      ? `<p class="stroll-sheet-note">${poi.boundaryReasons.join("；")}</p>`
      : "";
    const event = poi.event
      ? `<div class="stroll-sheet-event">
          <strong>★ ${poi.event.title}</strong>
          <span>${poi.event.venue}</span>
          <span>${poi.event.timeText}</span>
          <span>${poi.event.ticketNote}</span>
        </div>`
      : "";
    const kid = poi.kidBadge ? `<span class="stroll-sheet-kid">亲子</span>` : "";
    const visited = poi.visited ? `<span class="stroll-sheet-visited">已访问</span>` : "";
    const address = poi.address ? `<p class="stroll-sheet-meta">${poi.address}</p>` : "";
    const phone = poi.phone
      ? `<a class="stroll-sheet-phone" href="${detailView.phoneHref(poi.phone)}">${poi.phone}</a>`
      : "";
    sheet.className = `stroll-sheet kind-${poi.kind}`;
    const pic = isPosterImage(poi.category.image) || !poi.category.image
      ? ""
      : `<img class="stroll-sheet-img" src="${poi.category.image}" alt="${poi.category.name}">`;
    sheet.innerHTML = `
      ${pic}
      <div class="stroll-sheet-body">
        <p class="stroll-sheet-kicker">${poi.kindLabel} · ${poi.category.name} ${kid}${visited}</p>
        <h2 class="stroll-sheet-title">${poi.name}</h2>
        ${event}
        <p class="stroll-sheet-intro">${poi.category.intro}</p>
        <p class="stroll-sheet-meta">${poi.distanceText}</p>
        ${address}
        ${phone}
        ${note}
        <div class="stroll-sheet-actions">
          <button type="button" class="stroll-btn ghost" data-close-sheet>收起</button>
          <button type="button" class="stroll-btn ghost" data-open-guest-post="${poi.id}">查看贵客帖</button>
          <button type="button" class="stroll-btn" data-go-here="${poi.id}">去为你推荐</button>
        </div>
      </div>
    `;
    sheet.hidden = false;
    renderMarkers();
  }

  /* 木柜与前往 */

  function collectShop(id) {
    if (!state.collectedIds.includes(id)) state.collectedIds.push(id);
    state.pendingId = id;
    closeDetail();
    saveRuntime();
    renderDock();
  }

  function releaseShop(id) {
    state.collectedIds = core.releaseCollected(state.collectedIds, id);
    if (state.posterPoiId === id) closePoster();
    saveRuntime();
    renderDock();
  }

  function confirmGoing() {
    if (!state.pendingId) return;
    const poi = wrapPoi(core.poiById(state.data, state.pendingId));
    state.goingId = poi.id;
    state.pendingId = null;
    writeItinerary(poi);
    saveRuntime();
    renderDock();
    startRoute(poi, true);
  }

  function dropPending() {
    state.pendingId = null;
    saveRuntime();
    renderDock();
  }

  function endGoing() {
    state.goingId = null;
    state.routeStage = "idle";
    state.routeMessage = "";
    saveRuntime();
    clearRoute();
    state.avatarMarker.setLatLng([state.origin.lat, state.origin.lng]);
    renderDock();
  }

  function isPosterImage(image) {
    return core.isPosterImage(image);
  }

  function nearestPoiId(categoryId) {
    if (!categoryId) return null;
    const pool = state.data.pois.filter((item) => item.categoryId === categoryId);
    if (pool.length === 0) return null;
    let best = pool[0];
    let bestMeters = core.haversineMeters(state.origin, best);
    for (const item of pool.slice(1)) {
      const meters = core.haversineMeters(state.origin, item);
      if (meters < bestMeters) {
        best = item;
        bestMeters = meters;
      }
    }
    return best.id;
  }

  function ensurePosterLayer() {
    const old = document.getElementById("stroll-poster");
    if (old && old.tagName === "DIV" && old.querySelector("[data-poster-go]") && old.querySelector("[data-favor]")) {
      return;
    }
    if (old) old.remove();
    const layer = document.createElement("div");
    layer.id = "stroll-poster";
    layer.className = "stroll-poster";
    layer.hidden = true;
    layer.innerHTML = `
      <img alt="">
      ${heartHtml("", false)}
      <div class="stroll-poster-bar">
        <button type="button" class="stroll-btn" data-poster-go>去为你推荐</button>
        <button type="button" class="stroll-btn ghost" data-close-poster>返回</button>
      </div>
    `;
    $("stroll-root").appendChild(layer);
  }

  function openPoster(src, alt, poiId) {
    closeDetail();
    ensurePosterLayer();
    state.posterPoiId = poiId || null;
    const layer = $("stroll-poster");
    const img = layer.querySelector("img");
    const go = layer.querySelector("[data-poster-go]");
    img.src = src;
    img.alt = alt;
    go.hidden = !state.posterPoiId;
    hideFavorHints();
    syncPosterHeart();
    layer.hidden = false;
  }

  function closePoster() {
    const layer = $("stroll-poster");
    const img = layer.querySelector("img");
    layer.hidden = true;
    img.removeAttribute("src");
    img.alt = "";
    state.posterPoiId = null;
  }

  function goHere(id) {
    if (!id) return;
    const poi = wrapPoi(core.poiById(state.data, id));
    closePoster();
    closeDetail();
    state.cabinetOpen = false;
    applyCabinet();
    state.goingId = poi.id;
    state.pendingId = null;
    writeItinerary(poi);
    saveRuntime();
    renderDock();
    startRoute(poi, true);
  }

  function goHereFromPoster() {
    goHere(state.posterPoiId);
  }

  function openGuestPost(id) {
    const poi = wrapPoi(core.poiById(state.data, id));
    state.cabinetOpen = true;
    applyCabinet();
    renderDock();
    state.focusCategoryId = poi.categoryId;
    renderMarkers();
    if (isPosterImage(poi.category.image)) {
      openPoster(poi.category.image, poi.category.name, poi.id);
    }
  }

  function heartHtml(id, on) {
    const mark = on ? " is-on" : "";
    return `<button type="button" class="stroll-heart${mark}" data-favor="${id}" aria-label="收藏">
      <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" d="M12.1 8.64l-.1.1-.11-.11C9.14 5.9 5.5 6.74 4.14 9.28c-1.01 1.87-.6 4.16 1.04 5.82L12 21l6.82-5.9c1.64-1.66 2.05-3.95 1.04-5.82C18.5 6.74 14.86 5.9 12.1 8.64z"/></svg>
    </button><span class="stroll-favored" hidden>已收藏</span>`;
  }

  function cardFavorId(id, attr) {
    if (!id) return "";
    if (attr === "open-detail") return id;
    if (state.data.pois.some((item) => item.id === id)) return id;
    return nearestPoiId(id) || "";
  }

  function resolveFavorId(raw) {
    if (!raw) throw new Error("缺少收藏对象");
    if (state.data.pois.some((item) => item.id === raw)) return raw;
    const nearest = nearestPoiId(raw);
    if (!nearest) throw new Error(`柜子里没有可收藏的点 ${raw}`);
    return nearest;
  }

  function hideFavorHints() {
    for (const el of document.querySelectorAll(".stroll-favored")) el.hidden = true;
  }

  function syncPosterHeart() {
    const layer = document.getElementById("stroll-poster");
    if (!layer) return;
    const heart = layer.querySelector("[data-favor]");
    if (!heart) return;
    heart.setAttribute("data-favor", state.posterPoiId || "");
    heart.hidden = !state.posterPoiId;
    heart.classList.toggle("is-on", Boolean(state.posterPoiId && state.collectedIds.includes(state.posterPoiId)));
  }

  function onFavor(raw, heart) {
    const id = resolveFavorId(raw);
    state.collectedIds = core.collectId(state.collectedIds, id);
    saveRuntime();
    heart.classList.add("is-on");
    hideFavorHints();
    const hint = heart.parentElement.querySelector(".stroll-favored");
    hint.hidden = false;
    clearTimeout(state.favorHintTimer);
    state.favorHintTimer = setTimeout(() => {
      hint.hidden = true;
      renderDock();
      syncPosterHeart();
    }, 1000);
  }

  function cardHtml(opts) {
    const going = opts.going ? " is-going" : "";
    const poster = isPosterImage(opts.image) ? " is-poster" : "";
    const star = opts.starred ? `<i class="stroll-card-star">★</i>` : "";
    const card = `<button type="button" class="stroll-card kind-${opts.kind}${going}${poster}" data-${opts.attr}="${opts.id}">
      <span class="stroll-card-pic">${star}<img src="${opts.image}" alt="${opts.title}"></span>
      <strong>${opts.title}</strong>
      <span>${opts.sub}</span>
    </button>`;
    const favorId = cardFavorId(opts.id, opts.attr);
    const release = opts.release
      ? `<button type="button" class="stroll-card-release" data-release="${opts.id}">释放</button>`
      : "";
    const favor = favorId ? heartHtml(favorId, state.collectedIds.includes(favorId)) : "";
    return `<div class="stroll-card-slot">${card}${favor}${release}</div>`;
  }

  function confirmCloseHtml() {
    return `<button type="button" class="stroll-confirm-close" data-close-confirm aria-label="关闭">×</button>`;
  }

  function closeConfirm() {
    if (state.pendingId) {
      dropPending();
      return;
    }
    endGoing();
  }

  function renderConfirm() {
    const confirm = $("stroll-confirm");
    if (state.pendingId) {
      const poi = wrapPoi(core.poiById(state.data, state.pendingId));
      confirm.hidden = false;
      confirm.innerHTML = `
        ${confirmCloseHtml()}
        <p>确认前往「${poi.name}」？</p>
        <div class="stroll-sheet-actions">
          <button type="button" class="stroll-btn ghost" data-drop-pending>放下</button>
          <button type="button" class="stroll-btn" data-confirm-going>确认前往</button>
        </div>
      `;
      return;
    }
    if (!state.goingId) {
      confirm.hidden = true;
      confirm.innerHTML = "";
      return;
    }
    const poi = wrapPoi(core.poiById(state.data, state.goingId));
    confirm.hidden = false;
    if (state.routeStage === "error") {
      confirm.innerHTML = `
        ${confirmCloseHtml()}
        <p class="stroll-confirm-warn">${state.routeMessage}</p>
        <div class="stroll-sheet-actions">
          <button type="button" class="stroll-btn ghost" data-end-going>重新选</button>
        </div>
      `;
      return;
    }
    if (state.routeStage === "loading") {
      confirm.innerHTML = `${confirmCloseHtml()}<p>正在取到「${poi.name}」的步行路线……</p>`;
      return;
    }
    if (state.routeStage === "walking") {
      const key = core.avatarKey(state.session, state.mode);
      const who = core.PERSONA_LABEL[key] ? core.PERSONA_LABEL[key].species : "旅人";
      confirm.innerHTML = `${confirmCloseHtml()}<p>${who}正在替你走这一段，点一下跳过</p>`;
      return;
    }
    confirm.innerHTML = `
      ${confirmCloseHtml()}
      <p>正在前往「${poi.name}」</p>
      <div class="stroll-sheet-actions">
        <button type="button" class="stroll-btn ghost" data-end-going>重新选</button>
        <button type="button" class="stroll-btn" data-follow="${poi.id}">地图跳转</button>
      </div>
    `;
  }

  function renderDock() {
    const pinned = $("stroll-pinned");
    const enrich = $("stroll-enrich");
    pinned.innerHTML = "";
    enrich.innerHTML = "";

    const pinnedIds = [];
    if (state.goingId) pinnedIds.push(state.goingId);
    if (state.pendingId && state.pendingId !== state.goingId) pinnedIds.push(state.pendingId);
    for (const id of state.collectedIds) {
      if (!pinnedIds.includes(id)) pinnedIds.push(id);
    }

    for (const id of pinnedIds) {
      const poi = wrapPoi(core.poiById(state.data, id));
      if (!isPosterImage(poi.category.image)) continue;
      const collected = id !== state.goingId && id !== state.pendingId;
      const sub = id === state.goingId ? "本次要去" : id === state.pendingId ? "待确认" : "已收入";
      pinned.insertAdjacentHTML(
        "beforeend",
        cardHtml({
          id: poi.id,
          attr: "open-detail",
          kind: poi.kind,
          image: poi.category.image,
          title: poi.name,
          sub,
          going: id === state.goingId,
          starred: poi.starred,
          release: collected,
        })
      );
    }

    const cards = core.cabinetCards(state.data, mapBounds(), state.origin, state.session, context());
    if (cards.length === 0) {
      enrich.innerHTML =
        state.mode === core.MODE_GUEST
          ? `<div class="stroll-empty">
              <p>这一带没有合你口味的</p>
              <button type="button" class="stroll-empty-btn" data-switch-mode="global">去全局看看</button>
            </div>`
          : `<div class="stroll-empty"><p>附近暂时没有收录点</p></div>`;
    } else {
      for (const card of cards) {
        const sub =
          card.poi && card.poi.event
            ? `${card.poi.event.timeText} · ${card.poi.event.venue}`
            : core.KIND_LABEL[card.category.kind];
        enrich.insertAdjacentHTML(
          "beforeend",
          cardHtml({
            id: card.category.id,
            attr: "focus-cat",
            kind: card.category.kind,
            image: card.category.image,
            title: card.category.name,
            sub,
            going: false,
            starred: card.starred,
          })
        );
      }
    }

    renderConfirm();
  }

  function onFocusCategory(id) {
    state.focusCategoryId = state.focusCategoryId === id ? null : id;
    renderMarkers();
  }

  function bindRoot(root) {
    root.addEventListener("click", (ev) => {
      const mode = ev.target.closest("[data-mode]");
      if (mode) {
        switchMode(mode.getAttribute("data-mode"));
        return;
      }
      const switcher = ev.target.closest("[data-switch-mode]");
      if (switcher) {
        switchMode(switcher.getAttribute("data-switch-mode"));
        return;
      }
      if (ev.target.closest("[data-goto-plan]")) {
        if (window.GuikeTabs && typeof window.GuikeTabs.go === "function") window.GuikeTabs.go("路线");
        else window.parent.postMessage({ type: "guike:switch-tab", tab: "路线" }, "*");
        return;
      }
      const guestPost = ev.target.closest("[data-open-guest-post]");
      if (guestPost) {
        openGuestPost(guestPost.getAttribute("data-open-guest-post"));
        return;
      }
      const goHereBtn = ev.target.closest("[data-go-here]");
      if (goHereBtn) {
        goHere(goHereBtn.getAttribute("data-go-here"));
        return;
      }
      if (ev.target.closest("[data-poster-go]")) {
        goHereFromPoster();
        return;
      }
      if (ev.target.closest("[data-close-poster]")) {
        closePoster();
        return;
      }
      const favor = ev.target.closest("[data-favor]");
      if (favor) {
        onFavor(favor.getAttribute("data-favor"), favor);
        return;
      }
      const release = ev.target.closest("[data-release]");
      if (release) {
        releaseShop(release.getAttribute("data-release"));
        return;
      }
      const posterCard = ev.target.closest(".stroll-card.is-poster");
      if (posterCard) {
        const img = posterCard.querySelector("img");
        const poiId =
          posterCard.getAttribute("data-open-detail") ||
          nearestPoiId(posterCard.getAttribute("data-focus-cat"));
        openPoster(img.getAttribute("src"), img.getAttribute("alt"), poiId);
        const cat = posterCard.getAttribute("data-focus-cat");
        if (cat) onFocusCategory(cat);
        return;
      }
      const detail = ev.target.closest("[data-open-detail]");
      if (detail) {
        openDetail(detail.getAttribute("data-open-detail"));
        return;
      }
      const cat = ev.target.closest("[data-focus-cat]");
      if (cat) {
        onFocusCategory(cat.getAttribute("data-focus-cat"));
        return;
      }
      const collect = ev.target.closest("[data-collect]");
      if (collect) {
        collectShop(collect.getAttribute("data-collect"));
        return;
      }
      const follow = ev.target.closest("[data-follow]");
      if (follow) {
        openAmap(wrapPoi(core.poiById(state.data, follow.getAttribute("data-follow"))));
        return;
      }
      if (ev.target.closest("[data-close-sheet]")) {
        closeDetail();
        return;
      }
      if (ev.target.closest("[data-confirm-going]")) {
        confirmGoing();
        return;
      }
      if (ev.target.closest("[data-drop-pending]")) {
        dropPending();
        return;
      }
      if (ev.target.closest("[data-end-going]")) {
        endGoing();
        return;
      }
      if (ev.target.closest("[data-close-confirm]")) {
        closeConfirm();
        return;
      }
      if (ev.target.closest("#stroll-tie")) {
        toggleCabinet();
      }
    });
  }

  async function init() {
    if (state.inited) return;
    if (typeof L === "undefined") throw new Error("缺少 Leaflet");
    const modules = await pageModules();
    store = modules.store;
    detailView = modules.detailView;
    ensurePosterLayer();

    state.data = await loadJson("pois.json");
    state.session = await store.load(loadJson, window.localStorage);
    state.window = core.resolveWindow(state.session, new Date());
    state.mode = state.session.planned ? core.MODE_GUEST : core.MODE_GLOBAL;
    loadRuntime();
    const located = await resolveOrigin(state.session);
    state.origin = located.origin;
    state.demo = located.demo;

    const mapEl = $("stroll-map");
    state.map = L.map(mapEl, {
      zoomControl: true,
      attributionControl: true,
      minZoom: MIN_ZOOM,
      maxZoom: MAX_ZOOM,
    }).setView([state.origin.lat, state.origin.lng], DEFAULT_ZOOM);
    state.map.zoomControl.setPosition("topright");

    const gaode = L.tileLayer(
      "https://webrd0{s}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}",
      {
        subdomains: "1234",
        attribution: "&copy; 高德地图",
        maxZoom: MAX_ZOOM,
      }
    ).addTo(state.map);

    let gaodeOk = 0;
    let gaodeErr = 0;
    let switched = false;
    gaode.on("tileload", () => {
      gaodeOk += 1;
    });
    gaode.on("tileerror", () => {
      gaodeErr += 1;
      if (switched || gaodeOk > 0 || gaodeErr < 4) return;
      switched = true;
      state.map.removeLayer(gaode);
      L.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}",
        { attribution: "Esri", maxZoom: MAX_ZOOM }
      ).addTo(state.map);
    });

    state.avatarMarker = L.marker([state.origin.lat, state.origin.lng], {
      icon: avatarIcon(),
      interactive: false,
      zIndexOffset: 400,
    }).addTo(state.map);
    watchOrigin();

    state.map.on("click", () => {
      closePreview();
      closeDetail();
      closePoster();
      if (state.focusCategoryId) {
        state.focusCategoryId = null;
        renderMarkers();
      }
    });
    state.map.on("moveend", () => {
      renderMarkers();
      renderDock();
      placePreview();
    });
    state.map.on("zoomend", placePreview);

    bindRoot($("stroll-root"));
    ensureCabinetChrome();
    applyCabinet();
    state.inited = true;
    state.map.invalidateSize();
    renderModes();
    renderMarkers();
    renderDock();
  }

  async function onShow() {
    await init();
    state.map.invalidateSize();
    renderModes();
    renderMarkers();
    renderDock();
  }

  function onHide() {
    if (!state.inited) return;
    closePreview();
    closeDetail();
    removeRouteLine();
  }

  window.GuikeStroll = { onShow, onHide };
  window.addEventListener("message", (event) => {
    if (event.data?.type !== "guike:visibility") return;
    if (event.data.active) onShow();
    else onHide();
  });

  function applyHash() {
    const hash = decodeURIComponent((location.hash || "").replace(/^#/, ""));
    if (hash && window.GuikeTabs) window.GuikeTabs.go(hash);
  }
  setTimeout(applyHash, 0);
})();
