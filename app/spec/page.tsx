"use client";

import { useMemo, useState } from "react";
import {
  AlertCircle, ArrowLeft, Backpack, Bus, Camera, Car, Check, ChevronLeft,
  ChevronRight, Clock3, Coffee, Compass, Footprints, Grid2X2, Home, Landmark,
  Leaf, LocateFixed, Lock, Map as MapIcon, MapPin, MessageCircle, Mic, Mountain, Navigation,
  Palette, Plane, Play, RotateCcw, Route, Save, Send, ShieldCheck,
  SlidersHorizontal, Sparkles, Train, UserRound, Utensils, X,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type ScreenId = "home" | "talk" | "invitation" | "wish" | "time" | "pace" |
  "travel" | "interest" | "boundary" | "crystal" | "unfold" | "itinerary" | "map" | "tune";

export type QijingScreenId = ScreenId;

type ScreenMeta = {
  id: ScreenId; phase: string; title: string; index: string; goal: string; states: string[]; dev: string;
};

const screens: ScreenMeta[] = [
  { id: "home", phase: "01 · 启程", title: "启境首页", index: "01", goal: "用品牌主视觉和自由表达进入阿境对话，六问全部在对话中完成。", states: ["无输入", "已有描述", "有最近行程"], dev: "两个入口都进入数字人对话；底部一级导航吸底并适配安全区。" },
  { id: "talk", phase: "02 · 对话", title: "阿境数字人 · 开场", index: "02", goal: "阿境先理解自由描述，再自然带入六个旅行问题。", states: ["正在说话", "等待回答", "信息完整", "服务降级"], dev: "键盘出现时舞台缩至 28vh；字幕、快捷回复、输入框始终在可视区。" },
  { id: "invitation", phase: "03 · 仪式", title: "收帖页", index: "03", goal: "用短促、可跳过的仪式建立“开境”心智。", states: ["请帖合起", "请帖展开"], dev: "动画 600–900ms；开启减少动态效果时只做透明度切换。" },
  { id: "wish", phase: "04 · 六问对话", title: "阿境对话 · 心愿", index: "04", goal: "阿境用自然问法聊出最多两个不可替代的愿望锚点。", states: ["阿境提问", "快捷回答", "心愿锁定"], dev: "人物持续可见；选项是辅助回复，始终保留“我自己说”。" },
  { id: "time", phase: "04 · 六问对话", title: "阿境对话 · 时间", index: "05", goal: "在对话中确认旅行时长、抵达与离开位置。", states: ["追问天数", "确认位置", "定位授权"], dev: "每次只追问一个信息；请求定位前由阿境解释用途。" },
  { id: "pace", phase: "04 · 六问对话", title: "阿境对话 · 步速", index: "06", goal: "阿境用场景化描述帮助用户说出舒服的旅行节奏。", states: ["慢慢来", "刚刚好", "尽兴一点"], dev: "点击快捷回答后形成用户气泡，再由阿境复述确认。" },
  { id: "travel", phase: "04 · 六问对话", title: "阿境对话 · 走法", index: "07", goal: "通过连续追问确认交通、住宿切换与最长转场。", states: ["交通追问", "住处追问", "冲突解释"], dev: "条件冲突由阿境说清原因，并给出可选调整，不跳出对话。" },
  { id: "interest", phase: "04 · 六问对话", title: "阿境对话 · 风物", index: "08", goal: "边聊边收集最多五个会让用户停留的兴趣。", states: ["阿境举例", "兴趣收集", "达到上限"], dev: "标签作为快捷表达；用户自由输入仍由语义模型归入兴趣。" },
  { id: "boundary", phase: "04 · 六问对话", title: "阿境对话 · 边界", index: "09", goal: "由阿境逐类询问饮食、同行与行程中不能代替决定的事项。", states: ["边界追问", "锁定复述", "六问完成"], dev: "最终由阿境完整复述所有锁定项，用户确认后进入客态结晶。" },
  { id: "crystal", phase: "05 · 确认", title: "客态结晶", index: "10", goal: "将六问结果压缩成一张可扫读、可回改的确认卡。", states: ["可生成", "条件冲突"], dev: "心愿与边界优先显示；冲突时禁用主按钮并给出修复入口。" },
  { id: "unfold", phase: "06 · 生成", title: "万象推演", index: "11", goal: "用可理解的步骤替代旋转 Loading，让等待具有确定感。", states: ["生成中", "本地接棒", "已完成"], dev: "进度来自真实任务阶段；异常时切换本地方案但保留已完成步骤。" },
  { id: "itinerary", phase: "07 · 结果", title: "行程手帖", index: "12", goal: "按天与时间轴解释安排，并突出被锁定的心愿。", states: ["AI 启境", "本地方案", "已保存"], dev: "多日内容分组折叠；底部操作栏预留 96px 滚动安全距离。" },
  { id: "map", phase: "07 · 结果", title: "路线显影", index: "13", goal: "在地图上展示地点顺序、路径关系与定位状态。", states: ["地图可用", "定位拒绝", "地图降级"], dev: "真实开发接地图 SDK；失败态必须保留文字行程入口。" },
  { id: "tune", phase: "08 · 微调", title: "微调这一程", index: "14", goal: "只暴露会影响路线的关键参数，并保护心愿与边界。", states: ["默认值", "修改后", "解锁确认"], dev: "推荐 bottom sheet；重新生成前显示本次变化摘要。" },
];

function TopBar({ title, action }: { title: string; action?: string }) {
  return <div className="mock-topbar"><button aria-label="返回" className="icon-button"><ArrowLeft /></button><strong>{title}</strong><button className="text-action">{action ?? ""}</button></div>;
}

function PrimaryButton({ children, icon }: { children: React.ReactNode; icon?: React.ReactNode }) {
  return <button className="primary-button">{icon}{children}<ChevronRight /></button>;
}

function BottomActions({ secondary = "上一步", primary = "下一步" }: { secondary?: string; primary?: string }) {
  return <div className="bottom-actions"><button className="secondary-button">{secondary}</button><button className="compact-primary">{primary}<ChevronRight /></button></div>;
}

function StepHeader({ step, name, title, note }: { step: number; name: string; title: string; note: string }) {
  return <><TopBar title="开境六问" action="退出" /><div className="step-line" aria-label={`第 ${step} 问，共 6 问`}>{[1,2,3,4,5,6].map(item => <i key={item} className={item <= step ? "done" : ""}>{item < step ? <Check /> : item}</i>)}</div><div className="question-heading"><p>第 {step} 问 · {name}</p><h2>{title}</h2><span>{note}</span></div></>;
}

function HomeScreen() {
  return <div className="phone-page home-screen">
    <header className="brand-bar"><div><span>GUIZHOU</span><strong>贵客万象</strong></div><button className="round-bag" aria-label="行囊"><Backpack /></button></header>
    <section className="hero-visual"><div className="hero-copy"><span className="eyebrow"><Sparkles />贵客未行 · 万象先启</span><h1>这一次，贵州<br />想怎么遇见你？</h1><p>先说一句想法，阿境会陪你把愿望慢慢说清。</p></div><div className="guide-wrap"><img src="/assets/ajing-guide.png" alt="阿境数字人形象" /><span className="guide-role">AI 在地向导</span><b>阿境 · 先听你说</b></div><div className="fortune-card"><small>今日万象签</small><strong>山路会绕一点，<br />好风景不会。</strong><button>换一句贵州的暗示 ↻</button></div></section>
    <section className="ask-card"><div className="ask-title"><div className="mini-avatar">境</div><div><strong>告诉阿境，你想怎样抵达贵州</strong><span>阿境会在聊天里把六个问题慢慢聊清</span></div><em>AI 规划</em></div><div className="text-box">第一次来贵州，想看瀑布和村寨，也想吃街边小店……<span>34 / 500</span></div><div className="quick-tags"><button>第一次来贵州</button><button>带父母慢慢走</button><button>非遗与烟火</button></div><PrimaryButton icon={<MessageCircle />}>带着这句话，和阿境聊聊</PrimaryButton><p className="micro-note"><ShieldCheck /> 对话中的心愿与边界会请你再次确认</p></section>
    <section className="six-entry"><div className="seal-icon">六</div><div><strong>开境六问 · 由阿境陪你聊出来</strong><p>不填问卷，在对话里聊心愿、时间、步速与边界</p></div><button>从第一问聊起 <ChevronRight /></button></section>
    <nav className="tabbar"><button className="active"><Compass /><span>启境</span></button><button><MapIcon /><span>随逛</span></button><button><UserRound /><span>个人</span></button><button><Grid2X2 /><span>广场</span></button></nav>
  </div>;
}

function TalkScreen() {
  return <div className="phone-page talk-screen"><TopBar title="与阿境聊聊" action="重新开始" /><div className="dialog-stage-label"><span></span>自由表达 · 阿境正在理解</div><section className="talk-stage"><img src="/assets/ajing-guide.png" alt="阿境数字人" /><div className="speaking-indicator"><i></i><i></i><i></i><span>阿境正在说</span></div><div className="subtitle-card"><small>阿境 · 开场</small><strong>我听见了：瀑布、村寨，还有街边小店。我们再聊六件事，就能把这一程慢慢拼出来。</strong><div><button><Play />再说一遍</button><button>我想补充</button></div></div></section><div className="recognized-row"><button><Mountain />瀑布</button><button><Home />村寨</button><button className="locked"><Utensils />街边小店</button></div><div className="reply-area"><p>不用填问卷，阿境会一次只问一件事</p><div><button>我还想补充</button><button className="selected">开始聊六问</button><button>先随便聊聊</button></div></div><div className="chat-composer"><button aria-label="语音"><Mic /></button><div>直接和阿境说你的想法……</div><button className="send" aria-label="发送"><Send /></button></div></div>;
}

function InvitationScreen() {
  return <div className="phone-page invitation-screen"><div className="invitation-bg"></div><header><button><ArrowLeft /></button><button>跳过</button></header><div className="invite-intro"><span>GUIZHOU · YOUR JOURNEY</span><h1>贵州已备好一纸山水</h1><p>请收下这张帖，再告诉我们你想怎样遇见它。</p></div><div className="invitation-card"><span className="invite-knot"></span><small>贵客亲启</small><h2>贵客到了</h2><i></i><p>山有回声，水有来信<br />万象等你，徐徐展开</p><div className="cinnabar-seal">万象</div><em>上滑 · 开帖</em></div><div className="invite-action"><PrimaryButton>收下这张帖</PrimaryButton><span>轻触或上滑打开 · 动画可随时跳过</span></div></div>;
}

const wishOptions: [string,string,React.ReactNode][] = [
  ["城市烟火","旧巷 · 夜市",<Landmark key="1" />],["山水大景","瀑布 · 峡谷",<Mountain key="2" />],["村寨慢游","吊脚楼 · 晨雾",<Home key="3" />],["非遗风物","银饰 · 蜡染",<Palette key="4" />],["去野一下","徒步 · 观星",<Footprints key="5" />],["贵州寻味","酸汤 · 小吃",<Utensils key="6" />]
];

const convoLabels = ["心愿", "时间", "步速", "走法", "风物", "边界"];

function ConvoQuestionShell({ step, name, question, helper, memory, children, complete = false }: {
  step: number; name: string; question: string; helper: string; memory: string[];
  children: React.ReactNode; complete?: boolean;
}) {
  return <div className={`phone-page convo-question-screen convo-step-${step}`}>
    <TopBar title="与阿境聊聊" action="暂存" />
    <div className="convo-progress"><div><span>开境六问</span><b>{step} / 6 · 正在聊{name}</b></div><div>{convoLabels.map((label, idx) => <i key={label} className={idx < step ? "done" : idx === step - 1 ? "current" : ""}>{idx < step - 1 ? <Check /> : idx + 1}<em>{label}</em></i>)}</div></div>
    <section className="convo-stage"><img src="/assets/ajing-guide.png" alt="阿境数字人" /><div className="convo-speaking"><i></i><i></i><i></i><span>阿境正在问</span></div><div className="convo-subtitle"><small>阿境 · {name}</small><strong>{question}</strong><p>{helper}</p><div><button><Play />再说一遍</button><button>换个问法</button></div></div></section>
    <div className="convo-memory"><span>阿境已经记住</span><div>{memory.map((item, idx) => <b key={item} className={idx === 0 ? "locked" : ""}>{idx === 0 ? <Lock /> : null}{item}</b>)}</div></div>
    <section className="convo-answer-panel"><div className="answer-lead"><span>可以点选，也可以直接告诉阿境</span><button>我自己说</button></div>{children}</section>
    {complete ? <div className="convo-complete"><Sparkles /><div><strong>六问都聊清楚了</strong><span>阿境会先把记住的内容复述给你确认。</span></div><button>看看阿境记住了什么</button></div> : null}
    <div className="convo-composer"><button aria-label="语音"><Mic /></button><div>直接和阿境说你的想法……</div><button className="send" aria-label="发送"><Send /></button></div>
  </div>;
}

function WishScreen() {
  return <ConvoQuestionShell step={1} name="心愿" question="这一程，有没有哪一处是你无论如何都想遇见的？" helper="不一定是景点，也可以是一种画面或感受。最多锁定两个。" memory={["第一次来贵州"]}>
    <div className="answer-wish-grid">{wishOptions.map(([title, note, icon], idx) => <button key={title} className={idx === 1 || idx === 3 ? "selected" : ""}>{icon}<span><strong>{title}</strong><small>{note}</small></span>{idx === 1 || idx === 3 ? <Lock /> : null}</button>)}</div>
  </ConvoQuestionShell>;
}

function TimeScreen() {
  return <ConvoQuestionShell step={2} name="时间" question="四天左右对吗？你会从哪里来，又准备从哪里离开？" helper="我先把能走多远算准，才不会把贵州塞得太满。" memory={["黄果树瀑布", "非遗风物"]}>
    <div className="answer-duration"><div><span>预计停留</span><strong>4 <small>天 3 晚</small></strong></div><div>{["半天", "1 天", "2–3 天", "4 天", "5–7 天"].map((x, i) => <button key={x} className={i === 3 ? "active" : ""}>{x}</button>)}</div></div>
    <div className="answer-locations"><button><Train /><span><small>从这里开始</small><strong>贵阳北站</strong></span><em>修改</em></button><button><Plane /><span><small>从这里离开</small><strong>贵阳机场</strong></span><em>修改</em></button></div>
  </ConvoQuestionShell>;
}

function PaceScreen() {
  const cards = [["缓", "慢慢来", "一天 1–2 处"], ["衡", "刚刚好", "一天 2–3 处"], ["盛", "尽兴一点", "一天 3–4 处"]];
  return <ConvoQuestionShell step={3} name="步速" question="想慢慢走，还是想把喜欢的风景多装一些回去？" helper="我会用这个答案决定每天安排多少站、几点出发。" memory={["黄果树瀑布", "4 天 3 晚", "贵阳北站"]}>
    <div className="answer-pace">{cards.map(([mark, title, note], idx) => <button key={title} className={idx === 1 ? "selected" : ""}><i>{mark}</i><span><strong>{title}</strong><small>{note}</small></span>{idx === 1 ? <Check /> : null}</button>)}</div>
    <div className="ajing-confirm"><Leaf /><span>听起来你想“刚刚好”——重点不漏，也给街巷留一点空白。</span><button>就是这样</button></div>
  </ConvoQuestionShell>;
}

function TravelScreen() {
  return <ConvoQuestionShell step={4} name="走法" question="贵州的路会绕一些。你更习惯怎么走，能接受中途换住处吗？" helper="如果条件冲突，我会在这里和你商量，不会擅自改。" memory={["黄果树瀑布", "4 天 3 晚", "刚刚好"]}>
    <div className="answer-modes"><button className="selected"><Train />高铁 + 打车<Check /></button><button><Car />自驾</button><button className="selected"><Bus />包车 / 拼车<Check /></button><button><Footprints />公共交通</button></div>
    <div className="answer-travel-settings"><div><span>换住处</span><button>可以</button><button className="active"><Lock />不换酒店</button></div><div><span>最长转场</span>{[30, 60, 120].map(x => <button key={x} className={x === 60 ? "active" : ""}>{x} 分</button>)}</div></div>
    <div className="convo-warning"><AlertCircle /><span><strong>阿境想和你商量一下</strong>不换酒店且转场 60 分钟，西江会有些勉强。</span><button>听听建议</button></div>
  </ConvoQuestionShell>;
}

function InterestScreen() {
  const tags = ["非遗手作", "地方小吃", "山水观景", "摄影", "村寨", "徒步", "夜生活", "市集", "茶园", "咖啡"];
  const selected = ["非遗手作", "地方小吃", "摄影", "村寨"];
  return <ConvoQuestionShell step={5} name="风物" question="除了必去的地方，看到什么会让你忍不住多停一会？" helper="可以多说几个，我最多替你记住五样。" memory={["黄果树瀑布", "刚刚好", "不换酒店"]}>
    <div className="answer-collected"><span>这一程已经收下</span><div>{selected.map(x => <b key={x}>{x}<X /></b>)}<em>4 / 5</em></div></div>
    <div className="answer-tags">{tags.map(x => <button key={x} className={selected.includes(x) ? "selected" : ""}>{selected.includes(x) ? <Check /> : <span>＋</span>}{x}</button>)}</div>
  </ConvoQuestionShell>;
}

function BoundaryScreen() {
  return <ConvoQuestionShell step={6} name="边界" question="最后再确认：哪些事是我绝对不能替你决定的？" helper="比如饮食、同行人、早起和台阶。你说过的，我都会锁住。" memory={["黄果树瀑布", "4 天 3 晚", "非遗与村寨", "不换酒店"]} complete>
    <div className="answer-boundaries"><section><span>同行与体力</span><div><button className="selected"><Lock />带长辈</button><button>带儿童</button><button className="selected"><Lock />少走长台阶</button></div></section><section><span>体验与时间</span><div><button className="selected"><Lock />不赶早</button><button className="selected"><Lock />避开人挤人</button><button>不走夜路</button></div></section></div>
    <div className="boundary-echo"><ShieldCheck /><span>我记住了：带长辈、不赶早、少走长台阶，也尽量避开拥挤。</span><button>确认锁定</button></div>
  </ConvoQuestionShell>;
}

function CrystalScreen() {
  return <div className="phone-page crystal-screen"><TopBar title="客态结晶" action="修改" /><div className="crystal-intro"><span>六问已成 · 万象将启</span><h1>阿境记住了<br />这一程的你</h1><p>确认之后，我们只调整时间与走法，不改掉真正重要的地方。</p></div><div className="crystal-paper"><div className="paper-head"><div><small>TRAVEL PORTRAIT</small><strong>这一程的你</strong></div><span>贵客</span></div><div className="persona-tags"><b>非遗手作</b><b>村寨慢游</b><b>地方小吃</b></div><dl><div><dt><Clock3/>时间</dt><dd>4 天 3 晚</dd></div><div><dt><Leaf/>步速</dt><dd>刚刚好</dd></div><div><dt><Home/>住处</dt><dd>不换酒店</dd></div><div><dt><Route/>转场</dt><dd>最长 60 分钟</dd></div></dl><section><span>心愿锚点</span><p><Lock/>黄果树瀑布</p><p><Lock/>非遗风物</p></section><section className="red"><span>旅途边界</span><p><Lock/>带长辈 · 不赶早 · 避开人挤人</p><p><Lock/>尽量减少长距离台阶</p></section><em>癸卯 · 黔中启程</em></div><div className="crystal-note"><ShieldCheck/>我们不会改掉你真正想去的地方，只替你选择更舒服的时间和走法。</div><div className="single-bottom"><PrimaryButton icon={<Sparkles />}>为我开境</PrimaryButton></div></div>;
}

function UnfoldScreen() {
  const steps=["读懂你的心愿与边界","匹配贵州的山水与风物","计算更舒服的抵达顺序","避开拥挤与过长转场","写成属于你的行程手帖"];
  return <div className="phone-page unfold-screen"><div className="unfold-bg"></div><button className="unfold-back"><ArrowLeft/></button><div className="unfold-heading"><span>GUIZHOU IS UNFOLDING</span><h1>万象<br/>推演中</h1><p>阿境正在把四天的贵州，折成一条更从容的线。</p></div><div className="progress-orbit"><span>68<small>%</small></span><i></i><i></i></div><div className="unfold-steps">{steps.map((step,idx)=><div key={step} className={idx<3?"done":idx===3?"current":""}><i>{idx<3?<Check/>:idx+1}</i><span>{step}</span>{idx===3?<em>正在推演</em>:null}</div>)}</div><div className="unfold-bottom"><button>返回检查</button><span>通常需要 15–30 秒，请不要关闭页面</span></div></div>;
}

function ResultHeader({ active }: { active:"notes"|"map" }) {
  return <><TopBar title="我的这一程" action="编辑"/><section className="result-summary"><div className="result-status"><Sparkles/>AI 启境 <span>刚刚生成</span></div><h1>四日黔行 · 山水与手艺之间</h1><p>从贵阳的街巷出发，看瀑布，也在村寨里把脚步慢下来。</p><div><span>4 天 3 晚</span><span>刚刚好</span><span>带长辈</span></div></section><div className="guizhou-letter"><small>贵州的回信</small><p>“没有把每一处都塞进来，是想替你留住一段真正看得见山雾的上午。”</p><span>慢游 · 手艺 · 烟火</span><i>万象</i></div><div className="view-toggle"><button className={active==="notes"?"active":""}><Landmark/>行程手帖</button><button className={active==="map"?"active":""}><MapIcon/>路线显影</button></div></>;
}

function ItineraryScreen() {
  const items=[["09:40","01","贵阳北站 · 抵达","从容接站，先到酒店放下行李","40 min"],["11:30","02","青云市集 · 午味","从一碗酸汤开始认识贵州","90 min"],["14:20","03","贵州省博物馆","从山地文明读懂接下来的村寨","120 min"],["18:40","04","甲秀楼 · 南明河","避开白天人流，看灯影落进河里","70 min"]];
  return <div className="phone-page result-screen itinerary-screen"><ResultHeader active="notes"/><section className="day-section"><div className="day-heading"><div><small>DAY 1 · 09/18</small><h2>先从贵阳的烟火里落脚</h2></div><span>松弛抵达</span></div><div className="timeline">{items.map(([time,no,title,desc,duration],idx)=><article key={no}><time>{time}</time><i>{no}</i><div><h3>{title}</h3><p>{desc}</p><span><Clock3/>{duration}{idx===2?<b><Lock/>心愿已锁定</b>:null}</span></div></article>)}</div></section><button className="next-day"><span><small>DAY 2</small><strong>黄果树 · 把一天交给水声</strong></span><ChevronRight/></button><div className="result-actions"><button><SlidersHorizontal/>微调</button><button><Save/>收下这一程</button></div></div>;
}

function MapScreen() {
  return <div className="phone-page result-screen map-screen"><ResultHeader active="map"/><div className="map-toolbar"><div><strong>DAY 1 · 贵阳</strong><span>4 个地点 · 约 18.6 km</span></div><button><LocateFixed/>定位我</button></div><div className="map-canvas"><div className="map-route"></div><span className="marker m1">1</span><span className="marker m2">2</span><span className="marker m3">3</span><span className="marker m4">4</span><div className="map-place p1">贵阳北站</div><div className="map-place p2">青云市集</div><div className="map-place p3">省博物馆</div><div className="map-place p4">甲秀楼</div><button className="map-control">＋<span></span>−</button><div className="map-scale">2 km</div></div><div className="route-sequence"><span>01</span><i></i><span>02</span><i></i><span>03</span><i></i><span>04</span><p>北站 → 青云市集 → 省博物馆 → 甲秀楼</p></div><p className="map-privacy"><ShieldCheck/>定位仅在本页使用；拒绝定位也能完整查看行程路线。</p><div className="result-actions"><button><SlidersHorizontal/>微调</button><button><Save/>收下这一程</button></div></div>;
}

function TuneScreen() {
  return <div className="phone-page tune-screen"><div className="dimmed-itinerary"><ResultHeader active="notes"/></div><div className="sheet-handle"></div><section className="tune-sheet"><header><div><small>FINE TUNE</small><h1>微调这一程</h1><p>只改走法，不动你锁定的心愿。</p></div><button aria-label="关闭"><X/></button></header><div className="tune-row"><div><Leaf/><span><small>当前节奏</small><strong>刚刚好</strong></span></div><div className="mini-segment"><button>慢</button><button className="active">衡</button><button>盛</button></div></div><div className="tune-row"><div><Clock3/><span><small>最长转场</small><strong>60 分钟</strong></span></div><div className="range-line"><i></i><b></b></div></div><div className="tune-row"><div><Home/><span><small>更换住处</small><strong>不换酒店</strong></span></div><button className="switch"><i></i></button></div><section className="protected"><div><span>已保护内容</span><ShieldCheck/></div><p><Lock/>黄果树瀑布 · 非遗风物</p><p><Lock/>带长辈 · 不赶早 · 少走长台阶</p></section><label className="tune-input"><span>再告诉阿境一句</span><div>第二天晚上想吃一顿安静的酸汤鱼。</div></label><div className="change-summary"><Sparkles/><span><strong>本次会变化</strong>第 2 天晚餐与前后路程会重新安排，其他心愿保持不变。</span></div><div className="sheet-actions"><button>取消</button><button><RotateCcw/>重新开境</button></div></section></div>;
}

const screenComponents: Record<ScreenId, React.ComponentType> = { home:HomeScreen, talk:TalkScreen, invitation:InvitationScreen, wish:WishScreen, time:TimeScreen, pace:PaceScreen, travel:TravelScreen, interest:InterestScreen, boundary:BoundaryScreen, crystal:CrystalScreen, unfold:UnfoldScreen, itinerary:ItineraryScreen, map:MapScreen, tune:TuneScreen };

export function QijingProductScreen({ screenId }: { screenId: QijingScreenId }) {
  const Screen = screenComponents[screenId];
  return <div className={`phone-viewport screen-${screenId}`}><Screen /></div>;
}

function PhoneFrame({ screenId, miniature=false }: { screenId:ScreenId; miniature?:boolean }) {
  const Screen=screenComponents[screenId];
  return <div className={miniature?"miniature-shell":"phone-shell"}><div className="phone-hardware"><span className="phone-speaker"></span><span className="phone-camera"></span></div><div className="phone-status"><span>9:41</span><div><i></i><i></i><i></i><b></b></div></div><div className={`phone-viewport screen-${screenId}`}><Screen/></div><div className="home-indicator"></div></div>;
}

function SpecPanel() {
  return <div className="spec-page">
    <section className="spec-hero"><span>DESIGN SYSTEM · V1.3</span><h2>黔山入纸，万象由对话而启</h2><p>以宣纸的温度承载 AI 的理性，用雾境和等高线建立贵州识别度。六问不是独立问卷，而是由阿境在连续对话中逐步聊出。</p></section>
    <section className="token-grid">
      <article><span>色彩</span><div className="swatches"><i style={{background:"#F3EEDF"}}><b>宣纸</b></i><i style={{background:"#173C34"}}><b>黔山</b></i><i style={{background:"#A8C3BD"}}><b>雾青</b></i><i style={{background:"#B64A3A"}}><b>朱砂</b></i><i style={{background:"#1D2925"}}><b>浓墨</b></i></div></article>
      <article><span>字体层级</span><div className="type-samples"><h3>贵州想怎么遇见你？</h3><h4>这一程的你</h4><p>正文用于说明、状态与可操作提示。</p><small>GUIZHOU · 12 / 16 · 0.18EM</small></div></article>
      <article><span>圆角与间距</span><div className="radius-samples"><i>12</i><i>18</i><i>24</i><i>32</i></div><p className="spacing-rule">4px 基础网格 · 页面边距 20px · 卡片间距 12–16px</p></article>
      <article><span>语义组件</span><div className="semantic-samples"><button className="s-primary">主要操作</button><button className="s-secondary">次要操作</button><button className="s-locked"><Lock/>锁定项</button><button className="s-tag">快捷回答</button></div></article>
    </section>
    <section className="implementation-table"><header><div><span>开发基线</span><h3>交互与适配规则</h3></div><b>H5 · 320–480 px</b></header><div className="table-row"><span>六问对话</span><p>阿境始终在场；每次只问一件事，快捷选项与自由输入并存，回答后形成用户气泡。</p></div><div className="table-row"><span>米色主背景</span><p>宣纸色作为组件背后的整页底层；水墨山影、水纹与纹样只在边缘低对比度显影，中央保持干净。</p></div><div className="table-row"><span>触控</span><p>主要按钮 ≥ 44px，卡片整块可点；所有图标按钮提供 aria-label。</p></div><div className="table-row"><span>固定区域</span><p>底部输入区适配 env(safe-area-inset-bottom)，回答内容预留 96px。</p></div><div className="table-row"><span>键盘</span><p>输入框聚焦后自动滚入视口；数字人舞台缩小但不消失。</p></div><div className="table-row"><span>动效</span><p>人物呼吸与字幕反馈 160–600ms；prefers-reduced-motion 下关闭位移。</p></div><div className="table-row"><span>错误</span><p>AI 异常时才降级为结构化问答，并明确提示仍可继续完成六问。</p></div></section>
  </div>;
}

export default function HomePage() {
  const [selected,setSelected]=useState<ScreenId>("home"); const [view,setView]=useState("preview");
  const currentIndex=screens.findIndex(screen=>screen.id===selected), current=screens[currentIndex];
  const grouped=useMemo(()=>{const map=new Map<string,ScreenMeta[]>(); screens.forEach(screen=>map.set(screen.phase,[...(map.get(screen.phase)??[]),screen])); return [...map.entries()]},[]);
  const move=(delta:number)=>setSelected(screens[(currentIndex+delta+screens.length)%screens.length].id);
  return <main className="design-site"><header className="site-header"><div className="site-brand"><span className="brand-mark">境</span><div><small>GUIZHOU WANXIANG</small><strong>启境 · UI 开发示意</strong></div></div><div className="site-version"><span>Tab 01</span><b>V1.3</b></div></header><Tabs value={view} onValueChange={setView} className="workspace-tabs"><div className="workspace-toolbar"><TabsList className="view-tabs"><TabsTrigger value="preview">单屏预览</TabsTrigger><TabsTrigger value="board">全流程画板</TabsTrigger><TabsTrigger value="spec">开发规范</TabsTrigger></TabsList><p>基准画布 390 × 844 · H5 竖屏</p></div><TabsContent value="preview" className="preview-layout"><aside className="screen-nav"><div className="nav-heading"><span>页面目录</span><b>14 SCREENS</b></div><div className="nav-scroll">{grouped.map(([phase,items])=><section key={phase}><p>{phase}</p>{items.map(screen=><button key={screen.id} className={selected===screen.id?"active":""} onClick={()=>setSelected(screen.id)}><i>{screen.index}</i><span>{screen.title}</span><ChevronRight/></button>)}</section>)}</div></aside><section className="device-column"><div className="screen-caption"><button onClick={()=>move(-1)} aria-label="上一页"><ChevronLeft/></button><div><span>{current.phase}</span><h1>{current.title}</h1></div><button onClick={()=>move(1)} aria-label="下一页"><ChevronRight/></button></div><PhoneFrame screenId={selected}/><div className="page-dots">{screens.map(screen=><button key={screen.id} aria-label={screen.title} onClick={()=>setSelected(screen.id)} className={screen.id===selected?"active":""}></button>)}</div></section><aside className="handoff-panel"><div className="panel-index">{current.index}<span>/ 14</span></div><span className="panel-kicker">SCREEN INTENT</span><h2>{current.title}</h2><p>{current.goal}</p><section><span>关键状态</span><div>{current.states.map(state=><b key={state}>{state}</b>)}</div></section><section><span>开发提示</span><p>{current.dev}</p></section><section className="viewport-note"><Navigation/><div><strong>适配尺寸</strong><span>360×800 · 390×844 · 430×932</span></div></section></aside></TabsContent><TabsContent value="board" className="board-view"><div className="board-heading"><span>USER FLOW BOARD · CONVERSATIONAL SIX QUESTIONS</span><h1>六问由阿境陪你聊出来</h1><p>从一句自由表达开始，在连续对话中形成一程贵州。点击任意画面进入 1:1 预览。</p></div><div className="screen-board">{screens.map(screen=><button key={screen.id} onClick={()=>{setSelected(screen.id);setView("preview")}}><div className="miniature-window"><PhoneFrame screenId={screen.id} miniature/></div><span>{screen.index} · {screen.phase}</span><strong>{screen.title}</strong></button>)}</div></TabsContent><TabsContent value="spec"><SpecPanel/></TabsContent></Tabs><footer className="site-footer"><span>贵客万象 · Tab 01「启境」</span><p>高保真示意稿 V1.3 · 米色水墨主背景</p></footer></main>;
}
