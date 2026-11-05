import { HttpError } from "./auction/finalize";

export function jsonError(err: unknown) {
  if (err instanceof HttpError) {
    return Response.json(
      { error: err.message, ...(typeof err.payload === "object" && err.payload ? err.payload : {}) },
      { status: err.status },
    );
  }
  const status = (err as { status?: number }).status;
  if (typeof status === "number") {
    return Response.json({ error: (err as Error).message }, { status });
  }
  console.error(err);
  return Response.json({ error: "Internal server error" }, { status: 500 });
}
