const DEFAULT_IMAGE_BASE_URL = "https://api.stepfun.com/v1";
const DEFAULT_IMAGE_MODEL = "step-image-edit-2";
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

type StepFunImageResponse = {
  data?: Array<{
    b64_json?: string;
    finish_reason?: string;
    seed?: number;
  }>;
};

function imageProviderConfig() {
  const timeoutMs = Number(process.env.STEPFUN_IMAGE_TIMEOUT_MS || process.env.STEPFUN_TIMEOUT_MS || 65000);
  return {
    baseUrl: (process.env.STEPFUN_IMAGE_BASE_URL || DEFAULT_IMAGE_BASE_URL).replace(/\/$/, ""),
    apiKey: process.env.STEPFUN_API_KEY || "",
    model: process.env.STEPFUN_IMAGE_MODEL || DEFAULT_IMAGE_MODEL,
    timeoutMs: Number.isFinite(timeoutMs) ? Math.min(120000, Math.max(10000, timeoutMs)) : 65000,
  };
}

function decodeDataUri(dataUri: string) {
  const match = /^data:(image\/(?:jpeg|png|webp));base64,([a-zA-Z0-9+/=]+)$/.exec(dataUri);
  if (!match) throw new Error("INVALID_IMAGE_DATA_URI");
  const binary = atob(match[2]);
  if (!binary.length || binary.length > MAX_IMAGE_BYTES) throw new Error("IMAGE_SIZE_OUT_OF_RANGE");
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  const extension = match[1] === "image/jpeg" ? "jpg" : match[1].split("/")[1];
  return { blob: new Blob([bytes], { type: match[1] }), filename: `qijing-cutout.${extension}` };
}

function detectImageMime(base64: string) {
  if (base64.startsWith("iVBOR")) return "image/png";
  if (base64.startsWith("UklGR")) return "image/webp";
  if (base64.startsWith("/9j/")) return "image/jpeg";
  return "image/png";
}

export async function createStepFunCutoutPlate(image: string, subject?: string) {
  const config = imageProviderConfig();
  if (!config.apiKey) throw new Error("AI_NOT_CONFIGURED");
  const { blob, filename } = decodeDataUri(image);
  const form = new FormData();
  form.append("model", config.model);
  form.append("image", blob, filename);
  form.append("prompt", [
    "保持主体的位置、姿态、轮廓、五官、服装、颜色和全部细节完全不变。",
    subject ? `只保留主体“${subject.slice(0, 80)}”。` : "只保留画面中最显著的前景主体。",
    "移除其余所有背景并替换为完全均匀、无阴影、无渐变、无纹理的纯品红色 #FF00FF。",
    "不要新增物体，不要裁切主体，不要改变画幅。",
  ].join(""));
  form.append("response_format", "b64_json");
  form.append("cfg_scale", "1.0");
  form.append("steps", "8");
  form.append("text_mode", "false");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.timeoutMs);
  try {
    const response = await fetch(`${config.baseUrl}/images/edits`, {
      method: "POST",
      headers: { Authorization: `Bearer ${config.apiKey}` },
      body: form,
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`AI_PROVIDER_${response.status}`);
    const payload = await response.json() as StepFunImageResponse;
    const result = payload.data?.[0];
    if (!result?.b64_json || result.finish_reason === "content_filtered") throw new Error("AI_IMAGE_EMPTY");
    return {
      image: `data:${detectImageMime(result.b64_json)};base64,${result.b64_json}`,
      engine: config.model,
      seed: result.seed,
    };
  } finally {
    clearTimeout(timeout);
  }
}

