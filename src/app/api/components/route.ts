/**
 * ROUTING · app/api/components/route.ts — the URLs  GET/POST /api/components.
 *
 * Only wiring: list the composite components, or save one (add or replace).
 */
import { connection } from "next/server";
import { listComposites, saveComposite } from "@/server/componentStore";

export async function GET() {
  await connection(); // always read the database at request time, never prerender it
  return Response.json({ composites: await listComposites() });
}

export async function POST(req: Request) {
  const { problems } = await saveComposite(await req.json());
  if (problems.length) return Response.json({ problems }, { status: 400 });
  return Response.json({ composites: await listComposites() });
}
