import { NextRequest, NextResponse } from "next/server";
import { requireModuleAccess } from "@/lib/erp-queries";
import { getWatiMessageStatus } from "@/lib/communication";
import { createClient } from "@/lib/supabase/server";

function maskPhone(phone: string) {
  const digits = phone.replace(/\D/g, "");
  return digits.length > 4 ? `${digits.slice(0, 2)}******${digits.slice(-4)}` : "masked";
}

export async function GET(request: NextRequest) {
  await requireModuleAccess("invoices", "edit");

  const phone = request.nextUrl.searchParams.get("phone") || "";
  const id = request.nextUrl.searchParams.get("id") || "";

  if (!phone || !id) {
    return NextResponse.json({ ok: false, error: "Phone and message id are required." }, { status: 400 });
  }

  const result = await getWatiMessageStatus({ phone, localMessageId: id });
  const status =
    result.result?.statusString ||
    result.result?.status ||
    result.result?.messageStatus ||
    result.result?.deliveryStatus ||
    null;

  if (result.ok) {
    try {
      const supabase = await createClient();
      await (supabase as any)
        .from("communication_logs")
        .update({
          status: String(status || "checked").toLowerCase(),
          provider_response: result.result,
          status_checked_at: new Date().toISOString()
        })
        .eq("provider_message_id", id);
    } catch {
      // Status API response still returns even if observability columns are pending.
    }
  }

  return NextResponse.json({
    ok: result.ok,
    recipient: maskPhone(phone),
    localMessageId: id,
    status,
    error: result.ok ? null : result.error,
    provider: result.ok ? result.result : null
  });
}
