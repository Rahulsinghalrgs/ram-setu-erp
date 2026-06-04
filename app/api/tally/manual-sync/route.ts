import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { syncTallyLedgersWithErp, syncTallyWithErp, testTallyConnection } from "@/lib/tally-integration";

export const maxDuration = 300;

function companyNames() {
  return String(process.env.TALLY_COMPANY_NAMES || "")
    .split(/[\n,]/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function authSecret(request: NextRequest) {
  const expected = process.env.TALLY_MANUAL_SYNC_SECRET || "";
  const provided = request.nextUrl.searchParams.get("secret") || request.headers.get("x-sync-secret") || "";
  return Boolean(expected && provided === expected);
}

export async function GET(request: NextRequest) {
  if (!authSecret(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient() as any;
  const { data: organization, error: organizationError } = await supabase
    .from("organizations")
    .select("id, name")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (organizationError || !organization?.id) {
    return NextResponse.json(
      { ok: false, error: organizationError?.message || "Organization not found." },
      { status: 500 }
    );
  }

  try {
    const apiUrl = process.env.TALLY_API_URL || null;
    const configuredCompanies = companyNames();
    const scope = request.nextUrl.searchParams.get("scope") || "ledgers";
    const connection = await testTallyConnection(apiUrl, configuredCompanies);
    const result =
      scope === "full"
        ? await syncTallyWithErp(supabase, organization.id, {
            apiUrl,
            companyNames: configuredCompanies
          })
        : await syncTallyLedgersWithErp(supabase, organization.id, {
            apiUrl,
            companyNames: configuredCompanies
          });

    return NextResponse.json({
      ok: true,
      organization,
      endpoint: connection.endpoint,
      companies: connection.foundCompanies,
      scope,
      result
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Tally manual sync failed." },
      { status: 500 }
    );
  }
}
