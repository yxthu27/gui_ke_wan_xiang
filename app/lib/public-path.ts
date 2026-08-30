const normalizedBasePath = (process.env.NEXT_PUBLIC_BASE_PATH || "").replace(/\/$/, "");
const normalizedApiBaseUrl = (process.env.NEXT_PUBLIC_QIJING_API_BASE_URL || "").replace(/\/$/, "");

if (normalizedApiBaseUrl && !/^https:\/\//i.test(normalizedApiBaseUrl) && !/^http:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?$/i.test(normalizedApiBaseUrl)) {
  throw new Error("NEXT_PUBLIC_QIJING_API_BASE_URL must use HTTPS outside local development.");
}

export const PUBLIC_BASE_PATH = normalizedBasePath;
export const QIJING_API_BASE_URL = normalizedApiBaseUrl;
export const IS_STATIC_EXPORT = process.env.NEXT_PUBLIC_STATIC_EXPORT === "true";
export const QIJING_RUNTIME_MODE = IS_STATIC_EXPORT ? (normalizedApiBaseUrl ? "external-api" : "static-fallback") : "server";

export function publicPath(path: string) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${PUBLIC_BASE_PATH}${normalizedPath}`;
}

export function apiPath(path: string) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${QIJING_API_BASE_URL}${normalizedPath}`;
}

export function usesLocalAiFallback() {
  return IS_STATIC_EXPORT && !QIJING_API_BASE_URL;
}
