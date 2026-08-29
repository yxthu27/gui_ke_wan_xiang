/* ============================================================
   贵客万象 · 浏览器端主体抠图适配器
   - 基于 IMG.LY background-removal-js（AGPL-3.0）
   - 照片仅在浏览器本地处理，不上传图片、不需要 API Key
   - 首次使用从 CDN 下载并缓存 ONNX/WASM 模型
   ============================================================ */
(function () {
  "use strict";

  const MODULE_URLS = [
    "https://esm.sh/@imgly/background-removal@1.7.0?bundle&target=es2022",
    "https://cdn.jsdelivr.net/npm/@imgly/background-removal@1.7.0/+esm"
  ];

  let modulePromise = null;

  async function loadModule() {
    if (modulePromise) return modulePromise;
    modulePromise = (async () => {
      let lastError;
      for (const url of MODULE_URLS) {
        try {
          const mod = await import(url);
          if (typeof mod.removeBackground === "function") return mod;
          if (typeof mod.default === "function") return { removeBackground: mod.default };
          throw new Error("模块没有导出 removeBackground");
        } catch (error) {
          lastError = error;
        }
      }
      throw lastError || new Error("无法加载本地主体抠图模块");
    })();
    try {
      return await modulePromise;
    } catch (error) {
      modulePromise = null;
      throw error;
    }
  }

  function dataUriToBlob(dataUri) {
    const match = /^data:([^;,]+)?(;base64)?,(.*)$/s.exec(String(dataUri));
    if (!match) throw new Error("图片不是可处理的 data URI");
    const mime = match[1] || "application/octet-stream";
    const binary = match[2] ? atob(match[3]) : decodeURIComponent(match[3]);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
    return new Blob([bytes], { type: mime });
  }

  function blobToDataUri(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error || new Error("无法读取透明 PNG"));
      reader.readAsDataURL(blob);
    });
  }

  async function sourceToBlob(source) {
    if (source instanceof Blob) return source;
    if (/^data:/i.test(String(source))) return dataUriToBlob(source);
    const response = await fetch(source);
    if (!response.ok) throw new Error(`读取图片失败（HTTP ${response.status}）`);
    return response.blob();
  }

  async function removeBackgroundLocal(source, options = {}) {
    const { removeBackground } = await loadModule();
    const image = await sourceToBlob(source);
    const result = await removeBackground(image, {
      output: { format: "image/png", quality: 1 },
      progress(key, current, total) {
        const safeTotal = Number(total) || 0;
        const percent = safeTotal > 0 ? Math.max(0, Math.min(100, Math.round(Number(current) / safeTotal * 100))) : null;
        options.onProgress?.({ key: String(key || "model"), current: Number(current) || 0, total: safeTotal, percent });
      }
    });
    return blobToDataUri(result);
  }

  window.GuikeBackgroundRemoval = {
    removeBackground: removeBackgroundLocal,
    warmup: loadModule,
    engine: "imgly-background-removal-1.7.0",
    localOnly: true
  };
})();
