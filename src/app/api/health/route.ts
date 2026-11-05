import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  // Reading runtime request headers opts the route handler into dynamic request-time execution
  await headers();

  const startTime = Date.now();
  let dbStatus = "unhealthy";
  let errorMsg = null;

  try {
    // Quick probe to ensure the database connection is alive
    await prisma.user.count();
    dbStatus = "healthy";
  } catch (err) {
    errorMsg = (err as Error).message;
  }

  const responseTime = Date.now() - startTime;
  const status = dbStatus === "healthy" ? 200 : 503;

  return Response.json(
    {
      status: dbStatus === "healthy" ? "ok" : "degraded",
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
      database: {
        status: dbStatus,
        responseTimeMs: responseTime,
        error: errorMsg,
      },
      memory: {
        rssMb: Math.round(process.memoryUsage().rss / 1024 / 1024),
        heapUsedMb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      },
      version: "1.0.0",
    },
    { status }
  );
}
