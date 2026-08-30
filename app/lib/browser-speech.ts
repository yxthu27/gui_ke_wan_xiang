export type QijingSpeechStatus = "idle" | "listening" | "speaking" | "error" | "unsupported";

export type SpeechRecognitionResultLike = {
  isFinal: boolean;
  0: { transcript: string };
};

export type SpeechRecognitionEventLike = {
  resultIndex: number;
  results: ArrayLike<SpeechRecognitionResultLike>;
};

export type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onstart: (() => void) | null;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};

export type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

export function getSpeechRecognitionConstructor(target: Window & typeof globalThis = window): SpeechRecognitionConstructor | undefined {
  const speechWindow = target as typeof target & {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };
  return speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition;
}

export function mergeSpeechTranscript(current: string, transcript: string) {
  const base = current.trim();
  const addition = transcript.trim();
  if (!addition) return base;
  if (!base) return addition;
  return `${base}${/[，。！？、,.!?]$/.test(base) ? "" : "，"}${addition}`;
}

export function speechRecognitionErrorMessage(error: string) {
  if (error === "not-allowed" || error === "service-not-allowed") return "没有获得麦克风权限，请允许访问后重试，或继续使用文字输入。";
  if (error === "audio-capture") return "没有检测到可用麦克风，请检查设备连接。";
  if (error === "no-speech") return "没有听清，请靠近麦克风再说一次。";
  if (error === "network") return "语音识别服务暂时无法连接，请使用文字输入。";
  if (error === "language-not-supported") return "当前浏览器暂不支持中文语音识别。";
  return "语音识别没有完成，请重试或使用文字输入。";
}

export function speechStatusMessage(status: QijingSpeechStatus, interim = "") {
  if (status === "listening") return interim ? `正在听：${interim}` : "正在听，请说出你的想法…";
  if (status === "speaking") return "阿境正在朗读，点击语音按钮可以停止。";
  if (status === "unsupported") return "当前浏览器不支持语音识别，仍可使用文字输入。";
  return "";
}
