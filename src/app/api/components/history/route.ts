/**
 * ROUTING · app/api/components/history/route.ts — the URL  GET /api/components/history.
 *
 * Only wiring: the component rows (seed or runtime, when) and the latest changes.
 */
import { componentHistory } from "@/server/componentStore";

export async function GET() {
  return Response.json(await componentHistory());
}
