import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";

export async function POST(request: Request) {
  try {
    const {
      patient_id,
      appointment_id,
      consent_type,
      consent_text_version,
      accepted,
      visit_type,
    } = await request.json();

    if (!patient_id || !consent_type) {
      return NextResponse.json({ error: "patient_id and consent_type required" }, { status: 400 });
    }

    const ip_address = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
      || request.headers.get("x-real-ip")
      || null;
    const user_agent = request.headers.get("user-agent") || null;

    const supabase = createServerClient();

    const { error } = await supabase.from("patient_consents").insert({
      patient_id,
      appointment_id: appointment_id || null,
      consent_type,
      consent_text_version: consent_text_version || "v1",
      accepted: accepted === true,
      accepted_at: accepted === true ? new Date().toISOString() : null,
      ip_address,
      user_agent,
      visit_type: visit_type || null,
      created_at: new Date().toISOString(),
    });

    if (error) {
      // Table may not exist yet — log but don't fail the booking flow
      console.error("[save-consent] insert error:", error.message);
      return NextResponse.json({ success: false, error: error.message }, { status: 200 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("[save-consent] error:", msg);
    return NextResponse.json({ success: false, error: msg }, { status: 200 });
  }
}
