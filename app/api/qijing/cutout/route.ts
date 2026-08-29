import { z } from "zod";
import { createStepFunCutoutPlate } from "../../../lib/qijing-cutout.server";

const requestSchema = z.object({
  image: z.string().min(32).max(15_000_000),
  subject: z.string().trim().max(80).optional(),
});

export async function POST(request: Request) {
  try {
    const { image, subject } = requestSchema.parse(await request.json());
    return Response.json(await createStepFunCutoutPlate(image, subject));
  } catch (error) {
    if (error instanceof z.ZodError) return Response.json({ error: "INVALID_REQUEST" }, { status: 400 });
    const code = error instanceof Error ? error.message : "CUTOUT_FAILED";
    if (code === "AI_NOT_CONFIGURED") return Response.json({ error: code }, { status: 503 });
    if (code === "INVALID_IMAGE_DATA_URI" || code === "IMAGE_SIZE_OUT_OF_RANGE") {
      return Response.json({ error: code }, { status: 400 });
    }
    console.warn(`[qijing-cutout] ${code}`);
    return Response.json({ error: "CUTOUT_FAILED" }, { status: 502 });
  }
}
