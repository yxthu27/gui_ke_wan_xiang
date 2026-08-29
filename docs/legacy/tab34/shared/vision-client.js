/* ============================================================
   贵客万象 · Vision Client（执行文档 §5 / §13 / §36）
   - 前端不持有 API Key，一律请求本地代理 /api/vision/analyze
   - file:// 直接打开时尝试 http://localhost:8787
   - 失败时抛错，由 personal-tab.js 降级为本地识别 + 手动圈选
   ============================================================ */
(function () {
  "use strict";

  const LOCAL_SERVER = "http://localhost:8787";

  function apiBase() {
    return /^https?:$/.test(window.location.protocol) ? "" : LOCAL_SERVER;
  }

  let available = null; // null=未探测 true/false

  async function ping() {
    if (available !== null) return available;
    try {
      const res = await fetch(`${apiBase()}/api/health`, { signal: AbortSignal.timeout(2500) });
      const data = await res.json();
      available = Boolean(data.ok && data.hasKey);
    } catch (_error) {
      available = false;
    }
    return available;
  }

  /* 输入 dataURI，输出与 personal-tab 主体契约一致的对象数组：
     { id, label, confidence, type:"photo", description, groundingPrompt, guizhouRelevance } */
  async function detectSubjects(image) {
    if (!(await ping())) throw new Error("本地识别服务未启动");
    const res = await fetch(`${apiBase()}/api/vision/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image }),
      signal: AbortSignal.timeout(28000)
    });
    const payload = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(payload?.error || `识别服务 HTTP ${res.status}`);
    const subjects = Array.isArray(payload.subjects) ? payload.subjects : [];
    if (!subjects.length) throw new Error("识别服务未返回可用主体");
    return subjects.map((subject, index) => ({
      id: `ai-${index}-${String(subject.label).slice(0, 6)}`,
      label: subject.label,
      confidence: Math.max(.5, Math.min(.99, Number(subject.guizhou_relevance) * .6 + Number(subject.visual_salience) * .4 || .8)),
      type: "photo",
      description: subject.description || `照片中的${subject.label}。`,
      groundingPrompt: subject.grounding_prompt || "",
      guizhouRelevance: Number(subject.guizhou_relevance) || .5,
      source: "stepfun-vision"
    }));
  }

  window.GuikeVisionAdapter = { detectSubjects, ping };
})();
