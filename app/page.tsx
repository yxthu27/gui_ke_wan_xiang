"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowLeft, Compass, Grid2X2, Map as MapIcon, Mic, Play, Send, UserRound,
} from "lucide-react";

type MainTab = "qijing" | "stroll" | "personal" | "plaza";
type Tab34Pane = "个人" | "广场";

const tabFromLegacy: Record<string, MainTab> = {
  启境: "qijing", 路线: "qijing", 随逛: "stroll", 个人: "personal", 广场: "plaza",
};

function TabOne() {
  return <div className="phone-page talk-screen merged-talk-screen">
      <div className="mock-topbar"><button aria-label="返回" className="icon-button" onClick={() => window.history.back()}><ArrowLeft /></button><strong>与阿境聊聊</strong><button className="text-action">重新开始</button></div>
      <div className="dialog-stage-label"><span />自由表达 · 阿境正在理解</div>
      <section className="talk-stage"><img src="/assets/ajing-guide.png" alt="阿境数字人" /><div className="speaking-indicator"><i /><i /><i /><span>阿境正在说</span></div><div className="subtitle-card"><small>阿境 · 开场</small><strong>我听见了：瀑布、村寨，还有街边小店。我们再聊六件事，就能把这一程慢慢拼出来。</strong><div><button><Play />再说一遍</button><button>我想补充</button></div></div></section>
      <div className="recognized-row"><button>瀑布</button><button>村寨</button><button className="locked">街边小店</button></div>
      <div className="reply-area"><p>不用填问卷，阿境会一次只问一件事</p><div><button>我还想补充</button><a className="selected" href="/spec">查看完整六问流程</a></div></div>
      <div className="chat-composer"><button aria-label="语音"><Mic /></button><div>直接和阿境说你的想法……</div><button className="send" aria-label="发送"><Send /></button></div>
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
