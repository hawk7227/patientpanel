import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  try {
    const { appointmentId, visitType, appointmentDate, appointmentTime, notes } = await req.json();

    if (!appointmentId) {
      return NextResponse.json({ error: "appointmentId required" }, { status: 400 });
    }

    const supabase = createServerClient();

    // Update the appointment to the new visit type and scheduled time
    const { data, error } = await supabase
      .from("appointments")
      .update({
        visit_type: visitType || "video",
        appointment_date: appointmentDate,
        appointment_time: appointmentTime,
        notes: notes || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", appointmentId)
      .select()
      .single();

    if (error) {
      console.error("[update-appointment-type] Error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, appointment: data });
  } catch (err: any) {
    console.error("[update-appointment-type] Unexpected error:", err);
    return NextResponse.json({ error: err.message || "Internal error" }, { status: 500 });
  }
}
