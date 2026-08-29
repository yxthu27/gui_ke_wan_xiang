import { z } from "zod";
import { draftSchema, generatePlan } from "../../../lib/qijing-ai.server";

const planInputSchema = z.object({
  title: z.string(), summary: z.string(), tags: z.array(z.string()), warnings: z.array(z.string()),
  generatedBy: z.enum(["ai", "fallback"]),
  days: z.array(z.object({
    day: z.number(), theme: z.string(),
    items: z.array(z.object({
      id: z.string(), time: z.string(), title: z.string(), description: z.string(),
      durationMinutes: z.number(), location: z.string(), lockedWish: z.boolean().optional(),
    })),
  })),
});

const requestSchema = z.object({
  draft: draftSchema,
  currentPlan: planInputSchema,
  instruction: z.string().trim().min(1).max(1000),
});

export async function POST(request: Request) {
  try {
    const { draft, currentPlan, instruction } = requestSchema.parse(await request.json());
    return Response.json(await generatePlan(draft, currentPlan, instruction));
  } catch (error) {
    if (error instanceof z.ZodError) return Response.json({ error: "INVALID_REQUEST", issues: error.issues }, { status: 400 });
    return Response.json({ error: "PLAN_REFINEMENT_FAILED" }, { status: 500 });
  }
}
