import { jsonError } from "@/lib/api";
import { joinTeam } from "@/lib/auction/service";
import { prisma } from "@/lib/prisma";
import { getSessionUser, upsertSessionUser } from "@/lib/session";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = (await request.json().catch(() => ({}))) as {
      teamId?: string;
      coachName?: string;
    };

    if (!body.teamId) {
      return Response.json({ error: "teamId is required" }, { status: 400 });
    }

    let user = await getSessionUser();
    if (!user) {
      const name = body.coachName?.trim().slice(0, 40) || "Coach";
      user = await upsertSessionUser(name);
    }

    await joinTeam(prisma, id, user.id, body.teamId, body.coachName);

    const updatedUser = await prisma.user.findUnique({ where: { id: user.id } });
    return Response.json({ ok: true, user: updatedUser });
  } catch (err) {
    return jsonError(err);
  }
}
