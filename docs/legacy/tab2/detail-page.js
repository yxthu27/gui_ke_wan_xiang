(function () {
  const core = window.GuikeStrollCore;
  const store = window.GuikeSessionStore;
  const view = window.GuikeDetailView;
  const root = document.getElementById("detail-root");
  if (!core || !store || !view || !root) throw new Error("详情页缺少必要脚本");

  async function loadJson(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`无法读取 ${url}`);
    return res.json();
  }

  async function start() {
    const id = new URLSearchParams(location.search).get("id");
    if (!id) throw new Error("地址缺少 id 参数");
    const data = await loadJson("pois.json");
    const session = store.markVisited(await store.load(loadJson, window.localStorage), id, window.localStorage);
    const poi = core.poiById(data, id);
    const category = core.categoryById(data, poi.categoryId);
    root.innerHTML = view.renderPage(poi, category, session, store);
    document.title = `${poi.name} · 贵客万象`;
  }

  start();
})();
