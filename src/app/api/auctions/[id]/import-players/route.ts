import { jsonError } from "@/lib/api";
import { requireHost } from "@/lib/auction/auth";
import { importPlayersToAuction } from "@/lib/auction/csvPlayerImport";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    // Host-only permission
    await requireHost(request, id);

    const body = (await request.json().catch(() => ({}))) as { csvText?: string };
    if (!body.csvText) {
      return Response.json({ error: "csvText is required" }, { status: 400 });
    }

    const players = await importPlayersToAuction(prisma, id, body.csvText);
    return Response.json({ ok: true, importedCount: players.length });
  } catch (err) {
    return jsonError(err);
  }
}
