import type { AvatarState } from "./types";
import { publicPath } from "../../lib/public-path";

export function AjingAvatarPoster({ state = "idle", className }: { state?: AvatarState; className?: string }) {
  const status = state === "thinking" ? "阿境正在思考" : state === "listening" ? "阿境正在听" : state === "speaking" ? "阿境正在说" : "阿境数字人形象";
  return <img className={className} src={publicPath("/assets/ajing-guide.png")} alt={status} data-avatar-mode="poster" data-avatar-state={state} />;
}
