/* ============================================================
   贵客万象 · Route Service（执行文档 §14–§17 / §19）
   - POI 真实经纬度 → 步行 Routing（OSRM，真实道路 geometry）
   - geometry 缓存 localStorage，路线/山纹/贵客帖共用同一份
   - 失败降级：POI 间直线插值（标记 source="estimated"），禁止冒充真路
   坐标系：输入输出统一 WGS84（本项目自绘 SVG 投影，不叠图瓦片）
   ============================================================ */
(function () {
  "use strict";

  const CACHE_KEY = "guike-route-cache-v1";
  const ENDPOINTS = [
    profile => `https://routing.openstreetmap.de/routed-foot/route/v1/foot/${profile}`,
    profile => `https://router.project-osrm.org/route/v1/walking/${profile}`
  ];

  function loadCache() {
    try { return JSON.parse(localStorage.getItem(CACHE_KEY) || "{}"); } catch (_error) { return {}; }
  }
  function saveCache(cache) {
    try { localStorage.setItem(CACHE_KEY, JSON.stringify(cache)); } catch (_error) { /* 忽略 */ }
  }

  function cacheKey(points) {
    return points.map(p => `${Number(p.lat).toFixed(4)},${Number(p.lng).toFixed(4)}`).join(";");
  }

  /* 直线插值降级：POI 之间每 ~0.004° 补一点，保持点序 */
  function interpolate(points) {
    const out = [];
    for (let i = 0; i < points.length - 1; i += 1) {
      const a = points[i], b = points[i + 1];
      out.push({ lat: Number(a.lat), lng: Number(a.lng) });
      const steps = Math.min(24, Math.max(3, Math.round(Math.hypot(b.lat - a.lat, b.lng - a.lng) / 0.004)));
      for (let s = 1; s < steps; s += 1) {
        out.push({ lat: a.lat + (b.lat - a.lat) * s / steps, lng: a.lng + (b.lng - a.lng) * s / steps });
      }
    }
    const last = points[points.length - 1];
    if (last) out.push({ lat: Number(last.lat), lng: Number(last.lng) });
    return out;
  }

  async function fetchRouting(points) {
    const coordinateText = points.map(p => `${Number(p.lng).toFixed(6)},${Number(p.lat).toFixed(6)}`).join(";");
    for (const build of ENDPOINTS) {
      try {
        const res = await fetch(`${build(coordinateText)}?overview=full&geometries=geojson`, { signal: AbortSignal.timeout(9000) });
        if (!res.ok) continue;
        const data = await res.json();
        const line = data?.routes?.[0]?.geometry?.coordinates;
        if (Array.isArray(line) && line.length > 3) {
          return line.map(([lng, lat]) => ({ lat, lng }));
        }
      } catch (_error) { /* 尝试下一个端点 */ }
    }
    return null;
  }

  /* 主入口：planRoute(points) → Promise<{ points, source, distanceKm }>
     points: [{lat,lng}, ...] 至少 2 个真实 POI 坐标 */
  async function planRoute(points) {
    if (!Array.isArray(points) || points.length < 2) {
      return { points: points || [], source: "invalid", distanceKm: 0 };
    }
    const key = cacheKey(points);
    const cache = loadCache();
    if (cache[key]?.points?.length > 3) {
      return { points: cache[key].points, source: cache[key].source, distanceKm: cache[key].distanceKm, cached: true };
    }
    const geometry = await fetchRouting(points);
    const result = geometry
      ? { points: geometry, source: "routing", distanceKm: estimateDistance(geometry) }
      : { points: interpolate(points), source: "estimated", distanceKm: estimateDistance(interpolate(points)) };
    cache[key] = { points: result.points, source: result.source, distanceKm: result.distanceKm, at: Date.now() };
    saveCache(cache);
    return result;
  }

  function estimateDistance(points) {
    let total = 0;
    for (let i = 1; i < points.length; i += 1) {
      const dy = (points[i].lat - points[i - 1].lat) * 111;
      const dx = (points[i].lng - points[i - 1].lng) * 111 * Math.cos(points[i].lat * Math.PI / 180);
      total += Math.hypot(dy, dx);
    }
    return Math.round(total * 10) / 10;
  }

  window.GuikeRoute = { planRoute, interpolate };
})();
