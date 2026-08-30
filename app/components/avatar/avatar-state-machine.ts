import type { AvatarEvent, AvatarState } from "./types";

export function nextAvatarState(state: AvatarState, event: AvatarEvent): AvatarState {
  if (event === "DISABLE") return "disabled";
  if (event === "FAIL") return "error";
  if (event === "LOAD") return "loading";
  if (state === "disabled" && event !== "LOAD") return state;
  if (event === "READY" || event === "STOP") return "idle";
  if (event === "LISTEN") return "listening";
  if (event === "THINK") return "thinking";
  if (event === "SPEAK") return "speaking";
  return state;
}
