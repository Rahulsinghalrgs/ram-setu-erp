type BridgeOptions = {
  bridgeUrl?: string | null;
  apiKey?: string | null;
  companyNames?: string[];
};

type BridgeSyncResult = {
  ledgersRead: number;
  clientsUpserted: number;
  vouchersRead: number;
  invoicesUpserted: number;
  paymentsCreated: number;
  warnings: string[];
};

function bridgeBaseUrl(bridgeUrl?: string | null) {
  return String(bridgeUrl || process.env.TALLY_BRIDGE_URL || "").replace(/\/+$/, "");
}

function bridgeApiKey(apiKey?: string | null) {
  return String(apiKey || process.env.TALLY_BRIDGE_API_KEY || "");
}

function companyNames(options: BridgeOptions) {
  const configured = options.companyNames?.filter(Boolean) || [];
  if (configured.length) return configured;
  return String(process.env.TALLY_COMPANY_NAMES || "")
    .split(/[\n,]/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

async function bridgeGet<T>(path: string, options: BridgeOptions): Promise<T> {
  const baseUrl = bridgeBaseUrl(options.bridgeUrl);
  const key = bridgeApiKey(options.apiKey);
  if (!baseUrl) throw new Error("Tally bridge URL missing. Provider API URL me HTTPS bridge URL save karo.");
  if (!key) throw new Error("Tally bridge API key missing. TALLY_BRIDGE_API_KEY server env me set karo.");

  const response = await fetch(`${baseUrl}${path}`, {
    headers: { Authorization: `Bearer ${key}` },
    cache: "no-store"
  });
  const text = await response.text();
  let json: any = {};
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    json = { raw: text };
  }
  if (!response.ok) {
    throw new Error(`Tally bridge error ${response.status}: ${json.error || text.slice(0, 180)}`);
  }
  return json as T;
}

function normalizeDate(value: unknown) {
  const raw = String(value || "").trim();
  if (!raw) return new Date().toISOString().slice(0, 10);
  const compact = raw.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (compact) return `${compact[1]}-${compact[2]}-${compact[3]}`;
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? new Date().toISOString().slice(0, 10) : parsed.toISOString().slice(0, 10);
}

function amount(value: unknown) {
  const number = Number(String(value || "0").replace(/[₹,\s]/g, ""));
  return Number.isFinite(number) ? Math.abs(number) : 0;
}

function isoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function registerWindowQuery() {
  const configuredFrom = String(process.env.TALLY_SYNC_FROM_DATE || "").trim();
  const configuredTo = String(process.env.TALLY_SYNC_TO_DATE || "").trim();
  const days = Number(process.env.TALLY_SYNC_DAYS || 60);
  const to = configuredTo || isoDate(new Date());
  const fromDate = new Date(`${to}T00:00:00.000Z`);
  fromDate.setUTCDate(fromDate.getUTCDate() - (Number.isFinite(days) ? days : 60));
  const from = configuredFrom || isoDate(fromDate);
  return `from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;
}

async function ensureCustomer(supabase: any, organizationId: string, ledger: any) {
  const name = String(ledger.name || ledger.ledger || ledger.partyName || "").trim();
  if (!name) return null;

  const { data: existing } = await supabase
    .from("customers")
    .select("id")
    .eq("organization_id", organizationId)
    .ilike("name", name)
    .limit(1)
    .maybeSingle();

  const payload = {
    name,
    phone: ledger.mobile || ledger.phone || null,
    whatsapp: ledger.mobile || ledger.phone || null,
    email: ledger.email || null,
    gstin: ledger.gstin || null,
    opening_outstanding: amount(ledger.closingBalance || ledger.outstanding),
    outstanding_as_of: new Date().toISOString().slice(0, 10),
    status: "active",
    tally_ledger_name: name,
    tally_synced_at: new Date().toISOString()
  };

  if (existing?.id) {
    const { error } = await supabase.from("customers").update(payload).eq("id", existing.id);
    if (error) throw new Error(`Bridge client update failed: ${name}`);
    return existing.id as string;
  }

  const { data, error } = await supabase
    .from("customers")
    .insert({ organization_id: organizationId, ...payload })
    .select("id")
    .single();
  if (error || !data?.id) throw new Error(`Bridge client insert failed: ${name}`);
  return data.id as string;
}

function invoiceTotals(total: number) {
  const subtotal = Math.round((total / 1.18) * 100) / 100;
  const tax = Math.round((total - subtotal) * 100) / 100;
  const halfTax = Math.round((tax / 2) * 100) / 100;
  return { subtotal, cgst: halfTax, sgst: halfTax, igst: 0, total };
}

export async function testTallyBridge(options: BridgeOptions = {}) {
  const health = await bridgeGet<any>("/health", options);
  return {
    endpoint: bridgeBaseUrl(options.bridgeUrl),
    companies: health.companies || []
  };
}

export async function syncTallyBridgeWithErp(
  supabase: any,
  organizationId: string,
  options: BridgeOptions = {}
): Promise<BridgeSyncResult> {
  const warnings: string[] = [];
  const companies = companyNames(options);
  if (!companies.length) throw new Error("Tally company names missing. Richa Global Sales/Richa Industries save karo.");

  let ledgersRead = 0;
  let clientsUpserted = 0;
  let vouchersRead = 0;
  let invoicesUpserted = 0;
  let paymentsCreated = 0;

  for (const company of companies) {
    const query = `?company=${encodeURIComponent(company)}`;
    const registerQuery = `${query}&${registerWindowQuery()}`;
    const [{ rows: ledgers = [] }, { rows: salesRows = [] }, { rows: receiptRows = [] }] = await Promise.all([
      bridgeGet<any>(`/ledgers${query}`, options),
      bridgeGet<any>(`/sales-register${registerQuery}`, options),
      bridgeGet<any>(`/receipt-register${registerQuery}`, options)
    ]);

    ledgersRead += ledgers.length;
    for (const ledger of ledgers) {
      const customerId = await ensureCustomer(supabase, organizationId, ledger);
      if (customerId) clientsUpserted += 1;
    }

    vouchersRead += salesRows.length + receiptRows.length;
    for (const voucher of salesRows) {
      const total = amount(voucher.amount);
      const customerId = await ensureCustomer(supabase, organizationId, { name: voucher.partyName || voucher.ledger });
      if (!customerId || !voucher.voucherNumber || !total) continue;
      const totals = invoiceTotals(total);
      const { error } = await supabase.from("invoices").upsert(
        {
          organization_id: organizationId,
          customer_id: customerId,
          invoice_number: String(voucher.voucherNumber),
          invoice_type: "sales",
          status: "sent",
          invoice_date: normalizeDate(voucher.date),
          subtotal: totals.subtotal,
          cgst: totals.cgst,
          sgst: totals.sgst,
          igst: totals.igst,
          total: totals.total,
          balance_due: totals.total
        },
        { onConflict: "organization_id,invoice_number" }
      );
      if (error) throw new Error(`Bridge invoice sync failed: ${voucher.voucherNumber}`);
      invoicesUpserted += 1;
    }

    for (const receipt of receiptRows) {
      const value = amount(receipt.amount);
      const reference = `TallyBridge:${company}:${receipt.voucherNumber || receipt.date || value}`;
      if (!value) continue;
      const { data: existingPayment } = await supabase
        .from("payments")
        .select("id")
        .eq("organization_id", organizationId)
        .eq("reference", reference)
        .limit(1)
        .maybeSingle();
      if (existingPayment?.id) continue;
      const { error } = await supabase.from("payments").insert({
        organization_id: organizationId,
        payment_date: normalizeDate(receipt.date),
        amount: value,
        method: "tally_bridge_receipt",
        reference
      });
      if (error) throw new Error(`Bridge receipt sync failed: ${receipt.voucherNumber || receipt.date}`);
      paymentsCreated += 1;
    }
  }

  return {
    ledgersRead,
    clientsUpserted,
    vouchersRead,
    invoicesUpserted,
    paymentsCreated,
    warnings
  };
}
