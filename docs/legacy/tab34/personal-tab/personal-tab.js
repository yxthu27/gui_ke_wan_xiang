(function () {
  "use strict";

  const CATEGORY_LABELS = {
    food: "食",
    scenic: "景",
    shop: "店",
    culture: "非遗",
    experience: "体验"
  };

  const SUBJECT_COPY = {
    cat: { label: "猫", name: "黔灵的小懒猫", desc: "午后的黔灵山脚，一只橘猫蜷在石阶旁晒太阳。" },
    embroidery: { label: "苗绣", name: "山纹苗绣", desc: "靛蓝布面上，针脚把山川、花叶与祝愿悄悄缝在一起。" },
    tree: { label: "古树", name: "山门前的树", desc: "湿润的风穿过枝叶，树影在旧石阶上停留了一会儿。" },
    drink: { label: "刺梨汁茶", name: "一杯刺梨风", desc: "酸甜的刺梨气息从杯口升起，像贵阳傍晚的一阵风。" }
  };

  function mockPhoto(title, colors) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="600" viewBox="0 0 900 600">
      <defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${colors[0]}"/><stop offset="1" stop-color="${colors[1]}"/></linearGradient></defs>
      <rect width="900" height="600" fill="url(#bg)"/><path d="M0 480 Q160 270 310 465 Q470 210 610 470 Q755 310 900 455 V600 H0Z" fill="#446555" opacity=".7"/><path d="M0 505 Q160 380 340 510 Q570 360 900 520 V600H0Z" fill="#dfe8db" opacity=".55"/><text x="52" y="72" fill="#fff" opacity=".86" font-size="28" font-family="serif">${title}</text></svg>`;
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  }

  /* —— 真实贵州实拍图（执行文档 §26/§27：Wikimedia Commons，带来源与授权）——
     失败时回落到手帐渐变 postcard，不使用 AI 生成图 */
  function realPhoto(category, index, size) {
    try {
      const asset = window.GuikePhotos?.pick?.(category, index);
      return asset ? window.GuikePhotos.url(asset.id, size || "card") : null;
    } catch (_error) { return null; }
  }

  /* —— 收藏地点 → 随逛掉落的风物卡片（assets: cards/ 目录，随逛掉落池）—— */
  const PLACE_CARDS = {
    f1: [
      { file: "卡片1 (6).png", title: "肠旺面", note: "随逛掉落 · 肥肠与血旺，贵阳的早晨" },
      { file: "卡片1 (3).png", title: "豆腐圆子", note: "随逛掉落 · 老街现炸，趁热咬开" },
      { file: "卡片1 (9).png", title: "花溪牛肉粉", note: "随逛掉落 · 清汤打底，牛肉给得足" }
    ],
    f2: [
      { file: "卡片1 (8).png", title: "青岩烟火", note: "随逛掉落 · 石板街边的吃食摊" },
      { file: "卡片1 (10).png", title: "恋爱豆腐果", note: "随逛掉落 · 路边炭火上的甜辣气" },
      { file: "卡片1 (7).png", title: "山市食单", note: "随逛掉落 · 贵州风物的一页" }
    ],
    f3: [
      { file: "卡片1 (4).png", title: "酸汤鱼", note: "随逛掉落 · 凯里红酸汤，木姜子点睛" },
      { file: "省博特展.png", title: "省博特展", note: "随逛掉落 · 历史文化与民族工艺" },
      { file: "博物馆.png", title: "民族博物馆", note: "随逛掉落 · 苗绣银饰与手艺" }
    ],
    f4: [
      { file: "图书馆.png", title: "山城讲席", note: "随逛掉落 · 贵州历史与人文讲座" },
      { file: "演唱会.png", title: "山谷回响", note: "随逛掉落 · 夜色与音乐交汇" },
      { file: "卡片1 (2).png", title: "辣子鸡", note: "随逛掉落 · 一盘地道的贵阳辣香" }
    ]
  };

  function openPlaceCards(runtime, id) {
    const place = runtime.data.favoritePlaces.find(entry => entry.id === id);
    if (!place) return;
    const cards = PLACE_CARDS[id] || [];
    runtime.app.querySelector("[data-placecards-mark]").textContent = CATEGORY_LABELS[place.category] || "藏";
    runtime.app.querySelector("[data-placecards-title]").textContent = place.name;
    runtime.app.querySelector("[data-placecards-sub]").textContent =
      `${place.city}${place.district ? ` · ${place.district}` : ""} · 在这里出现过的风物 ${cards.length} 则`;
    const list = runtime.app.querySelector("[data-placecards-list]");
    list.innerHTML = cards.length ? cards.map((card, i) => `
      <figure class="gx-personal-placecards-card" style="--tilt:${((i % 3) - 1) * 2.2}deg; --stagger:${i * 90}ms">
        <img src="cards/${encodeURIComponent(card.file)}" alt="${escapeHtml(card.title)}" loading="lazy">
        <figcaption><b>${escapeHtml(card.title)}</b><small>${escapeHtml(card.note)}</small></figcaption>
      </figure>`).join("") : `<p class="gx-personal-placecards-empty">这一带还没有掉落的卡片，先去随逛走走。</p>`;
    list.scrollLeft = 0;
    openModal(runtime, "place-cards");
  }

  const DEFAULT_DATA = {
    user: { name: "山客", wanxiangCount: 12 },
    todayJourney: {
      id: "journey-20260829",
      date: "2026-08-29",
      city: "贵阳",
      subtitle: "山风经过的第 3 日",
      distance: 8.6,
      duration: 286,
      plannedPlaces: [
        { id: "p1", name: "黔灵山", lat: 26.6042, lng: 106.6932, visited: true, time: "09:20" },
        { id: "p2", name: "文昌阁", lat: 26.5774, lng: 106.7217, visited: true, time: "12:10" },
        { id: "p3", name: "甲秀楼", lat: 26.5667, lng: 106.7145, visited: true, time: "15:35" },
        { id: "p4", name: "青云市集", lat: 26.5584, lng: 106.7078, visited: true, time: "18:20" },
        { id: "p5", name: "电台街小店", lat: 26.5841, lng: 106.7163, visited: false, time: "20:00" }
      ],
      visitedPlaces: ["p1", "p2", "p3", "p4"],
      routePoints: [
        { lat: 26.6042, lng: 106.6932 }, { lat: 26.596, lng: 106.699 },
        { lat: 26.589, lng: 106.708 }, { lat: 26.5774, lng: 106.7217 },
        { lat: 26.571, lng: 106.718 }, { lat: 26.5667, lng: 106.7145 },
        { lat: 26.562, lng: 106.711 }, { lat: 26.5584, lng: 106.7078 },
        { lat: 26.571, lng: 106.712 }, { lat: 26.5841, lng: 106.7163 }
      ]
    },
    wanxiangItems: [
      { id: "wx-cat", subject: "cat", subjectName: "猫", customName: "黔灵山值班员", aiDescription: SUBJECT_COPY.cat.desc, capturedAt: "2026-08-29T16:42:00+08:00", location: { lat: 26.6035, lng: 106.694, placeName: "黔灵山 · 贵阳" }, routeId: "journey-20260829", originalPhoto: mockPhoto("QIANLING · 16:42", ["#ba8d63", "#6d7b60"]) },
      { id: "wx-emb", subject: "embroidery", subjectName: "苗绣", customName: "山纹苗绣", aiDescription: SUBJECT_COPY.embroidery.desc, capturedAt: "2026-08-29T14:21:00+08:00", location: { lat: 26.5768, lng: 106.7209, placeName: "文昌阁 · 贵阳" }, routeId: "journey-20260829", originalPhoto: realPhoto("heritage", 0) || mockPhoto("MIAO EMBROIDERY · 14:21", ["#315c65", "#9e4833"]) },
      { id: "wx-tree", subject: "tree", subjectName: "古树", customName: "山门前的树", aiDescription: SUBJECT_COPY.tree.desc, capturedAt: "2026-08-29T10:08:00+08:00", location: { lat: 26.596, lng: 106.7, placeName: "黔灵山南门 · 贵阳" }, routeId: "journey-20260829", originalPhoto: realPhoto("scenic", 10) || mockPhoto("OLD TREE · 10:08", ["#9fb598", "#5d745d"]) },
      { id: "wx-drink", subject: "drink", subjectName: "刺梨汁茶", customName: "一杯刺梨风", aiDescription: SUBJECT_COPY.drink.desc, capturedAt: "2026-08-29T19:08:00+08:00", location: { lat: 26.5587, lng: 106.7084, placeName: "青云市集 · 贵阳" }, routeId: "journey-20260829", originalPhoto: realPhoto("food", 0) || mockPhoto("ROSA ROXBURGHII · 19:08", ["#c9a046", "#71825f"]) }
    ],
    favoritePlaces: [
      { id: "f1", name: "丝恋红汤丝娃娃", category: "food", city: "贵阳", district: "南明", description: "一口酸辣，卷起贵阳的清爽。", lat: 26.57, lng: 106.71, savedAt: "2026-08-27" },
      { id: "f2", name: "青岩古镇", category: "scenic", city: "贵阳", district: "花溪", description: "石巷、城墙与慢下来的光。", lat: 26.33, lng: 106.68, savedAt: "2026-08-25" },
      { id: "f3", name: "黔东南苗绣工坊", category: "culture", city: "凯里", district: "西江", description: "听针线讲一段山川旧事。", lat: 26.49, lng: 107.59, savedAt: "2026-08-23" },
      { id: "f4", name: "大觉精舍", category: "shop", city: "贵阳", district: "云岩", description: "藏在旧街转角的一间茶屋。", lat: 26.59, lng: 106.72, savedAt: "2026-08-22" }
    ],
    journeys: [
      { id: "journey-20260829", date: "2026-08-29", city: "贵阳", placeCount: 5, wanxiangCount: 4 },
      { id: "journey-20260828", date: "2026-08-28", city: "安顺", placeCount: 4, wanxiangCount: 3, routePoints: [{lat:25.98,lng:105.92},{lat:25.94,lng:105.87},{lat:25.91,lng:105.94},{lat:25.88,lng:105.9}] }
    ],
    savedJourneys: [
      { id: "saved-1", author: "阿木", date: "2026-08-26", city: "黔东南", places: ["肇兴侗寨", "堂安梯田", "鼓楼夜歌"], routePoints: [{lat:25.91,lng:109.18},{lat:25.93,lng:109.22},{lat:25.89,lng:109.25},{lat:25.86,lng:109.21}], savedAt: "2026-08-28",
        dist: 11.2, time: "3h40m", tags: ["非遗", "山野"], saves: 1284, saved: true,
        photo: realPhoto("scenic", 14) || undefined, photoColors: ["#315c65", "#9e4833"], tempIdx: [2], alts: [null, null, "堂安观景台下的老茶铺"],
        stopNotes: ["寨门口的晒谷场，先听了一段侗歌。", "梯田风很大，稻子快黄了。", "TA 当天在这里遇见了夜歌，今天暂时无人确认。"] },
      { id: "saved-2", author: "青禾", date: "2026-08-24", city: "兴义", places: ["万峰林", "纳灰村", "马岭河"], routePoints: [{lat:25.09,lng:104.91},{lat:25.05,lng:104.96},{lat:25.03,lng:104.92},{lat:25.07,lng:104.88}], savedAt: "2026-08-27",
        dist: 9.4, time: "3h05m", tags: ["山野", "松弛"], saves: 936, saved: false,
        photo: realPhoto("scenic", 22) || undefined, photoColors: ["#586B5A", "#AEC2B2"], tempIdx: [1], alts: [null, "纳灰村口的小卖部", null],
        stopNotes: ["峰林下的骑行，风是甜的。", "TA 当天在这里遇见了晒秋，今天暂时无人确认。", "峡谷的水声盖过了人声。"] }
    ]
  };

  /* —— Tab1 主规划数据源（真实持久化，其他 Tab 可直接读取）—— */
  const PLAN_STORAGE_KEY = "guike-main-plan-v1";
  function defaultPlan() {
    return {
      version: 1,
      updatedAt: new Date().toISOString(),
      days: [{
        id: "day-20260829", date: "2026-08-29", city: "贵阳", title: "今日主规划", source: "self",
        places: [
          { name: "黔灵山", time: "09:20" }, { name: "文昌阁", time: "12:10" },
          { name: "甲秀楼", time: "15:35" }, { name: "青云市集", time: "18:20" }
        ]
      }]
    };
  }
  const GuikePlan = {
    load() {
      try {
        const parsed = JSON.parse(localStorage.getItem(PLAN_STORAGE_KEY) || "null");
        return parsed && Array.isArray(parsed.days) && parsed.days.length ? parsed : defaultPlan();
      } catch (_error) { return defaultPlan(); }
    },
    save(plan) {
      plan.updatedAt = new Date().toISOString();
      try { localStorage.setItem(PLAN_STORAGE_KEY, JSON.stringify(plan)); } catch (_error) { /* 存储不可用时仅内存保存 */ }
      window.dispatchEvent(new CustomEvent("guike:plan-updated", { detail: clone(plan) }));
      return plan;
    },
    addBorrow(entry) {
      const plan = this.load();
      const day = plan.days.find(d => d.date === entry.date);
      if (day) {
        entry.places.forEach(place => { if (!day.places.some(x => x.name === place.name)) day.places.push(place); });
        day.source = `borrow+${day.source || "self"}`;
      } else {
        plan.days.unshift({
          id: `day-${entry.date}`, date: entry.date, city: entry.city,
          title: entry.title, places: entry.places, routePoints: entry.routePoints, source: "borrow",
          borrowMeta: { author: entry.author, mode: entry.mode, from: entry.sourceJourneyId, borrowedAt: new Date().toISOString().slice(0, 10) }
        });
      }
      return this.save(plan);
    }
  };
  window.GuikePlan = GuikePlan;

  /* —— 数据增强工具 —— */
  function hashCode(value) {
    let h = 0;
    for (const ch of String(value)) h = (h * 31 + ch.charCodeAt(0)) | 0;
    return Math.abs(h);
  }
  function fmtCount(n) { return Number(n || 0).toLocaleString("en-US"); }
  function routeDistanceKm(points) {
    if (!Array.isArray(points) || points.length < 2) return 0;
    let total = 0;
    for (let i = 1; i < points.length; i += 1) {
      const dy = (points[i].lat - points[i - 1].lat) * 111;
      const dx = (points[i].lng - points[i - 1].lng) * 111 * Math.cos(points[i].lat * Math.PI / 180);
      total += Math.hypot(dy, dx);
    }
    return Math.round(total * 1.27 * 10) / 10;
  }
  function addDaysISO(dateISO, n) {
    const d = new Date(`${dateISO}T12:00:00+08:00`);
    d.setDate(d.getDate() + n);
    return d.toISOString().slice(0, 10);
  }
  function stopTimeAt(i) {
    const m = 9 * 60 + 21 + i * 83;
    return `${pad(Math.floor(m / 60) % 24)}:${pad(m % 60)}`;
  }
  function fmtDuration(min) { return `${Math.floor(min / 60)}h${pad(Math.round(min % 60))}m`; }
  const CITY_PINYIN = { "贵阳": "GUIYANG", "黔东南": "QIANDONGNAN", "兴义": "XINGYI", "安顺": "ANSHUN", "贵州": "GUIZHOU" };
  const PLACE_PINYIN = { "黔灵山": "QIANLING", "文昌阁": "WENCHANGGE", "甲秀楼": "JIAXIU", "青云市集": "QINGYUN", "电台街小店": "DIANTAI", "肇兴侗寨": "ZHAOXING", "堂安梯田": "TANGAN", "鼓楼夜歌": "GULOU", "万峰林": "WANFENGLIN", "纳灰村": "NAHUI", "马岭河": "MALINGHE" };
  function enrichSavedJourney(item) {
    const dist = Number(item.dist) || routeDistanceKm(item.routePoints);
    const minutes = item.time
      ? (() => { const m = String(item.time).match(/(\d+)h(\d+)?/); return m ? Number(m[1]) * 60 + Number(m[2] || 0) : 180; })()
      : Math.max(95, Math.round(dist / 4.6 * 60));
    const stops = (item.places || []).map((name, i) => ({
      name,
      time: item.stopTimes?.[i] || stopTimeAt(i),
      note: item.stopNotes?.[i] || `沿着 ${item.author || "TA"} 的路线经过${name}。`,
      temp: (item.tempIdx || []).includes(i),
      alt: item.alts?.[i] || null
    }));
    return Object.assign({}, item, {
      dist,
      time: item.time || fmtDuration(minutes),
      stops,
      saves: Number(item.saves) || 400 + hashCode(item.id) % 1400,
      saved: item.saved !== false,
      photo: item.photo || mockPhoto(`${item.city || "GUIZHOU"} · ${String(item.date || "").slice(5).replace("-", "/")}`, item.photoColors || ["#586B5A", "#AEC2B2"]),
      tags: item.tags || ["松弛", "城市"]
    });
  }
  function enrichOwnJourney(runtime, item) {
    const points = item.routePoints?.length ? item.routePoints : runtime.data.todayJourney.routePoints;
    return Object.assign({}, item, {
      routePoints: points,
      dist: routeDistanceKm(points),
      photo: item.photo || mockPhoto(`${item.city} · ${String(item.date).slice(5)}`, ["#9bab95", "#546a5d"])
    });
  }

  const AIAdapter = {
    async detectSubjects(image) {
      if (window.GuikeVisionAdapter?.detectSubjects) return window.GuikeVisionAdapter.detectSubjects(image);
      await delay(650);
      return inspectImageTone(image);
    },
    async generateSticker(image, subject) {
      if (window.GuikeVisionAdapter?.generateSticker) return window.GuikeVisionAdapter.generateSticker(image, subject);
      await delay(900);
      return photoStickerDataUri(image, subject?.label || "旅途所见");
    },
    async describeImage(subject) {
      if (window.GuikeVisionAdapter?.describeImage) return window.GuikeVisionAdapter.describeImage(subject);
      await delay(160);
      return subject?.description || `照片里的${subject?.label || "这一眼万象"}保留了原来的形态与颜色，被收入今日行径。`;
    }
  };

  let instance = null;

  function delay(ms) { return new Promise(resolve => window.setTimeout(resolve, ms)); }
  function clone(value) { return JSON.parse(JSON.stringify(value)); }
  function pad(num) { return String(num).padStart(2, "0"); }
  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>'"]/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[char]);
  }
  function dateCN(value) {
    const date = new Date(`${value}T00:00:00+08:00`);
    return `${date.getMonth() + 1}月${date.getDate()}日`;
  }
  function dateDots(value) { return String(value).slice(0, 10).replaceAll("-", "."); }
  function timeText(value) {
    const match = String(value).match(/T(\d{2}:\d{2})/);
    return match ? match[1] : "此刻";
  }

  async function inspectImageTone(source) {
    try {
      const image = await new Promise((resolve, reject) => {
        const element = new Image();
        element.onload = () => resolve(element);
        element.onerror = reject;
        element.src = source;
      });
      const canvas = document.createElement("canvas");
      canvas.width = 48;
      canvas.height = 48;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      ctx.drawImage(image, 0, 0, 48, 48);
      const pixels = ctx.getImageData(0, 0, 48, 48).data;
      let green = 0, warm = 0, pale = 0, dark = 0, blue = 0, vivid = 0;
      for (let index = 0; index < pixels.length; index += 4) {
        const r = pixels[index], g = pixels[index + 1], b = pixels[index + 2];
        const lum = r + g + b;
        if (g > r * .95 && g > b * 1.12) green += 1;
        if (r > g * 1.12 && r > b * 1.18) warm += 1;
        if (b > r * 1.18 && b > g * 1.12) blue += 1;
        if (lum > 640) pale += 1;
        if (lum < 220) dark += 1;
        const max = Math.max(r, g, b), min = Math.min(r, g, b);
        if (max - min > 55) vivid += 1;
      }
      const total = pixels.length / 4;
      const ratio = v => v / total;
      const candidates = [];
      candidates.push({ id: "visual-core", label: "画面中心主体", confidence: .94, type: "photo", description: "从照片中心区域提取的最完整、边界清晰的真实物体。" });
      if (ratio(green) > .18) candidates.push({ id: "visual-plant", label: "草木 / 山景", confidence: Math.min(.93, .72 + ratio(green)), type: "photo", description: "画面以绿色为主，可能是树、叶或远处的山景。" });
      if (ratio(warm) > .12) candidates.push({ id: "visual-food", label: "暖色小物 / 食物", confidence: Math.min(.91, .70 + ratio(warm)), type: "photo", description: "画面存在暖褐、橙黄或红棕主体，常见于人手、食物、器皿。" });
      if (ratio(blue) > .10) candidates.push({ id: "visual-water", label: "水域 / 天空", confidence: Math.min(.88, .68 + ratio(blue)), type: "photo", description: "画面蓝灰区域较多，可能是水面、天空或潮湿的石面。" });
      if (ratio(pale) > .30) candidates.push({ id: "visual-light", label: "浅色器物 / 建筑", confidence: .78, type: "photo", description: "浅色轮廓较集中，可能是建筑、墙面、服饰或纸张。" });
      if (ratio(dark) > .22) candidates.push({ id: "visual-detail", label: "深色前景细节", confidence: .75, type: "photo", description: "前景存在深色轮廓，可作为独立贴画主体。" });
      if (ratio(vivid) > .25) candidates.push({ id: "visual-color", label: "色彩鲜明的物件", confidence: .80, type: "photo", description: "画面色彩对比明显，可能是民族纹样、旗帜或手工艺品。" });
      return candidates.slice(0, 4);
    } catch (_error) {
      return [{ id: "visual-core", label: "画面中心主体", confidence: .84, type: "photo", description: "请核对或改写主体名称后再生成贴画。" }];
    }
  }

  function stickerSvg(type) {
    const commonStart = `<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${escapeHtml(SUBJECT_COPY[type]?.label || "万象贴画")}">`;
    const paper = `<path d="M18 29Q28 10 52 14Q77 5 99 22Q113 42 104 65Q111 88 89 103Q64 115 42 103Q17 105 11 81Q2 56 18 29Z" fill="#f3ead5" stroke="#ded0ae" stroke-width="1.3" opacity=".94"/>`;
    const art = {
      cat: `${paper}<g stroke="#604b37" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M41 54Q33 38 43 29L54 40Q66 35 77 41L87 30Q94 42 84 57Q91 77 77 90Q60 101 43 89Q28 75 41 54Z" fill="#b87d4b"/><path d="M45 66q15 11 31 0q1 20-15 23q-15-2-16-23Z" fill="#d7a574" stroke="none"/><path d="M45 56l5 2m24-2l-5 2M60 66q3 2 6 0" fill="none"/><path d="M39 69q-12-2-18 5m19 1q-11 2-16 9m55-15q12-3 19 3m-19 4q12 1 17 7" fill="none"/></g>`,
      embroidery: `${paper}<g><path d="M28 28Q60 18 92 30L97 90Q61 102 23 89Z" fill="#315f69" stroke="#244b55" stroke-width="2"/><path d="M32 56Q44 33 58 56Q73 32 88 58Q75 82 60 62Q45 83 32 56Z" fill="none" stroke="#d3a64d" stroke-width="4"/><path d="M31 75l14-9 14 13 14-13 16 10M38 38q7 12 14 0q7 12 14 0q7 12 14 0" fill="none" stroke="#b84c38" stroke-width="3"/><circle cx="60" cy="58" r="7" fill="#ede3c5" stroke="#b84c38" stroke-width="2"/></g>`,
      tree: `${paper}<g stroke-linecap="round"><path d="M58 91Q56 71 60 54M60 70l-13-13m13 7l15-16" stroke="#6c5035" stroke-width="8"/><path d="M27 55Q20 39 36 31Q37 16 54 22Q65 8 77 23Q96 21 95 40Q108 50 94 62Q82 74 68 65Q55 75 44 66Q29 71 27 55Z" fill="#68836a" stroke="#456550" stroke-width="2"/><path d="M34 48q10-11 18 1m8-16q9-8 18 2m-12 19q12-10 23 0" fill="none" stroke="#9db498" stroke-width="3"/></g>`,
      drink: `${paper}<g stroke-linecap="round" stroke-linejoin="round"><path d="M37 42H84L79 91Q62 99 43 91Z" fill="#d8b151" fill-opacity=".76" stroke="#7d6b42" stroke-width="2"/><path d="M36 42Q60 35 85 42" fill="none" stroke="#7d6b42" stroke-width="3"/><path d="M71 40l11-20" stroke="#4a6455" stroke-width="3"/><path d="M75 28q14-4 16 6q-10 4-16-6Z" fill="#6e8a6d" stroke="#4a6455" stroke-width="1.5"/><circle cx="52" cy="59" r="7" fill="#c78738"/><circle cx="69" cy="71" r="8" fill="#bb7731"/><path d="M47 82q15 5 29-1" fill="none" stroke="#f2e5bd" stroke-width="2"/></g>`
    };
    return `${commonStart}${art[type] || art.tree}</svg>`;
  }

  function photoStickerDataUri(imageSource, label) {
    const safeSource = escapeHtml(imageSource);
    const safeLabel = escapeHtml(label);
    const uid = Math.random().toString(36).slice(2, 9);
    const torn = tornEdgePath(80, 80, 64, 60, 28, 5);
    const tornInner = tornEdgePath(80, 80, 58, 54, 28, 4);
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="640" viewBox="0 0 160 160" role="img" aria-label="${safeLabel}照片衍生贴画">
      <defs>
        <clipPath id="gx-cut-${uid}"><path d="${torn}"/></clipPath>
        <filter id="gx-paint-${uid}" x="-15%" y="-15%" width="130%" height="130%">
          <feGaussianBlur stdDeviation=".55" result="soft"/>
          <feColorMatrix in="soft" type="matrix" values="1.08 0 0 0 0  0 1.04 0 0 0  0 0 0.96 0 0  0 0 0 1 0" result="adjusted"/>
          <feColorMatrix in="adjusted" type="saturate" values="0.78" result="muted"/>
          <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="3" seed="12" result="grain"/>
          <feDisplacementMap in="muted" in2="grain" scale="2" xChannelSelector="R" yChannelSelector="G" result="displaced"/>
          <feBlend in="displaced" in2="grain" mode="soft-light" result="blended"/>
        </filter>
        <filter id="gx-shadow-${uid}" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="4" stdDeviation="5" flood-color="#2b2a26" flood-opacity="0.18"/>
        </filter>
      </defs>
      <path d="${torn}" fill="#f5ecd8" filter="url(#gx-shadow-${uid})"/>
      <path d="${torn}" fill="#f5ecd8" stroke="#d9c9a5" stroke-width="1.6"/>
      <path d="${tornInner}" fill="none" stroke="#a7bcad" stroke-width="0.7" opacity="0.35"/>
      <g clip-path="url(#gx-cut-${uid})">
        <image href="${safeSource}" x="6" y="6" width="148" height="148" preserveAspectRatio="xMidYMid slice" filter="url(#gx-paint-${uid})"/>
        <rect x="6" y="6" width="148" height="148" fill="#f4ecd8" opacity="0.10"/>
        <rect x="10" y="10" width="140" height="140" fill="none" stroke="#ffffff" stroke-width="1.2" opacity="0.22"/>
      </g>
      <path d="${torn}" fill="none" stroke="#506a59" stroke-width="1.6" opacity="0.55"/>
      <path d="${tornInner}" fill="none" stroke="#506a59" stroke-width="0.7" opacity="0.28" stroke-dasharray="2 3"/>
    </svg>`;
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  }

  function tornEdgePath(cx, cy, rx, ry, segments = 24, irregularity = 4) {
    let d = "";
    for (let i = 0; i <= segments; i += 1) {
      const angle = (i / segments) * Math.PI * 2;
      const bump = 1 + Math.sin(i * 3.7) * 0.045 + Math.cos(i * 5.3) * 0.035 + (i % 2 ? 0.03 : -0.02);
      const x = cx + Math.cos(angle) * rx * bump;
      const y = cy + Math.sin(angle) * ry * bump;
      if (i === 0) {
        d += `M${x.toFixed(1)},${y.toFixed(1)}`;
      } else {
        const prevAngle = ((i - 1) / segments) * Math.PI * 2;
        const cpx = cx + Math.cos(prevAngle + 0.12) * rx * (1.02 + Math.sin(i * 2.1) * 0.02);
        const cpy = cy + Math.sin(prevAngle + 0.12) * ry * (1.02 + Math.cos(i * 2.1) * 0.02);
        d += ` Q${cpx.toFixed(1)},${cpy.toFixed(1)} ${x.toFixed(1)},${y.toFixed(1)}`;
      }
    }
    return d + "Z";
  }

  function stickerDataUri(itemOrType) {
    if (itemOrType && typeof itemOrType === "object" && /^data:image\//.test(itemOrType.stickerImage || "")) return itemOrType.stickerImage;
    const type = typeof itemOrType === "string" ? itemOrType : itemOrType?.subject;
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(stickerSvg(type))}`;
  }

  function stickerMarkup(item) {
    if (/^data:image\//.test(item?.stickerImage || "")) return `<img class="gx-personal-derived-sticker" src="${escapeHtml(item.stickerImage)}" alt="${escapeHtml(item.subjectName || item.customName || "照片衍生贴画")}">`;
    return stickerSvg(item?.subject || item);
  }

  /* faithful=true 时来自真实道路 geometry（执行文档 §19），禁止加装饰性抖动改变拓扑 */
  function normalizedRoute(points, width, height, xPad = 28, yPad = 35, faithful = false) {
    const source = points?.length > 1 ? points : [{ lat: 0, lng: 0 }, { lat: 1, lng: 1 }];
    const lngs = source.map(p => Number(p.lng));
    const lats = source.map(p => Number(p.lat));
    const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
    const minLat = Math.min(...lats), maxLat = Math.max(...lats);
    const dx = maxLng - minLng || 1, dy = maxLat - minLat || 1;
    return source.map((p, index) => ({
      x: xPad + ((Number(p.lng) - minLng) / dx) * (width - xPad * 2) + (faithful ? 0 : Math.sin(index * 0.8) * 4),
      y: yPad + (1 - (Number(p.lat) - minLat) / dy) * (height - yPad * 2) + (faithful ? 0 : Math.sin(index * 1.2) * 6 + Math.cos(index * 0.5) * 3),
      source: p
    }));
  }

  function catmullRomPath(points) {
    if (!points.length) return "";
    if (points.length === 1) return `M${points[0].x},${points[0].y}`;
    let path = `M${points[0].x.toFixed(1)},${points[0].y.toFixed(1)}`;
    for (let i = 0; i < points.length - 1; i += 1) {
      const p0 = points[i - 1] || points[i];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = points[i + 2] || p2;
      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;
      path += ` C${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`;
    }
    return path;
  }

  function nearestRouteIndex(location, routePoints) {
    if (!location || !Number.isFinite(Number(location.lat))) return Math.max(0, routePoints.length - 1);
    let nearest = 0, best = Infinity;
    routePoints.forEach((point, index) => {
      const distance = Math.hypot(Number(point.lat) - Number(location.lat), Number(point.lng) - Number(location.lng));
      if (distance < best) { best = distance; nearest = index; }
    });
    return nearest;
  }

    function routeSvg(journey, items, mode = "hero") {
    const width = mode === "postcard" ? 360 : 340;
    const height = mode === "postcard" ? 230 : mode === "mini" ? 112 : 204;
    const xPad = mode === "postcard" ? 22 : 28;
    const yPad = mode === "mini" ? 18 : 42;
    const faithful = journey.geometrySource === "routing" && (journey.routePoints?.length || 0) > 12;
    const projected = normalizedRoute(journey.routePoints, width, height, xPad, yPad, faithful);
    // 真实 geometry 点数过多时抽稀，保持拓扑不变（执行文档 §19 允许轻微 smoothing）
    const stride = faithful ? Math.ceil(projected.length / 120) : 1;
    const points = stride > 1 ? projected.filter((p, i) => i % stride === 0 || i === projected.length - 1) : projected;
    const path = catmullRomPath(points);

    const uid = Math.random().toString(36).slice(2, 9);
    const waterFilterId = `gx-water-${uid}`;
    const threadGradId = `gx-thread-${uid}`;

    const makeRipple = (offset, amp) => catmullRomPath(points.map((p, i) => ({
      x: p.x + Math.sin(i * 0.9 + offset) * amp,
      y: p.y + offset + Math.cos(i * 0.7 + offset) * amp * 0.6
    })));
    const waterOffsets = mode === "mini" ? [-6, 6] : [-28, -16, 16, 28];
    const waterRipples = waterOffsets.map((off, i) => makeRipple(off, i % 2 ? 3.2 : 4));

    function mountainLayer(yBase, amplify) {
      if (points.length < 2) return "";
      const tops = points.map((p, i) => ({
        x: p.x,
        y: Math.min(height - 6, p.y + Math.sin(i * 0.8) * amplify + yBase)
      }));
      let d = `M0 ${height} L0 ${tops[0].y.toFixed(1)} `;
      for (let i = 1; i < tops.length; i += 1) {
        const prev = tops[i - 1], cur = tops[i];
        const cpx = prev.x + (cur.x - prev.x) / 2;
        d += `C${cpx.toFixed(1)},${prev.y.toFixed(1)} ${cpx.toFixed(1)},${cur.y.toFixed(1)} ${cur.x.toFixed(1)},${cur.y.toFixed(1)} `;
      }
      d += `L${width} ${tops[tops.length - 1].y.toFixed(1)} L${width} ${height} Z`;
      return d;
    }
    const mountainBack = mode === "mini" ? "" : `<path class="gx-personal-mountain-back" d="${mountainLayer(56, 22)}"/>`;
    const mountainMid = mode === "mini" ? "" : `<path class="gx-personal-mountain-mid" d="${mountainLayer(34, 14)}"/>`;
    const mountainFront = mode === "mini" ? "" : `<path class="gx-personal-mountain-front" d="${mountainLayer(16, 8)}"/>`;

    const ethnicPath = catmullRomPath(points.map((p, i) => ({
      x: p.x + Math.cos(i * 0.5) * 7,
      y: p.y + Math.sin(i * 0.6) * 6 - 18
    })));
    const ethnicLine = mode === "mini" ? "" : `<path class="gx-personal-ethnic-line" d="${ethnicPath}"/>`;

    const ornamentPath1 = catmullRomPath(points.map((p, i) => ({ x: p.x + Math.cos(i * 0.7) * 6, y: p.y + Math.sin(i * 0.9) * 5 })));
    const ornamentPath2 = catmullRomPath(points.map((p, i) => ({ x: p.x - Math.sin(i * 0.6) * 5, y: p.y - Math.cos(i * 0.8) * 4 })));

    const river = catmullRomPath(points.map((p, i) => ({ x: p.x + 10 + Math.sin(i * 0.8) * 5, y: p.y + 32 + Math.cos(i * 1.2) * 8 })));

    const icons = {
      house: `<path class="gx-personal-map-icon" d="M-6 4V-4L0-9L6-4V4H-6M-3 4V0H3V4"/>`,
      tree: `<path class="gx-personal-map-tree" d="M0 6V-2M-5 0C-5 -6 0 -10 0 -10C0 -10 5 -6 5 0C5 2 3 4 0 4C-3 4 -5 2 -5 0Z"/>`,
      bridge: `<path class="gx-personal-map-bridge" d="M-10 0C-10 -8 -6 -12 0 -12C6 -12 10 -8 10 0M-10 0H10M-7 -4H7"/>`,
      pagoda: `<path class="gx-personal-map-icon gx-personal-map-icon-accent" d="M0 -10L4 -4H-4ZM-6 -4H6V2H-6ZM-3 2V6M3 2V6"/>`
    };
    const iconPositions = mode === "mini" ? [] : [
      { x: width * .14, y: height * .26, icon: "tree" },
      { x: width * .30, y: height * .70, icon: "house" },
      { x: width * .54, y: height * .23, icon: "bridge" },
      { x: width * .76, y: height * .62, icon: "pagoda" },
      { x: width * .90, y: height * .36, icon: "tree" }
    ];
    const mapIcons = iconPositions.map(pos => `<g transform="translate(${pos.x.toFixed(1)},${pos.y.toFixed(1)}) scale(0.85)">${icons[pos.icon]}</g>`).join("");

    const mapDetails = mode === "mini" ? "" : `<g class="gx-personal-map-context">
      ${mountainBack}
      <path class="gx-personal-map-ridge gx-personal-map-ridge-back" d="M0 ${height - 14} Q42 ${height - 72} 82 ${height - 24} Q126 ${height - 92} 170 ${height - 30} Q218 ${height - 86} 260 ${height - 31} Q304 ${height - 72} ${width} ${height - 20} V${height}H0Z"/>
      <path class="gx-personal-map-ridge" d="M0 ${height - 5} Q38 ${height - 47} 76 ${height - 15} Q112 ${height - 63} 150 ${height - 14} Q192 ${height - 58} 232 ${height - 10} Q280 ${height - 56} ${width} ${height - 8} V${height}H0Z"/>
      <path class="gx-personal-map-road" d="M-8 44 Q72 30 132 67 T252 55 T354 72"/><path class="gx-personal-map-road" d="M24 12 Q70 83 119 113 T211 153 T328 177"/><path class="gx-personal-map-road" d="M4 136 Q85 116 158 132 T336 112"/>
      <path class="gx-personal-map-river" d="${river}"/>
      ${mountainMid}
      ${mapIcons}
      <g class="gx-personal-map-glyph gx-personal-map-glyph-a" transform="translate(${width * .18} ${height * .34})"><path d="M-7 6L0-6L7 6M-4 1H4M0-6V10"/></g>
      <g class="gx-personal-map-glyph gx-personal-map-glyph-b" transform="translate(${width * .82} ${height * .27})"><path d="M-8 6H8M-6 6V-2L0-7L6-2V6M-3 1H3"/></g>
    </g>`;

    const places = (journey.plannedPlaces || []).map((place, i) => {
      const rawIndex = nearestRouteIndex(place, journey.routePoints);
      const routeIndex = faithful ? Math.round(rawIndex * (points.length - 1) / Math.max(1, journey.routePoints.length - 1)) : rawIndex;
      const p = points[routeIndex] || points[Math.min(i, points.length - 1)];
      const visited = place.visited ?? journey.visitedPlaces?.includes(place.id);
      const showLabel = mode !== "mini" && i < 5;
      const labelY = p.y + (i % 2 ? 22 : -16);
      const labelX = Math.max(28, Math.min(width - 32, p.x + (i % 2 ? -6 : 6)));
      return `<g class="gx-personal-route-place">
        <circle class="gx-personal-route-node-ring" cx="${p.x}" cy="${p.y}" r="${mode === "mini" ? 6 : 9}"/>
        <circle class="gx-personal-route-node ${visited ? "gx-personal-is-visited" : ""}" cx="${p.x}" cy="${p.y}" r="${mode === "mini" ? 2.8 : 4.6}"/>
        ${visited ? `<circle class="gx-personal-route-node-inner" cx="${p.x}" cy="${p.y}" r="${mode === "mini" ? 1.2 : 2.1}"/>` : ''}
        ${showLabel ? `<text class="gx-personal-route-index" x="${p.x}" y="${p.y + 2.6}" text-anchor="middle">${i + 1}</text><text class="gx-personal-route-label" x="${labelX}" y="${labelY}" text-anchor="middle">${escapeHtml(place.name)}</text>` : ""}
      </g>`;
    }).join("");

    const weaveKnots = mode === "mini" ? "" : points.filter((_p, index) => index > 0 && index < points.length - 1 && index % 3 === 0).map((point, index) => `<g class="gx-personal-route-knot" transform="translate(${point.x} ${point.y}) rotate(${index % 2 ? 42 : -42})">
      <path d="M-9 0L0-7L9 0L0 7Z"/>
      <circle r="2.5"/>
      <circle r="1" fill="var(--ink-soft)"/>
    </g>`).join("");

    const ornaments = mode === "mini" ? "" : points.filter((_p, index) => index % 4 === 0 && index > 0 && index < points.length - 1).map((point) => `<g class="gx-personal-route-ornament" transform="translate(${point.x} ${point.y})">
      <path d="M-5 0a5 5 0 015-5 5 5 0 015 5 5 5 0 01-5 5 5 5 0 01-5-5" fill="none" stroke="var(--mount-soft)" stroke-width="1.2"/>
    </g>`).join("");

    const stickers = mode === "hero" ? (items || []).slice(0, 4).map((item, i) => {
      const rawIndex = nearestRouteIndex(item.location, journey.routePoints);
      const index = faithful ? Math.round(rawIndex * (points.length - 1) / Math.max(1, journey.routePoints.length - 1)) : rawIndex;
      const p = points[index] || points[points.length - 1];
      const x = Math.max(10, Math.min(width - 34, p.x + (i % 2 ? 10 : -16)));
      const y = Math.max(7, p.y - 40 - (i % 2) * 6);
      return `<image class="gx-personal-route-sticker" href="${escapeHtml(item.cutoutImage || stickerDataUri(item))}" x="${x}" y="${y}" width="36" height="36"/>`;
    }).join("") : "";

    return `<svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
      <defs>
        <filter id="${waterFilterId}" x="-20%" y="-20%" width="140%" height="140%">
          <feTurbulence type="fractalNoise" baseFrequency="0.03" numOctaves="2" seed="5" result="noise"/>
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="2" xChannelSelector="R" yChannelSelector="G"/>
        </filter>
        <linearGradient id="${threadGradId}" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="var(--mount-soft)" stop-opacity="0.6"/>
          <stop offset="50%" stop-color="var(--mount-2)" stop-opacity="0.8"/>
          <stop offset="100%" stop-color="var(--mount-soft)" stop-opacity="0.6"/>
        </linearGradient>
      </defs>
      ${mapDetails}
      ${mountainFront}
      <path class="gx-personal-route-wash" d="${path}"/>
      ${waterRipples.map((ripple, i) => `<path class="gx-personal-water-ripple gx-personal-water-ripple-${i + 1}" d="${ripple}" ${i === 0 ? `filter="url(#${waterFilterId})"` : ""}/>`).join("")}
      <path class="gx-personal-route-ornament-line" d="${ornamentPath1}" fill="none" stroke="var(--mount-soft)" stroke-width="1.5" stroke-linecap="round" opacity="0.4"/>
      <path class="gx-personal-route-ornament-line" d="${ornamentPath2}" fill="none" stroke="var(--mount-soft)" stroke-width="1" stroke-linecap="round" opacity="0.3"/>
      ${ethnicLine}
      <path class="gx-personal-route-main" d="${path}"/>
      <path class="gx-personal-route-thread" d="${path}" stroke="url(#${threadGradId})"/>
      ${ornaments}
      ${weaveKnots}
      ${places}
      ${stickers}
    </svg>`;
  }
  function createRuntime(root, data) {
    const app = root.matches?.("[data-personal-app]") ? root : root.querySelector("[data-personal-app]");
    if (!app) throw new Error("GuikePersonal: 未找到 [data-personal-app] 根节点，请先插入 personal-tab.html。 ");
    const runtime = {
      root,
      app,
      data: Object.assign(clone(DEFAULT_DATA), clone(data || {})),
      aborter: new AbortController(),
      stream: null,
      lastFocus: null,
      activeModal: null,
      activeCollection: "places",
      activeWanxiangId: null,
      activeSavedId: null,
      borrowState: null,
      filmState: null,
      detectedSubjects: [],
      selectedSubject: null,
      capturedImage: null,
      capturedCutout: null,
      capturedCutoutOverlay: null,
      cutoutPromise: null,
      cutoutMode: null,
      capturedLocation: null,
      pendingWanxiang: null,
      selectedStickerId: null,
      stickerPositions: {},
      removedStickerIds: new Set(),
      pointerMap: new Map(),
      gesture: null,
      frameContent: app.closest(".content"),
      frameContentZIndex: "",
      toastTimer: 0,
      clickTimer: 0
    };
    runtime.data.savedJourneys = (runtime.data.savedJourneys || []).map(enrichSavedJourney);
    initializeStickerPositions(runtime);
    bindEvents(runtime);
    renderAll(runtime);
    // 他人行径/借入行径也升级为真实道路 geometry（缓存共享，同路线只请求一次）
    (runtime.data.savedJourneys || []).forEach(item => upgradeJourneyGeometry(runtime, item, () => renderCollection(runtime)));
    return runtime;
  }

  function initializeStickerPositions(runtime) {
    const defaults = [
      { x: 24, y: 49, scale: 1, rotate: -8 },
      { x: 69, y: 43, scale: .92, rotate: 7 },
      { x: 44, y: 69, scale: .9, rotate: -3 },
      { x: 77, y: 70, scale: .88, rotate: 10 }
    ];
    runtime.data.wanxiangItems.forEach((item, index) => {
      runtime.stickerPositions[item.id] = Object.assign({}, defaults[index % defaults.length]);
    });
  }

  function renderAll(runtime) {
    const journey = runtime.data.todayJourney;
    runtime.app.querySelector("[data-wanxiang-count]").textContent = runtime.data.user?.wanxiangCount || runtime.data.wanxiangItems.length;
    runtime.app.querySelector("[data-journey-meta]").textContent = `${dateCN(journey.date)} · ${journey.city}`;
    runtime.app.querySelector("#personal-today-title").textContent = journey.subtitle || "今日行径";
    runtime.app.querySelector("[data-journey-stats]").textContent = `${journey.plannedPlaces?.length || 0}处 · ${journey.distance || 0}km`;
    renderRoute(runtime);
    renderWanxiang(runtime);
    renderCollection(runtime);
  }

  function renderRoute(runtime) {
    const { todayJourney: journey, wanxiangItems } = runtime.data;
    const stage = runtime.app.querySelector("[data-route-stage]");
    if (!journey?.routePoints?.length) {
      stage.innerHTML = `<div class="gx-personal-empty"><div><strong>今日尚未落笔。</strong><p>去路线里选一程，山纹便会从那里生长。</p><button type="button" data-action="switch-route">去选路线</button></div></div>`;
      return;
    }
    stage.innerHTML = routeSvg(journey, wanxiangItems, "hero");
    if (!runtime.heroDrawn) {
      runtime.heroDrawn = true;
      stage.classList.remove("gx-personal-hero-draw");
      void stage.offsetWidth;
      stage.classList.add("gx-personal-hero-draw");
    }
    upgradeJourneyGeometry(runtime, journey, () => {
      runtime.app.querySelector("[data-journey-stats]").textContent = `${journey.plannedPlaces?.length || 0}处 · ${journey.distance || 0}km`;
      renderRoute(runtime);
    });
  }

  /* —— 真实道路 geometry 升级（执行文档 §14–§19）：POI 坐标 → Routing API → routePoints，
        山纹 Hero / 详情 / 明信片 / 贵客帖共用同一份 geometry —— */
  function upgradeJourneyGeometry(runtime, journey, rerender) {
    if (!window.GuikeRoute || journey.geometrySource === "routing" || journey.geometryUpgrading) return;
    let coords = (journey.plannedPlaces || [])
      .map(p => ({ lat: Number(p.lat), lng: Number(p.lng) }))
      .filter(p => Number.isFinite(p.lat) && Number.isFinite(p.lng));
    if (coords.length < 2) coords = (journey.routePoints || [])
      .map(p => ({ lat: Number(p.lat), lng: Number(p.lng) }))
      .filter(p => Number.isFinite(p.lat) && Number.isFinite(p.lng));
    if (coords.length < 2) return;
    journey.geometryUpgrading = true;
    window.GuikeRoute.planRoute(coords).then(result => {
      journey.geometryUpgrading = false;
      if (result.source !== "routing" || !runtime.root.isConnected) return;
      journey.routePoints = result.points;
      journey.geometrySource = "routing";
      if (journey === runtime.data.todayJourney && Number.isFinite(result.distanceKm)) journey.distance = result.distanceKm;
      rerender?.();
    }).catch(() => { journey.geometryUpgrading = false; });
  }

  function renderWanxiang(runtime) {
    const list = runtime.app.querySelector("[data-wanxiang-list]");
    const items = runtime.data.wanxiangItems;
    if (!items.length) {
      list.innerHTML = `<div class="gx-personal-empty"><div><strong>沿途所见，都可以收入万象。</strong><button type="button" data-action="open-camera">拍下第一景</button></div></div>`;
      return;
    }
    list.innerHTML = items.map(item => `<button type="button" class="gx-personal-wanxiang-item" data-wanxiang-id="${escapeHtml(item.id)}" aria-label="查看${escapeHtml(item.customName)}详情">
      <span class="gx-personal-sticker-art">${stickerMarkup(item)}</span><span class="gx-personal-wanxiang-source">${item.stickerImage ? "源自照片" : "手帐示例"}</span><strong>${escapeHtml(item.customName)}</strong><time>${escapeHtml(timeText(item.capturedAt))}</time>
    </button>`).join("");
  }

  function renderCollection(runtime) {
    const body = runtime.app.querySelector("[data-collection-body]");
    if (runtime.activeCollection === "places") {
      if (!runtime.data.favoritePlaces.length) {
        body.innerHTML = `<div class="gx-personal-empty"><div><strong>还没有私藏之地。</strong><p>路线里点亮的收藏，会安静地落在这里。</p></div></div>`;
        return;
      }
      body.innerHTML = `<div class="gx-personal-place-grid">${runtime.data.favoritePlaces.map(place => `<button type="button" class="gx-personal-place-card" data-action="place-detail" data-place-id="${escapeHtml(place.id)}" data-mark="${escapeHtml(CATEGORY_LABELS[place.category] || "藏")}">
        <small>${escapeHtml(place.city)} · ${escapeHtml(CATEGORY_LABELS[place.category] || place.category)}</small><span class="gx-personal-favorite-star" aria-label="已收藏">◆</span><strong>${escapeHtml(place.name)}</strong><p>${escapeHtml(place.description)}</p>
      </button>`).join("")}</div>`;
      return;
    }
    if (runtime.activeCollection === "journeys") {
      body.innerHTML = runtime.data.journeys.length ? `<div class="gx-personal-journey-list">${runtime.data.journeys.map(item => journeyCard(runtime, item, false)).join("")}</div>` : `<div class="gx-personal-empty"><div><strong>还没有保存的行径。</strong></div></div>`;
      return;
    }
    body.innerHTML = runtime.data.savedJourneys.length ? `<div class="gx-personal-journey-list">${runtime.data.savedJourneys.map(item => journeyCard(runtime, item, true)).join("")}</div>` : `<div class="gx-personal-empty"><div><strong>去广场看看别人的贵州。</strong><button type="button" data-action="switch-square">去广场</button></div></div>`;
  }

  function journeyCard(runtime, item, saved) {
    const sourceJourney = item.id === runtime.data.todayJourney.id ? runtime.data.todayJourney : Object.assign({ plannedPlaces: [] }, item);
    const points = item.routePoints || sourceJourney.routePoints || runtime.data.todayJourney.routePoints;
    const journey = Object.assign({}, sourceJourney, { routePoints: points });
    const stops = saved ? (item.places?.length || 0) : (item.placeCount || sourceJourney.plannedPlaces?.length || 0);
    const dist = saved ? Number(item.dist) || routeDistanceKm(points) : Number(runtime.data.todayJourney.distance) || routeDistanceKm(points);
    const saves = saved ? (item.saves || 0) : (item.wanxiangCount || 0);
    const cityPinyin = CITY_PINYIN[item.city] || "GUIZHOU";
    const serial = `GX-${String(hashCode(item.id) % 9000 + 1000)}`;
    const openTag = saved ? `<button type="button" class="gx-personal-pass" data-action="open-saved" data-journey-id="${escapeHtml(item.id)}" aria-label="打开${escapeHtml(item.author)}的行径详情">` : `<article class="gx-personal-pass">`;
    const closeTag = saved ? `</button>` : `</article>`;
    // 双层背景：真实照片在上，加载失败时透出手帐渐变（§36 图片降级，不用 AI 图补位）
    const photoMain = saved ? item.photo : mockPhoto(`${item.city} · ${String(item.date).slice(5)}`, ["#9bab95", "#546a5d"]);
    const photoFallback = mockPhoto(`${item.city || "GUIZHOU"} · ${String(item.date || "").slice(5).replace("-", "/")}`, item.photoColors || ["#586B5A", "#AEC2B2"]);
    return `${openTag}
      <span class="gx-personal-pass-photo" style="background-image:url('${photoMain}'), url('${photoFallback}')"></span>
      <span class="gx-personal-pass-photo-route" aria-hidden="true">${routeSvg(journey, [], "mini")}</span>
      ${saved && item.borrowed ? `<span class="gx-personal-pass-borrowed">已借 · ${dateDots(item.borrowedDate || "")}</span>` : ""}
      <span class="gx-personal-pass-main">
        <small class="gx-personal-pass-kicker">${saved ? `${escapeHtml(item.author)} · ROUTE PASS` : "MY JOURNEY · ROUTE PASS"}</small>
        <strong>${dateCN(item.date)} · ${escapeHtml(item.city)}</strong>
        <em>${saved ? escapeHtml(item.tags?.join(" / ") || "贵州路线") : `${item.wanxiangCount || 0} 枚万象收藏`}</em>
      </span>
      <span class="gx-personal-pass-tear" aria-hidden="true"><i></i><i></i></span>
      <span class="gx-personal-pass-stub">
        <b>${cityPinyin}</b><small>GUIZHOU</small>
        <span class="gx-personal-pass-stub-row"><i>${String(item.date).replaceAll("-", ".")}</i></span>
        <span class="gx-personal-pass-stub-row"><i>${stops} STOP</i><i>${dist.toFixed(1)} KM</i></span>
        <span class="gx-personal-pass-stub-row gx-personal-pass-stub-save"><i>♥ ${fmtCount(saves)}</i></span>
        <span class="gx-personal-pass-serial">${serial}</span>
      </span>
    ${closeTag}`;
  }

  function bindEvents(runtime) {
    const signal = runtime.aborter.signal;
    runtime.app.addEventListener("click", event => handleClick(runtime, event), { signal });
    runtime.app.addEventListener("dblclick", event => handleDoubleClick(runtime, event), { signal });
    runtime.app.addEventListener("change", event => handleChange(runtime, event), { signal });
    runtime.app.addEventListener("keydown", event => handleKeydown(runtime, event), { signal });
    runtime.app.addEventListener("pointerdown", event => handlePointerDown(runtime, event), { signal });
    runtime.app.addEventListener("pointermove", event => handlePointerMove(runtime, event), { signal });
    runtime.app.addEventListener("pointerup", event => handlePointerUp(runtime, event), { signal });
    runtime.app.addEventListener("pointercancel", event => handlePointerUp(runtime, event), { signal });

    // Journey Tape 连续拖动：free drag，无 snap（执行文档 §23）
    const tape = runtime.app.querySelector("[data-film-scrub]");
    if (tape) {
      const onDown = event => {
        const state = runtime.filmState;
        if (!state || state.mode === "album" || !state.frames.length) return;
        stopFilmPlayback(runtime);
        state.dragging = true;
        state.dragStartX = event.clientX;
        state.dragStartOffset = state.offset;
        tape.setPointerCapture?.(event.pointerId);
      };
      const onMove = event => {
        const state = runtime.filmState;
        if (!state?.dragging) return;
        applyFilmOffset(runtime, state.dragStartOffset + (event.clientX - state.dragStartX));
      };
      const onUp = () => { if (runtime.filmState) runtime.filmState.dragging = false; };
      tape.addEventListener("pointerdown", onDown, { signal });
      tape.addEventListener("pointermove", onMove, { signal });
      tape.addEventListener("pointerup", onUp, { signal });
      tape.addEventListener("pointercancel", onUp, { signal });
    }
  }

  function handleClick(runtime, event) {
    const borrowMode = event.target.closest("[data-borrow-mode]");
    if (borrowMode) { pickBorrowMode(runtime, borrowMode.dataset.borrowMode); return; }
    const borrowDate = event.target.closest("[data-borrow-date]");
    if (borrowDate) {
      const type = borrowDate.dataset.borrowDate;
      if (type === "other" || type === "newday") {
        pickBorrowDate(runtime, type, runtime.borrowState?.dateValue || "");
        const picker = borrowDate.querySelector("input[type='date']");
        if (picker && event.target === borrowDate) picker.showPicker?.();
      } else {
        pickBorrowDate(runtime, type, null);
      }
      return;
    }
    const filmModeButton = event.target.closest("[data-film-mode]");
    if (filmModeButton) { setFilmMode(runtime, filmModeButton.dataset.filmMode); return; }
    const borrowPlace = event.target.closest("[data-borrow-place]");
    if (borrowPlace) { updateBorrowTarget(runtime); return; }
    const filmChip = event.target.closest("[data-film-chip]");
    if (filmChip) { centerFilmFrame(runtime, Number(filmChip.dataset.filmChip)); return; }
    const wanxiang = event.target.closest("[data-wanxiang-id]");
    if (wanxiang) {
      window.clearTimeout(runtime.clickTimer);
      runtime.clickTimer = window.setTimeout(() => openWanxiang(runtime, wanxiang.dataset.wanxiangId), 220);
      return;
    }
    const collectionTab = event.target.closest("[data-collection-tab]");
    if (collectionTab) {
      runtime.activeCollection = collectionTab.dataset.collectionTab;
      runtime.app.querySelectorAll("[data-collection-tab]").forEach(button => {
        const active = button === collectionTab;
        button.classList.toggle("gx-personal-is-active", active);
        button.setAttribute("aria-selected", String(active));
      });
      renderCollection(runtime);
      return;
    }
    const subjectButton = event.target.closest("[data-subject]");
    if (subjectButton) { selectSubject(runtime, subjectButton.dataset.subject); return; }
    const editorSticker = event.target.closest("[data-editor-sticker]");
    if (editorSticker) { selectEditorSticker(runtime, editorSticker.dataset.editorSticker); return; }
    const actionElement = event.target.closest("[data-action]");
    if (!actionElement) return;
    const action = actionElement.dataset.action;
    const actions = {
      "scroll-wanxiang": () => runtime.app.querySelector("[data-wanxiang-section]")?.scrollIntoView({ behavior: "smooth", block: "start" }),
      "open-camera": () => openCamera(runtime),
      "close-modal": () => closeModal(runtime),
      "start-camera": () => startCamera(runtime),
      "choose-photo": () => runtime.app.querySelector("[data-photo-input]").click(),
      "capture-photo": () => capturePhoto(runtime),
      "camera-restart": () => resetCamera(runtime),
      "add-custom-subject": () => addCustomSubject(runtime),
      "direct-sticker": () => generateDirectSticker(runtime),
      "generate-sticker": () => generatePendingSticker(runtime),
      "save-wanxiang": () => saveWanxiang(runtime),
      "rename-wanxiang": () => renameWanxiang(runtime),
      "wanxiang-more": () => {
        const menu = runtime.app.querySelector("[data-more-menu]");
        if (menu) menu.hidden = !menu.hidden;
      },
      "delete-wanxiang": () => deleteWanxiang(runtime),
      "join-journey": () => joinJourney(runtime),
      "open-journey": () => openJourney(runtime),
      "journey-to-postcard": () => { closeModal(runtime, false); window.setTimeout(() => openPostcard(runtime), 80); },
      "open-postcard": () => openPostcard(runtime),
      "animate-postcard": () => animatePostcard(runtime),
      "sticker-smaller": () => transformSelectedSticker(runtime, { scale: -.1 }),
      "sticker-larger": () => transformSelectedSticker(runtime, { scale: .1 }),
      "sticker-rotate": () => transformSelectedSticker(runtime, { rotate: 12 }),
      "sticker-remove": () => removeSelectedSticker(runtime),
      "save-postcard": () => savePostcard(runtime),
      "share-postcard": () => sharePostcard(runtime),
      "publish-postcard": () => publishPostcard(runtime),
      "borrow-journey": () => openSavedJourney(runtime, actionElement.dataset.journeyId),
      "open-saved": () => openSavedJourney(runtime, actionElement.dataset.journeyId),
      "toggle-saved-save": () => toggleSavedSave(runtime),
      "open-borrow": () => openBorrow(runtime),
      "close-borrow": () => closeBorrow(runtime),
      "confirm-borrow": () => confirmBorrow(runtime),
      "open-film": () => openFilm(runtime),
      "film-play": () => startFilmPlayback(runtime),
      "film-mode": () => setFilmMode(runtime, actionElement.dataset.filmMode),
      "switch-route": () => dispatchTab("路线"),
      "switch-square": () => dispatchTab("广场"),
      "place-detail": () => openPlaceCards(runtime, actionElement.dataset.placeId)
    };
    actions[action]?.();
  }

  function handleDoubleClick(runtime, event) {
    const item = event.target.closest("[data-wanxiang-id]");
    if (!item) return;
    window.clearTimeout(runtime.clickTimer);
    openWanxiang(runtime, item.dataset.wanxiangId);
  }

  function handleChange(runtime, event) {
    if (event.target.matches("[data-borrow-datepicker]")) { pickBorrowDate(runtime, "other", event.target.value); return; }
    if (event.target.matches("[data-borrow-newday]")) { pickBorrowDate(runtime, "newday", event.target.value); return; }
    if (!event.target.matches("[data-photo-input]") || !event.target.files?.[0]) return;
    const reader = new FileReader();
    reader.onload = () => processPhoto(runtime, reader.result);
    reader.readAsDataURL(event.target.files[0]);
    event.target.value = "";
  }

  function handleKeydown(runtime, event) {
    if (!runtime.activeModal) return;
    if (event.key === "Escape") { event.preventDefault(); closeModal(runtime); return; }
    if (event.key !== "Tab") return;
    const overlay = runtime.app.querySelector(`[data-modal="${runtime.activeModal}"]`);
    const focusables = [...overlay.querySelectorAll('button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])')].filter(el => !el.hidden && el.offsetParent !== null);
    if (!focusables.length) return;
    const first = focusables[0], last = focusables[focusables.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  }

  function openModal(runtime, name) {
    if (runtime.activeModal) closeModal(runtime, false);
    runtime.lastFocus = document.activeElement;
    const overlay = runtime.app.querySelector(`[data-modal="${name}"]`);
    if (!overlay) return;
    overlay.hidden = false;
    runtime.activeModal = name;
    runtime.app.style.overflow = "hidden";
    if (runtime.frameContent) {
      runtime.frameContentZIndex = runtime.frameContent.style.zIndex;
      runtime.frameContent.style.zIndex = "6";
    }
    window.setTimeout(() => overlay.querySelector("button, input, [tabindex]")?.focus(), 20);
  }

  function closeModal(runtime, restoreFocus = true) {
    if (!runtime.activeModal) return;
    const overlay = runtime.app.querySelector(`[data-modal="${runtime.activeModal}"]`);
    if (overlay) overlay.hidden = true;
    if (runtime.activeModal === "camera") stopCamera(runtime);
    if (runtime.activeModal === "film") stopFilmPlayback(runtime);
    runtime.activeModal = null;
    runtime.app.style.overflow = "";
    if (runtime.frameContent) runtime.frameContent.style.zIndex = runtime.frameContentZIndex;
    if (restoreFocus) runtime.lastFocus?.focus?.();
  }

  function showToast(runtime, message) {
    const toast = runtime.app.querySelector("[data-toast]");
    toast.textContent = message;
    toast.classList.add("gx-personal-is-visible");
    window.clearTimeout(runtime.toastTimer);
    runtime.toastTimer = window.setTimeout(() => toast.classList.remove("gx-personal-is-visible"), 2400);
  }

  function showCameraStep(runtime, step) {
    runtime.app.querySelectorAll("[data-camera-step]").forEach(element => element.classList.toggle("gx-personal-is-active", element.dataset.cameraStep === step));
  }

  function openCamera(runtime) {
    runtime.detectedSubjects = [];
    runtime.selectedSubject = null;
    runtime.capturedImage = null;
    runtime.capturedCutout = null;
    runtime.capturedCutoutOverlay = null;
    runtime.cutoutPromise = null;
    runtime.cutoutMode = null;
    runtime.pendingWanxiang = null;
    showCameraStep(runtime, "source");
    openModal(runtime, "camera");
  }

  async function startCamera(runtime) {
    showToast(runtime, "正在请求相机权限…");
    try {
      runtime.stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false });
      const video = runtime.app.querySelector("[data-camera-video]");
      video.srcObject = runtime.stream;
      showCameraStep(runtime, "live");
    } catch (_error) {
      showToast(runtime, "相机暂不可用，请从相册继续");
      runtime.app.querySelector("[data-photo-input]").click();
    }
  }

  function stopCamera(runtime) {
    runtime.stream?.getTracks?.().forEach(track => track.stop());
    runtime.stream = null;
    const video = runtime.app.querySelector("[data-camera-video]");
    if (video) video.srcObject = null;
  }

  function capturePhoto(runtime) {
    const video = runtime.app.querySelector("[data-camera-video]");
    if (!video.videoWidth) { showToast(runtime, "镜头还在醒来，请稍候再拍"); return; }
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d").drawImage(video, 0, 0);
    stopCamera(runtime);
    processPhoto(runtime, canvas.toDataURL("image/jpeg", .86));
  }

  async function processPhoto(runtime, source) {
    runtime.capturedImage = source;
    runtime.capturedCutout = null;
    runtime.capturedCutoutOverlay = null;
    runtime.cutoutMode = null;
    runtime.app.querySelector("[data-scan-image]").src = source;
    showCameraStep(runtime, "analyzing");
    locateCapture(runtime);
    const scanStage = runtime.app.querySelector(".gx-personal-scan-stage");
    scanStage.classList.remove("gx-personal-has-beam");
    void scanStage.offsetWidth;
    scanStage.classList.add("gx-personal-has-beam");
    runtime.app.querySelector("[data-scan-status]").textContent = "万象扫描中";
    const subjectPromise = AIAdapter.detectSubjects(source).catch(async () => {
      // 执行文档 §36：语义识别失败时仍用本地显著物体模型完成真实抠图。
      return inspectImageTone(source);
    });
    runtime.cutoutPromise = makeCutoutResult(source, "visual-core", progress => {
      if (runtime.activeModal !== "camera") return;
      const label = progress.percent === null ? "正在载入本地抠图模型" : `本地模型载入 ${progress.percent}%`;
      runtime.app.querySelector("[data-scan-status]").textContent = label;
    });
    const [subjects, cutout] = await Promise.all([subjectPromise, runtime.cutoutPromise, delay(1500)]);
    runtime.capturedCutout = cutout.image;
    runtime.capturedCutoutOverlay = cutout.overlay;
    runtime.cutoutMode = cutout.mode;
    if (runtime.activeModal !== "camera") return;
    runtime.app.querySelector("[data-scan-status]").textContent = cutout.mode === "local-ai" ? "核心主体已自动分离" : "扫描完成 · 请核对主体";
    runtime.detectedSubjects = (subjects || []).map((subject, index) => typeof subject === "string"
      ? { id: subject, label: SUBJECT_COPY[subject]?.label || subject, confidence: .76, type: "photo", description: SUBJECT_COPY[subject]?.desc || "可点选生成贴画。" }
      : Object.assign({ id: `detected-${index}`, label: `识别主体 ${index + 1}`, confidence: .72, type: "photo", description: "可点选生成贴画。" }, subject));
    runtime.app.querySelector("[data-analysis-mode]").textContent = cutout.mode === "local-ai" ? "本地 AI 抠图完成" : ((subjects || []).some(subject => subject && subject.source === "stepfun-vision") ? "AI 识别完成" : "本地视觉识别");
    runtime.selectedSubject = null;
    const options = runtime.app.querySelector("[data-subject-options]");
    options.innerHTML = runtime.detectedSubjects.map(subject => `<button type="button" data-subject="${escapeHtml(subject.id)}" aria-pressed="false"><span><b>${escapeHtml(subject.label)}</b><small>${Math.round(Number(subject.confidence || 0) * 100)}% 匹配</small></span><em>✓</em><i>${escapeHtml(subject.description)}</i></button>`).join("");
    runtime.app.querySelector("[data-analysis-summary]").textContent = `共辨认出 ${runtime.detectedSubjects.length} 个可能主体。点击照片里的银色轮廓锁定主体，或直接改写。`;
    runtime.app.querySelector("[data-custom-subject]").value = "";
    runtime.app.querySelector("[data-subject-confirmation]").textContent = "点击银色轮廓锁定主体，再把 TA 拾起来。";
    runtime.app.querySelector('[data-action="generate-sticker"]').disabled = true;
    runtime.app.querySelector('[data-action="generate-sticker"]').textContent = "拾起这个主体";
    runtime.app.querySelector("[data-captured-image]").src = source;
    showCameraStep(runtime, "subjects");
    renderSubjectBlobs(runtime);
    if (runtime.detectedSubjects[0]) selectSubject(runtime, runtime.detectedSubjects[0].id);
  }

  const BLOB_SPOTS = [
    { x: 50, y: 52, r: 31 },
    { x: 30, y: 36, r: 19 },
    { x: 72, y: 63, r: 21 },
    { x: 64, y: 28, r: 15 }
  ];

  function renderSubjectBlobs(runtime) {
    const photo = runtime.app.querySelector(".gx-personal-captured-photo");
    if (!photo) return;
    photo.querySelector(".gx-personal-subject-blobs")?.remove();
    const wrap = document.createElement("span");
    wrap.className = "gx-personal-subject-blobs";
    if (runtime.capturedCutoutOverlay && runtime.cutoutMode === "local-ai" && runtime.detectedSubjects[0]) {
      const subject = runtime.detectedSubjects[0];
      wrap.classList.add("gx-personal-has-smart-cutout");
      wrap.innerHTML = `<button type="button" class="gx-personal-smart-cutout" data-subject="${escapeHtml(subject.id)}" aria-pressed="false" aria-label="锁定核心主体：${escapeHtml(subject.label)}">
        <img src="${escapeHtml(runtime.capturedCutoutOverlay)}" alt="">
        <span>${escapeHtml(subject.label)}</span>
      </button>`;
    } else wrap.innerHTML = runtime.detectedSubjects.map((subject, i) => {
      const spot = BLOB_SPOTS[i % BLOB_SPOTS.length];
      const seed = subject.id || String(i);
      return `<button type="button" class="gx-personal-subject-blob" data-subject="${escapeHtml(subject.id)}" aria-pressed="false" aria-label="锁定主体：${escapeHtml(subject.label)}" style="--bx:${spot.x}%;--by:${spot.y}%;--br:${spot.r}%">
        <svg viewBox="0 0 100 100" aria-hidden="true"><path d="${blobPathD(50, 50, 46, 43, seed, 12)}"/></svg>
        <span>${escapeHtml(subject.label)}</span>
      </button>`;
    }).join("");
    photo.appendChild(wrap);
  }

  function locateCapture(runtime) {
    runtime.capturedLocation = null;
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(position => {
      runtime.capturedLocation = { lat: position.coords.latitude, lng: position.coords.longitude, placeName: nearestPlaceName(runtime, position.coords) };
    }, () => {}, { enableHighAccuracy: false, timeout: 4500, maximumAge: 60000 });
  }

  function nearestPlaceName(runtime, coords) {
    const places = runtime.data.todayJourney.plannedPlaces || [];
    if (!places.length) return "贵州 · 地点待确认";
    let best = places[0], distance = Infinity;
    places.forEach(place => {
      const d = Math.hypot(place.lat - coords.latitude, place.lng - coords.longitude);
      if (d < distance) { distance = d; best = place; }
    });
    return distance < .08 ? `${best.name} · ${runtime.data.todayJourney.city}` : "贵州 · 地点待确认";
  }

  function selectSubject(runtime, subjectId) {
    runtime.selectedSubject = runtime.detectedSubjects.find(subject => subject.id === subjectId) || null;
    runtime.app.querySelectorAll("[data-subject]").forEach(button => {
      const selected = button.dataset.subject === subjectId;
      button.classList.toggle("gx-personal-is-selected", selected);
      button.setAttribute("aria-pressed", String(selected));
    });
    runtime.app.querySelector(".gx-personal-captured-photo")?.classList.toggle("gx-personal-is-locking", Boolean(runtime.selectedSubject));
    runtime.app.querySelector('[data-action="generate-sticker"]').disabled = false;
    runtime.app.querySelector('[data-action="generate-sticker"]').textContent = "拾起这个主体";
    runtime.app.querySelector("[data-subject-confirmation]").textContent = runtime.selectedSubject
      ? `已锁定「${runtime.selectedSubject.label}」，点击下方按钮把 TA 从照片里轻轻拾起。`
      : "点击银色轮廓锁定主体，再把 TA 拾起来。";
  }

  function addCustomSubject(runtime) {
    const input = runtime.app.querySelector("[data-custom-subject]");
    const label = input.value.trim();
    if (!label) { showToast(runtime, "请先写下照片里的真实主体"); input.focus(); return; }
    const subject = { id: `custom-${Date.now()}`, label, confidence: 1, type: "photo", description: `照片中的${label}。` };
    runtime.detectedSubjects.push(subject);
    runtime.app.querySelector("[data-subject-options]").insertAdjacentHTML("beforeend", `<button type="button" data-subject="${subject.id}" aria-pressed="false"><span><b>${escapeHtml(label)}</b><small>已加入</small></span><em>✓</em><i>将按此主体从照片中提取真实元素。</i></button>`);
    selectSubject(runtime, subject.id);
  }

  function generateDirectSticker(runtime) {
    runtime.selectedSubject = { id: `unlabeled-${Date.now()}`, label: "旅途所见", confidence: 1, type: "photo", description: "未设置关键词，直接依据原照片中心主体生成。" };
    generatePendingSticker(runtime);
  }

  async function generatePendingSticker(runtime) {
    if (!runtime.selectedSubject) return;
    const blob = runtime.app.querySelector(`.gx-personal-subject-blob[data-subject="${CSS.escape(runtime.selectedSubject.id)}"]`);
    if (blob) blob.classList.add("gx-personal-is-picked-up");
    const started = Date.now();
    await delay(blob ? 780 : 0);
    showCameraStep(runtime, "generating");
    const cutout = runtime.cutoutPromise
      ? await runtime.cutoutPromise
      : await makeCutoutResult(runtime.capturedImage, runtime.selectedSubject?.id || "core");
    runtime.capturedCutout = cutout.image;
    runtime.capturedCutoutOverlay = cutout.overlay;
    runtime.cutoutMode = cutout.mode;
    const cutoutStatus = runtime.app.querySelector("[data-cutout-status]");
    if (cutoutStatus) cutoutStatus.textContent = cutout.mode === "local-ai" ? "主体轮廓已分离，正在压上手帐纸边。" : "本地模型暂不可用，已保留照片并使用安全回退。";
    const [art, description] = await Promise.all([
      AIAdapter.generateSticker(runtime.capturedImage, runtime.selectedSubject),
      AIAdapter.describeImage(runtime.selectedSubject)
    ]);
    await delay(Math.max(0, 860 - (Date.now() - started)));
    if (runtime.activeModal !== "camera") return;
    const now = new Date();
    const journey = runtime.data.todayJourney;
    const fallbackPlace = journey.plannedPlaces[Math.max(0, journey.visitedPlaces.length - 1)] || journey.plannedPlaces[0];
    const location = runtime.capturedLocation || { lat: fallbackPlace?.lat, lng: fallbackPlace?.lng, placeName: fallbackPlace ? `${fallbackPlace.name} · ${journey.city}` : "贵州 · 地点待确认" };
    runtime.pendingWanxiang = {
      id: `wx-${Date.now()}`,
      originalPhoto: runtime.capturedImage,
      subject: runtime.selectedSubject.id,
      subjectName: runtime.selectedSubject.label,
      customName: runtime.selectedSubject.label,
      stickerImage: runtime.capturedCutout ? paperStickerFromCutout(runtime.capturedCutout, runtime.selectedSubject.label) : art,
      cutoutImage: runtime.capturedCutout,
      aiDescription: description,
      capturedAt: `${journey.date}T${pad(now.getHours())}:${pad(now.getMinutes())}:00+08:00`,
      location,
      routeId: journey.id
    };
    runtime.app.querySelector("[data-new-sticker]").innerHTML = stickerMarkup(runtime.pendingWanxiang);
    renderJourneyTicket(runtime, runtime.pendingWanxiang);
    runtime.app.querySelector("[data-new-name]").value = runtime.pendingWanxiang.customName;
    runtime.app.querySelector("[data-new-location]").textContent = location.placeName;
    runtime.app.querySelector("[data-new-date]").textContent = dateDots(journey.date);
    showCameraStep(runtime, "complete");
  }

  /* —— 不规则轮廓 / 抠图 / 三种产物 —— */
  function blobPoints(cx, cy, rx, ry, seed, segments = 12) {
    const seedNum = String(seed).length + (String(seed).charCodeAt(0) || 7) % 9;
    const points = [];
    for (let i = 0; i < segments; i += 1) {
      const angle = (i / segments) * Math.PI * 2;
      const wobble = 1 + Math.sin(i * 2.3 + seedNum) * .1 + Math.cos(i * 3.7 + seedNum * 1.7) * .07;
      points.push({ x: cx + Math.cos(angle) * rx * wobble, y: cy + Math.sin(angle) * ry * wobble });
    }
    return points;
  }

  function blobPathD(cx, cy, rx, ry, seed, segments = 12) {
    const pts = blobPoints(cx, cy, rx, ry, seed, segments);
    const mid = (a, b) => `${((a.x + b.x) / 2).toFixed(1)},${((a.y + b.y) / 2).toFixed(1)}`;
    let d = `M${mid(pts[pts.length - 1], pts[0])}`;
    for (let i = 0; i < pts.length; i += 1) {
      const next = pts[(i + 1) % pts.length];
      d += ` Q${pts[i].x.toFixed(1)},${pts[i].y.toFixed(1)} ${mid(pts[i], next)}`;
    }
    return d + "Z";
  }

  async function makeLegacyCutout(source, seed) {
    try {
      const image = await loadCanvasImage(source);
      const size = Math.round(Math.min(image.width, image.height) * .62);
      const cx = image.width / 2, cy = image.height * .46;
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");
      const sx = cx - size / 2, sy = cy - size / 2;
      const scaleX = size / 100, scaleY = size / 100;
      ctx.save();
      ctx.beginPath();
      blobPoints(50, 50, 46, 43, seed, 14).forEach((p, i) => {
        const x = (p.x - 50) * scaleX + size / 2;
        const y = (p.y - 50) * scaleY + size / 2;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      });
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(image, sx, sy, size, size, 0, 0, size, size);
      ctx.restore();
      return canvas.toDataURL("image/png");
    } catch (_error) {
      return null;
    }
  }

  async function normalizeTransparentCutout(source) {
    const image = await loadCanvasImage(source);
    const scan = document.createElement("canvas");
    scan.width = image.width;
    scan.height = image.height;
    const scanCtx = scan.getContext("2d", { willReadFrequently: true });
    scanCtx.drawImage(image, 0, 0);
    const pixels = scanCtx.getImageData(0, 0, scan.width, scan.height).data;
    let left = scan.width, top = scan.height, right = -1, bottom = -1;
    for (let y = 0; y < scan.height; y += 1) {
      for (let x = 0; x < scan.width; x += 1) {
        if (pixels[(y * scan.width + x) * 4 + 3] < 10) continue;
        if (x < left) left = x;
        if (x > right) right = x;
        if (y < top) top = y;
        if (y > bottom) bottom = y;
      }
    }
    if (right < left || bottom < top) throw new Error("没有找到可见主体");
    const width = right - left + 1, height = bottom - top + 1;
    const pad = Math.max(8, Math.round(Math.max(width, height) * .08));
    const size = Math.min(1400, Math.max(width, height) + pad * 2);
    const output = document.createElement("canvas");
    output.width = size;
    output.height = size;
    const ctx = output.getContext("2d");
    const scale = Math.min(1, (size - pad * 2) / Math.max(width, height));
    const drawWidth = width * scale, drawHeight = height * scale;
    ctx.drawImage(scan, left, top, width, height, (size - drawWidth) / 2, (size - drawHeight) / 2, drawWidth, drawHeight);
    return output.toDataURL("image/png");
  }

  async function makeCutoutResult(source, seed, onProgress) {
    try {
      if (!window.GuikeBackgroundRemoval?.removeBackground) throw new Error("本地抠图适配器未加载");
      const overlay = await window.GuikeBackgroundRemoval.removeBackground(source, { onProgress });
      return { image: await normalizeTransparentCutout(overlay), overlay, mode: "local-ai" };
    } catch (error) {
      console.warn("[Guike] 本地 AI 抠图失败，使用中央裁切回退：", error);
      const fallback = await makeLegacyCutout(source, seed);
      return { image: fallback, overlay: null, mode: "fallback", error };
    }
  }

  function paperStickerFromCutout(cutout, label) {
    const uid = Math.random().toString(36).slice(2, 9);
    const safeCutout = escapeHtml(cutout);
    const safeLabel = escapeHtml(label);
    const outer = blobPathD(50, 50, 47, 44, `p${label}`, 14);
    const inner = blobPathD(50, 50, 40, 37, `p${label}`, 14);
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="560" height="560" viewBox="0 0 100 100" role="img" aria-label="${safeLabel}万象贴画">
      <defs>
        <clipPath id="gxp-${uid}"><path d="${inner}"/></clipPath>
        <filter id="gxs-${uid}" x="-25%" y="-25%" width="150%" height="150%">
          <feDropShadow dx="0" dy="1.6" stdDeviation="1.8" flood-color="#2b2a26" flood-opacity="0.22"/>
        </filter>
        <filter id="gxg-${uid}"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" result="n"/><feColorMatrix in="n" type="matrix" values="0 0 0 0 0.55 0 0 0 0 0.52 0 0 0 0 0.44 0 0 0 0.06 0"/><feComposite operator="over" in2="SourceGraphic"/></filter>
      </defs>
      <path d="${outer}" fill="#f3ecda" filter="url(#gxs-${uid})"/>
      <g clip-path="url(#gxp-${uid})"><image href="${safeCutout}" x="0" y="0" width="100" height="100" preserveAspectRatio="xMidYMid slice"/></g>
      <path d="${inner}" fill="none" stroke="#b8b8b2" stroke-width=".7" opacity=".8"/>
      <path d="${outer}" fill="none" stroke="#d8cdae" stroke-width=".9" opacity=".9"/>
    </svg>`;
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  }

  function renderJourneyTicket(runtime, item) {
    const ticket = runtime.app.querySelector("[data-new-ticket]");
    if (!ticket) return;
    ticket.hidden = false;
    ticket.removeAttribute("aria-hidden");
    const subject = item.cutoutImage
      ? `<img src="${escapeHtml(item.cutoutImage)}" alt="${escapeHtml(item.customName)}透明主体">`
      : stickerMarkup(item);
    ticket.innerHTML = `
      <span class="gx-personal-ticket-subject">${subject}</span>
      <span class="gx-personal-ticket-tear" aria-hidden="true"></span>
      <span class="gx-personal-ticket-info">
        <b>旅途票 · JOURNEY TICKET</b>
        <i>${dateDots(item.capturedAt)}</i>
        <i>${escapeHtml(item.location?.placeName || "贵州 · 地点待确认")}</i>
        <i>NO. GX-${String(hashCode(item.id) % 9000 + 1000)}</i>
      </span>`;
  }

  function saveWanxiang(runtime) {
    if (!runtime.pendingWanxiang) return;
    runtime.pendingWanxiang.customName = runtime.app.querySelector("[data-new-name]").value.trim() || runtime.pendingWanxiang.subjectName;
    runtime.data.wanxiangItems.unshift(runtime.pendingWanxiang);
    runtime.data.user.wanxiangCount = Math.max(runtime.data.user.wanxiangCount || 0, runtime.data.wanxiangItems.length);
    runtime.stickerPositions[runtime.pendingWanxiang.id] = { x: 55, y: 58, scale: .92, rotate: -4 };
    renderAll(runtime);
    closeModal(runtime);
    showToast(runtime, "万象已落在今日山纹上");
  }

  function resetCamera(runtime) {
    stopCamera(runtime);
    runtime.detectedSubjects = [];
    runtime.selectedSubject = null;
    runtime.pendingWanxiang = null;
    runtime.capturedImage = null;
    runtime.capturedCutout = null;
    runtime.capturedCutoutOverlay = null;
    runtime.cutoutPromise = null;
    runtime.cutoutMode = null;
    showCameraStep(runtime, "source");
  }

  function openWanxiang(runtime, id) {
    const item = runtime.data.wanxiangItems.find(entry => entry.id === id);
    if (!item) return;
    runtime.activeWanxiangId = id;
    runtime.app.querySelector("[data-detail-sticker]").innerHTML = stickerMarkup(item);
    runtime.app.querySelector("[data-detail-name]").value = item.customName;
    runtime.app.querySelector("[data-detail-description]").textContent = item.aiDescription;
    runtime.app.querySelector("[data-detail-location]").textContent = item.location?.placeName || "贵州 · 地点待确认";
    runtime.app.querySelector("[data-detail-date]").textContent = dateDots(item.capturedAt);
    const original = runtime.app.querySelector("[data-detail-original]");
    original.src = item.originalPhoto || mockPhoto("GUIZHOU JOURNEY", ["#9bab95", "#546a5d"]);
    openModal(runtime, "wanxiang");
  }

  function renameWanxiang(runtime) {
    const item = runtime.data.wanxiangItems.find(entry => entry.id === runtime.activeWanxiangId);
    if (!item) return;
    item.customName = runtime.app.querySelector("[data-detail-name]").value.trim() || item.subjectName;
    const menu = runtime.app.querySelector("[data-more-menu]");
    if (menu) menu.hidden = true;
    renderWanxiang(runtime);
    showToast(runtime, "万象名已保存");
  }

  function deleteWanxiang(runtime) {
    const index = runtime.data.wanxiangItems.findIndex(entry => entry.id === runtime.activeWanxiangId);
    if (index < 0) return;
    const [removed] = runtime.data.wanxiangItems.splice(index, 1);
    delete runtime.stickerPositions[removed.id];
    renderAll(runtime);
    closeModal(runtime);
    showToast(runtime, "这一枚万象已移出收藏");
  }

  function joinJourney(runtime) {
    const item = runtime.data.wanxiangItems.find(entry => entry.id === runtime.activeWanxiangId);
    if (!item) return;
    item.routeId = runtime.data.todayJourney.id;
    if (!item.location?.lat) {
      const end = runtime.data.todayJourney.routePoints.at(-1);
      item.location = Object.assign({ placeName: "行径终点附近" }, end);
    }
    renderRoute(runtime);
    showToast(runtime, "万象已落在今日行径上");
  }

  function openJourney(runtime) {
    const journey = runtime.data.todayJourney;
    const stage = runtime.app.querySelector("[data-journey-detail-route]");
    stage.innerHTML = routeSvg(journey, [], "hero");
    upgradeJourneyGeometry(runtime, journey, () => { stage.innerHTML = routeSvg(journey, [], "hero"); });
    runtime.app.querySelector("[data-journey-timeline]").innerHTML = (journey.plannedPlaces || []).map(place => `<li class="${place.visited ? "gx-personal-is-visited" : ""}"><span>${escapeHtml(place.name)}</span><small>${escapeHtml(place.time || "待定")} · ${place.visited ? "已走过" : "未抵达"}</small></li>`).join("");
    openModal(runtime, "journey");
  }

  function openPostcard(runtime) {
    const journey = runtime.data.todayJourney;
    runtime.app.querySelector("[data-postcard-date]").textContent = `${dateDots(journey.date)} · ${journey.city}`;
    const stage = runtime.app.querySelector("[data-postcard-route]");
    stage.innerHTML = routeSvg(journey, [], "postcard");
    upgradeJourneyGeometry(runtime, journey, () => { stage.innerHTML = routeSvg(journey, [], "postcard"); });
    renderPostcardStickers(runtime);
    openModal(runtime, "postcard");
    window.setTimeout(() => animatePostcard(runtime), 120);
  }

  function renderPostcardStickers(runtime) {
    const container = runtime.app.querySelector("[data-postcard-stickers]");
    container.innerHTML = runtime.data.wanxiangItems.filter(item => !runtime.removedStickerIds.has(item.id)).map(item => {
      const pos = runtime.stickerPositions[item.id] || { x: 50, y: 55, scale: 1, rotate: 0 };
      return `<div class="gx-personal-editor-sticker ${runtime.selectedStickerId === item.id ? "gx-personal-is-selected" : ""}" data-editor-sticker="${escapeHtml(item.id)}" style="left:${pos.x}%;top:${pos.y}%;transform:translate(-50%,-50%) scale(${pos.scale}) rotate(${pos.rotate}deg)" aria-label="${escapeHtml(item.customName)}贴画">${stickerMarkup(item)}</div>`;
    }).join("");
  }

  function animatePostcard(runtime) {
    const postcard = runtime.app.querySelector("[data-postcard-canvas]");
    postcard.classList.remove("gx-personal-is-generating");
    void postcard.offsetWidth;
    postcard.classList.add("gx-personal-is-generating");
    window.setTimeout(() => postcard.classList.remove("gx-personal-is-generating"), 1900);
  }

  function selectEditorSticker(runtime, id) {
    runtime.selectedStickerId = id;
    runtime.app.querySelectorAll("[data-editor-sticker]").forEach(sticker => sticker.classList.toggle("gx-personal-is-selected", sticker.dataset.editorSticker === id));
  }

  function transformSelectedSticker(runtime, change) {
    if (!runtime.selectedStickerId) { showToast(runtime, "请先点选一枚贴画"); return; }
    const pos = runtime.stickerPositions[runtime.selectedStickerId];
    if (!pos) return;
    if (change.scale) pos.scale = Math.max(.45, Math.min(1.8, pos.scale + change.scale));
    if (change.rotate) pos.rotate += change.rotate;
    renderPostcardStickers(runtime);
  }

  function removeSelectedSticker(runtime) {
    if (!runtime.selectedStickerId) { showToast(runtime, "请先点选一枚贴画"); return; }
    runtime.removedStickerIds.add(runtime.selectedStickerId);
    runtime.selectedStickerId = null;
    renderPostcardStickers(runtime);
  }

  function handlePointerDown(runtime, event) {
    const sticker = event.target.closest("[data-editor-sticker]");
    if (!sticker) return;
    event.preventDefault();
    selectEditorSticker(runtime, sticker.dataset.editorSticker);
    sticker.setPointerCapture?.(event.pointerId);
    runtime.pointerMap.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (runtime.pointerMap.size === 1) {
      const pos = runtime.stickerPositions[runtime.selectedStickerId];
      runtime.gesture = { type: "drag", startX: event.clientX, startY: event.clientY, x: pos.x, y: pos.y };
    } else if (runtime.pointerMap.size === 2) {
      const [a, b] = [...runtime.pointerMap.values()];
      const pos = runtime.stickerPositions[runtime.selectedStickerId];
      runtime.gesture = { type: "pinch", distance: Math.hypot(b.x - a.x, b.y - a.y), angle: Math.atan2(b.y - a.y, b.x - a.x), scale: pos.scale, rotate: pos.rotate };
    }
  }

  function handlePointerMove(runtime, event) {
    if (!runtime.pointerMap.has(event.pointerId) || !runtime.selectedStickerId) return;
    event.preventDefault();
    runtime.pointerMap.set(event.pointerId, { x: event.clientX, y: event.clientY });
    const canvas = runtime.app.querySelector("[data-postcard-canvas]");
    const rect = canvas.getBoundingClientRect();
    const pos = runtime.stickerPositions[runtime.selectedStickerId];
    if (runtime.pointerMap.size === 1 && runtime.gesture?.type === "drag") {
      pos.x = Math.max(6, Math.min(94, runtime.gesture.x + ((event.clientX - runtime.gesture.startX) / rect.width) * 100));
      pos.y = Math.max(8, Math.min(92, runtime.gesture.y + ((event.clientY - runtime.gesture.startY) / rect.height) * 100));
    } else if (runtime.pointerMap.size >= 2) {
      const [a, b] = [...runtime.pointerMap.values()];
      if (runtime.gesture?.type !== "pinch") {
        runtime.gesture = { type: "pinch", distance: Math.hypot(b.x - a.x, b.y - a.y), angle: Math.atan2(b.y - a.y, b.x - a.x), scale: pos.scale, rotate: pos.rotate };
      }
      const distance = Math.hypot(b.x - a.x, b.y - a.y);
      const angle = Math.atan2(b.y - a.y, b.x - a.x);
      pos.scale = Math.max(.45, Math.min(1.8, runtime.gesture.scale * (distance / Math.max(1, runtime.gesture.distance))));
      pos.rotate = runtime.gesture.rotate + (angle - runtime.gesture.angle) * 180 / Math.PI;
    }
    updateStickerStyle(runtime, runtime.selectedStickerId);
  }

  function updateStickerStyle(runtime, id) {
    const element = runtime.app.querySelector(`[data-editor-sticker="${CSS.escape(id)}"]`);
    const pos = runtime.stickerPositions[id];
    if (!element || !pos) return;
    element.style.left = `${pos.x}%`;
    element.style.top = `${pos.y}%`;
    element.style.transform = `translate(-50%,-50%) scale(${pos.scale}) rotate(${pos.rotate}deg)`;
  }

  function handlePointerUp(runtime, event) {
    runtime.pointerMap.delete(event.pointerId);
    if (!runtime.pointerMap.size) runtime.gesture = null;
    else if (runtime.pointerMap.size === 1) {
      const point = [...runtime.pointerMap.values()][0];
      const pos = runtime.stickerPositions[runtime.selectedStickerId];
      runtime.gesture = { type: "drag", startX: point.x, startY: point.y, x: pos.x, y: pos.y };
    }
  }

  /* —— 他人行径：Bottom Sheet 详情 + 收藏数 —— */
  function openSavedJourney(runtime, id) {
    const item = runtime.data.savedJourneys.find(entry => entry.id === id);
    if (!item) { showToast(runtime, "这段行径暂时打不开"); return; }
    runtime.activeSavedId = id;
    runtime.app.querySelector("[data-saved-sheet]").hidden = false;
    runtime.app.querySelector("[data-borrow-sheet]").hidden = true;
    runtime.app.querySelector("[data-saved-avatar]").textContent = (item.author || "客").slice(0, 1);
    runtime.app.querySelector("[data-saved-title]").textContent = `${item.author}的行径`;
    const borrowedSuffix = item.borrowed ? ` · 已借入${dateCN(item.borrowedDate || item.date)}` : "";
    runtime.app.querySelector("[data-saved-sub]").textContent = `${dateCN(item.date)} · ${item.city} · ${Number(item.dist).toFixed(1)} KM${borrowedSuffix}`;
    runtime.app.querySelector("[data-saved-tags]").innerHTML = (item.tags || []).map(tag => `<i>${escapeHtml(tag)}</i>`).join("");
    const renderSavedRoute = () => {
      const pts = item.routePoints || [];
      const plannedPlaces = (item.places || []).map((name, i) => {
        const point = pts.length ? pts[Math.round(i * (pts.length - 1) / Math.max(1, (item.places.length - 1) || 1))] || pts[0] : {};
        return { id: `sp-${i}`, name, lat: point.lat, lng: point.lng, visited: false };
      });
      runtime.app.querySelector("[data-saved-route]").innerHTML = routeSvg(Object.assign({}, item, { plannedPlaces }), [], "postcard");
    };
    renderSavedRoute();
    upgradeJourneyGeometry(runtime, item, renderSavedRoute);
    runtime.app.querySelector("[data-saved-stats]").innerHTML = `
      <span><b>${item.places?.length || 0}</b><small>地点</small></span>
      <span><b>${escapeHtml(item.time)}</b><small>时长</small></span>
      <span><b>${Number(item.dist).toFixed(1)}</b><small>KM</small></span>
      <span><b>${fmtCount(item.saves)}</b><small>收藏数</small></span>`;
    runtime.app.querySelector("[data-saved-timeline]").innerHTML = (item.stops || []).map(stop => `
      <li class="${stop.temp ? "gx-personal-is-temp" : ""}">
        <span>${escapeHtml(stop.name)}${stop.temp ? `<em class="gx-personal-temp-badge">TA当天曾在这里遇见</em>` : ""}</span>
        <small>${escapeHtml(stop.time || "")} · ${escapeHtml(stop.note || "")}</small>
        ${stop.temp && stop.alt ? `<small class="gx-personal-temp-alt">今天暂无确认 · 附近替代：${escapeHtml(stop.alt)}</small>` : ""}
      </li>`).join("");
    updateSavedDock(runtime, item);
    openModal(runtime, "saved");
  }

  function updateSavedDock(runtime, item) {
    const dock = runtime.app.querySelector("[data-action='toggle-saved-save']");
    if (!dock) return;
    dock.setAttribute("aria-pressed", String(Boolean(item.saved)));
    dock.innerHTML = `${item.saved ? "♥" : "♡"} <b data-saved-count>${fmtCount(item.saves)}</b><small>收藏数</small>`;
  }

  function toggleSavedSave(runtime) {
    const item = runtime.data.savedJourneys.find(entry => entry.id === runtime.activeSavedId);
    if (!item) return;
    item.saved = !item.saved;
    item.saves = Math.max(0, (item.saves || 0) + (item.saved ? 1 : -1));
    updateSavedDock(runtime, item);
    showToast(runtime, item.saved ? `已收藏 ${item.author} 的行径` : "已取消收藏（不影响借此一程）");
  }

  /* —— 借此一程：二级 Sheet，真实写入 Tab1 主规划 —— */
  function openBorrow(runtime) {
    const item = runtime.data.savedJourneys.find(entry => entry.id === runtime.activeSavedId);
    if (!item) return;
    runtime.borrowState = { journey: item, mode: "whole", date: "today", dateValue: "" };
    runtime.app.querySelector("[data-saved-sheet]").hidden = true;
    runtime.app.querySelector("[data-borrow-sheet]").hidden = false;
    runtime.app.querySelectorAll("[data-borrow-mode]").forEach(button => button.classList.toggle("gx-personal-is-picked", button.dataset.borrowMode === "whole"));
    runtime.app.querySelectorAll("[data-borrow-date]").forEach(button => button.classList.toggle("gx-personal-is-picked", button.dataset.borrowDate === "today"));
    renderBorrowPlaces(runtime);
    updateBorrowTarget(runtime);
  }

  function closeBorrow(runtime) {
    runtime.app.querySelector("[data-borrow-sheet]").hidden = true;
    runtime.app.querySelector("[data-saved-sheet]").hidden = false;
    runtime.borrowState = null;
  }

  function renderBorrowPlaces(runtime) {
    const wrap = runtime.app.querySelector("[data-borrow-places]");
    const item = runtime.borrowState?.journey;
    if (!wrap || !item) return;
    wrap.innerHTML = (item.stops || []).map((stop, i) => `
      <label class="gx-personal-borrow-place" data-borrow-place>
        <input type="checkbox" ${runtime.borrowState.mode === "partial" ? "" : "hidden"} checked value="${i}" data-borrow-place-check>
        <span><b>${escapeHtml(stop.name)}</b><small>${escapeHtml(stop.time || "")}</small></span>
      </label>`).join("");
    wrap.hidden = runtime.borrowState.mode !== "partial";
  }

  function pickBorrowMode(runtime, mode) {
    if (!runtime.borrowState) return;
    runtime.borrowState.mode = mode;
    runtime.app.querySelectorAll("[data-borrow-mode]").forEach(button => button.classList.toggle("gx-personal-is-picked", button.dataset.borrowMode === mode));
    renderBorrowPlaces(runtime);
    updateBorrowTarget(runtime);
  }

  function pickBorrowDate(runtime, type, value) {
    if (!runtime.borrowState) return;
    runtime.borrowState.date = type;
    if (value) runtime.borrowState.dateValue = value;
    runtime.app.querySelectorAll("[data-borrow-date]").forEach(button => button.classList.toggle("gx-personal-is-picked", button.dataset.borrowDate === type));
    updateBorrowTarget(runtime);
  }

  function resolveBorrowDate(runtime) {
    const state = runtime.borrowState;
    if (!state) return null;
    const today = new Date().toISOString().slice(0, 10);
    if (state.date === "today") return today;
    if (state.date === "tomorrow") return addDaysISO(today, 1);
    return /^\d{4}-\d{2}-\d{2}$/.test(state.dateValue || "") ? state.dateValue : null;
  }

  function updateBorrowTarget(runtime) {
    const state = runtime.borrowState;
    const target = runtime.app.querySelector("[data-borrow-target]");
    if (!state || !target) return;
    const date = resolveBorrowDate(runtime);
    let count = state.journey.stops?.length || 0;
    if (state.mode === "partial") count = runtime.app.querySelectorAll("[data-borrow-place-check]:checked").length;
    const modeLabel = state.mode === "whole" ? "借整程" : state.mode === "partial" ? "挑选部分地点" : "只借路线骨架";
    target.textContent = date
      ? `将借「${modeLabel}」${state.mode === "skeleton" ? "" : `· ${count} 站`} → 添入 ${dateCN(date)}`
      : "请选择一个具体日期";
  }

  function confirmBorrow(runtime) {
    const state = runtime.borrowState;
    if (!state) return;
    const item = state.journey;
    const date = resolveBorrowDate(runtime);
    if (!date) { showToast(runtime, "请先选择要添入的日期"); return; }
    let places = [];
    if (state.mode === "whole") {
      places = (item.stops || []).map(stop => ({ name: stop.name, time: stop.time }));
    } else if (state.mode === "partial") {
      const boxes = [...runtime.app.querySelectorAll("[data-borrow-place-check]")];
      places = boxes.filter(box => box.checked).map(box => {
        const stop = item.stops[Number(box.value)];
        return { name: stop.name, time: stop.time };
      });
      if (!places.length) { showToast(runtime, "至少挑选一个地点"); return; }
    }
    const modeTitle = state.mode === "whole" ? `借自${item.author}的整程` : state.mode === "partial" ? `借自${item.author}的几站` : `借自${item.author}的路线骨架`;
    GuikePlan.addBorrow({
      date, city: item.city, title: modeTitle, places,
      routePoints: item.routePoints || [], author: item.author,
      mode: state.mode, sourceJourneyId: item.id
    });
    runtime.borrowState = null;
    closeModal(runtime);
    showToast(runtime, `已添进主规划 · ${dateCN(date)} · ${modeTitle}`);
  }

  /* —— 旅途胶卷：DV Time Capsule —— */
  const MONTH_EN = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

  function filmOsd(frame) {
    const date = new Date(`${frame.date}T12:00:00+08:00`);
    const city = CITY_PINYIN[frame.city] || "GUIZHOU";
    const place = PLACE_PINYIN[frame.place] || city;
    return `${MONTH_EN[date.getMonth()]} ${pad(date.getDate())} ${frame.time} / ${city} · ${place}`;
  }

  function frameTs(date, time) {
    const parsed = Date.parse(`${date}T${time}:00+08:00`);
    return Number.isFinite(parsed) ? parsed : Date.parse(`${date}T12:00:00+08:00`) || Date.now();
  }

  function buildFilmFrames(runtime) {
    const frames = [];
    runtime.data.wanxiangItems.forEach(item => {
      const time = timeText(item.capturedAt) === "此刻" ? "12:00" : timeText(item.capturedAt);
      const date = String(item.capturedAt).slice(0, 10);
      const placeName = item.location?.placeName || "贵州";
      frames.push({
        type: "PHOTO", time, date, ts: frameTs(date, time),
        city: runtime.data.todayJourney.city,
        place: placeName.split(" · ")[0],
        html: `<img src="${escapeHtml(item.originalPhoto || mockPhoto(item.customName || "GUIZHOU", ["#9bab95", "#546a5d"]))}" alt="${escapeHtml(item.customName || "旅途照片")}">`
      });
    });
    runtime.data.wanxiangItems.filter(item => item.cutoutImage || item.stickerImage).slice(0, 2).forEach(item => {
      const time = timeText(item.capturedAt) === "此刻" ? "14:21" : timeText(item.capturedAt);
      const date = String(item.capturedAt).slice(0, 10);
      frames.push({
        type: "PICK", time, date, ts: frameTs(date, time),
        city: runtime.data.todayJourney.city,
        place: (item.location?.placeName || "贵州").split(" · ")[0],
        html: `<span class="gx-personal-film-pick">${stickerMarkup(item)}</span>`
      });
    });
    return frames.sort((a, b) => a.ts - b.ts);
  }

  /* —— Journey Tape：连续自由拖动 + 中央 playhead（执行文档 §21–25）—— */
  function openFilm(runtime) {
    runtime.filmState = { frames: buildFilmFrames(runtime), index: 0, renderedIndex: -1, mode: "tape", playing: false, raf: 0, offset: 0, dragging: false };
    openModal(runtime, "film");
    buildFilmTape(runtime);
    setFilmMode(runtime, "tape");
    if (runtime.filmState.frames.length) centerFilmFrame(runtime, runtime.filmState.frames.length - 1, { instant: true });
    updateFilmPlayhead(runtime);
    runtime.app.querySelector("[data-film-hint]").hidden = !runtime.filmState.frames.length;
  }

  function buildFilmTape(runtime) {
    const state = runtime.filmState;
    const scrub = runtime.app.querySelector("[data-film-scrub]");
    const track = runtime.app.querySelector("[data-film-track]");
    if (!scrub || !track) return;
    state.viewW = scrub.clientWidth || 320;
    const frames = state.frames;
    if (!frames.length) {
      track.innerHTML = `<small>胶卷还是空的，先去拾一景。</small>`;
      state.t0 = state.t1 = Date.now(); state.pxPerMs = 1; state.pad = state.viewW / 2; state.tapeWidth = state.viewW;
      return;
    }
    state.t0 = frames[0].ts;
    state.t1 = frames[frames.length - 1].ts;
    /* 轨迹信息：每天行径以 mark 标在母带上（08:30 出发点），并纳入时间轴范围 */
    const journeyMarks = runtime.data.journeys
      .map(j => ({ ts: frameTs(j.date, "08:30"), label: `${j.city || "贵州"} · 行径` }))
      .filter(mark => Number.isFinite(mark.ts));
    if (journeyMarks.length) {
      state.t0 = Math.min(state.t0, ...journeyMarks.map(mark => mark.ts));
      state.t1 = Math.max(state.t1, ...journeyMarks.map(mark => mark.ts));
    }
    const span = Math.max(state.t1 - state.t0, 45 * 60000);
    state.pxPerMs = (state.viewW * 1.45) / span;
    state.pad = state.viewW / 2;
    state.tapeWidth = span * state.pxPerMs + state.viewW;
    const step = 30 * 60000;
    const firstTick = Math.ceil(state.t0 / step) * step;
    let ticks = "";
    for (let t = firstTick; t <= state.t1; t += step) {
      const d = new Date(t);
      ticks += `<i class="gx-personal-tape-tick" style="left:${(state.pad + (t - state.t0) * state.pxPerMs).toFixed(1)}px"><b>${pad(d.getHours())}:${pad(d.getMinutes())}</b></i>`;
    }
    const marks = journeyMarks.map(mark => {
      const x = (state.pad + (mark.ts - state.t0) * state.pxPerMs).toFixed(1);
      return `<span class="gx-personal-tape-mark" style="left:${x}px"><b>${escapeHtml(mark.label)}</b></span>`;
    }).join("");
    const chips = frames.map((f, i) => {
      const x = (state.pad + (f.ts - state.t0) * state.pxPerMs).toFixed(1);
      return `<button type="button" class="gx-personal-tape-chip" data-film-chip="${i}" style="left:${x}px"><i>${f.time}</i><b>${escapeHtml(f.place || f.type)}</b></button>`;
    }).join("");
    track.style.width = `${state.tapeWidth.toFixed(0)}px`;
    track.innerHTML = `${ticks}${marks}${chips}`;
  }

  function applyFilmOffset(runtime, offset) {
    const state = runtime.filmState;
    if (!state || !state.frames.length) return;
    state.offset = Math.max(state.viewW - state.tapeWidth, Math.min(0, offset));
    const track = runtime.app.querySelector("[data-film-track]");
    if (track) track.style.transform = `translateX(${state.offset.toFixed(1)}px)`;
    updateFilmPlayhead(runtime);
  }

  function filmPlayheadTime(runtime) {
    const state = runtime.filmState;
    if (!state || !state.frames.length) return Date.now();
    const t = state.t0 + (state.viewW / 2 - state.pad - state.offset) / state.pxPerMs;
    return Math.max(state.t0, Math.min(state.t1, t));
  }

  function filmOsdLive(frame, clock) {
    const city = CITY_PINYIN[frame.city] || "GUIZHOU";
    const place = PLACE_PINYIN[frame.place] || city;
    return `${clock} / ${city} · ${place}`;
  }

  function updateFilmPlayhead(runtime) {
    const state = runtime.filmState;
    if (!state || !state.frames.length) return;
    const t = filmPlayheadTime(runtime);
    let index = 0;
    for (let i = 0; i < state.frames.length; i += 1) { if (state.frames[i].ts <= t + 1) index = i; else break; }
    const d = new Date(t);
    state.index = index;
    state.clock = `${MONTH_EN[d.getMonth()]} ${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
    const frame = state.frames[index];
    if (state.renderedIndex !== index) {
      state.renderedIndex = index;
      const screen = runtime.app.querySelector(".gx-personal-dv-screen");
      runtime.app.querySelector("[data-film-frame]").innerHTML = frame.html;
      screen.classList.remove("gx-personal-is-flash");
      void screen.offsetWidth;
      screen.classList.add("gx-personal-is-flash");
    }
    runtime.app.querySelector("[data-film-osd]").textContent = filmOsdLive(frame, state.clock);
    runtime.app.querySelectorAll("[data-film-chip]").forEach(chip => {
      chip.classList.toggle("gx-personal-is-active", Number(chip.dataset.filmChip) === index);
    });
  }

  function centerFilmFrame(runtime, index, options = {}) {
    const state = runtime.filmState;
    const frame = state?.frames[index];
    if (!frame) return;
    const target = state.viewW / 2 - (state.pad + (frame.ts - state.t0) * state.pxPerMs);
    if (options.instant) { applyFilmOffset(runtime, target); return; }
    glideFilm(runtime, target);
  }

  function glideFilm(runtime, target) {
    const state = runtime.filmState;
    if (!state) return;
    stopFilmPlayback(runtime);
    cancelAnimationFrame(state.raf || 0);
    const from = state.offset;
    const start = performance.now();
    const step = now => {
      if (!runtime.filmState || runtime.filmState !== state) return;
      const p = Math.min(1, (now - start) / 320);
      const eased = 1 - Math.pow(1 - p, 3);
      applyFilmOffset(runtime, from + (target - from) * eased);
      if (p < 1) state.raf = requestAnimationFrame(step);
    };
    state.raf = requestAnimationFrame(step);
  }

  function startFilmPlayback(runtime) {
    const state = runtime.filmState;
    if (!state || !state.frames.length) { showToast(runtime, "胶卷还是空的，先去拾一景"); return; }
    if (state.playing) { stopFilmPlayback(runtime); return; }
    state.playing = true;
    runtime.app.querySelector(".gx-personal-dv-screen")?.classList.add("gx-personal-is-recording");
    runtime.app.querySelector("[data-dv-led]")?.classList.add("gx-personal-is-on");
    runtime.app.querySelector("[data-film-hint]").hidden = true;
    if (state.offset <= state.viewW - state.tapeWidth + 2) applyFilmOffset(runtime, 0);
    let last = performance.now();
    const pxPerSec = Math.max(16, state.tapeWidth / 48);
    const step = now => {
      if (!state.playing) return;
      const dt = (now - last) / 1000;
      last = now;
      applyFilmOffset(runtime, state.offset - pxPerSec * dt);
      if (state.offset <= state.viewW - state.tapeWidth + 1) { stopFilmPlayback(runtime); showToast(runtime, "回放到今天为止"); return; }
      state.raf = requestAnimationFrame(step);
    };
    state.raf = requestAnimationFrame(step);
  }

  function stopFilmPlayback(runtime) {
    const state = runtime.filmState;
    if (!state) return;
    state.playing = false;
    cancelAnimationFrame(state.raf || 0);
    runtime.app.querySelector(".gx-personal-dv-screen")?.classList.remove("gx-personal-is-recording");
    runtime.app.querySelector("[data-dv-led]")?.classList.remove("gx-personal-is-on");
    runtime.app.querySelector("[data-film-hint]").hidden = false;
  }

  function setFilmMode(runtime, mode) {
    const state = runtime.filmState;
    if (!state) return;
    stopFilmPlayback(runtime);
    state.mode = mode;
    runtime.app.querySelectorAll("[data-film-mode]").forEach(button => button.classList.toggle("gx-personal-is-active", button.dataset.filmMode === mode));
    const album = runtime.app.querySelector("[data-film-album]");
    const scrub = runtime.app.querySelector("[data-film-scrub]");
    if (mode === "album") {
      scrub.hidden = true;
      album.hidden = false;
      renderFilmAlbum(runtime);
      return;
    }
    album.hidden = true;
    scrub.hidden = false;
    if (mode === "play" && state.frames.length) {
      centerFilmFrame(runtime, state.frames.length - 1, { instant: true });
      startFilmPlayback(runtime);
    }
  }

  function renderFilmAlbum(runtime) {
    const album = runtime.app.querySelector("[data-film-album]");
    const frames = runtime.filmState.frames.filter(frame => frame.type === "PHOTO" || frame.type === "PICK");
    album.innerHTML = frames.length
      ? frames.map((frame, i) => `<figure class="gx-personal-polaroid" style="transform:rotate(${(hashCode(frame.date + frame.time + i) % 7) - 3}deg)">${frame.html}<figcaption>${filmOsd(frame)}</figcaption></figure>`).join("")
      : `<div class="gx-personal-empty"><div><strong>相册还是空的。</strong></div></div>`;
  }

  function dispatchTab(tab) {
    window.dispatchEvent(new CustomEvent("guike:switch-tab", { detail: { tab } }));
    const button = document.querySelector(`.tab[data-target="${CSS.escape(tab)}"]`);
    button?.click();
  }

  async function createPostcardBlob(runtime) {
    const canvas = document.createElement("canvas");
    canvas.width = 1080;
    canvas.height = 1440;
    const ctx = canvas.getContext("2d");
    const journey = runtime.data.todayJourney;
    const gradient = ctx.createLinearGradient(0, 0, 1080, 1440);
    gradient.addColorStop(0, "#f8f2e4");
    gradient.addColorStop(1, "#e9ddc2");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 1080, 1440);
    ctx.save();
    ctx.globalAlpha = .1;
    ctx.strokeStyle = "#5d7869";
    ctx.lineWidth = 42;
    ctx.beginPath();
    ctx.ellipse(1010, 470, 220, 370, .35, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
    ctx.fillStyle = "#2b2a26";
    ctx.font = "600 76px 'Noto Serif SC', serif";
    ctx.fillText("贵客帖", 72, 120);
    ctx.fillStyle = "#4a6455";
    ctx.font = "600 21px Georgia, serif";
    ctx.fillText("GUIZHOU JOURNEY NOTE", 76, 164);
    ctx.fillStyle = "#8a8578";
    ctx.font = "28px 'Noto Serif SC', serif";
    ctx.fillText(`${dateDots(journey.date)}  ·  ${journey.city}`, 76, 215);

    const points = normalizedRoute(journey.routePoints, 1080, 680, 70, 95).map(p => ({ x: p.x, y: p.y + 390 }));
    drawCanvasMountains(ctx, points, 1440, "#c7d5cb", .14, 140, 55);
    drawCanvasMountains(ctx, points, 1440, "#9eb7a9", .16, 95, 35);
    drawCanvasRoute(ctx, points, "#a7bcae", 48, .13);
    [-48, -28, 28, 48].forEach((offset, echoIndex) => drawCanvasRoute(ctx, points.map((p, i) => ({ x: p.x + Math.sin(i + echoIndex) * 7, y: p.y + offset + Math.cos(i * 1.2) * 6 })), "#6f8d7a", 3, .28));
    drawCanvasRoute(ctx, points.map((p,i) => ({x:p.x+15,y:p.y+72+Math.sin(i)*18})), "#8cad9b", 13, .14);
    drawCanvasRoute(ctx, points, "#4a6455", 9, 1);
    drawCanvasRoute(ctx, points, "#f4ecd8", 2.2, .72, [12, 10]);
    (journey.plannedPlaces || []).slice(0, 5).forEach((place, index) => {
      const routeIndex = nearestRouteIndex(place, journey.routePoints);
      const p = points[routeIndex];
      ctx.beginPath();
      ctx.arc(p.x, p.y, 11, 0, Math.PI * 2);
      ctx.fillStyle = place.visited ? "#a4432a" : "#f4ecd8";
      ctx.fill();
      ctx.strokeStyle = place.visited ? "#f4ecd8" : "#4a6455";
      ctx.lineWidth = 4;
      ctx.stroke();
      ctx.fillStyle = "#4a4740";
      ctx.font = "22px 'Noto Serif SC', serif";
      ctx.fillText(place.name, p.x + (index % 2 ? -92 : 18), p.y + (index % 2 ? 40 : -25));
    });
    for (const item of runtime.data.wanxiangItems.filter(item => !runtime.removedStickerIds.has(item.id))) {
      const pos = runtime.stickerPositions[item.id] || { x: 50, y: 55, scale: 1, rotate: 0 };
      if (item.stickerImage) {
        try {
          const stickerImage = await loadCanvasImage(item.stickerImage);
          drawPhotoStickerCanvas(ctx, stickerImage, pos.x / 100 * 1080, pos.y / 100 * 1440, 190 * pos.scale, pos.rotate);
        } catch (_error) {
          drawStickerCanvas(ctx, item.subject, pos.x / 100 * 1080, pos.y / 100 * 1440, 180 * pos.scale, pos.rotate);
        }
      } else {
        drawStickerCanvas(ctx, item.subject, pos.x / 100 * 1080, pos.y / 100 * 1440, 180 * pos.scale, pos.rotate);
      }
    }
    ctx.save();
    ctx.translate(930, 1290);
    ctx.rotate(.06);
    ctx.strokeStyle = "#a4432a";
    ctx.lineWidth = 4;
    ctx.strokeRect(-55, -55, 110, 110);
    ctx.fillStyle = "#a4432a";
    ctx.font = "40px 'Noto Serif SC', serif";
    ctx.textAlign = "center";
    ctx.fillText("贵", 0, -5);
    ctx.fillText("客", 0, 40);
    ctx.restore();
    ctx.textAlign = "left";
    ctx.fillStyle = "#8a8578";
    ctx.font = "22px 'Noto Serif SC', serif";
    ctx.fillText("我走过的路，成了贵州的一座山。", 74, 1340);
    return new Promise(resolve => canvas.toBlob(resolve, "image/png"));
  }

  function drawCanvasRoute(ctx, points, color, width, alpha, dash = []) {
    if (points.length < 2) return;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.setLineDash(dash);
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 0; i < points.length - 1; i += 1) {
      const p0 = points[i - 1] || points[i], p1 = points[i], p2 = points[i + 1], p3 = points[i + 2] || p2;
      ctx.bezierCurveTo(p1.x + (p2.x - p0.x) / 6, p1.y + (p2.y - p0.y) / 6, p2.x - (p3.x - p1.x) / 6, p2.y - (p3.y - p1.y) / 6, p2.x, p2.y);
    }
    ctx.stroke();
    ctx.restore();
  }


  function drawCanvasMountains(ctx, points, height, color, alpha, yBase, amplify) {
    if (points.length < 2) return;
    const tops = points.map((p, i) => ({ x: p.x, y: Math.min(height - 20, p.y + Math.sin(i * 0.8) * amplify + yBase) }));
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, height);
    ctx.lineTo(0, tops[0].y);
    for (let i = 1; i < tops.length; i += 1) {
      const prev = tops[i - 1], cur = tops[i];
      const cpx = prev.x + (cur.x - prev.x) / 2;
      ctx.bezierCurveTo(cpx, prev.y, cpx, cur.y, cur.x, cur.y);
    }
    ctx.lineTo(1080, tops[tops.length - 1].y);
    ctx.lineTo(1080, height);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function loadCanvasImage(source) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = reject;
      image.src = source;
    });
  }

  function drawPhotoStickerCanvas(ctx, image, x, y, size, rotation) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotation * Math.PI / 180);
    ctx.fillStyle = "rgba(244,236,216,.95)";
    ctx.beginPath();
    ctx.ellipse(0, 0, size * .56, size * .54, .08, 0, Math.PI * 2);
    ctx.fill();
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(0, 0, size * .48, size * .46, .08, 0, Math.PI * 2);
    ctx.clip();
    ctx.globalAlpha = .92;
    const ratio = Math.max(size / image.width, size / image.height);
    const width = image.width * ratio, height = image.height * ratio;
    ctx.drawImage(image, -width / 2, -height / 2, width, height);
    ctx.restore();
    ctx.strokeStyle = "rgba(74,100,85,.55)";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.ellipse(0, 0, size * .49, size * .47, .08, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  function drawStickerCanvas(ctx, type, x, y, size, rotation) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotation * Math.PI / 180);
    const s = size / 120;
    ctx.scale(s, s);
    ctx.fillStyle = "rgba(244,236,216,.94)";
    ctx.beginPath();
    ctx.ellipse(0, 0, 52, 50, .1, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    if (type === "cat") {
      ctx.fillStyle = "#b87d4b"; ctx.strokeStyle = "#604b37"; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(-33,-12); ctx.lineTo(-28,-42); ctx.lineTo(-13,-28); ctx.quadraticCurveTo(9,-38,26,-27); ctx.lineTo(37,-42); ctx.lineTo(32,-10); ctx.quadraticCurveTo(38,27,1,36); ctx.quadraticCurveTo(-38,28,-33,-12); ctx.fill(); ctx.stroke();
      ctx.fillStyle="#604b37"; ctx.beginPath(); ctx.arc(-12,-5,2.5,0,Math.PI*2); ctx.arc(14,-5,2.5,0,Math.PI*2); ctx.fill();
    } else if (type === "embroidery") {
      ctx.fillStyle="#315f69"; ctx.strokeStyle="#244b55"; ctx.lineWidth=3; ctx.fillRect(-40,-40,80,80); ctx.strokeRect(-40,-40,80,80);
      ctx.strokeStyle="#d3a64d"; ctx.lineWidth=6; ctx.beginPath(); ctx.moveTo(-32,0); ctx.quadraticCurveTo(-16,-34,0,0); ctx.quadraticCurveTo(17,-34,33,0); ctx.quadraticCurveTo(17,32,0,5); ctx.quadraticCurveTo(-16,32,-32,0); ctx.stroke();
    } else if (type === "tree") {
      ctx.strokeStyle="#6c5035"; ctx.lineWidth=10; ctx.beginPath(); ctx.moveTo(0,39); ctx.lineTo(0,-10); ctx.stroke();
      ctx.fillStyle="#68836a"; ctx.strokeStyle="#456550"; ctx.lineWidth=3; [[-22,-12,24],[4,-28,28],[26,-8,22],[-4,0,27]].forEach(([cx,cy,r])=>{ctx.beginPath();ctx.arc(cx,cy,r,0,Math.PI*2);ctx.fill();ctx.stroke();});
    } else {
      ctx.fillStyle="rgba(216,177,81,.78)"; ctx.strokeStyle="#7d6b42"; ctx.lineWidth=3; ctx.beginPath(); ctx.moveTo(-28,-32); ctx.lineTo(30,-32); ctx.lineTo(22,38); ctx.quadraticCurveTo(0,48,-21,38); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle="#bb7731"; ctx.beginPath(); ctx.arc(-8,-5,10,0,Math.PI*2);ctx.arc(12,15,11,0,Math.PI*2);ctx.fill(); ctx.strokeStyle="#4a6455";ctx.beginPath();ctx.moveTo(16,-34);ctx.lineTo(31,-57);ctx.stroke();
    }
    ctx.restore();
  }

  async function savePostcard(runtime) {
    const blob = await createPostcardBlob(runtime);
    if (!blob) { showToast(runtime, "图片生成失败，请稍后再试"); return; }
    downloadBlob(blob, `贵客帖-${runtime.data.todayJourney.date}.png`);
    showToast(runtime, "贵客帖 PNG 已保存");
  }

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1200);
  }

  async function sharePostcard(runtime) {
    const blob = await createPostcardBlob(runtime);
    const text = `我的贵州，正在成帖。${dateCN(runtime.data.todayJourney.date)}，${runtime.data.todayJourney.city}。`;
    const file = new File([blob], `贵客帖-${runtime.data.todayJourney.date}.png`, { type: "image/png" });
    try {
      if (navigator.share && (!navigator.canShare || navigator.canShare({ files: [file] }))) {
        await navigator.share({ title: "贵客帖", text, files: [file] });
        showToast(runtime, "贵客帖已交给系统分享");
      } else {
        downloadBlob(blob, file.name);
        await navigator.clipboard?.writeText(text);
        showToast(runtime, "图片已保存，分享文案已复制");
      }
    } catch (error) {
      if (error?.name !== "AbortError") { downloadBlob(blob, file.name); showToast(runtime, "已改为保存 PNG"); }
    }
  }

  async function publishPostcard(runtime) {
    const blob = await createPostcardBlob(runtime);
    window.dispatchEvent(new CustomEvent("guike:publish-journey", {
      detail: { journeyId: runtime.data.todayJourney.id, postcardBlob: blob, journeyData: clone(runtime.data.todayJourney) }
    }));
    showToast(runtime, "贵客帖已送往广场");
  }

  function mount(root, data) {
    if (!root) throw new Error("GuikePersonal.mount(root, data): root 不能为空。");
    if (instance) destroy();
    instance = createRuntime(root, data);
    return instance;
  }

  function update(data) {
    if (!instance) return;
    instance.data = Object.assign(instance.data, clone(data || {}));
    renderAll(instance);
  }

  function addWanxiang(item) {
    if (!instance || !item) return;
    instance.data.wanxiangItems.unshift(clone(item));
    instance.stickerPositions[item.id] = { x: 52, y: 58, scale: 1, rotate: 0 };
    renderAll(instance);
  }

  // 供广场页调用：把收藏的他人行径写进「我的收藏 · 他人行径」
  function addSavedJourney(route) {
    if (!instance || !route) return false;
    const today = new Date().toISOString().slice(0, 10);
    const places = Array.isArray(route.places) ? route.places : [];
    const entry = enrichSavedJourney({
      id: route.id || `saved-${Date.now()}`,
      author: route.author || "山客",
      date: route.date || today,
      city: route.city || "贵州",
      places,
      routePoints: Array.isArray(route.routePoints) ? route.routePoints : [],
      savedAt: today,
      dist: route.dist || routeDistanceKm(route.routePoints),
      tags: route.tags || ["松弛", "城市"],
      saves: Number(route.saves) || 1,
      saved: true,
      borrowed: route.borrowed === true,
      borrowedDate: route.borrowedDate || null,
      photoColors: [["#586B5A", "#AEC2B2"], ["#315c65", "#9e4833"], ["#9bab95", "#546a5d"]][hashCode(route.id || "") % 3],
      tempIdx: [],
      alts: places.map(() => null),
      stopNotes: places.map(name => `与 ${route.author || "山客"} 同款的一站：${name}。`)
    });
    const idx = instance.data.savedJourneys.findIndex(item => item.id === entry.id);
    if (idx >= 0) instance.data.savedJourneys[idx] = Object.assign(instance.data.savedJourneys[idx], entry);
    else instance.data.savedJourneys.unshift(entry);
    renderCollection(instance);
    return true;
  }

  function openJourneyPublic(id) {
    if (!instance) return;
    if (id && id !== instance.data.todayJourney.id) showToast(instance, "Demo 当前展示今日行径");
    openJourney(instance);
  }

  function generatePostcard(id) {
    if (!instance) return;
    if (id && id !== instance.data.todayJourney.id) showToast(instance, "Demo 当前生成今日贵客帖");
    openPostcard(instance);
  }

  // 供广场「沿着 TA 走 · 深度定制」跳转后直接打开对应他人行径 Sheet
  function openSavedJourneyPublic(id) {
    if (!instance || !id) return false;
    if (!instance.data.savedJourneys.some(item => item.id === id)) return false;
    openSavedJourney(instance, id);
    return true;
  }

  function destroy() {
    if (!instance) return;
    instance.aborter.abort();
    stopCamera(instance);
    window.clearTimeout(instance.toastTimer);
    window.clearTimeout(instance.clickTimer);
    instance = null;
  }

  window.GuikePersonal = { mount, update, addWanxiang, addSavedJourney, openJourney: openJourneyPublic, openSavedJourney: openSavedJourneyPublic, generatePostcard, destroy, AIAdapter };
}());
