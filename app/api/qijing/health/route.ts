import { providerStatus } from "../../../lib/qijing-ai.server";

export async function GET() {
  const provider = providerStatus();
  return Response.json({
    status: provider.configured ? "configured" : "degraded",
    configured: provider.configured,
    providerVerified: false,
    mode: provider.configured ? "ai-enabled" : "fallback",
    model: provider.model,
    checkedAt: new Date().toISOString(),
  }, {
    headers: { "Cache-Control": "no-store" },
  });
}
