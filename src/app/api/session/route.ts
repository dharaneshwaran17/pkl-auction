import { upsertSessionUser } from "@/lib/session";
import { jsonError } from "@/lib/api";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { name?: string };
    const user = await upsertSessionUser(body.name ?? "Manager");
    return Response.json({ user });
  } catch (err) {
    return jsonError(err);
  }
}
