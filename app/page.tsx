"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowLeft, Backpack, ChevronRight, Compass, Grid2X2, Map as MapIcon,
  MessageCircle, Mic, Play, Send, ShieldCheck, Sparkles, UserRound,
} from "lucide-react";

type MainTab = "qijing" | "stroll" | "personal" | "plaza";
type Tab34Pane = "个人" | "广场";

const tabFromLegacy: Record<string, MainTab> = {
  启境: "qijing", 路线: "qijing", 随逛: "stroll", 个人: "personal", 广场: "plaza",
};

function TabOne() {
  const [screen, setScreen] = useState<"home" | "talk">("home");

  if (screen === "talk") {
    return <div className="phone-page talk-screen merged-talk-screen">
      <div className="mock-topbar"><button aria-label="返回启境首页" className="icon-button" onClick={() => setScreen("home")}><ArrowLeft /></button><strong>与阿境聊聊</strong><button className="text-action" onClick={() => setScreen("home")}>重新开始</button></div>
      <div className="dialog-stage-label"><span />自由表达 · 阿境正在理解</div>
      <section className="talk-stage"><img src="/assets/ajing-guide.png" alt="阿境数字人" /><div className="speaking-indicator"><i /><i /><i /><span>阿境正在说</span></div><div className="subtitle-card"><small>阿境 · 开场</small><strong>我听见了：瀑布、村寨，还有街边小店。我们再聊六件事，就能把这一程慢慢拼出来。</strong><div><button><Play />再说一遍</button><button>我想补充</button></div></div></section>
      <div className="recognized-row"><button>瀑布</button><button>村寨</button><button className="locked">街边小店</button></div>
      <div className="reply-area"><p>不用填问卷，阿境会一次只问一件事</p><div><button>我还想补充</button><a className="selected" href="/spec">查看完整六问流程</a></div></div>
      <div className="chat-composer"><button aria-label="语音"><Mic /></button><div>直接和阿境说你的想法……</div><button className="send" aria-label="发送"><Send /></button></div>
    </div>;
  }

  return <div className="phone-page home-screen merged-home-screen">
    <header className="brand-bar"><div><span>GUIZHOU</span><strong>贵客万象</strong></div><button className="round-bag" aria-label="行囊"><Backpack /></button></header>
    <section className="hero-visual"><div className="hero-copy"><span className="eyebrow"><Sparkles />贵客未行 · 万象先启</span><h1>这一次，贵州<br />想怎么遇见你？</h1><p>先说一句想法，阿境会陪你把愿望慢慢说清。</p></div><div className="guide-wrap"><img src="/assets/ajing-guide.png" alt="阿境数字人形象" /><span className="guide-role">AI 在地向导</span><b>阿境 · 先听你说</b></div><div className="fortune-card"><small>今日万象签</small><strong>山路会绕一点，<br />好风景不会。</strong><button>换一句贵州的暗示 ↻</button></div></section>
    <section className="ask-card"><div className="ask-title"><div className="mini-avatar">境</div><div><strong>告诉阿境，你想怎样抵达贵州</strong><span>阿境会在聊天里把六个问题慢慢聊清</span></div><em>AI 规划</em></div><div className="text-box">第一次来贵州，想看瀑布和村寨，也想吃街边小店……<span>34 / 500</span></div><div className="quick-tags"><button>第一次来贵州</button><button>带父母慢慢走</button><button>非遗与烟火</button></div><button className="primary-button" onClick={() => setScreen("talk")}><MessageCircle />带着这句话，和阿境聊聊<ChevronRight /></button><p className="micro-note"><ShieldCheck /> 对话中的心愿与边界会请你再次确认</p></section>
    <section className="six-entry"><div className="seal-icon">六</div><div><strong>开境六问 · 由阿境陪你聊出来</strong><p>不填问卷，在对话里聊心愿、时间、步速与边界</p></div><button onClick={() => setScreen("talk")}>从第一问聊起 <ChevronRight /></button></section>
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
