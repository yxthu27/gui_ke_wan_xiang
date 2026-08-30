export type GuikeState = {
  schemaVersion: 3;
  revision: number;
  updatedAt: string;
  lastSection: string;
  draft: unknown | null;
  activePlan: Record<string, unknown> | null;
  favoritePlaces: Array<Record<string, unknown>>;
  savedJourneys: Array<Record<string, unknown>>;
  wanxiangItems: Array<Record<string, unknown>>;
  publishedJourneys: Array<Record<string, unknown>>;
  initialized: { wanxiang: boolean };
  stroll: { extraPois: Array<Record<string, unknown>>; visitedPoiIds: string[] };
};

export type GuikeRepository = {
  STORAGE_KEY: string;
  read: () => GuikeState;
  savePlan: (plan: unknown) => GuikeState;
  addPlaceToActivePlan: (place: unknown, targetDate?: string) => GuikeState;
  saveDraft: (draft: unknown) => GuikeState;
  setStroll: (stroll: Partial<GuikeState["stroll"]>) => GuikeState;
  subscribe: (handler: (state: GuikeState, section: string) => void) => () => void;
};

declare global {
  interface Window { GuikeRepository?: GuikeRepository }
}

export function getGuikeRepository() {
  return typeof window === "undefined" ? undefined : window.GuikeRepository;
}
