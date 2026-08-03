import { NextResponse } from "next/server";
import { db } from "@/server/db/client";

export const dynamic = "force-dynamic";

export async function GET() {
  const status = {
    status: "healthy",
    timestamp: new Date().toISOString(),
    database: "unknown",
    groq: "unknown",
  };

  // 1. Verify Database connection by querying a single record
  try {
    await db.user.findFirst({ select: { id: true } });
    status.database = "connected";
  } catch (e) {
    status.status = "unhealthy";
    status.database = `error: ${e instanceof Error ? e.message : String(e)}`;
  }

  // 2. Verify Groq API Key configuration presence
  try {
    const groqKey = process.env.GROQ_API_KEY;
    if (groqKey && groqKey.startsWith("gsk_") && groqKey !== "gsk_REPLACE_ME") {
      status.groq = "configured";
    } else {
      status.status = "unhealthy";
      status.groq = "error: missing or invalid GROQ_API_KEY environment variable";
    }
  } catch (e) {
    status.status = "unhealthy";
    status.groq = `error: ${e instanceof Error ? e.message : String(e)}`;
  }

  const responseStatus = status.status === "healthy" ? 200 : 503;
  return NextResponse.json(status, { status: responseStatus });
}
