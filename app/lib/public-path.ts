const normalizedBasePath = (process.env.NEXT_PUBLIC_BASE_PATH || "").replace(/\/$/, "");
const normalizedApiBaseUrl = (process.env.NEXT_PUBLIC_QIJING_API_BASE_URL || "").replace(/\/$/, "");

export const PUBLIC_BASE_PATH = normalizedBasePath;
export const QIJING_API_BASE_URL = normalizedApiBaseUrl;
export const IS_STATIC_EXPORT = process.env.NEXT_PUBLIC_STATIC_EXPORT === "true";

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
