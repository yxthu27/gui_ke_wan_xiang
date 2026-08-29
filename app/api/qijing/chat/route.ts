import { z } from "zod";
import { chatWithAjing, draftSchema } from "../../../lib/qijing-ai.server";

const requestSchema = z.object({
  screenId: z.enum(["talk", "wish", "time", "pace", "travel", "interest", "boundary"]),
  userText: z.string().trim().min(1).max(1000),
  draft: draftSchema,
});

export async function POST(request: Request) {
  try {
    const input = requestSchema.parse(await request.json());
    return Response.json(await chatWithAjing(input.screenId, input.userText, input.draft));
  } catch (error) {
    if (error instanceof z.ZodError) return Response.json({ error: "INVALID_REQUEST", issues: error.issues }, { status: 400 });
    return Response.json({ error: "AI_CHAT_FAILED" }, { status: 500 });
  }
}
