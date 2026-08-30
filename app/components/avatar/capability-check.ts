export type AvatarCapabilities = {
  webgl: boolean;
  reducedMotion: boolean;
  recommendedMode: "realtime" | "reduced" | "poster";
};

export function detectAvatarCapabilities(): AvatarCapabilities {
  if (typeof document === "undefined" || typeof window === "undefined") return { webgl: false, reducedMotion: false, recommendedMode: "poster" };
  const canvas = document.createElement("canvas");
  const webgl = Boolean(canvas.getContext("webgl2") || canvas.getContext("webgl"));
  const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
  return { webgl, reducedMotion, recommendedMode: !webgl ? "poster" : reducedMotion ? "reduced" : "realtime" };
}
