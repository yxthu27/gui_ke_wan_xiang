/* ============================================================
   贵客万象 · Tab 04 广场 —— 万象广场
   “别人走过一段贵州，而我可以把这一程收藏下来，明天沿着它继续走。”
   ============================================================ */
(function () {
  "use strict";

  /* ----------------------------------------------------------
     图片（执行文档 §26/§40：真实贵州实拍，Wikimedia Commons，
     禁止 AI 生成图冒充实拍；加载失败由 guizhou-photos.js 全局降级）
     ---------------------------------------------------------- */
  const photo = (category, index, size) => {
    const asset = window.GuikePhotos?.pick?.(category, index);
    return asset ? window.GuikePhotos.url(asset.id, size || "card") : "";
  };

  const PHOTOS = {
    featured: photo("scenic", 8),            // 山野村寨 · 晨雾梯田
    headerArt: photo("scenic", 2, "detail"), // 喀斯特山形（页首）
    featCutout: photo("heritage", 4),        // 非遗特写（贴画位）
    c1: photo("city", 0),                    // 青岩古镇石板街
    c2: photo("food", 2),                    // 贵州食物
    c3: photo("heritage", 6),                // 侗寨鼓楼
    c4: photo("heritage", 2),                // 苗银特写
    c5: photo("city", 2),                    // 贵阳街景/夜市
    c6: photo("scenic", 4),                  // 雾中山径
    c7: photo("city", 4)                     // 街角小店
  };

  /* ----------------------------------------------------------
     数据
     ---------------------------------------------------------- */
  const CHIPS = ["全部", "山野", "寻味", "非遗", "城市", "松弛", "去野", "夜游", "小店"];

  const FEATURED = {
    id: "f1",
    title: "为了这碗糯米饭，多坐了两站公交",
    place: "贵阳 · 花溪—青岩",
    dist: 6.2, stops: 4, time: "3h20m", near: 1.2,
    tags: ["寻味", "松弛", "山野"],
    saves: 1284,
    author: "阿枝",
    date: "27 AUG 2026",
    img: PHOTOS.featured,
    cutout: PHOTOS.featCutout,
    route: [[12, 86], [30, 64], [52, 70], [70, 44], [88, 18]],
    // 真实 POI 坐标（WGS84，前四点对应 stops，末点为收尾）：借入主规划/收藏走真实 geometry
    geo: [[26.4297, 106.6702], [26.3300, 106.6814], [26.3288, 106.6828], [26.3297, 106.6821]],
    line: "糯米饭要趁热，城墙上要坐久一点。",
    stops: [
      { name: "花溪公园北门", time: "08:40", note: "在公交站旁买了一份糯米饭，趁热吃完，手心是暖的。", photo: PHOTOS.c2, thing: "拾得 · 一枚青岩玫瑰糖" },
      { name: "青岩古镇西门", time: "10:25", note: "从背街走进去，石板路比主街安静得多，鞋底有回声。", photo: PHOTOS.c1 },
      { name: "定广门城墙", time: "11:50", note: "在城墙上坐了半小时，看云从山那边慢慢过来。" },
      { name: "背街无名茶馆", time: "13:20", note: "一间没有招牌的小茶馆，当天坐满了人，老板娘加了三次水。", expired: true }
    ]
  };

  const CARDS = [
    {
      id: "c1", ratio: "r-34", title: "这一下午，没有去景点", place: "贵阳 · 黔灵山脚",
      dist: 4.8, stops: 3, time: "2h10m", near: 0.8, tags: ["松弛", "城市"], saves: 862,
      author: "老周", date: "26 AUG 2026", img: PHOTOS.c1,
      route: [[14, 84], [46, 58], [84, 20]],
      geo: [[26.5989, 106.6903], [26.6023, 106.6953], [26.5990, 106.6912]],
      line: "猴子比人先下班，我比猴子走得慢。",
      stops: [
        { name: "黔灵山南门", time: "14:05", note: "从南门慢慢往上，路边的樟树味道很重，像下过雨。" },
        { name: "弘福寺石阶", time: "15:20", note: "坐在石阶上听了一会儿钟声，什么都没想。", photo: PHOTOS.c1 },
        { name: "山脚素面馆", time: "16:40", note: "下山吃了一碗素面，老板说我是今天最后一个客人。", thing: "拾得 · 一颗山核桃" }
      ]
    },
    {
      id: "c2", ratio: "r-1", title: "在花溪多绕了一点路", place: "贵阳 · 花溪",
      dist: 5.4, stops: 3, time: "2h45m", near: 2.4, tags: ["去野", "山野"], saves: 517,
      author: "小满", date: "25 AUG 2026", img: PHOTOS.c2,
      route: [[10, 30], [44, 52], [86, 80]],
      line: "本来要回家的，脚自己拐了弯。",
      stops: [
        { name: "花溪十里河滩", time: "16:00", note: "沿着河滩走，水很浅，有人在水里洗菜。" },
        { name: "黄金大道", time: "17:10", note: "梧桐把光切成小块，落在肩膀上。", photo: PHOTOS.c2 },
        { name: "青岩岔路口", time: "18:05", note: "在这里犹豫了很久，最后还是原路返回。", thing: "拾得 · 一片干荷叶" }
      ]
    },
    {
      id: "c3", ratio: "r-45", title: "鼓楼底下的黄昏，值得等", place: "黔东南 · 肇兴侗寨",
      dist: 3.6, stops: 3, time: "4h05m", near: 18.6, tags: ["夜游", "山野"], saves: 2136,
      author: "阿木", date: "24 AUG 2026", img: PHOTOS.c3,
      route: [[16, 20], [50, 48], [80, 86]],
      line: "灯亮的那一刻，整个寨子安静了一秒。",
      stops: [
        { name: "鼓楼广场", time: "17:30", note: "老人们在鼓楼下抽烟聊天，木头的味道混着烟火。" },
        { name: "风雨桥", time: "18:40", note: "桥上风很大，河面先是金色，然后是蓝色。", photo: PHOTOS.c3 },
        { name: "堂安梯田路口", time: "20:15", note: "夜里上山的人很少，萤火虫跟着走了很长一段。", thing: "拾得 · 一段侗歌录音" }
      ]
    },
    {
      id: "c4", ratio: "r-1", title: "为一只银耳环走了三条街", place: "黔东南 · 台江",
      dist: 2.9, stops: 3, time: "1h50m", near: 12.3, tags: ["非遗", "小店"], saves: 341,
      author: "禾一", date: "23 AUG 2026", img: PHOTOS.c4,
      route: [[20, 80], [52, 50], [88, 26]],
      line: "錾子敲下去的声音，比任何音乐都准。",
      stops: [
        { name: "银匠铺", time: "10:20", note: "老师傅不抬头，錾子在小银片上走了四十分钟。" },
        { name: "老街市集", time: "11:35", note: "银饰摊一家挨一家，看得眼睛发花。", photo: PHOTOS.c4 },
        { name: "苗绣工坊", time: "12:50", note: "临走前绣娘塞给我一小段线，说是山里的颜色。", thing: "拾得 · 一小段绣线" }
      ]
    },
    {
      id: "c5", ratio: "r-34", title: "夜市的灯亮起来之前，先吃饱", place: "贵阳 · 二七路",
      dist: 1.8, stops: 4, time: "1h30m", near: 1.6, tags: ["寻味", "夜游"], saves: 928,
      author: "大乔", date: "27 AUG 2026", img: PHOTOS.c5,
      route: [[12, 50], [40, 66], [66, 40], [90, 16]],
      line: "恋爱豆腐果的名字很老套，味道很诚实。",
      stops: [
        { name: "小吃街口", time: "17:50", note: "天还没黑，摊主们正在点火，油烟先于灯亮起来。" },
        { name: "恋爱豆腐果摊", time: "18:20", note: "蹲在塑料凳上吃了两个，蘸水是灵魂。", photo: PHOTOS.c5 },
        { name: "冰浆铺子", time: "19:00", note: "加刺梨和杨梅，甜得很突然。", thing: "拾得 · 一杯刺梨冰浆" },
        { name: "夜市灯亮处", time: "19:30", note: "灯全亮的时候回头看了一眼，人潮刚好涨上来。" }
      ]
    },
    {
      id: "c6", ratio: "r-45", title: "雾里走了两个小时，值", place: "铜仁 · 梵净山",
      dist: 8.1, stops: 3, time: "5h40m", near: 46.2, tags: ["山野", "去野"], saves: 1759,
      author: "江离", date: "22 AUG 2026", img: PHOTOS.c6,
      route: [[10, 88], [38, 70], [62, 46], [88, 14]],
      geo: [[27.9160, 108.6940], [27.9260, 108.7000], [27.9215, 108.6960]],
      line: "看不见山顶的时候，就把每一步当山顶。",
      stops: [
        { name: "山门", time: "08:10", note: "工作人员说今天雾大，我倒是觉得正合适。" },
        { name: "栈道雾中段", time: "10:05", note: "能见度不到十米，只听得见自己的呼吸和水滴。", photo: PHOTOS.c6 },
        { name: "蘑菇石", time: "12:30", note: "雾散了一分钟，刚好够拍一张，又合上了。", thing: "拾得 · 一枚掉落的松果" }
      ]
    },
    {
      id: "c7", ratio: "r-1", title: "藏在巷子里的书店，只坐了十分钟", place: "贵阳 · 电台街",
      dist: 1.2, stops: 3, time: "1h15m", near: 0.6, tags: ["城市", "小店", "松弛"], saves: 203,
      author: "沈一", date: "28 AUG 2026", img: PHOTOS.c7,
      route: [[14, 26], [48, 44], [84, 72]],
      geo: [[26.5865, 106.7205], [26.5868, 106.7209], [26.5872, 106.7214]],
      line: "买了一本没打算买的书，配得上这十分钟。",
      stops: [
        { name: "电台街转角", time: "15:40", note: "巷子窄到两个人要侧身让路，转角有一只打盹的猫。" },
        { name: "书店", time: "15:55", note: "在窗边站了十分钟，翻完了一本关于贵州山地的旧影集。", photo: PHOTOS.c7 },
        { name: "巷口咖啡", time: "16:30", note: "老板不问加不加糖，直接端上来，是对的。", thing: "拾得 · 一张手写书签" }
      ]
    }
  ];

  const CLUSTER = {
    kicker: "COMMUNITY CLUSTER",
    title: "本周很多贵客都去了这里",
    place: "花溪 · 青岩",
    count: 12,
    route: [[8, 70], [28, 56], [44, 66], [62, 40], [80, 52], [94, 24]]
  };

  /* ----------------------------------------------------------
     状态
     ---------------------------------------------------------- */
  const STORE_KEY = "gzp-collected";
  const BORROW_KEY = "gzp-borrowed";
  let state = {
    seg: "精选",      // 精选 | 附近
    chip: "全部",
    collected: loadCollected(),
    borrowed: loadBorrowed(),   // { [行径id]: 借入日期 ISO }
    detail: null,
    borrow: null                // 快速借入面板状态 { mode, date, dateValue }
  };
  let rt = null; // runtime

  function loadCollected() {
    try { return JSON.parse(localStorage.getItem(STORE_KEY)) || []; }
    catch (e) { return []; }
  }
  function saveCollected() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(state.collected)); } catch (e) { /* ignore */ }
  }
  function loadBorrowed() {
    try { return JSON.parse(localStorage.getItem(BORROW_KEY)) || {}; }
    catch (e) { return {}; }
  }
  function saveBorrowed() {
    try { localStorage.setItem(BORROW_KEY, JSON.stringify(state.borrowed)); } catch (e) { /* ignore */ }
  }

  /* —— 真实坐标归一（执行文档 §15/§17）：dist 由真实 POI 计算，
        routePoints 供收藏/借入直接走真实 geometry（Personal 页再用 Routing 细化）—— */
  function geoDistanceKm(geo) {
    if (!Array.isArray(geo) || geo.length < 2) return 0;
    let total = 0;
    for (let i = 1; i < geo.length; i += 1) {
      const dy = (geo[i][0] - geo[i - 1][0]) * 111;
      const dx = (geo[i][1] - geo[i - 1][1]) * 111 * Math.cos(geo[i][0] * Math.PI / 180);
      total += Math.hypot(dy, dx);
    }
    return Math.round(total * 1.27 * 10) / 10;
  }
  [FEATURED, ...CARDS].forEach(item => {
    if (Array.isArray(item.geo) && item.geo.length > 1) {
      item.dist = geoDistanceKm(item.geo);
      item.routePoints = item.geo.map(([lat, lng]) => ({ lat, lng }));
    }
  });

  /* —— 日期工具：默认“明天”作为借入落点 —— */
  function addDaysISO(n) {
    const d = new Date();
    d.setDate(d.getDate() + n);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }
  function resolveDateISO(dateISO) {
    return /^\d{4}-\d{2}-\d{2}$/.test(dateISO || "") ? dateISO : addDaysISO(1);
  }
  function dateMD(dateISO) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateISO || "");
    return m ? `${Number(m[2])}月${Number(m[3])}日` : "";
  }
  function dateDots(dateISO) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateISO || "");
    return m ? `${m[2]}.${m[3]}` : "";
  }
  function fmt(n) { return n.toLocaleString("en-US"); }

  // 把广场行径转成个人页「我的收藏 · 他人行径」所需的数据
  function buildSavedRoute(item) {
    const city = (item.place || "贵州").split("·").pop().trim() || "贵州";
    return {
      id: "saved-from-" + item.id,
      author: item.author,
      date: new Date().toISOString().slice(0, 10),
      city,
      places: (item.stops || []).map(s => s.name),
      routePoints: item.routePoints || (item.route || []).map(p => ({ lat: p[1], lng: p[0] }))
    };
  }

  // 沿着 TA 走 → 借入主规划的载荷（与个人页「借此一程」共用 GuikePlan.addBorrow 协议）
  function buildBorrowPayload(item, dateISO) {
    const city = (item.place || "贵州").split("·").pop().trim() || "贵州";
    return {
      date: dateISO,
      city,
      title: `借自${item.author}的整程`,
      places: (item.stops || []).map(s => ({ name: s.name, time: s.time })),
      routePoints: item.routePoints || (item.route || []).map(p => ({ lat: p[1], lng: p[0] })),
      author: item.author,
      mode: "whole",
      sourceJourneyId: item.id
    };
  }

  // 借入：写主规划 + 收藏夹留痕（两种独立数据行为，收藏数不受影响）
  function walkBorrow(item, dateISO) {
    const date = resolveDateISO(dateISO);
    const plan = window.GuikePlan?.addBorrow?.(buildBorrowPayload(item, date));
    state.borrowed[item.id] = date;
    saveBorrowed();
    window.GuikePersonal?.addSavedJourney(Object.assign(buildSavedRoute(item), { borrowed: true, borrowedDate: date }));
    return Boolean(plan);
  }

  /* ----------------------------------------------------------
     SVG 抽象路线
     ---------------------------------------------------------- */
  function routePath(points) {
    if (!points.length) return "";
    let d = `M ${points[0][0]} ${points[0][1]}`;
    for (let i = 1; i < points.length - 1; i++) {
      const mx = (points[i][0] + points[i + 1][0]) / 2;
      const my = (points[i][1] + points[i + 1][1]) / 2;
      d += ` Q ${points[i][0]} ${points[i][1]} ${mx} ${my}`;
    }
    const last = points[points.length - 1];
    d += ` L ${last[0]} ${last[1]}`;
    return d;
  }

  function routeSvg(points, opts) {
    opts = opts || {};
    const nodeCount = opts.nodes || 3;
    const step = Math.max(1, Math.floor((points.length - 1) / (nodeCount - 1)));
    let circles = "";
    for (let i = 0; i < points.length; i += step) {
      const isEnd = i === points.length - 1;
      circles += `<circle cx="${points[i][0]}" cy="${points[i][1]}" r="${isEnd ? 1.9 : 1.4}"${isEnd ? ' class="is-end"' : ""}/>`;
      if (circles.split("circle").length - 1 >= nodeCount + 1) break;
    }
    return `<svg class="gzp-route ${opts.cls || ""}" viewBox="0 0 100 100" aria-hidden="true">
      <path d="${routePath(points)}" pathLength="1" vector-effect="non-scaling-stroke"/>
      ${circles}
    </svg>`;
  }

  const BOOKMARK_SVG = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4h10a1 1 0 0 1 1 1v15l-6-4.2L6 20V5a1 1 0 0 1 1-1z"/></svg>`;

  /* ----------------------------------------------------------
     模板
     ---------------------------------------------------------- */
  function saveBtnHTML(item, cls) {
    const saved = state.collected.indexOf(item.id) >= 0;
    return `<button class="gzp-save ${cls || ""} ${saved ? "is-saved" : ""}" data-save="${item.id}" aria-label="收藏这条行径">
      ${BOOKMARK_SVG}<span data-save-count="${item.id}">${fmt(item.saves + (saved ? 1 : 0))}</span>
    </button>`;
  }

  function stopCount(item) {
    return Array.isArray(item.stops) ? item.stops.length : Number(item.stops) || 0;
  }

  function featuredHTML(item) {
    return `<article class="gzp-feat" data-card="${item.id}" data-img="${item.img}">
      <div class="gzp-feat-media">
        <img class="gzp-photo" src="${item.img}" alt="${item.title}" loading="lazy"/>
        ${routeSvg(item.route, { nodes: 5 })}
        <span class="gzp-feat-flag">FEATURED ROUTE</span>
      </div>
      <img class="gzp-cutout gzp-feat-cutout" src="${item.cutout}" alt="" aria-hidden="true"/>
      <div class="gzp-feat-body">
        <h2 class="gzp-feat-title">${item.title}</h2>
        <p class="gzp-feat-place">${item.place}</p>
        <p class="gzp-feat-stats">
          <span>${item.dist.toFixed(1)} KM</span><i></i>
          <span>${stopCount(item)} 站</span><i></i>
          <span>${item.time}</span>
        </p>
        <div class="gzp-tags">${item.tags.slice(0, 3).map(t => `<span class="gzp-tag">${t}</span>`).join("")}</div>
        <div class="gzp-feat-foot">
          <span class="gzp-author"><i class="gzp-avatar">${item.author[0]}</i><span class="gzp-author-name">${item.author}</span></span>
          ${saveBtnHTML(item)}
        </div>
      </div>
    </article>`;
  }

  function cardHTML(item) {
    return `<article class="gzp-card ${item.ratio}" data-card="${item.id}" data-img="${item.img}">
      <div class="gzp-card-media">
        <img class="gzp-photo" src="${item.img}" alt="${item.title}" loading="lazy"/>
        ${routeSvg(item.route, { nodes: 3 })}
        ${state.seg === "附近" ? `<span class="gzp-near-chip">${item.near} KM</span>` : ""}
        ${item.postcard ? `<span class="gzp-private-mark is-postcard">贵客帖</span>` : item.private ? `<span class="gzp-private-mark">仅自己</span>` : ""}
      </div>
      <div class="gzp-card-body">
        <h3 class="gzp-card-title">${item.title}</h3>
        <p class="gzp-card-place">${item.place} · ${(item.near || 0).toFixed(1)} KM</p>
        <div class="gzp-tags">${item.tags.slice(0, 3).map(t => `<span class="gzp-tag">${t}</span>`).join("")}</div>
        <div class="gzp-card-foot">
          <span class="gzp-author"><i class="gzp-avatar">${item.author[0]}</i><span class="gzp-author-name">${item.author}</span></span>
          ${saveBtnHTML(item)}
        </div>
      </div>
    </article>`;
  }

  function clusterHTML() {
    return `<aside class="gzp-cluster" data-observe>
      <p class="gzp-cluster-kicker">${CLUSTER.kicker}</p>
      <h3 class="gzp-cluster-title">${CLUSTER.title}</h3>
      <p class="gzp-cluster-meta">${CLUSTER.place} · ${CLUSTER.count} 条行径</p>
      <div class="gzp-cluster-route">${routeSvg(CLUSTER.route, { nodes: 4 })}</div>
    </aside>`;
  }

  function matchesChip(item) {
    return state.chip === "全部" || item.tags.indexOf(state.chip) >= 0;
  }

  function visibleCards() {
    let list = CARDS.slice();
    list = list.filter(matchesChip);
    if (state.seg === "附近") list.sort((a, b) => a.near - b.near);
    return list;
  }

  function feedHTML() {
    const cards = visibleCards();
    const first = cards.slice(0, 4);
    const second = cards.slice(4, 8);
    const featured = matchesChip(FEATURED) ? featuredHTML(FEATURED) : "";
    return `${featured}
      ${first.length ? `<div class="gzp-masonry">${first.map(cardHTML).join("")}</div>` : ""}
      ${first.length && second.length ? clusterHTML() : ""}
      ${second.length ? `<div class="gzp-masonry">${second.map(cardHTML).join("")}</div>` : ""}
      ${!first.length && !second.length ? `<div class="gzp-empty">这个 Tag 下还没有行径，去别处看看。</div>` : ""}
      <p class="gzp-feed-foot">WANXIANG PLAZA · GROWING<em>每一条行径，都可以被重新行走</em></p>`;
  }

  function detailHTML(item) {
    const saved = state.collected.indexOf(item.id) >= 0;
    const borrowedDate = state.borrowed[item.id];
    return `<div class="gzp-detail-scroll">
      <div class="gzp-hero">
        <img src="${item.img}" alt="${item.title}" data-hero-img/>
        ${routeSvg(item.route, { nodes: 5 })}
        <div class="gzp-hero-shade"></div>
        <button class="gzp-back" type="button" data-action="close-detail" aria-label="返回广场">←</button>
        <div class="gzp-hero-head"><p class="gzp-eyebrow">ROUTE STORY · ${item.place}</p></div>
      </div>
      <div class="gzp-detail-body">
        <div class="gzp-detail-author">
          <i class="gzp-avatar">${item.author[0]}</i>
          <div>
            <span class="gzp-detail-author-name">${item.author}</span>
            <span class="gzp-detail-author-date">${item.date} · GUIZHOU</span>
          </div>
        </div>
        <h2 class="gzp-detail-line">${item.line}</h2>
        <p class="gzp-detail-stats">
          <span>${item.dist.toFixed(1)} KM</span><i></i><span>${stopCount(item)} 站</span><i></i><span>${item.time}</span>
        </p>
        <ol class="gzp-timeline">
          ${item.stops.map((s, i) => stopHTML(s, i === item.stops.length - 1)).join("")}
        </ol>
        <button class="gzp-map-toggle" type="button" data-action="open-map">
          <span>展开地图</span><small>OPEN MAP · ${stopCount(item)} NODES</small>
        </button>
        <p class="gzp-detail-footnote">收藏这一程，明天沿着它走。</p>
      </div>
    </div>
    <div class="gzp-dock">
      <button class="gzp-dock-save ${saved ? "is-saved" : ""}" type="button" data-action="dock-save" aria-label="收藏这条行径">
        ${BOOKMARK_SVG}<span data-dock-count>${fmt(item.saves + (saved ? 1 : 0))}</span>
      </button>
      <button class="gzp-dock-walk ${borrowedDate ? "is-borrowed" : ""}" type="button" data-action="walk" aria-label="沿着 TA 走，借入主规划">
        <i aria-hidden="true"></i><span data-walk-label>${borrowedDate ? `已借入 · ${dateDots(borrowedDate)}` : "沿着 TA 走"}</span>
      </button>
    </div>
    <div class="gzp-borrow" data-borrow-panel hidden>
      <div class="gzp-borrow-mask" data-action="close-borrow" aria-hidden="true"></div>
      <section class="gzp-borrow-card" role="dialog" aria-modal="true" aria-label="沿着 TA 走 · 快速借入">
        <span class="gzp-borrow-handle" aria-hidden="true"></span>
        <p class="gzp-eyebrow">BORROW THIS ROUTE</p>
        <h3>沿着 TA 走</h3>
        <p class="gzp-borrow-intro">${item.author} 的这一程，将作为你当天的主规划继续走。</p>
        <div class="gzp-borrow-modes">
          <button type="button" class="is-picked" data-borrow-quick="whole"><b>借整程</b><small>全部站点照搬进当天规划</small></button>
          <button type="button" data-borrow-quick="custom"><b>深度定制</b><small>挑地点 / 借骨架 → 个人页</small></button>
        </div>
        <div class="gzp-borrow-dates">
          <button type="button" data-borrow-date="tomorrow" class="is-picked">明天</button>
          <button type="button" data-borrow-date="today">今天</button>
          <label class="gzp-borrow-pick">其他<input type="date" data-borrow-input aria-label="选择其他日期"></label>
        </div>
        <p class="gzp-borrow-target" data-borrow-target></p>
        <div class="gzp-borrow-actions">
          <button type="button" class="gzp-borrow-cancel" data-action="close-borrow">返回</button>
          <button type="button" class="gzp-borrow-confirm" data-action="confirm-borrow">确认借入 · 添进主规划</button>
        </div>
      </section>
    </div>
    <div class="gzp-sheet" data-map-sheet>
      <div class="gzp-sheet-mask" data-action="close-map"></div>
      <section class="gzp-sheet-panel" role="dialog" aria-modal="true" aria-label="行径地图">
        <div class="gzp-sheet-handle" aria-hidden="true"></div>
        <div class="gzp-sheet-titlebar">
          <div><p class="gzp-eyebrow">ABSTRACT MAP</p><h3>${item.place}</h3></div>
          <button class="gzp-icon-btn" type="button" data-action="close-map" aria-label="收起地图">×</button>
        </div>
        <div class="gzp-map-canvas">
          ${bigMapSvg(item)}
        </div>
        <p class="gzp-map-caption"><span>${item.dist.toFixed(1)} KM · ${stopCount(item)} 站 · ${item.time}</span><span>ABSTRACT ROUTE</span></p>
      </section>
    </div>`;
  }

  function stopHTML(s, isEnd) {
    return `<li class="gzp-stop ${isEnd ? "is-end" : ""} ${s.expired ? "is-expired" : ""}">
      <i class="gzp-stop-node" aria-hidden="true"></i>
      <p class="gzp-stop-name">${s.name}<span class="gzp-stop-time">${s.time || ""}</span></p>
      ${s.note ? `<p class="gzp-stop-note">${s.note}</p>` : ""}
      ${s.photo ? `<img class="gzp-stop-photo" src="${s.photo}" alt="${s.name}" loading="lazy"/>` : ""}
      ${s.thing ? `<span class="gzp-thing">${s.thing}</span>` : ""}
      ${s.expired ? `<p class="gzp-stop-expired">TA 当天在这里遇见过 / 今天暂时没人确认，不保证仍然营业。</p>` : ""}
    </li>`;
  }

  function bigMapSvg(item) {
    const pts = item.route;
    const labels = item.stops.map((s, i) => {
      const p = pts[Math.min(i, pts.length - 1)];
      return `<text x="${p[0]}" y="${p[1] - 4}" text-anchor="middle" fill="rgba(238,233,221,0.85)" font-size="3.1" letter-spacing="0.4">${s.name}</text>`;
    }).join("");
    return `<svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
      <g stroke="rgba(200,200,193,0.1)" stroke-width="0.25">
        ${[20, 40, 60, 80].map(y => `<line x1="0" y1="${y}" x2="100" y2="${y}"/>`).join("")}
        ${[20, 40, 60, 80].map(x => `<line x1="${x}" y1="0" x2="${x}" y2="100"/>`).join("")}
      </g>
      <path d="${routePath(pts)}" pathLength="1" fill="none" stroke="rgba(238,233,221,0.9)" stroke-width="1.4" vector-effect="non-scaling-stroke" class="gzp-map-path"/>
      ${pts.map((p, i) => `<circle cx="${p[0]}" cy="${p[1]}" r="${i === pts.length - 1 ? 1.7 : 1.2}" fill="${i === pts.length - 1 ? "#A94B3C" : "#EEE9DD"}"/>`).join("")}
      ${labels}
    </svg>`;
  }

  function templateHTML() {
    return `<div class="gzp" data-plaza-app>
      <div class="gzp-scroll" data-plaza-scroll>
        <header class="gzp-header">
          <p class="gzp-eyebrow">GUIYANG · GUIZHOU · <span data-today>28 AUG 2026</span></p>
          <h1>万象广场</h1>
          <p class="gzp-header-sub">看看别人怎么遇见贵州。</p>
          <p class="gzp-header-count"><b data-growing>82</b> 条正在生长的旅途 · <em>EVERY ROUTE CAN BE WALKED AGAIN</em></p>
          <div class="gzp-header-art" aria-hidden="true"><img src="${PHOTOS.headerArt}" alt=""/></div>
        </header>

        <div class="gzp-seg-wrap">
          <div class="gzp-seg" role="tablist" aria-label="广场切换">
            <button type="button" role="tab" class="is-active" data-seg="精选" aria-selected="true">精选</button>
            <button type="button" role="tab" data-seg="附近" aria-selected="false">附近</button>
          </div>
        </div>
        <div class="gzp-chips" data-chips>
          ${CHIPS.map(c => `<button type="button" class="gzp-chip ${c === "全部" ? "is-active" : ""}" data-chip="${c}" aria-pressed="${c === "全部" ? "true" : "false"}">${c}</button>`).join("")}
        </div>

        <div class="gzp-feed" data-feed></div>
      </div>

      <div class="gzp-detail" data-detail></div>
      <div class="gzp-toast" role="status" aria-live="polite" data-toast></div>
    </div>`;
  }

  /* ----------------------------------------------------------
     渲染与交互
     ---------------------------------------------------------- */
  function renderFeed(animate) {
    const feed = rt.root.querySelector("[data-feed]");
    const update = () => {
      feed.innerHTML = feedHTML();
      observeReveal();
      requestAnimationFrame(() => feed.classList.remove("is-filtering"));
    };
    if (!animate) {
      update();
      return;
    }
    feed.classList.add("is-filtering");
    clearTimeout(rt.filterTimer);
    rt.filterTimer = setTimeout(update, 130);
  }

  function observeReveal() {
    if (rt.io) rt.io.disconnect();
    const io = new IntersectionObserver(entries => {
      entries.forEach(en => {
        if (en.isIntersecting) {
          en.target.classList.add("is-in");
          io.unobserve(en.target);
        }
      });
    }, { root: rt.scroll, threshold: 0.12 });
    rt.root.querySelectorAll(".gzp-card, .gzp-cluster, .gzp-feat").forEach(el => io.observe(el));
    rt.io = io;
  }

  function showToast(msg) {
    const t = rt.root.querySelector("[data-toast]");
    t.textContent = msg;
    t.classList.add("is-show");
    clearTimeout(rt.toastTimer);
    rt.toastTimer = setTimeout(() => t.classList.remove("is-show"), 2000);
  }

  function toggleSave(id, btn, dockBtn) {
    const item = [FEATURED].concat(CARDS).find(c => c.id === id);
    if (!item) return;
    const idx = state.collected.indexOf(id);
    const svgBox = (btn || dockBtn).querySelector("svg");
    if (idx >= 0) {
      state.collected.splice(idx, 1);
      item.saves = Math.max(0, item.saves - 1);
      [btn, dockBtn].forEach(b => b && b.classList.remove("is-saved"));
    } else {
      state.collected.push(id);
      item.saves += 1;
      [btn, dockBtn].forEach(b => b && b.classList.add("is-saved"));
      // 收藏的行径同步进个人页「我的收藏 · 他人行径」
      const ok = window.GuikePersonal?.addSavedJourney(buildSavedRoute(item));
      showToast(ok === false ? "已收进我的路线（个人页尚未打开，稍后自动同步）" : "已收进我的路线 · 存入个人收藏夹");
    }
    saveCollected();
    [btn, dockBtn].forEach(b => {
      if (!b) return;
      b.classList.remove("is-pop");
      void b.offsetWidth;
      b.classList.add("is-pop");
    });
    document.querySelectorAll(`[data-save-count="${id}"]`).forEach(el => { el.textContent = fmt(item.saves); });
    if (dockBtn) dockBtn.querySelector("[data-dock-count]").textContent = fmt(item.saves);
    if (svgBox) { /* animation handled by class */ }
  }

  /* —— 沿着 TA 走：快速借入面板（Sheet 内二级，不跳页） —— */
  function borrowPanelEl() { return rt.root.querySelector("[data-borrow-panel]"); }

  function openBorrowPanel(item) {
    const panel = borrowPanelEl();
    if (!panel) return;
    state.borrow = { item, date: "tomorrow", dateValue: "" };
    panel.querySelectorAll("[data-borrow-date]").forEach(b => b.classList.toggle("is-picked", b.dataset.borrowDate === "tomorrow"));
    const input = panel.querySelector("[data-borrow-input]");
    if (input) input.value = "";
    updateBorrowTarget();
    panel.hidden = false;
    requestAnimationFrame(() => panel.classList.add("is-open"));
  }

  function closeBorrowPanel() {
    const panel = borrowPanelEl();
    if (!panel) return;
    panel.classList.remove("is-open");
    state.borrow = null;
    setTimeout(() => { if (!state.borrow) panel.hidden = true; }, 260);
  }

  function resolveBorrowDate() {
    const st = state.borrow;
    if (!st) return null;
    if (st.date === "today") return addDaysISO(0);
    if (st.date === "tomorrow") return addDaysISO(1);
    return /^\d{4}-\d{2}-\d{2}$/.test(st.dateValue || "") ? st.dateValue : null;
  }

  function updateBorrowTarget() {
    const st = state.borrow;
    const target = rt.root.querySelector("[data-borrow-target]");
    if (!st || !target) return;
    const date = resolveBorrowDate();
    target.textContent = date
      ? `将借「整程 · ${st.item.stops.length} 站」→ 添入 ${dateMD(date)}`
      : "请选择一个具体日期";
  }

  function pickBorrowDate(type, value) {
    const st = state.borrow;
    if (!st) return;
    st.date = type;
    if (value) st.dateValue = value;
    const panel = borrowPanelEl();
    if (panel) {
      panel.querySelectorAll("[data-borrow-date]").forEach(b => b.classList.toggle("is-picked", b.dataset.borrowDate === type));
    }
    updateBorrowTarget();
  }

  function confirmBorrow() {
    const st = state.borrow;
    if (!st) return;
    const date = resolveBorrowDate();
    if (!date) { showToast("请先选择要添入的日期"); return; }
    const ok = walkBorrow(st.item, date);
    closeBorrowPanel();
    // dock CTA 切换为已借入态
    const walkBtn = rt.root.querySelector(".gzp-dock-walk");
    if (walkBtn) {
      walkBtn.classList.add("is-borrowed");
      const label = walkBtn.querySelector("[data-walk-label]");
      if (label) label.textContent = `已借入 · ${dateDots(date)}`;
    }
    showToast(ok ? `已添进主规划 · ${dateMD(date)} · 明天沿 TA 走` : "已记下这一程（主规划暂不可写）");
  }

  // 深度定制：留痕进收藏夹后，跳个人页完整「借此一程」Sheet
  function borrowAdvanced(item) {
    const route = buildSavedRoute(item);
    window.GuikePersonal?.addSavedJourney(route);
    window.dispatchEvent(new CustomEvent("guike:switch-tab", { detail: { tab: "个人" } }));
    const tabBtn = document.querySelector(".tab[data-target='个人']");
    tabBtn?.click();
    setTimeout(() => {
      if (!window.GuikePersonal?.openSavedJourney?.(route.id)) {
        showToast("到「个人 · 我的收藏 · 他人行径」里定制借用");
      }
    }, 380);
  }

  /* —— 详情 + 共享元素过渡 —— */
  function openDetail(item, fromImgEl) {
    state.detail = item;
    const box = rt.root.querySelector("[data-detail]");
    box.innerHTML = detailHTML(item);
    box.classList.add("is-open");

    // shared element transition：等详情上滑结束后，Feed 图片飞至 Hero
    if (fromImgEl) {
      const heroImg = box.querySelector("[data-hero-img]");
      const start = fromImgEl.getBoundingClientRect();
      heroImg.style.opacity = "0";
      setTimeout(() => {
        const end = heroImg.getBoundingClientRect();
        const fly = document.createElement("div");
        fly.className = "gzp-fly";
        fly.style.cssText = `left:${start.left}px;top:${start.top}px;width:${start.width}px;height:${start.height}px;`;
        fly.innerHTML = `<img src="${item.img}" alt=""/>`;
        document.body.appendChild(fly);
        const dx = end.left - start.left, dy = end.top - start.top;
        const sx = end.width / start.width, sy = end.height / start.height;
        requestAnimationFrame(() => {
          fly.style.transform = `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})`;
        });
        setTimeout(() => {
          fly.style.transition = "opacity 180ms ease";
          fly.style.opacity = "0";
          heroImg.style.transition = "opacity 200ms ease";
          heroImg.style.opacity = "1";
          setTimeout(() => fly.remove(), 220);
        }, 340);
      }, 370);
    }
    // 路线 path draw
    setTimeout(() => box.querySelectorAll(".gzp-route path").forEach(p => p.style.strokeDashoffset = "0"), 420);
  }

  function closeDetail() {
    const box = rt.root.querySelector("[data-detail]");
    box.classList.remove("is-open");
    const sheet = box.querySelector("[data-map-sheet]");
    if (sheet) sheet.classList.remove("is-open");
    setTimeout(() => { if (!box.classList.contains("is-open")) box.innerHTML = ""; }, 360);
    state.detail = null;
    state.borrow = null;
  }

  /* —— 接收个人页贵客帖，放进广场 —— */
  function formatDuration(min) {
    const m = Math.round(min || 0);
    return `${Math.floor(m / 60)}h${String(m % 60).padStart(2, "0")}m`;
  }

  function todayLabel() {
    const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
    const d = new Date();
    return `${String(d.getDate()).padStart(2, "0")} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
  }

  // 经纬度轨迹 → 归一化到 0–100 画布（保持形状比例）
  function normalizeRoute(routePoints) {
    const pts = (routePoints || []).map(p => [p.lng, p.lat]);
    if (pts.length < 2) return [[12, 84], [50, 52], [88, 18]];
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    pts.forEach(p => {
      minX = Math.min(minX, p[0]); maxX = Math.max(maxX, p[0]);
      minY = Math.min(minY, p[1]); maxY = Math.max(maxY, p[1]);
    });
    const spanX = maxX - minX || 1, spanY = maxY - minY || 1;
    const scale = Math.min(80 / spanX, 80 / spanY);
    return pts.map(p => [10 + (p[0] - minX) * scale, 10 + (p[1] - minY) * scale]);
  }

  function postcardFallbackArt(routePts) {
    const pts = routePts.map(p => `${p[0]},${p[1]}`).join(" ");
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="800" viewBox="0 0 100 100">
      <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#2A372F"/><stop offset="1" stop-color="#38483D"/></linearGradient></defs>
      <rect width="100" height="100" fill="url(#g)"/>
      <polyline points="${pts}" fill="none" stroke="#EEE9DD" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`;
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  }

  function journeyToCard(detail) {
    const j = detail.journeyData || {};
    const places = j.plannedPlaces || [];
    const visitedIds = j.visitedPlaces || [];
    const visited = places.filter(p => visitedIds.indexOf(p.id) >= 0);
    const timeline = (visited.length ? visited : places).map(p => ({
      name: p.name,
      time: p.time || "",
      note: visitedIds.indexOf(p.id) >= 0
        ? "这一站被收进了贵客帖，山风替你保管。"
        : "TA 当天原计划抵达，最终没有走过去。"
    }));
    const route = normalizeRoute(j.routePoints);
    let imgSrc = "";
    if (detail.postcardBlob) {
      try { imgSrc = URL.createObjectURL(detail.postcardBlob); } catch (err) { imgSrc = ""; }
    }
    if (!imgSrc) imgSrc = postcardFallbackArt(route);
    return {
      id: "pub-" + (detail.journeyId || Date.now()),
      ratio: "r-34",
      title: j.subtitle || "我走过的路，成了贵州的一座山",
      place: `${j.city || "贵阳"} · 今日行径`,
      dist: j.distance || 0,
      stops: Math.max(1, visited.length || places.length),
      time: formatDuration(j.duration),
      near: 0.4,
      tags: ["松弛", "城市"],
      saves: 0,
      author: "山客",
      date: todayLabel(),
      img: imgSrc,
      route,
      line: j.subtitle || "我走过的路，成了贵州的一座山。",
      stops: timeline,
      postcard: true
    };
  }

  function onPublishedJourney(e) {
    if (!rt) return;
    const card = journeyToCard(e.detail || {});
    CARDS.unshift(card);
    renderFeed();
    const growing = rt.root.querySelector("[data-growing]");
    growing.textContent = String(Number(growing.textContent) + 1);
    showToast("贵客帖已放进万象广场");
    setTimeout(() => {
      const el = rt.root.querySelector(`[data-card="${card.id}"]`);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 300);
  }

  /* —— 事件绑定 —— */
  function bindEvents() {
    rt.scroll.addEventListener("click", e => {
      const save = e.target.closest("[data-save]");
      if (save) {
        e.stopPropagation();
        toggleSave(save.dataset.save, save, null);
        return;
      }
      const seg = e.target.closest("[data-seg]");
      if (seg) {
        state.seg = seg.dataset.seg;
        rt.root.querySelectorAll("[data-seg]").forEach(b => {
          b.classList.toggle("is-active", b === seg);
          b.setAttribute("aria-selected", b === seg ? "true" : "false");
        });
        renderFeed();
        return;
      }
      const chip = e.target.closest("[data-chip]");
      if (chip) {
        if (state.chip === chip.dataset.chip) return;
        state.chip = chip.dataset.chip;
        rt.root.querySelectorAll("[data-chip]").forEach(b => {
          const active = b === chip;
          b.classList.toggle("is-active", active);
          b.setAttribute("aria-pressed", active ? "true" : "false");
        });
        chip.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
        renderFeed(true);
        return;
      }
      const card = e.target.closest("[data-card]");
      if (card) {
        const id = card.dataset.card;
        const item = [FEATURED].concat(CARDS).find(c => c.id === id);
        if (item) openDetail(item, card.querySelector(".gzp-photo"));
      }
    });

    // 详情内交互（含 sheet / dock）
    rt.root.querySelector("[data-detail]").addEventListener("click", e => {
      if (e.target.closest("[data-action='close-detail']")) { closeDetail(); return; }
      if (e.target.closest("[data-action='open-map']")) {
        rt.root.querySelector("[data-map-sheet]").classList.add("is-open");
        // 地图 path draw
        setTimeout(() => rt.root.querySelectorAll(".gzp-map-path").forEach(p => p.style.strokeDashoffset = "0"), 120);
        return;
      }
      if (e.target.closest("[data-action='close-map']")) {
        rt.root.querySelector("[data-map-sheet]").classList.remove("is-open");
        return;
      }
      const dockSave = e.target.closest("[data-action='dock-save']");
      if (dockSave && state.detail) {
        toggleSave(state.detail.id, null, dockSave);
        return;
      }
      // 沿着 TA 走：打开快速借入面板（不再复制收藏行为）
      if (e.target.closest("[data-action='walk']") && state.detail) {
        openBorrowPanel(state.detail);
        return;
      }
      if (e.target.closest("[data-action='close-borrow']")) { closeBorrowPanel(); return; }
      const quick = e.target.closest("[data-borrow-quick]");
      if (quick && state.detail) {
        if (quick.dataset.borrowQuick === "custom") {
          borrowAdvanced(state.detail);
          closeBorrowPanel();
        } else {
          quick.parentElement.querySelectorAll("[data-borrow-quick]").forEach(b => b.classList.toggle("is-picked", b === quick));
        }
        return;
      }
      const bDate = e.target.closest("[data-borrow-date]");
      if (bDate) { pickBorrowDate(bDate.dataset.borrowDate, null); return; }
      if (e.target.closest("[data-action='confirm-borrow']") && state.detail) { confirmBorrow(); return; }
    });
    // 「其他日期」选择器
    rt.root.querySelector("[data-detail]").addEventListener("change", e => {
      if (e.target.matches("[data-borrow-input]") && state.borrow) {
        pickBorrowDate("other", e.target.value);
      }
    });
  }

  /* ----------------------------------------------------------
     Mount
     ---------------------------------------------------------- */
  function mount(root) {
    if (!root) throw new Error("GuikePlaza.mount(root): root 不能为空。");
    if (rt) destroy();
    root.innerHTML = templateHTML();

    const today = new Date();
    const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
    root.querySelector("[data-today]").textContent =
      `${String(today.getDate()).padStart(2, "0")} ${MONTHS[today.getMonth()]} ${today.getFullYear()}`;

    rt = { root, scroll: root.querySelector("[data-plaza-scroll]"), toastTimer: null, filterTimer: null, io: null, pubHandler: onPublishedJourney };
    window.addEventListener("guike:publish-journey", rt.pubHandler);
    renderFeed();
    bindEvents();
    return rt;
  }

  function destroy() {
    if (!rt) return;
    if (rt.io) rt.io.disconnect();
    window.removeEventListener("guike:publish-journey", rt.pubHandler);
    clearTimeout(rt.toastTimer);
    clearTimeout(rt.filterTimer);
    rt = null;
  }

  window.GuikePlaza = { mount, destroy };
}());
