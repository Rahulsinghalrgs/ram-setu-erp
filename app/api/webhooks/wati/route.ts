import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

function readString(payload: any, keys: string[]) {
  for (const key of keys) {
    const value = key.split(".").reduce((current, part) => current?.[part], payload);
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function readStatus(payload: any) {
  const status = readString(payload, [
    "status",
    "eventType",
    "type",
    "statusString",
    "message.status",
    "message.statusString",
    "messageStatus",
    "deliveryStatus"
  ]).toLowerCase();

  if (status.includes("deliver")) return "delivered";
  if (status.includes("read")) return "read";
  if (status.includes("fail") || status.includes("error") || status.includes("undeliver")) return "failed";
  if (status.includes("sent")) return "sent";
  return status || "callback";
}

function readError(payload: any) {
  return (
    readString(payload, [
      "error",
      "errorMessage",
      "message.error",
      "message.errorMessage",
      "failedReason",
      "failedDetail",
      "message.failedDetail",
      "reason",
      "info"
    ]) || null
  );
}

export async function POST(request: NextRequest) {
  const secret =
    process.env.WATI_WEBHOOK_SECRET ||
    process.env.ATTENDANCE_WEBHOOK_SECRET ||
    process.env.SETUP_SECRET ||
    "";
  const provided = request.nextUrl.searchParams.get("secret") || request.headers.get("x-webhook-secret") || "";

  if (secret && provided !== secret) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const payload = await request.json().catch(() => ({}));
  const providerMessageId = readString(payload, [
    "localMessageId",
    "local_message_id",
    "message.localMessageId",
    "message.local_message_id",
    "id",
    "message.id"
  ]);
  const status = readStatus(payload);
  const errorMessage = readError(payload);

  if (providerMessageId) {
    try {
      const supabase = createAdminClient() as any;
      const { data } = await supabase
        .from("communication_logs")
        .update({
          status,
          error_message: errorMessage,
          provider_response: payload,
          status_checked_at: new Date().toISOString(),
          sent_at: status === "sent" || status === "delivered" || status === "read" ? new Date().toISOString() : undefined
        })
        .eq("provider_message_id", providerMessageId)
        .select("id");

      await supabase.from("wati_webhook_events").insert({
        provider_message_id: providerMessageId,
        status,
        error_message: errorMessage,
        payload,
        matched_log: Boolean(data?.length)
      });
    } catch {
      // WATI must still get 200 so it does not retry forever when Supabase is unavailable.
    }
  } else {
    try {
      const supabase = createAdminClient() as any;
      await supabase.from("wati_webhook_events").insert({
        provider_message_id: null,
        status,
        error_message: errorMessage,
        payload,
        matched_log: false
      });
    } catch {
      // WATI must still get 200 so it does not retry forever when Supabase is unavailable.
    }
  }

  return NextResponse.json({ ok: true, providerMessageId, status });
}
