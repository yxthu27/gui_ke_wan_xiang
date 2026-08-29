import { z } from "zod";
import { draftSchema, generatePlan } from "../../../lib/qijing-ai.server";

const requestSchema = z.object({ draft: draftSchema });

export async function POST(request: Request) {
  try {
    const { draft } = requestSchema.parse(await request.json());
    return Response.json(await generatePlan(draft));
  } catch (error) {
    if (error instanceof z.ZodError) return Response.json({ error: "INVALID_REQUEST", issues: error.issues }, { status: 400 });
    return Response.json({ error: "PLAN_GENERATION_FAILED" }, { status: 500 });
  }
}
