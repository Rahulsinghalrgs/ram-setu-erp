import { NextRequest, NextResponse } from "next/server";
import { sendPendingTaskReminders } from "@/lib/task-notifications";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Daily 10:00 IST cron (configured in vercel.json) sends each employee one
// consolidated WhatsApp message listing their pending tasks. Also callable
// manually with the CRON_SECRET bearer token.
async function handle(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    const result = await sendPendingTaskReminders();
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Reminder run failed." },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  return handle(request);
}

export async function POST(request: NextRequest) {
  return handle(request);
}
