import { cookies } from "next/headers";
import { prisma } from "./prisma";

const COOKIE = "pk_uid";

export async function getSessionUser() {
  const jar = await cookies();
  const id = jar.get(COOKIE)?.value;
  if (!id) return null;
  return prisma.user.findUnique({ where: { id } });
}

export async function upsertSessionUser(name: string) {
  const trimmed = name.trim().slice(0, 40) || "Manager";
  const jar = await cookies();
  const existingId = jar.get(COOKIE)?.value;
  if (existingId) {
    const existing = await prisma.user.findUnique({ where: { id: existingId } });
    if (existing) {
      return prisma.user.update({ where: { id: existing.id }, data: { name: trimmed } });
    }
  }
  const user = await prisma.user.create({ data: { name: trimmed } });
  jar.set(COOKIE, user.id, { httpOnly: true, sameSite: "lax", path: "/" });
  return user;
}

export async function requireUser() {
  const user = await getSessionUser();
  if (!user) {
    const err = new Error("Sign in with a display name first");
    (err as Error & { status: number }).status = 401;
    throw err;
  }
  return user;
}
