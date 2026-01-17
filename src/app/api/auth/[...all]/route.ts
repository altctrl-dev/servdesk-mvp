/**
 * Better Auth API Route Handler
 *
 * Handles all Better Auth routes at /api/auth/*
 * OpenNext automatically handles edge runtime for Cloudflare Workers.
 */

import { NextRequest, NextResponse } from "next/server";
import type { CloudflareEnv } from "@/env";
import { getCloudflareContext } from "@/lib/cf-context";
import { createAuth } from "@/lib/auth";

export const runtime = 'edge';

/**
 * Handles GET requests to Better Auth endpoints.
 * Includes: session retrieval, OAuth callbacks, etc.
 */
export async function GET(request: NextRequest) {
  try {
    const { env } = await getCloudflareContext();
    const auth = createAuth(env as CloudflareEnv);
    return auth.handler(request);
  } catch (error) {
    console.error("[Auth GET Error]", error);
    return NextResponse.json(
      { error: "Internal server error", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

/**
 * Handles POST requests to Better Auth endpoints.
 * Includes: sign in, sign up, sign out, 2FA verification, etc.
 */
export async function POST(request: NextRequest) {
  try {
    const { env } = await getCloudflareContext();
    const auth = createAuth(env as CloudflareEnv);
    return auth.handler(request);
  } catch (error) {
    console.error("[Auth POST Error]", error);
    return NextResponse.json(
      { error: "Internal server error", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
