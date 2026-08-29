(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }
  root.GuikeDetailView = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function detailHref(id) {
    if (!id) throw new Error("缺少点位 id");
    return `detail.html?id=${encodeURIComponent(id)}`;
  }

  function phoneHref(phone) {
    const first = String(phone).split(";")[0].trim();
    if (!first) throw new Error("缺少电话");
    return `tel:${first}`;
  }

  function badges(poi, session, store) {
    const bits = [];
    if (store.withKids(session) && poi.kidFriendly === true) bits.push("亲子");
    if (session.itinerary.visitedPoiIds.includes(poi.id)) bits.push("已访问");
    if (poi.today) bits.push("今日行程");
    return bits;
  }

  function renderBody(poi, category, session, store) {
    const badgeHtml = badges(poi, session, store)
      .map((label) => `<span class="detail-badge">${escapeHtml(label)}</span>`)
      .join("");
    const event = poi.event
      ? `<div class="detail-event">
          <strong>★ ${escapeHtml(poi.event.title)}</strong>
          <span>${escapeHtml(poi.event.venue)}</span>
          <span>${escapeHtml(poi.event.timeText)}</span>
          <span>${escapeHtml(poi.event.ticketNote)}</span>
        </div>`
      : "";
    const phone = poi.phone
      ? `<a class="detail-phone" href="${escapeHtml(phoneHref(poi.phone))}">${escapeHtml(poi.phone)}</a>`
      : `<span class="detail-phone is-empty">电话未收录</span>`;
    const img = category.image
      ? `<img class="detail-img" src="${escapeHtml(category.image)}" alt="${escapeHtml(category.name)}">`
      : "";
    return `
      ${img}
      <p class="detail-kicker">${escapeHtml(category.kind === "food" ? "美食" : category.kind === "sight" ? "景点" : "活动")} · ${escapeHtml(category.name)}</p>
      <h1 class="detail-title">${escapeHtml(poi.name)}</h1>
      <p class="detail-badges">${badgeHtml}</p>
      ${event}
      <p class="detail-intro">${escapeHtml(category.intro)}</p>
      <p class="detail-address">${escapeHtml(poi.address || "地址未收录")}</p>
      ${phone}
    `;
  }

  function renderPage(poi, category, session, store) {
    if (String(category.image).startsWith("img/") && String(category.image).endsWith(".png")) {
      return `<article class="detail-page is-poster-full"><img class="detail-poster-full" src="${escapeHtml(category.image)}" alt="${escapeHtml(category.name)}"></article>`;
    }
    return `<article class="detail-page kind-${escapeHtml(category.kind)}">${renderBody(poi, category, session, store)}</article>`;
  }

  return {
    detailHref,
    phoneHref,
    badges,
    renderBody,
    renderPage,
  };
});
