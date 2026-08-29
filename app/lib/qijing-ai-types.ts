export type QijingDraft = {
  wishes: string[];
  wishesTouched: boolean;
  days: string;
  arrival: string;
  departure: string;
  pace: string;
  travelModes: string[];
  changeHotel: boolean;
  maxTransfer: number;
  interests: string[];
  boundaries: string[];
  note: string;
};

export type QijingPlanItem = {
  id: string;
  time: string;
  title: string;
  description: string;
  durationMinutes: number;
  location: string;
  lockedWish?: boolean;
};

export type QijingPlanDay = {
  day: number;
  theme: string;
  items: QijingPlanItem[];
};

export type QijingPlan = {
  title: string;
  summary: string;
  tags: string[];
  days: QijingPlanDay[];
  warnings: string[];
  generatedBy: "ai" | "fallback";
};

export type QijingChatResponse = {
  assistantText: string;
  draftPatch: Partial<QijingDraft>;
  source: "ai" | "fallback";
};
