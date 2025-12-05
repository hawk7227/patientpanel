import { NextResponse } from "next/server";
import { checkSMSStatus, getSMSHistory } from "@/lib/clicksend-status";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const messageId = searchParams.get("messageId");
  const action = searchParams.get("action") || "status";

  try {
    if (action === "history") {
      const limit = parseInt(searchParams.get("limit") || "10", 10);
      const result = await getSMSHistory(limit);
      return NextResponse.json(result);
    }

    if (!messageId) {
      return NextResponse.json(
        { success: false, error: "Message ID is required" },
        { status: 400 }
      );
    }

    const result = await checkSMSStatus(messageId);
    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error("Error checking SMS status:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { success: false, error: "Internal server error", details: errorMessage },
      { status: 500 }
    );
  }
}










