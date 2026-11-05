import { jsonError } from "@/lib/api";
import { ensureHostSecret, getHostCookieName, isHostAuthorized } from "@/lib/auction/auth";
import { getAuctionState } from "@/lib/auction/service";
import { prisma } from "@/lib/prisma";
import { getSessionUser, upsertSessionUser } from "@/lib/session";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    let user = await getSessionUser();
    const hostHeader = request.headers.get("host") || "";
    const isLocalhost = hostHeader.includes("localhost") || hostHeader.includes("127.0.0.1");

    if (!user) {
      const existingOwners = await prisma.team.count({
        where: { auctionId: id, ownerId: { not: null } },
      });
      const defaultName = isLocalhost
        ? "Dharaneshwaran R (Host)"
        : `Coach #${existingOwners + 1}`;
      user = await upsertSessionUser(defaultName);
    }

    // Host Secret and authorization verification
    const { hostSecret, shouldSetCookie } = await ensureHostSecret(id, request);
    const { isHost } = await isHostAuthorized(request, id);
    const finalIsHost = isHost || shouldSetCookie;

    // If host was claimed on localhost, link user as auction.hostId
    if (finalIsHost) {
      const auctionData = await prisma.auction.findUnique({ where: { id } });
      if (auctionData && auctionData.hostId !== user.id) {
        await prisma.auction.update({
          where: { id },
          data: { hostId: user.id },
        });
      }
    }

    const state = await getAuctionState(prisma, id, user.id, finalIsHost);

    // Prepare response
    const response = Response.json({
      ...state,
      me: user,
      isHost: finalIsHost,
    });

    // If host was established on setup, issue the host authorization cookie
    if (shouldSetCookie && hostSecret) {
      response.headers.append(
        "Set-Cookie",
        `${getHostCookieName(id)}=${encodeURIComponent(hostSecret)}; Path=/; HttpOnly; SameSite=Lax`
      );
    }

    return response;
  } catch (err) {
    return jsonError(err);
  }
}
