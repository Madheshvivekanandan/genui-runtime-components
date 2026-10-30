/**
 * ROUTING · app/api/components/[type]/route.ts — the URL  DELETE /api/components/<type>.
 */
import { deleteComposite, listComposites } from "@/server/componentStore";

export async function DELETE(_req: Request, ctx: RouteContext<"/api/components/[type]">) {
  const { type } = await ctx.params;
  const { problems } = await deleteComposite(type);
  if (problems.length) return Response.json({ problems }, { status: 400 });
  return Response.json({ composites: await listComposites() });
}
