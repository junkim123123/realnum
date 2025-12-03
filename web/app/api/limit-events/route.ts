import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const session = await getServerSession();
    const isAuthenticated = !!session?.user;
    
    // Get request body
    const body = await req.json();
    const { action, reason, userType, input } = body;

    // Validate required fields
    if (!action || !reason || !userType) {
      return NextResponse.json(
        { ok: false, error: "invalid_payload", message: "Missing required fields: action, reason, userType" },
        { status: 400 }
      );
    }

    // Validate action
    const validActions = ["limit_hit", "cta_primary_click", "cta_secondary_click"];
    if (!validActions.includes(action)) {
      return NextResponse.json(
        { ok: false, error: "invalid_payload", message: `Invalid action. Must be one of: ${validActions.join(", ")}` },
        { status: 400 }
      );
    }

    // Validate userType
    if (userType !== "anonymous" && userType !== "user") {
      return NextResponse.json(
        { ok: false, error: "invalid_payload", message: "userType must be 'anonymous' or 'user'" },
        { status: 400 }
      );
    }

    // Get userAgent from headers
    const userAgent = headers().get("user-agent") || null;

    // Determine userId - use email if authenticated, otherwise null
    const userId = isAuthenticated && session?.user?.email ? session.user.email : null;

    // Ensure userType matches authentication status
    // If authenticated but userType is "anonymous", use "user" instead
    // If not authenticated but userType is "user", use "anonymous" instead
    const actualUserType = isAuthenticated ? "user" : "anonymous";

    // Create the limit event record
    if (!prisma) {
      console.error("[LimitEvents] Prisma client is not available");
      // Don't fail the request if DB is unavailable, just log
      return NextResponse.json({ ok: true, warning: "Database unavailable, event not logged" });
    }

    try {
      await prisma.limitEvent.create({
        data: {
          userId,
          userType: actualUserType,
          reason,
          action,
          input: input || null,
          userAgent,
        },
      });
    } catch (dbError: any) {
      console.error("[LimitEvents] Database error:", dbError);
      // Don't fail the request on DB errors during alpha, just log
      return NextResponse.json({ ok: true, warning: "Event logged with warnings" });
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("[LimitEvents] Unexpected server error", err);
    return NextResponse.json(
      {
        ok: false,
        error: "server_error",
        message: err?.message || "Something went wrong",
      },
      { status: 500 }
    );
  }
}

