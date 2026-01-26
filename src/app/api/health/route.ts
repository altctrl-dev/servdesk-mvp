import { NextResponse } from "next/server";
import { getCloudflareContext } from "@/lib/cf-context";
import type { CloudflareEnv } from "@/env";

export const runtime = 'edge';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const warmDb = url.searchParams.get("warm") === "true";

  let dbStatus = "skipped";

  // Optionally warm up D1 connection
  if (warmDb) {
    try {
      const { env } = await getCloudflareContext();
      const typedEnv = env as CloudflareEnv;
      await typedEnv.DB.prepare("SELECT 1").first();
      dbStatus = "warm";
    } catch {
      dbStatus = "error";
    }
  }

  return NextResponse.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    version: "0.1.0",
    environment: process.env.ENVIRONMENT || "development",
    db: dbStatus,
  });
}
