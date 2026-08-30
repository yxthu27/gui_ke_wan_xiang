import type { QijingDraft, QijingPlan, QijingPlanDay, QijingPlanItem } from "./qijing-ai-types";

export const exactDayOptions = ["半天", "1 天", "2 天", "3 天", "4 天", "5 天", "6 天", "7 天"] as const;

const wishRules: Record<string, RegExp> = {
  城市烟火: /老街|夜市|市集|甲秀楼|城市|烟火/,
  山水大景: /瀑布|峡谷|黄果树|坝陵河|山水/,
  村寨慢游: /村寨|苗寨|侗寨|吊脚楼|田埂/,
  非遗风物: /非遗|蜡染|银饰|苗绣|手作|博物馆/,
  去野一下: /徒步|步道|露营|观星|山野|日落/,
  贵州寻味: /美食|午餐|酸汤|小吃|市集|家常|手信|贵州味/,
};

const boundaryRules: Record<string, RegExp> = {
  带长辈: /父母|老人|长辈/,
  带儿童: /孩子|儿童|小朋友/,
  少走长台阶: /少走|台阶|腿脚|体力/,
  不赶早: /不想赶早|不赶早|别太早|睡懒觉/,
  避开人挤人: /避开人|不拥挤|人少/,
  不走夜路: /不走夜路|天黑前/,
};

const wishTextRules: Array<[RegExp, string]> = [
  [/夜市|老街|城市|烟火/, "城市烟火"],
  [/瀑布|峡谷|山水|黄果树/, "山水大景"],
  [/村寨|苗寨|侗寨|西江/, "村寨慢游"],
  [/非遗|蜡染|银饰|手作/, "非遗风物"],
  [/徒步|露营|观星|户外/, "去野一下"],
  [/美食|酸汤|小吃|吃/, "贵州寻味"],
];

function unique<T>(values: T[]) {
  return [...new Set(values)];
}

export function parseDayCount(days: string) {
  if (days === "半天") return 1;
  const values = days.match(/\d+/g)?.map(Number) ?? [1];
  // Legacy ranges are migrated conservatively to their lower bound instead of
  // silently expanding the trip to the maximum number of days.
  return Math.min(7, Math.max(1, values[0] ?? 1));
}

export function normalizeDayLabel(days: string) {
  return days === "半天" ? days : `${parseDayCount(days)} 天`;
}

export function interpretSupplement(text: string): Partial<QijingDraft> {
  const patch: Partial<QijingDraft> = {};
  const wishes = wishTextRules.filter(([pattern]) => pattern.test(text)).map(([, value]) => value);
  if (wishes.length) {
    patch.wishes = unique(wishes).slice(0, 2);
    patch.wishesTouched = true;
  }
  const dayMatch = text.match(/(\d+)\s*天/);
  if (dayMatch) patch.days = `${Math.min(7, Math.max(1, Number(dayMatch[1])))} 天`;
  if (/慢慢|松弛|不赶/.test(text)) patch.pace = "慢慢来";
  if (/尽兴|多去|多玩/.test(text)) patch.pace = "尽兴一点";
  const boundaries = Object.entries(boundaryRules).filter(([, pattern]) => pattern.test(text)).map(([value]) => value);
  if (boundaries.length) patch.boundaries = boundaries;
  return patch;
}

export function applySupplement(draft: QijingDraft, screenId: string, text: string, patch = interpretSupplement(text)): QijingDraft {
  const nextWishes = patch.wishes ? unique([...draft.wishes, ...patch.wishes]).slice(0, 2) : draft.wishes;
  const nextInterests = patch.interests ? unique([...draft.interests, ...patch.interests]).slice(0, 5) : draft.interests;
  const nextBoundaries = patch.boundaries ? unique([...draft.boundaries, ...patch.boundaries]).slice(0, 8) : draft.boundaries;
  return {
    ...draft,
    ...patch,
    wishes: nextWishes,
    interests: nextInterests,
    boundaries: nextBoundaries,
    supplements: [...(draft.supplements ?? []), { screenId, text, createdAt: new Date().toISOString() }].slice(-20),
    note: "",
  };
}

export function wishRefsForItem(wishes: string[], item: Pick<QijingPlanItem, "title" | "description" | "location">) {
  const text = `${item.title} ${item.description} ${item.location}`;
  return wishes.filter((wish) => wishRules[wish]?.test(text));
}

type StopTemplate = [location: string, description: string, time: string, durationMinutes: number];
type DayTemplate = { theme: string; stops: StopTemplate[] };

function activityTemplates(): DayTemplate[] {
  return [
    { theme: "先从贵阳的烟火里落脚", stops: [["青云市集", "从一顿贵州午味开始", "11:30", 90], ["贵州省博物馆", "从山地文明读懂村寨与手艺", "14:20", 120], ["甲秀楼", "在南明河边慢慢收尾", "18:20", 70]] },
    { theme: "把一整天留给山水大景", stops: [["黄果树瀑布", "错开首波人流靠近瀑布", "09:30", 150], ["关岭", "留足午餐与休息时间", "12:30", 80], ["坝陵河", "用轻松远眺替代连续爬坡", "15:00", 70]] },
    { theme: "在石巷与手艺之间慢下来", stops: [["青岩古镇", "从安静的背街进入", "09:50", 120], ["非遗工坊", "留一段完整时间体验手作", "13:40", 150], ["城墙茶铺", "在天色变柔前休息", "17:10", 70]] },
    { theme: "把村寨的清晨留给自己", stops: [["黔东南村寨", "在人流前看晨雾与吊脚楼", "09:30", 150], ["寨中家常菜", "就近午餐减少转场", "12:30", 90], ["田埂慢行", "为拍照和停留留足时间", "15:10", 100]] },
    { theme: "去野，但不催促脚步", stops: [["贵阳近郊步道", "按体力选择轻量短线", "09:30", 140], ["山边午餐", "给下午留恢复时间", "12:40", 90], ["山地日落", "天黑前返回，不走夜路", "16:30", 80]] },
    { theme: "在城市里留一日余白", stops: [["黔灵山脚", "不赶早地散一小段步", "10:00", 90], ["贵阳老街", "补上一顿喜欢的贵州味", "12:30", 90], ["自由停留", "把下午留给临时遇见的风景", "15:00", 120]] },
    { theme: "最后一天只做真正喜欢的事", stops: [["自由回访", "回到最喜欢的一处", "10:00", 120], ["贵州手信", "顺路挑一份不绕远的纪念", "13:30", 80]] },
  ];
}

function itemFromStop(stop: StopTemplate, day: number, index: number, draft: QijingDraft): QijingPlanItem {
  const [location, description, time, durationMinutes] = stop;
  const item: QijingPlanItem = { id: `local-${day}-${index + 1}`, time, title: location, description, durationMinutes, location };
  const wishRefs = wishRefsForItem(draft.wishes, item);
  return { ...item, wishRefs, lockedWish: wishRefs.length > 0 };
}

export function createFallbackPlan(draft: QijingDraft): QijingPlan {
  const dayCount = parseDayCount(draft.days);
  const normalizedDays = normalizeDayLabel(draft.days);
  const days: QijingPlanDay[] = activityTemplates().slice(0, dayCount).map((template, index) => ({
    day: index + 1,
    theme: template.theme,
    items: template.stops.map((stop, itemIndex) => itemFromStop(stop, index + 1, itemIndex, draft)),
  }));
  const arrival: QijingPlanItem = {
    id: "local-arrival", time: "09:40", title: `${draft.arrival} · 抵达`, description: "从容抵达，先放下行李", durationMinutes: 40, location: draft.arrival, wishRefs: [], lockedWish: false,
  };
  const departure: QijingPlanItem = {
    id: "local-departure", time: "16:30", title: `${draft.departure} · 离开`, description: "预留充足交通时间，从容结束这一程", durationMinutes: 60, location: draft.departure, wishRefs: [], lockedWish: false,
  };
  days[0].items.unshift(arrival);
  days.at(-1)?.items.push(departure);
  return {
    title: `${normalizedDays}黔行 · ${draft.wishes[0] || "山水与烟火"}之间`,
    summary: `从${draft.arrival}出发，以“${draft.pace || "舒适"}”的节奏完成这一程。`,
    tags: [normalizedDays, draft.pace || "舒适节奏", draft.boundaries[0] || "自在同行"],
    days,
    warnings: draft.days.includes("–") ? [`原选择“${draft.days}”已按 ${normalizedDays} 生成，可返回修改准确天数。`] : [],
    generatedBy: "fallback",
  };
}

function chineseDayNumber(value: string) {
  const map: Record<string, number> = { 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7 };
  return map[value] ?? Number(value);
}

export type LocalRefineResult = {
  plan: QijingPlan;
  appliedChanges: string[];
  unhandledInstruction?: string;
  protectedConflict?: string;
};

export function refineFallbackPlan(currentPlan: QijingPlan, draft: QijingDraft, instruction: string): LocalRefineResult {
  const rebuilt = createFallbackPlan(draft);
  const normalizedInstruction = instruction.trim();
  if (!normalizedInstruction) return { plan: rebuilt, appliedChanges: ["已按新的节奏与走法重新安排基础方案"] };
  const workingPlan = JSON.parse(JSON.stringify(currentPlan)) as QijingPlan;
  const dayMatch = normalizedInstruction.match(/第\s*([一二三四五六七1-7])\s*天/);
  const dayNumber = dayMatch ? chineseDayNumber(dayMatch[1]) : undefined;
  const actionIsRemove = /删除|移除|去掉|不要/.test(normalizedInstruction);
  if (actionIsRemove && dayNumber) {
    const day = workingPlan.days.find((entry) => entry.day === dayNumber);
    const candidate = day?.items.find((item) => normalizedInstruction.includes(item.location) || normalizedInstruction.includes(item.title.replace(/\s*·.*$/, "")));
    if (candidate?.lockedWish) {
      return { plan: currentPlan, appliedChanges: [], protectedConflict: `“${candidate.title}”对应已锁定心愿，未执行删除。` };
    }
    if (day && candidate) {
      day.items = day.items.filter((item) => item.id !== candidate.id);
      return { plan: { ...workingPlan, generatedBy: "fallback" }, appliedChanges: [`已从第 ${dayNumber} 天移除“${candidate.title}”`] };
    }
  }
  return { plan: currentPlan, appliedChanges: [], unhandledInstruction: normalizedInstruction };
}

export function routeStops(day?: QijingPlanDay) {
  return (day?.items ?? []).filter((item) => item.location.trim()).map((item, index) => ({ id: item.id, order: index + 1, label: item.location }));
}
