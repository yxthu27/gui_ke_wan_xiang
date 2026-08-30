"use client";

import { useCallback, useEffect, useRef, useState, type MouseEvent } from "react";
import { QijingProductScreen, initialQijingDraft, type QijingDraft, type QijingPlan, type QijingScreenId } from "./spec/spec-client";
import { apiPath, IS_STATIC_EXPORT, publicPath, QIJING_API_BASE_URL, usesLocalAiFallback } from "./lib/public-path";
import { applySupplement, createFallbackPlan, refineFallbackPlan } from "./lib/qijing-planner";
import {
  getSpeechRecognitionConstructor,
  mergeSpeechTranscript,
  speechRecognitionErrorMessage,
  speechStatusMessage,
  type QijingSpeechStatus,
  type SpeechRecognitionLike,
} from "./lib/browser-speech";
import { getGuikeRepository, type GuikeState } from "./lib/guike-repository.client";

type MainTab = "qijing" | "stroll" | "personal" | "plaza";
type Tab34Pane = "个人" | "广场";
const DRAFT_STORAGE_KEY = "qijing-draft-v2";
const MAIN_PLAN_STORAGE_KEY = "guike-main-plan-v1";
const QIJING_FLOW: QijingScreenId[] = ["talk", "invitation", "wish", "time", "pace", "travel", "interest", "boundary", "crystal", "unfold", "itinerary", "map", "tune"];

function addDaysISO(offset: number) {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function saveJourneyPlan(plan: QijingPlan, draft: QijingDraft) {
  const payload = {
    version: 2,
    updatedAt: new Date().toISOString(),
    activeJourneyId: `qijing-${Date.now()}`,
    qijingPlan: plan,
    draft,
    days: plan.days.map((day, index) => ({
      id: `qijing-day-${day.day}`,
      date: addDaysISO(index),
      city: "贵州",
      title: day.theme,
      source: "qijing",
      places: day.items.map((item) => ({ name: item.location || item.title, time: item.time, description: item.description })),
    })),
  };
  const repository = getGuikeRepository();
  if (repository) repository.savePlan(payload);
  else window.localStorage.setItem(MAIN_PLAN_STORAGE_KEY, JSON.stringify(payload));
  window.dispatchEvent(new CustomEvent("guike:plan-updated", { detail: payload }));
}

function planFromRepository(state: GuikeState): QijingPlan | undefined {
  const stored = state.activePlan;
  if (!stored) return undefined;
  if (stored.qijingPlan && typeof stored.qijingPlan === "object") return stored.qijingPlan as QijingPlan;
  const days = Array.isArray(stored.days) ? stored.days as Array<Record<string, unknown>> : [];
  if (!days.length) return undefined;
  return {
    title: String(stored.title || "我的贵州行程"),
    summary: "已从各页面共享的主规划恢复，可继续查看、收藏或微调。",
    tags: ["已同步", "主规划"],
    generatedBy: "fallback",
    warnings: [],
    days: days.map((day, dayIndex) => ({
      day: dayIndex + 1,
      theme: String(day.title || `第 ${dayIndex + 1} 天`),
      items: (Array.isArray(day.places) ? day.places as Array<Record<string, unknown>> : []).map((place, placeIndex) => ({
        id: String(place.id || `shared-${dayIndex + 1}-${placeIndex + 1}`),
        time: String(place.time || "待定"),
        title: String(place.name || place.title || "待确认地点"),
        location: String(place.name || place.location || place.title || ""),
        description: String(place.description || "从共享主规划同步到启境。"),
        durationMinutes: Number(place.durationMinutes) || 60,
      })),
    })),
  };
}

const tabFromLegacy: Record<string, MainTab> = {
  启境: "qijing", 路线: "qijing", 随逛: "stroll", 个人: "personal", 广场: "plaza",
};

const mainTabs: Array<{ id: MainTab; label: string; icon: string }> = [
  { id: "qijing", label: "路线", icon: "route" },
  { id: "stroll", label: "随逛", icon: "stroll" },
  { id: "personal", label: "个人", icon: "personal" },
  { id: "plaza", label: "广场", icon: "plaza" },
];

function TabOne() {
  const [screenId, setScreenId] = useState<QijingScreenId>("talk");
  const [draft, setDraft] = useState<QijingDraft>(initialQijingDraft);
  const [formError, setFormError] = useState("");
  const [notice, setNotice] = useState("");
  const [assistantReply, setAssistantReply] = useState("");
  const [aiBusy, setAiBusy] = useState(false);
  const [planLoading, setPlanLoading] = useState(false);
  const [unfoldProgress, setUnfoldProgress] = useState(0);
  const [plan, setPlan] = useState<QijingPlan>();
  const [speechStatus, setSpeechStatus] = useState<QijingSpeechStatus>("idle");
  const [speechMessage, setSpeechMessage] = useState("");
  const [speechInterim, setSpeechInterim] = useState("");
  const [voiceOptedIn, setVoiceOptedIn] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const draftStorageReady = useRef(false);

  const move = useCallback((offset: number) => {
    setFormError("");
    setScreenId(current => QIJING_FLOW[Math.max(0, Math.min(QIJING_FLOW.length - 1, QIJING_FLOW.indexOf(current) + offset))]);
  }, []);

  const updateDraft = (next: QijingDraft) => {
    setDraft(next);
    setFormError("");
  };

  const showNotice = (message: string, duration = 1800) => {
    setNotice(message);
    window.setTimeout(() => setNotice(""), duration);
  };

  const stopSpeech = useCallback(() => {
    recognitionRef.current?.abort();
    recognitionRef.current = null;
    if (typeof window !== "undefined") window.speechSynthesis?.cancel();
    utteranceRef.current = null;
    setSpeechInterim("");
    setSpeechMessage("");
    setSpeechStatus("idle");
  }, []);

  const speakText = useCallback((text: string) => {
    const cleanText = text.replace(/\s+/g, " ").trim();
    if (!cleanText) return;
    setVoiceOptedIn(true);
    recognitionRef.current?.abort();
    recognitionRef.current = null;
    if (!("speechSynthesis" in window) || typeof SpeechSynthesisUtterance === "undefined") {
      setSpeechStatus("unsupported");
      setSpeechMessage("当前浏览器不支持语音朗读，你仍可阅读屏幕文字。");
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = "zh-CN";
    utterance.rate = 0.92;
    utterance.pitch = 1;
    const voice = window.speechSynthesis.getVoices().find(item => item.lang.toLowerCase().startsWith("zh"));
    if (voice) utterance.voice = voice;
    utterance.onstart = () => {
      setSpeechStatus("speaking");
      setSpeechMessage(speechStatusMessage("speaking"));
    };
    utterance.onend = () => {
      utteranceRef.current = null;
      setSpeechStatus("idle");
      setSpeechMessage("");
    };
    utterance.onerror = () => {
      utteranceRef.current = null;
      setSpeechStatus("error");
      setSpeechMessage("语音朗读没有完成，你仍可阅读屏幕文字。");
    };
    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  }, []);

  const toggleListening = useCallback(() => {
    setVoiceOptedIn(true);
    if (speechStatus === "speaking") {
      stopSpeech();
      return;
    }
    if (speechStatus === "listening") {
      recognitionRef.current?.stop();
      return;
    }
    const Recognition = getSpeechRecognitionConstructor(window);
    if (!Recognition) {
      setSpeechStatus("unsupported");
      setSpeechMessage(speechStatusMessage("unsupported"));
      return;
    }
    window.speechSynthesis?.cancel();
    const recognition = new Recognition();
    recognition.lang = "zh-CN";
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognition.onstart = () => {
      setSpeechStatus("listening");
      setSpeechInterim("");
      setSpeechMessage(speechStatusMessage("listening"));
    };
    recognition.onresult = event => {
      let finalText = "";
      let interimText = "";
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index];
        if (result.isFinal) finalText += result[0].transcript;
        else interimText += result[0].transcript;
      }
      setSpeechInterim(interimText);
      setSpeechMessage(speechStatusMessage("listening", interimText));
      if (finalText.trim()) setDraft(current => ({ ...current, note: mergeSpeechTranscript(current.note, finalText) }));
    };
    recognition.onerror = event => {
      recognitionRef.current = null;
      setSpeechInterim("");
      if (event.error === "aborted") {
        setSpeechStatus("idle");
        setSpeechMessage("");
        return;
      }
      setSpeechStatus("error");
      setSpeechMessage(speechRecognitionErrorMessage(event.error));
    };
    recognition.onend = () => {
      recognitionRef.current = null;
      setSpeechInterim("");
      setSpeechStatus(current => current === "error" || current === "unsupported" ? current : "idle");
      setSpeechMessage(current => current.startsWith("没有") || current.startsWith("语音") ? current : "");
    };
    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch {
      recognitionRef.current = null;
      setSpeechStatus("error");
      setSpeechMessage("麦克风暂时无法启动，请稍后重试或使用文字输入。");
    }
  }, [speechStatus, stopSpeech]);

  const validateQuestion = () => {
    const hasNote = draft.note.trim().length > 0;
    const rules: Partial<Record<QijingScreenId, [boolean, string]>> = {
      wish: [draft.wishes.length > 0 || hasNote, "请至少锁定一个心愿，或直接告诉阿境。"],
      time: [Boolean(draft.days && draft.arrival && draft.departure), "请确认停留时间、抵达与离开位置。"],
      pace: [Boolean(draft.pace) || hasNote, "请选择一个舒服的旅行节奏。"],
      travel: [draft.travelModes.length > 0 || hasNote, "请至少选择一种出行方式。"],
      interest: [draft.interests.length > 0 || hasNote, "请至少收下一样会让你停留的风物。"],
      boundary: [draft.boundaries.length > 0 || hasNote, "请至少确认一项旅途边界。"],
    };
    const rule = rules[screenId];
    if (!rule || rule[0]) return true;
    setFormError(rule[1]);
    return false;
  };

  useEffect(() => {
    const repositoryState = getGuikeRepository()?.read();
    const repositoryDraft = repositoryState?.draft && typeof repositoryState.draft === "object" ? repositoryState.draft : null;
    const saved = repositoryDraft ? JSON.stringify(repositoryDraft) : window.sessionStorage.getItem(DRAFT_STORAGE_KEY);
    const restoredPlan = repositoryState ? planFromRepository(repositoryState) : undefined;
    if (restoredPlan) {
      setPlan(restoredPlan);
      setScreenId("itinerary");
    }
    if (!saved) { draftStorageReady.current = true; return; }
    try {
      const parsed = { ...initialQijingDraft, ...JSON.parse(saved) } as QijingDraft;
      if (!parsed.wishesTouched) parsed.wishes = [];
      const timer = window.setTimeout(() => {
        setDraft(parsed);
        draftStorageReady.current = true;
      }, 0);
      return () => window.clearTimeout(timer);
    } catch {
      window.sessionStorage.removeItem(DRAFT_STORAGE_KEY);
      draftStorageReady.current = true;
    }
  }, []);

  useEffect(() => {
    if (!draftStorageReady.current) return;
    window.sessionStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
    getGuikeRepository()?.saveDraft(draft);
  }, [draft]);

  useEffect(() => {
    const repository = getGuikeRepository();
    if (!repository) return;
    return repository.subscribe((state, section) => {
      if (section === "draft" && state.draft && typeof state.draft === "object") {
        setDraft(current => {
          const next = { ...current, ...(state.draft as Partial<QijingDraft>) };
          return JSON.stringify(next) === JSON.stringify(current) ? current : next;
        });
      }
      if (section === "plan" || section === "all") {
        const restored = planFromRepository(state);
        if (restored) setPlan(restored);
      }
    });
  }, []);

  useEffect(() => () => stopSpeech(), [stopSpeech]);

  useEffect(() => {
    if (voiceOptedIn && assistantReply) speakText(assistantReply);
  }, [assistantReply, speakText, voiceOptedIn]);

  useEffect(() => {
    if (screenId !== "unfold" || planLoading || !plan) return;
    const timer = window.setTimeout(() => setScreenId("itinerary"), 900);
    return () => window.clearTimeout(timer);
  }, [plan, planLoading, screenId]);

  useEffect(() => {
    if (screenId !== "unfold" || !planLoading) return;
    const timer = window.setInterval(() => {
      setUnfoldProgress(current => {
        if (current >= 92) return current;
        if (current < 30) return Math.min(92, current + 4);
        if (current < 60) return Math.min(92, current + 3);
        if (current < 82) return Math.min(92, current + 2);
        return Math.min(92, current + 1);
      });
    }, 700);
    return () => window.clearInterval(timer);
  }, [planLoading, screenId]);

  const submitQuestion = async (destination?: QijingScreenId) => {
    if (aiBusy || !validateQuestion()) return;
    const userText = draft.note.trim();
    if (!userText) {
      setAssistantReply("");
      return destination ? setScreenId(destination) : move(1);
    }
    setAiBusy(true);
    setAssistantReply("");
    const controller = new AbortController();
    const requestTimeout = window.setTimeout(() => controller.abort(), 15000);
    try {
      if (usesLocalAiFallback()) {
        const nextDraft = applySupplement(draft, screenId, userText);
        setDraft(nextDraft);
        setAssistantReply("这句话和能识别的偏好都已保存在当前设备里。");
        showNotice("补充内容已保存并用于后续规划", 2200);
        return;
      }
      const response = await fetch(apiPath("/api/qijing/chat"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ screenId, userText, draft }),
        signal: controller.signal,
      });
      if (!response.ok) throw new Error("AI_CHAT_FAILED");
      const result = await response.json() as { assistantText?: string; draftPatch?: Partial<QijingDraft>; source?: string };
      const nextDraft = applySupplement(draft, screenId, userText, result.draftPatch ?? {});
      setDraft(nextDraft);
      setAssistantReply(result.assistantText || "我已经记下了。");
      if (result.source === "fallback") showNotice("AI 暂时离线，已用本地理解继续", 2200);
    } catch {
      setDraft(applySupplement(draft, screenId, userText));
      setAssistantReply("AI 暂时没有回应，原话和可识别的偏好已经保存在当前设备里。");
      showNotice("AI 暂不可用，已使用本地理解保存", 2200);
    } finally {
      window.clearTimeout(requestTimeout);
      setAiBusy(false);
      if (destination) setScreenId(destination); else move(1);
    }
  };

  const generateJourney = async (refine = false) => {
    if (planLoading) return;
    const controller = new AbortController();
    const requestTimeout = window.setTimeout(() => controller.abort(), 50000);
    setUnfoldProgress(6);
    setPlanLoading(true);
    setScreenId("unfold");
    showNotice(refine ? "阿境正在按你的新要求微调" : "阿境正在推演这一程", 2400);
    try {
      const canRefine = refine && plan && draft.note.trim();
      if (usesLocalAiFallback()) {
        if (refine && plan) {
          const result = refineFallbackPlan(plan, draft, draft.note);
          if (!result.appliedChanges.length) {
            setFormError(result.protectedConflict || `暂未理解“${result.unhandledInstruction}”，路线没有改变。请尝试“删除第一天的青云市集”。`);
            setScreenId("tune");
            showNotice("没有修改路线", 2200);
            return;
          }
          setPlan(result.plan);
          setDraft(current => ({ ...current, note: "" }));
          setUnfoldProgress(100);
          showNotice(result.appliedChanges[0], 2600);
          return;
        }
        setUnfoldProgress(100);
        setPlan(createFallbackPlan(draft));
        showNotice("GitHub Pages 静态版已生成本地安心方案", 2600);
        return;
      }
      const response = await fetch(apiPath(canRefine ? "/api/qijing/refine" : "/api/qijing/plan"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(canRefine ? { draft, currentPlan: plan, instruction: draft.note.trim() } : { draft }),
        signal: controller.signal,
      });
      if (!response.ok) throw new Error("PLAN_FAILED");
      const nextPlan = await response.json() as QijingPlan;
      setUnfoldProgress(100);
      setPlan(nextPlan);
      if (canRefine) setDraft(current => ({ ...current, note: "" }));
      if (nextPlan.generatedBy === "fallback") showNotice("AI 暂时离线，已生成可继续编辑的安心方案", 2600);
    } catch {
      setUnfoldProgress(100);
      showNotice("暂时无法连接 AI，先展示基础行程", 2400);
      setPlan(createFallbackPlan(draft));
      window.setTimeout(() => setScreenId("itinerary"), 650);
    } finally {
      window.clearTimeout(requestTimeout);
      setPlanLoading(false);
    }
  };

  const handleFlowClick = (event: MouseEvent<HTMLDivElement>) => {
    const button = (event.target as HTMLElement).closest("button");
    if (!button) return;
    const label = `${button.getAttribute("aria-label") ?? ""} ${button.textContent ?? ""}`.trim();

    if (label.includes("开始语音输入") || label.includes("停止语音输入")) { toggleListening(); return; }
    const speechText = button.dataset.speechText;
    if (speechText) { speakText(speechText); showNotice("阿境正在为你朗读", 1400); return; }

    if (label.includes("重新开始") || label.includes("退出")) { setDraft(initialQijingDraft); setPlan(undefined); setAssistantReply(""); window.sessionStorage.removeItem(DRAFT_STORAGE_KEY); setFormError(""); return setScreenId("talk"); }
    if (button.matches(".icon-button,.unfold-back") || label === "关闭" || label.includes("取消")) return screenId === "talk" ? window.history.back() : move(-1);
    if (screenId === "invitation" && button.parentElement?.tagName === "HEADER" && !label.includes("跳过")) return move(-1);
    if (screenId === "talk" && label.includes("开始聊六问")) return setScreenId("invitation");
    if (screenId === "talk" && label.includes("发送想法")) { void submitQuestion("invitation"); return; }
    if (screenId === "invitation" && (label.includes("跳过") || label.includes("收下这张帖"))) return setScreenId("wish");
    if (label.includes("暂存")) {
      window.sessionStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
      showNotice("已暂存，回来可以接着聊");
      return;
    }
    if (label.includes("我自己说")) {
      window.setTimeout(() => document.querySelector<HTMLInputElement>('input[aria-label="补充说明"]')?.focus(), 0);
      return;
    }
    if (label.includes("换个问法")) {
      showNotice("可以直接在下方说出你的想法");
      window.setTimeout(() => document.querySelector<HTMLInputElement>('input[aria-label="补充说明"]')?.focus(), 0);
      return;
    }
    if (["wish", "time", "pace", "travel", "interest"].includes(screenId) && label.includes("继续下一问")) { void submitQuestion(); return; }
    if (["wish", "time", "pace", "travel", "interest"].includes(screenId) && label.includes("发送补充")) { void submitQuestion(); return; }
    if (screenId === "travel" && label.includes("听听建议")) {
      updateDraft({ ...draft, changeHotel: true, maxTransfer: Math.max(120, draft.maxTransfer) });
      showNotice("已放宽住处与转场，西江可以更从容", 2000);
      return;
    }
    if (screenId === "boundary" && (label.includes("完成六问") || label.includes("发送补充"))) { void submitQuestion("crystal"); return; }
    if (screenId === "crystal" && label.includes("修改")) return setScreenId("boundary");
    if (screenId === "crystal" && label.includes("为我开境")) { void generateJourney(); return; }
    if (screenId === "unfold" && label.includes("返回检查")) return setScreenId("crystal");
    if (label.includes("行程手帖")) return setScreenId("itinerary");
    if (label.includes("路线显影")) return setScreenId("map");
    if (label.includes("定位我")) {
      if (!navigator.geolocation) return showNotice("当前设备不支持定位，仍可查看完整路线");
      showNotice("正在获取你的位置…", 2400);
      navigator.geolocation.getCurrentPosition(
        () => showNotice("已定位，路线将从你附近开始"),
        () => showNotice("未获得定位权限，仍可查看完整路线", 2400),
        { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 },
      );
      return;
    }
    if (label.includes("微调") || (label.includes("编辑") && ["itinerary", "map"].includes(screenId))) return setScreenId("tune");
    if (screenId === "tune" && label.includes("重新开境")) { void generateJourney(true); return; }
    if (label.includes("收下这一程")) {
      if (!plan) return showNotice("行程仍在生成，请稍后再保存", 2200);
      try {
        saveJourneyPlan(plan, draft);
        window.sessionStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
        showNotice("这一程已保存，可在个人 · 我的行径查看");
      } catch {
        showNotice("保存失败，请检查浏览器存储权限", 2600);
      }
    }
  };

  return <div className="qijing-product-flow" onClick={handleFlowClick}>
    <QijingProductScreen screenId={screenId} draft={draft} plan={plan} unfoldProgress={unfoldProgress} assistantReply={assistantReply} busy={aiBusy || planLoading} error={formError} speechStatus={speechStatus} speechMessage={speechMessage} speechInterim={speechInterim} onToggleListening={toggleListening} onSpeak={speakText} onDraftChange={updateDraft} />
    {notice ? <div className="qijing-save-notice" role="status">{notice}</div> : null}
  </div>;
}

type LegacyWindow = Window & {
  GuikeTabs?: { go: (tab: string) => void };
  GuikeStroll?: { onShow?: () => void; onHide?: () => void };
  GuikePersonal?: { syncStorage?: () => void };
  __guikeBridgeReady?: boolean;
  __QIJING_API_BASE_URL__?: string;
  __QIJING_STATIC_EXPORT__?: boolean;
};

function LegacyFrame({ src, title, pane, allow, active, onSwitch, onModalChange }: { src: string; title: string; pane?: Tab34Pane; allow?: string; active: boolean; onSwitch: (tab: MainTab) => void; onModalChange?: (open: boolean) => void }) {
  const ref = useRef<HTMLIFrameElement>(null);

  const configure = useCallback(() => {
    const frame = ref.current;
    const win = frame?.contentWindow;
    const doc = frame?.contentDocument;
    if (!win) return;
    const legacyWin = win as LegacyWindow;
    legacyWin.__QIJING_API_BASE_URL__ = QIJING_API_BASE_URL;
    legacyWin.__QIJING_STATIC_EXPORT__ = IS_STATIC_EXPORT;

    if (doc && !doc.getElementById("guike-embed-style")) {
      const style = doc.createElement("style");
      style.id = "guike-embed-style";
      style.textContent = "html,body,.stage,.phone{width:100%!important;height:100%!important;max-width:none!important}body{background:#f4ecd8!important}.phone{box-shadow:none!important}.tabbar{display:none!important}";
      doc.head.appendChild(style);
    }
    if (pane) doc?.querySelector<HTMLButtonElement>(`.tab[data-target="${pane}"]`)?.click();

    legacyWin.GuikeTabs = { go: (requested: string) => { const target = tabFromLegacy[requested]; if (target) onSwitch(target); } };
    if (active) legacyWin.GuikePersonal?.syncStorage?.();
    if (!legacyWin.__guikeBridgeReady) {
      const bridge = (event: Event) => {
        const requested = (event as CustomEvent<{ tab?: string }>).detail?.tab;
        if (requested && tabFromLegacy[requested]) onSwitch(tabFromLegacy[requested]);
      };
      win.addEventListener("guike:switch-tab", bridge);
      legacyWin.__guikeBridgeReady = true;
    }
    if (title === "随逛") {
      if (active) legacyWin.GuikeStroll?.onShow?.();
      else legacyWin.GuikeStroll?.onHide?.();
    }
    win.postMessage({ type: "guike:visibility", active }, "*");
    if (pane) win.postMessage({ type: "guike:select-pane", pane }, "*");
  }, [active, onSwitch, pane, title]);

  useEffect(() => {
    const receive = (event: MessageEvent<{ type?: string; tab?: string; action?: string }>) => {
      if (event.source !== ref.current?.contentWindow || event.origin !== window.location.origin) return;
      if (event.data?.type === "guike:modal") {
        onModalChange?.(event.data.action === "open");
        return;
      }
      if (event.data?.type !== "guike:switch-tab") return;
      const target = event.data.tab ? tabFromLegacy[event.data.tab] : undefined;
      if (target) onSwitch(target);
    };
    window.addEventListener("message", receive);
    return () => window.removeEventListener("message", receive);
  }, [onModalChange, onSwitch]);

  useEffect(() => { configure(); }, [configure]);
  return <iframe ref={ref} className="legacy-frame" src={src} title={title} allow={allow} onLoad={configure} />;
}

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<MainTab>("qijing");
  const [modalOpen, setModalOpen] = useState(false);
  const tab34Pane: Tab34Pane = activeTab === "plaza" ? "广场" : "个人";
  useEffect(() => setModalOpen(false), [activeTab]);

  return <main className="merged-stage"><section className={`merged-phone ${modalOpen ? "is-modal-open" : ""}`} aria-label="贵客万象">
    <div className="merged-content">
      <div className={`merged-pane ${activeTab === "qijing" ? "is-active" : ""}`} aria-hidden={activeTab !== "qijing"}><TabOne /></div>
      <div className={`merged-pane ${activeTab === "stroll" ? "is-active" : ""}`} aria-hidden={activeTab !== "stroll"}><LegacyFrame src={publicPath("/legacy/tab2/index.html")} title="随逛" active={activeTab === "stroll"} allow="geolocation" onSwitch={setActiveTab} /></div>
      <div className={`merged-pane ${activeTab === "personal" || activeTab === "plaza" ? "is-active" : ""}`} aria-hidden={activeTab !== "personal" && activeTab !== "plaza"}><LegacyFrame src={publicPath("/legacy/tab34/index-guike-personal.html")} title="个人与广场" active={activeTab === "personal" || activeTab === "plaza"} pane={tab34Pane} allow="camera; geolocation" onSwitch={setActiveTab} onModalChange={setModalOpen} /></div>
    </div>
    <nav className="merged-tabbar" aria-label="主导航">
      {mainTabs.map(tab => <button key={tab.id} className={activeTab === tab.id ? "is-active" : ""} onClick={() => setActiveTab(tab.id)} aria-current={activeTab === tab.id ? "page" : undefined} aria-label={tab.label}>
        <span className="merged-tab-icon" aria-hidden="true"><img className="ico-bw" src={publicPath(`/tabbar-icons/${tab.icon}-bw.png`)} alt="" /><img className="ico-color" src={publicPath(`/tabbar-icons/${tab.icon}-color.png`)} alt="" /></span>
        <span className="merged-tab-label">{tab.label}</span>
      </button>)}
    </nav>
  </section></main>;
}
