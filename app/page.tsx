"use client";

import { useCallback, useEffect, useRef, useState, type MouseEvent } from "react";
import {
  Compass, Grid2X2, Map as MapIcon, UserRound,
} from "lucide-react";
import { QijingProductScreen, type QijingScreenId } from "./spec/page";

type MainTab = "qijing" | "stroll" | "personal" | "plaza";
type Tab34Pane = "个人" | "广场";

const tabFromLegacy: Record<string, MainTab> = {
  启境: "qijing", 路线: "qijing", 随逛: "stroll", 个人: "personal", 广场: "plaza",
};

function TabOne() {
  const flow: QijingScreenId[] = ["talk", "invitation", "wish", "time", "pace", "travel", "interest", "boundary", "crystal", "unfold", "itinerary", "map", "tune"];
  const [screenId, setScreenId] = useState<QijingScreenId>("talk");

  const move = useCallback((offset: number) => {
    setScreenId(current => flow[Math.max(0, Math.min(flow.length - 1, flow.indexOf(current) + offset))]);
  }, []);

  useEffect(() => {
    if (screenId !== "unfold") return;
    const timer = window.setTimeout(() => setScreenId("itinerary"), 2200);
    return () => window.clearTimeout(timer);
  }, [screenId]);

  const handleFlowClick = (event: MouseEvent<HTMLDivElement>) => {
    const button = (event.target as HTMLElement).closest("button");
    if (!button) return;
    const label = `${button.getAttribute("aria-label") ?? ""} ${button.textContent ?? ""}`.trim();

    if (label.includes("重新开始") || label.includes("退出")) return setScreenId("talk");
    if (button.matches(".icon-button,.unfold-back") || label === "关闭" || label.includes("取消")) return screenId === "talk" ? window.history.back() : move(-1);
    if (screenId === "invitation" && button.parentElement?.tagName === "HEADER" && !label.includes("跳过")) return move(-1);
    if (screenId === "talk" && label.includes("开始聊六问")) return setScreenId("invitation");
    if (screenId === "invitation" && (label.includes("跳过") || label.includes("收下这张帖"))) return setScreenId("wish");
    if (["wish", "time", "pace", "travel", "interest"].includes(screenId) && label.includes("发送")) return move(1);
    if (screenId === "boundary" && (label.includes("看看阿境记住了什么") || label.includes("发送"))) return setScreenId("crystal");
    if (screenId === "crystal" && label.includes("修改")) return setScreenId("boundary");
    if (screenId === "crystal" && label.includes("为我开境")) return setScreenId("unfold");
    if (screenId === "unfold" && label.includes("返回检查")) return setScreenId("crystal");
    if (label.includes("行程手帖")) return setScreenId("itinerary");
    if (label.includes("路线显影")) return setScreenId("map");
    if (label.includes("微调") || (label.includes("编辑") && ["itinerary", "map"].includes(screenId))) return setScreenId("tune");
    if (screenId === "tune" && label.includes("重新开境")) return setScreenId("unfold");
  };

  return <div className="qijing-product-flow" onClick={handleFlowClick}>
    <QijingProductScreen screenId={screenId} />
  </div>;
}

function LegacyFrame({ src, title, pane, allow, onSwitch }: { src: string; title: string; pane?: Tab34Pane; allow?: string; onSwitch: (tab: MainTab) => void }) {
  const ref = useRef<HTMLIFrameElement>(null);

  const configure = useCallback(() => {
    const frame = ref.current;
    const win = frame?.contentWindow;
    const doc = frame?.contentDocument;
    if (!win || !doc) return;

    if (!doc.getElementById("guike-embed-style")) {
      const style = doc.createElement("style");
      style.id = "guike-embed-style";
      style.textContent = "html,body,.stage,.phone{width:100%!important;height:100%!important;max-width:none!important}body{background:#f4ecd8!important}.phone{box-shadow:none!important}.tabbar{display:none!important}";
      doc.head.appendChild(style);
    }
    if (pane) doc.querySelector<HTMLButtonElement>(`.tab[data-target="${pane}"]`)?.click();

    if (!frame.dataset.bridgeReady) {
      const bridge = (event: Event) => {
        const requested = (event as CustomEvent<{ tab?: string }>).detail?.tab;
        if (requested && tabFromLegacy[requested]) onSwitch(tabFromLegacy[requested]);
      };
      win.addEventListener("guike:switch-tab", bridge);
      frame.dataset.bridgeReady = "true";
    }
  }, [onSwitch, pane]);

  useEffect(() => { configure(); }, [configure]);
  return <iframe ref={ref} className="legacy-frame" src={src} title={title} allow={allow} onLoad={configure} />;
}

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<MainTab>("qijing");
  const tab34Pane: Tab34Pane = activeTab === "plaza" ? "广场" : "个人";

  return <main className="merged-stage"><section className="merged-phone" aria-label="贵客万象">
    <div className="merged-content">
      <div className={`merged-pane ${activeTab === "qijing" ? "is-active" : ""}`} aria-hidden={activeTab !== "qijing"}><TabOne /></div>
      <div className={`merged-pane ${activeTab === "stroll" ? "is-active" : ""}`} aria-hidden={activeTab !== "stroll"}><LegacyFrame src="/legacy/tab2/index.html" title="随逛" allow="geolocation" onSwitch={setActiveTab} /></div>
      <div className={`merged-pane ${activeTab === "personal" || activeTab === "plaza" ? "is-active" : ""}`} aria-hidden={activeTab !== "personal" && activeTab !== "plaza"}><LegacyFrame src="/legacy/tab34/index-guike-personal.html" title="个人与广场" pane={tab34Pane} allow="camera; geolocation" onSwitch={setActiveTab} /></div>
    </div>
    <nav className="merged-tabbar" aria-label="主导航">
      <button className={activeTab === "qijing" ? "is-active" : ""} onClick={() => setActiveTab("qijing")} aria-current={activeTab === "qijing" ? "page" : undefined}><Compass /><span>启境</span></button>
      <button className={activeTab === "stroll" ? "is-active" : ""} onClick={() => setActiveTab("stroll")} aria-current={activeTab === "stroll" ? "page" : undefined}><MapIcon /><span>随逛</span></button>
      <button className={activeTab === "personal" ? "is-active" : ""} onClick={() => setActiveTab("personal")} aria-current={activeTab === "personal" ? "page" : undefined}><UserRound /><span>个人</span></button>
      <button className={activeTab === "plaza" ? "is-active" : ""} onClick={() => setActiveTab("plaza")} aria-current={activeTab === "plaza" ? "page" : undefined}><Grid2X2 /><span>广场</span></button>
    </nav>
  </section></main>;
}
