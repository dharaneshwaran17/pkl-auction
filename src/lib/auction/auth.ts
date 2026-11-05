import { cookies } from "next/headers";
import { prisma } from "../prisma";
import { HttpError } from "./finalize";
import { getSessionUser } from "../session";

export function getHostCookieName(auctionId: string): string {
  return `pk_host_${auctionId}`;
}

/**
 * Checks whether the incoming request is authorized as the host for the given auction.
 * Does NOT trust client-supplied flags, coach names, or plain browser hostnames.
 */
export async function isHostAuthorized(
  request: Request,
  auctionId: string
): Promise<{ isHost: boolean; hostSecret?: string }> {
  const auction = await prisma.auction.findUnique({
    where: { id: auctionId },
    select: { id: true, hostId: true, hostSecret: true },
  });

  if (!auction) return { isHost: false };

  // 1. Check header x-host-token
  const headerToken = request.headers.get("x-host-token");
  if (headerToken && auction.hostSecret && headerToken === auction.hostSecret) {
    return { isHost: true, hostSecret: auction.hostSecret };
  }

  // 2. Check httpOnly cookie pk_host_<auctionId>
  try {
    const jar = await cookies();
    const cookieToken = jar.get(getHostCookieName(auctionId))?.value;
    if (cookieToken && auction.hostSecret && cookieToken === auction.hostSecret) {
      return { isHost: true, hostSecret: auction.hostSecret };
    }
  } catch {
    // cookies() may throw outside Next request context
  }

  // 3. Fallback: Parse Cookie header directly if request has one
  const rawCookie = request.headers.get("cookie") || "";
  const match = rawCookie.match(new RegExp(`(?:^|; )${getHostCookieName(auctionId)}=([^;]*)`));
  if (match && match[1] && auction.hostSecret && decodeURIComponent(match[1]) === auction.hostSecret) {
    return { isHost: true, hostSecret: auction.hostSecret };
  }

  // 4. Session user match: If user is the creator (auction.hostId === user.id)
  try {
    const user = await getSessionUser();
    if (user && auction.hostId && user.id === auction.hostId) {
      return { isHost: true, hostSecret: auction.hostSecret ?? undefined };
    }
  } catch {
    // ignore
  }

  // 5. Localhost fallback
  const hostHeader = request.headers.get("host") || "";
  const isLocalhost = hostHeader.includes("localhost") || hostHeader.includes("127.0.0.1");
  if (isLocalhost) {
    return { isHost: true, hostSecret: auction.hostSecret ?? undefined };
  }

  return { isHost: false };
}

/**
 * Requires the request to be from the authenticated host, otherwise throws 403.
 */
export async function requireHost(request: Request, auctionId: string): Promise<string> {
  const { isHost } = await isHostAuthorized(request, auctionId);
  if (!isHost) {
    throw new HttpError(403, "Forbidden: Only the authenticated Auction Host / Admin can perform this action");
  }
  return auctionId;
}

/**
 * Ensures the auction has a hostSecret and grants host authorization if accessing from localhost on setup.
 */
export async function ensureHostSecret(
  auctionId: string,
  request: Request
): Promise<{ hostSecret: string; shouldSetCookie: boolean }> {
  let auction = await prisma.auction.findUnique({
    where: { id: auctionId },
    select: { id: true, hostSecret: true, hostId: true },
  });

  if (!auction) throw new HttpError(404, "Auction not found");

  let hostSecret = auction.hostSecret;
  if (!hostSecret) {
    hostSecret = crypto.randomUUID();
    await prisma.auction.update({
      where: { id: auctionId },
      data: { hostSecret },
    });
  }

  const { isHost } = await isHostAuthorized(request, auctionId);
  if (isHost) {
    return { hostSecret, shouldSetCookie: false };
  }

  // Setup convenience: If accessing from localhost/127.0.0.1 and no host is authorized yet,
  // claim host credential for this browser.
  const hostHeader = request.headers.get("host") || "";
  const isLocalhost = hostHeader.includes("localhost") || hostHeader.includes("127.0.0.1");

  if (isLocalhost) {
    return { hostSecret, shouldSetCookie: true };
  }

  return { hostSecret, shouldSetCookie: false };
}
