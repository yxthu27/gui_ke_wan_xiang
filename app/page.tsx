"use client";

import { useCallback, useEffect, useRef, useState, type MouseEvent } from "react";
import { QijingProductScreen, initialQijingDraft, type QijingDraft, type QijingPlan, type QijingScreenId } from "./spec/page";

type MainTab = "qijing" | "stroll" | "personal" | "plaza";
type Tab34Pane = "个人" | "广场";
const DRAFT_STORAGE_KEY = "qijing-draft-v2";

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
  const flow: QijingScreenId[] = ["talk", "invitation", "wish", "time", "pace", "travel", "interest", "boundary", "crystal", "unfold", "itinerary", "map", "tune"];
  const [screenId, setScreenId] = useState<QijingScreenId>("talk");
  const [draft, setDraft] = useState<QijingDraft>(initialQijingDraft);
  const [formError, setFormError] = useState("");
  const [notice, setNotice] = useState("");
  const [assistantReply, setAssistantReply] = useState("");
  const [aiBusy, setAiBusy] = useState(false);
  const [planLoading, setPlanLoading] = useState(false);
  const [plan, setPlan] = useState<QijingPlan>();

  const move = useCallback((offset: number) => {
    setFormError("");
    setScreenId(current => flow[Math.max(0, Math.min(flow.length - 1, flow.indexOf(current) + offset))]);
  }, []);

  const updateDraft = (next: QijingDraft) => {
    setDraft(next);
    setFormError("");
  };

  const showNotice = (message: string, duration = 1800) => {
    setNotice(message);
    window.setTimeout(() => setNotice(""), duration);
  };

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
    const saved = window.sessionStorage.getItem(DRAFT_STORAGE_KEY);
    if (!saved) return;
    try {
      const parsed = { ...initialQijingDraft, ...JSON.parse(saved) } as QijingDraft;
      if (!parsed.wishesTouched) parsed.wishes = [];
      setDraft(parsed);
    } catch { window.sessionStorage.removeItem(DRAFT_STORAGE_KEY); }
  }, []);

  useEffect(() => {
    window.sessionStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
  }, [draft]);

  useEffect(() => {
    if (screenId !== "unfold" || planLoading || !plan) return;
    const timer = window.setTimeout(() => setScreenId("itinerary"), 900);
    return () => window.clearTimeout(timer);
  }, [plan, planLoading, screenId]);

  const submitQuestion = async (destination?: QijingScreenId) => {
    if (aiBusy || !validateQuestion()) return;
    const userText = draft.note.trim();
    if (!userText) {
      setAssistantReply("");
      return destination ? setScreenId(destination) : move(1);
    }
    setAiBusy(true);
    setAssistantReply("");
    try {
      const response = await fetch("/api/qijing/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ screenId, userText, draft }),
      });
      if (!response.ok) throw new Error("AI_CHAT_FAILED");
      const result = await response.json() as { assistantText?: string; draftPatch?: Partial<QijingDraft>; source?: string };
      const nextDraft = { ...draft, ...(result.draftPatch ?? {}), note: "" };
      setDraft(nextDraft);
      setAssistantReply(result.assistantText || "我已经记下了。");
      if (result.source === "fallback") showNotice("AI 暂时离线，已用本地理解继续", 2200);
    } catch {
      setAssistantReply("这句话先替你记下，我们继续往下聊。");
      showNotice("AI 暂时不可用，选择内容不会丢失", 2200);
    } finally {
      setAiBusy(false);
      if (destination) setScreenId(destination); else move(1);
    }
  };

  const generateJourney = async (refine = false) => {
    if (planLoading) return;
    setPlanLoading(true);
    setScreenId("unfold");
    showNotice(refine ? "阿境正在按你的新要求微调" : "阿境正在推演这一程", 2400);
    try {
      const canRefine = refine && plan && draft.note.trim();
      const response = await fetch(canRefine ? "/api/qijing/refine" : "/api/qijing/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(canRefine ? { draft, currentPlan: plan, instruction: draft.note.trim() } : { draft }),
      });
      if (!response.ok) throw new Error("PLAN_FAILED");
      const nextPlan = await response.json() as QijingPlan;
      setPlan(nextPlan);
      if (canRefine) setDraft(current => ({ ...current, note: "" }));
      if (nextPlan.generatedBy === "fallback") showNotice("AI 暂时离线，已生成可继续编辑的安心方案", 2600);
    } catch {
      showNotice("暂时无法连接 AI，先展示基础行程", 2400);
      setScreenId("itinerary");
    } finally {
      setPlanLoading(false);
    }
  };

  const handleFlowClick = (event: MouseEvent<HTMLDivElement>) => {
    const button = (event.target as HTMLElement).closest("button");
    if (!button) return;
    const label = `${button.getAttribute("aria-label") ?? ""} ${button.textContent ?? ""}`.trim();

    if (label.includes("重新开始") || label.includes("退出")) { setDraft(initialQijingDraft); setPlan(undefined); setAssistantReply(""); window.sessionStorage.removeItem(DRAFT_STORAGE_KEY); setFormError(""); return setScreenId("talk"); }
    if (button.matches(".icon-button,.unfold-back") || label === "关闭" || label.includes("取消")) return screenId === "talk" ? window.history.back() : move(-1);
    if (screenId === "invitation" && button.parentElement?.tagName === "HEADER" && !label.includes("跳过")) return move(-1);
    if (screenId === "talk" && label.includes("开始聊六问")) return setScreenId("invitation");
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
    if (label.includes("再说一遍")) {
      showNotice("阿境正在为你重述这一问", 1600);
      return;
    }
    if (label.includes("换个问法")) {
      showNotice("可以直接在下方说出你的想法");
      window.setTimeout(() => document.querySelector<HTMLInputElement>('input[aria-label="补充说明"]')?.focus(), 0);
      return;
    }
    if (["wish", "time", "pace", "travel", "interest"].includes(screenId) && label.includes("发送")) { void submitQuestion(); return; }
    if (screenId === "pace" && label.includes("就是这样")) return validateQuestion() ? move(1) : undefined;
    if (screenId === "travel" && label.includes("听听建议")) {
      updateDraft({ ...draft, changeHotel: true, maxTransfer: Math.max(120, draft.maxTransfer) });
      showNotice("已放宽住处与转场，西江可以更从容", 2000);
      return;
    }
    if (screenId === "boundary" && (label.includes("看看阿境记住了什么") || label.includes("确认锁定") || label.includes("发送"))) { void submitQuestion("crystal"); return; }
    if (screenId === "crystal" && label.includes("修改")) return setScreenId("boundary");
    if (screenId === "crystal" && label.includes("为我开境")) { void generateJourney(); return; }
    if (screenId === "unfold" && label.includes("返回检查")) return setScreenId("crystal");
    if (label.includes("行程手帖")) return setScreenId("itinerary");
    if (label.includes("路线显影")) return setScreenId("map");
    if (label.includes("微调") || (label.includes("编辑") && ["itinerary", "map"].includes(screenId))) return setScreenId("tune");
    if (screenId === "tune" && label.includes("重新开境")) { void generateJourney(true); return; }
    if (label.includes("收下这一程")) {
      window.sessionStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
      showNotice("这一程已替你收好");
    }
  };

  return <div className="qijing-product-flow" onClick={handleFlowClick}>
    <QijingProductScreen screenId={screenId} draft={draft} plan={plan} assistantReply={assistantReply} busy={aiBusy || planLoading} error={formError} onDraftChange={updateDraft} />
    {notice ? <div className="qijing-save-notice" role="status">{notice}</div> : null}
  </div>;
}

type LegacyWindow = Window & {
  GuikeTabs?: { go: (tab: string) => void };
  GuikeStroll?: { onShow?: () => void; onHide?: () => void };
  __guikeBridgeReady?: boolean;
};

function LegacyFrame({ src, title, pane, allow, active, onSwitch }: { src: string; title: string; pane?: Tab34Pane; allow?: string; active: boolean; onSwitch: (tab: MainTab) => void }) {
  const ref = useRef<HTMLIFrameElement>(null);

  const configure = useCallback(() => {
    const frame = ref.current;
    const win = frame?.contentWindow;
    const doc = frame?.contentDocument;
    if (!win) return;
    const legacyWin = win as LegacyWindow;

    if (doc && !doc.getElementById("guike-embed-style")) {
      const style = doc.createElement("style");
      style.id = "guike-embed-style";
      style.textContent = "html,body,.stage,.phone{width:100%!important;height:100%!important;max-width:none!important}body{background:#f4ecd8!important}.phone{box-shadow:none!important}.tabbar{display:none!important}";
      doc.head.appendChild(style);
    }
    if (pane) doc?.querySelector<HTMLButtonElement>(`.tab[data-target="${pane}"]`)?.click();

    legacyWin.GuikeTabs = { go: (requested: string) => { const target = tabFromLegacy[requested]; if (target) onSwitch(target); } };
    if (!legacyWin.__guikeBridgeReady) {
      const bridge = (event: Event) => {
        const requested = (event as CustomEvent<{ tab?: string }>).detail?.tab;
        if (requested && tabFromLegacy[requested]) onSwitch(tabFromLegacy[requested]);
      };
      win.addEventListener("guike:switch-tab", bridge);
      legacyWin.__guikeBridgeReady = true;
    }
    if (title === "随逛") active ? legacyWin.GuikeStroll?.onShow?.() : legacyWin.GuikeStroll?.onHide?.();
    win.postMessage({ type: "guike:visibility", active }, "*");
    if (pane) win.postMessage({ type: "guike:select-pane", pane }, "*");
  }, [active, onSwitch, pane, title]);

  useEffect(() => {
    const receive = (event: MessageEvent<{ type?: string; tab?: string }>) => {
      if (event.source !== ref.current?.contentWindow || event.data?.type !== "guike:switch-tab") return;
      const target = event.data.tab ? tabFromLegacy[event.data.tab] : undefined;
      if (target) onSwitch(target);
    };
    window.addEventListener("message", receive);
    return () => window.removeEventListener("message", receive);
  }, [onSwitch]);

  useEffect(() => { configure(); }, [configure]);
  return <iframe ref={ref} className="legacy-frame" src={src} title={title} allow={allow} onLoad={configure} />;
}

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<MainTab>("qijing");
  const tab34Pane: Tab34Pane = activeTab === "plaza" ? "广场" : "个人";

  return <main className="merged-stage"><section className="merged-phone" aria-label="贵客万象">
    <div className="merged-content">
      <div className={`merged-pane ${activeTab === "qijing" ? "is-active" : ""}`} aria-hidden={activeTab !== "qijing"}><TabOne /></div>
      <div className={`merged-pane ${activeTab === "stroll" ? "is-active" : ""}`} aria-hidden={activeTab !== "stroll"}><LegacyFrame src="/legacy/tab2/index.html" title="随逛" active={activeTab === "stroll"} allow="geolocation" onSwitch={setActiveTab} /></div>
      <div className={`merged-pane ${activeTab === "personal" || activeTab === "plaza" ? "is-active" : ""}`} aria-hidden={activeTab !== "personal" && activeTab !== "plaza"}><LegacyFrame src="/legacy/tab34/index-guike-personal.html" title="个人与广场" active={activeTab === "personal" || activeTab === "plaza"} pane={tab34Pane} allow="camera; geolocation" onSwitch={setActiveTab} /></div>
    </div>
    <nav className="merged-tabbar" aria-label="主导航">
      {mainTabs.map(tab => <button key={tab.id} className={activeTab === tab.id ? "is-active" : ""} onClick={() => setActiveTab(tab.id)} aria-current={activeTab === tab.id ? "page" : undefined} aria-label={tab.label}>
        <span className="merged-tab-icon" aria-hidden="true"><img className="ico-bw" src={`/tabbar-icons/${tab.icon}-bw.png`} alt="" /><img className="ico-color" src={`/tabbar-icons/${tab.icon}-color.png`} alt="" /></span>
        <span className="merged-tab-label">{tab.label}</span>
      </button>)}
    </nav>
  </section></main>;
}
