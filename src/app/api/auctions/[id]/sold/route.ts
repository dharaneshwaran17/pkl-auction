import { jsonError } from "@/lib/api";
import { markSold } from "@/lib/auction/service";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const user = await requireUser();
    await markSold(prisma, id, user.id);
    return Response.json({ ok: true });
  } catch (err) {
    return jsonError(err);
  }
}
