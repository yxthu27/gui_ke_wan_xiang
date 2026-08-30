export type AvatarState = "loading" | "idle" | "listening" | "thinking" | "speaking" | "error" | "disabled";

export type AvatarEvent =
  | "LOAD"
  | "READY"
  | "LISTEN"
  | "THINK"
  | "SPEAK"
  | "STOP"
  | "FAIL"
  | "DISABLE";
