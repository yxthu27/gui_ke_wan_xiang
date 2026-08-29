"use client";

import { useCallback, useEffect, useRef, useState, type MouseEvent } from "react";
import { QijingProductScreen, initialQijingDraft, type QijingDraft, type QijingPlan, type QijingScreenId } from "./spec/page";

type MainTab = "qijing" | "stroll" | "personal" | "plaza";
type Tab34Pane = "个人" | "广场";
const DRAFT_STORAGE_KEY = "qijing-draft-v2";
const QIJING_FLOW: QijingScreenId[] = ["talk", "invitation", "wish", "time", "pace", "travel", "interest", "boundary", "crystal", "unfold", "itinerary", "map", "tune"];

function createLocalPlan(draft: QijingDraft): QijingPlan {
  const values = draft.days.match(/\d+/g)?.map(Number) ?? [1];
  const dayCount = draft.days === "半天" ? 1 : Math.min(7, Math.max(1, values.at(-1) ?? 1));
  const templates = [
    { theme: "先从贵阳的烟火里落脚", stops: [[draft.arrival, "从容抵达，先放下行李"], ["青云市集", "从一顿贵州午味开始"], ["甲秀楼", "在南明河边慢慢收尾"]] },
    { theme: "把一整天留给山水大景", stops: [["黄果树瀑布", "错开首波人流靠近瀑布"], ["关岭", "留足午餐与休息时间"], ["坝陵河", "用轻松远眺替代连续爬坡"]] },
    { theme: "在石巷与手艺之间慢下来", stops: [["青岩古镇", "从安静的背街进入"], ["非遗工坊", "留一段完整时间体验手作"], ["城墙茶铺", "在天色变柔前休息"]] },
    { theme: "带着余白从容返程", stops: [["黔灵山脚", "不赶早地散一小段步"], ["贵阳老街", "补上一顿喜欢的贵州味"], [draft.departure, "预留充足交通时间离开"]] },
    { theme: "把村寨的清晨留给自己", stops: [["黔东南村寨", "在人流前看晨雾与吊脚楼"], ["寨中家常菜", "就近午餐减少转场"], ["田埂慢行", "为拍照和停留留足时间"]] },
    { theme: "去野，但不催促脚步", stops: [["贵阳近郊步道", "按体力选择轻量短线"], ["山边午餐", "给下午留恢复时间"], ["山地日落", "天黑前返回，不走夜路"]] },
    { theme: "最后一天只做真正喜欢的事", stops: [["自由回访", "回到最喜欢的一处"], ["贵州手信", "顺路挑一份不绕远的纪念"], [draft.departure, "安心结束这一程"]] },
  ];
  const days = templates.slice(0, dayCount).map((template, dayIndex) => ({
    day: dayIndex + 1,
    theme: template.theme,
    items: template.stops.map(([location, description], itemIndex) => ({
      id: `local-${dayIndex + 1}-${itemIndex + 1}`,
      time: ["09:30", "12:30", "16:30"][itemIndex],
      title: location,
      description,
      durationMinutes: [90, 80, 70][itemIndex],
      location,
      lockedWish: itemIndex === 0 && dayIndex > 0 && draft.wishes.length > 0,
    })),
  }));
  return {
    title: `${draft.days}黔行 · ${draft.wishes[0] || "山水与烟火"}之间`,
    summary: `从${draft.arrival}出发，以“${draft.pace || "舒适"}”的节奏完成这一程。`,
    tags: [draft.days, draft.pace || "舒适节奏", draft.boundaries[0] || "自在同行"],
    days,
    warnings: ["当前使用本地安心方案，可稍后联网重新生成。"],
    generatedBy: "fallback",
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
  }, [draft]);

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
    const controller = new AbortController();
    const requestTimeout = window.setTimeout(() => controller.abort(), 30000);
    setUnfoldProgress(6);
    setPlanLoading(true);
    setScreenId("unfold");
    showNotice(refine ? "阿境正在按你的新要求微调" : "阿境正在推演这一程", 2400);
    try {
      const canRefine = refine && plan && draft.note.trim();
      const response = await fetch(canRefine ? "/api/qijing/refine" : "/api/qijing/plan", {
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
      setPlan(createLocalPlan(draft));
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
      window.sessionStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
      showNotice("这一程已替你收好");
    }
  };

  return <div className="qijing-product-flow" onClick={handleFlowClick}>
    <QijingProductScreen screenId={screenId} draft={draft} plan={plan} unfoldProgress={unfoldProgress} assistantReply={assistantReply} busy={aiBusy || planLoading} error={formError} onDraftChange={updateDraft} />
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
    if (title === "随逛") {
      if (active) legacyWin.GuikeStroll?.onShow?.();
      else legacyWin.GuikeStroll?.onHide?.();
    }
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
