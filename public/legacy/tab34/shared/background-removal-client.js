/* ============================================================
   贵客万象 · 混合主体抠图适配器
   - 优先用服务端 StepFun 图像编辑生成品红背景，再从原图提取透明蒙版
   - StepFun 不可用时回退 IMG.LY background-removal-js（AGPL-3.0）
   - API Key 始终留在服务端；本地模型首次使用时从 CDN 下载并缓存 ONNX/WASM
   ============================================================ */
(function () {
  "use strict";

  const MODULE_URLS = [
    "https://esm.sh/@imgly/background-removal@1.7.0?bundle&target=es2022",
    "https://cdn.jsdelivr.net/npm/@imgly/background-removal@1.7.0/+esm"
  ];

  let modulePromise = null;
  const adapter = { lastEngine: null };

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

  function loadImage(source) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error("无法解码抠图图片"));
      image.src = source;
    });
  }

  async function prepareForCloud(source) {
    const image = await loadImage(source);
    const maxSide = 2048;
    const scale = Math.min(1, maxSide / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", .9);
  }

  function magentaDistance(r, g, b) {
    return Math.sqrt((255 - r) ** 2 + g ** 2 + (255 - b) ** 2);
  }

  async function applyStepFunMask(originalSource, editedSource) {
    const [original, edited] = await Promise.all([loadImage(originalSource), loadImage(editedSource)]);
    const width = edited.naturalWidth, height = edited.naturalHeight;
    const editedCanvas = document.createElement("canvas");
    editedCanvas.width = width;
    editedCanvas.height = height;
    const editedContext = editedCanvas.getContext("2d", { willReadFrequently: true });
    editedContext.drawImage(edited, 0, 0, width, height);
    const editedPixels = editedContext.getImageData(0, 0, width, height).data;

    // 只从画布边缘向内寻找品红连通域，避免误删主体自身的紫红色细节。
    const total = width * height;
    const background = new Uint8Array(total);
    const queue = new Int32Array(total);
    let head = 0, tail = 0;
    const eligible = index => {
      const offset = index * 4;
      const r = editedPixels[offset], g = editedPixels[offset + 1], b = editedPixels[offset + 2];
      return magentaDistance(r, g, b) <= 220 && Math.min(r, b) - g >= 10;
    };
    const enqueue = index => {
      if (background[index] || !eligible(index)) return;
      background[index] = 1;
      queue[tail++] = index;
    };
    for (let x = 0; x < width; x += 1) { enqueue(x); enqueue((height - 1) * width + x); }
    for (let y = 1; y < height - 1; y += 1) { enqueue(y * width); enqueue(y * width + width - 1); }
    while (head < tail) {
      const index = queue[head++];
      const x = index % width;
      if (x > 0) enqueue(index - 1);
      if (x + 1 < width) enqueue(index + 1);
      if (index >= width) enqueue(index - width);
      if (index + width < total) enqueue(index + width);
    }

    const output = document.createElement("canvas");
    output.width = width;
    output.height = height;
    const context = output.getContext("2d", { willReadFrequently: true });
    context.drawImage(original, 0, 0, width, height);
    const outputImage = context.getImageData(0, 0, width, height);
    for (let index = 0; index < total; index += 1) {
      if (!background[index]) continue;
      const offset = index * 4;
      const distance = magentaDistance(editedPixels[offset], editedPixels[offset + 1], editedPixels[offset + 2]);
      outputImage.data[offset + 3] = distance <= 70 ? 0 : Math.round(Math.min(255, (distance - 70) / 150 * 255));
    }
    context.putImageData(outputImage, 0, 0);
    return output.toDataURL("image/png");
  }

  async function removeBackgroundStepFun(source, options = {}) {
    options.onProgress?.({ key: "stepfun-upload", current: 0, total: 0, percent: null, engine: "stepfun" });
    const prepared = await prepareForCloud(source);
    const response = await fetch("/api/qijing/cutout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image: prepared, subject: options.subject || undefined }),
      signal: AbortSignal.timeout(70000)
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload.image) throw new Error(payload.error || `StepFun 抠图失败（HTTP ${response.status}）`);
    options.onProgress?.({ key: "stepfun-mask", current: 0, total: 0, percent: null, engine: "stepfun" });
    return applyStepFunMask(prepared, payload.image);
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

  async function removeBackground(source, options = {}) {
    try {
      const result = await removeBackgroundStepFun(source, options);
      adapter.lastEngine = "stepfun-image-edit-2";
      return result;
    } catch (error) {
      console.warn("[Guike] StepFun 增强抠图不可用，切换本地模型：", error);
      options.onProgress?.({ key: "local-fallback", current: 0, total: 0, percent: null, engine: "local" });
      const result = await removeBackgroundLocal(source, options);
      adapter.lastEngine = "imgly-background-removal-1.7.0";
      return result;
    }
  }

  Object.assign(adapter, {
    removeBackground,
    warmup: loadModule,
    engine: "stepfun-image-edit-2 + imgly-background-removal-1.7.0",
    localOnly: false
  });
  window.GuikeBackgroundRemoval = adapter;
})();
