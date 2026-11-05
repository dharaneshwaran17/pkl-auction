import { jsonError } from "@/lib/api";
import { getHostCookieName } from "@/lib/auction/auth";
import { createAuction } from "@/lib/auction/service";
import { prisma } from "@/lib/prisma";
import { getSessionUser, upsertSessionUser } from "@/lib/session";

export async function POST(request: Request) {
  try {
    let user = await getSessionUser();
    const body = (await request.json().catch(() => ({}))) as {
      name?: string;
      hostName?: string;
      coachName?: string;
      initialPurse?: number;
      minSquad?: number;
      maxSquad?: number;
    };

    const hostDisplayName = (body.coachName ?? body.hostName)?.trim().slice(0, 40) || "Host Admin";

    if (!user) {
      user = await upsertSessionUser(hostDisplayName);
    } else if ((body.coachName ?? body.hostName)?.trim()) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { name: hostDisplayName },
      });
    }

    const auction = await createAuction(prisma, user.id, body.name ?? "Pro Kabaddi Auction", {
      initialPurse: body.initialPurse,
      minSquad: body.minSquad,
      maxSquad: body.maxSquad,
    });

    const response = Response.json({
      auctionId: auction.id,
      code: auction.code,
      name: auction.name,
      status: auction.status,
    });

    // Automatically issue the Host Secret cookie to the room creator
    if (auction.hostSecret) {
      const isSecure = process.env.NODE_ENV === "production" ? "; Secure" : "";
      response.headers.append(
        "Set-Cookie",
        `${getHostCookieName(auction.id)}=${encodeURIComponent(auction.hostSecret)}; Path=/; HttpOnly; SameSite=Lax${isSecure}`
      );
    }

    return response;
  } catch (err) {
    return jsonError(err);
  }
}
