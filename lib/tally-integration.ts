const DEFAULT_TALLY_API_URL = "http://localhost:9000";
const TALLY_REQUEST_TIMEOUT_MS = 20000;

type TallyLedger = {
  name: string;
  companyName: string | null;
  guid: string | null;
  masterId: string | null;
  alterId: string | null;
  parent: string | null;
  gstin: string | null;
  phone: string | null;
  email: string | null;
  stateName: string | null;
  address: string | null;
  closingBalance: number;
};

type TallyVoucher = {
  companyName: string | null;
  guid: string | null;
  masterId: string | null;
  alterId: string | null;
  voucherNumber: string;
  voucherType: string;
  partyName: string | null;
  date: string | null;
  amount: number;
};

type SyncResult = {
  ledgersRead: number;
  clientsUpserted: number;
  vouchersRead: number;
  invoicesUpserted: number;
  paymentsCreated: number;
  warnings: string[];
};

type TallySyncOptions = {
  apiUrl?: string | null;
  companyNames?: string[];
};

function tallyApiUrl(apiUrl?: string | null) {
  return (apiUrl || process.env.TALLY_API_URL || DEFAULT_TALLY_API_URL).replace(/\/+$/, "");
}

function xmlEscape(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function decodeXml(value: string | null) {
  return (value || "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

function attrValue(block: string, name: string) {
  const match = block.match(new RegExp(`\\b${name}="([^"]*)"`, "i"));
  return match ? decodeXml(match[1]) : "";
}

function tagValue(block: string, tag: string) {
  const match = block.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`, "i"));
  return match ? decodeXml(match[1]) : "";
}

function tagValues(block: string, tag: string) {
  return [...block.matchAll(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`, "gi"))].map((match) =>
    decodeXml(match[1])
  );
}

function blocks(xml: string, tag: string) {
  return [...xml.matchAll(new RegExp(`<${tag}(?:\\s[^>]*)?>[\\s\\S]*?</${tag}>`, "gi"))].map((match) => match[0]);
}

function staticVariables(companyName?: string | null) {
  return `
        <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
        ${companyName ? `<SVCURRENTCOMPANY>${xmlEscape(companyName)}</SVCURRENTCOMPANY>` : ""}`;
}

function companyTargets(companyNames?: string[]) {
  return (companyNames || []).map((company) => company.trim()).filter(Boolean);
}

function normalizeCompanyName(companyName: string | null) {
  return String(companyName || "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function matchFoundCompany(targetCompany: string, foundCompanies: string[]) {
  const normalizedTarget = normalizeCompanyName(targetCompany);
  return (
    foundCompanies.find((company) => {
      const normalizedFound = normalizeCompanyName(company);
      return (
        normalizedFound === normalizedTarget ||
        normalizedFound.startsWith(`${normalizedTarget} (`) ||
        normalizedTarget.startsWith(`${normalizedFound} (`)
      );
    }) || null
  );
}

function companyCode(companyName: string | null) {
  const normalized = String(companyName || "").toUpperCase();
  if (normalized.includes("RICHA GLOBAL")) return "RGS";
  if (normalized.includes("RICHA INDUSTRIES")) return "RI";
  return normalized
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 6);
}

function scopedInvoiceNumber(voucherNumber: string, companyName: string | null, multiCompany: boolean) {
  if (!multiCompany || !companyName) return voucherNumber;
  return `${companyCode(companyName)}-${voucherNumber}`;
}

function parseAmount(value: string | null) {
  const cleaned = String(value || "").replace(/[₹,\s]/g, "");
  const number = Number(cleaned);
  return Number.isFinite(number) ? number : 0;
}

function parseTallyDate(value: string | null) {
  const raw = String(value || "").trim();
  if (!raw) return null;
  const compact = raw.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (compact) return `${compact[1]}-${compact[2]}-${compact[3]}`;
  const dashed = raw.match(/^(\d{4})[-/](\d{2})[-/](\d{2})$/);
  if (dashed) return `${dashed[1]}-${dashed[2]}-${dashed[3]}`;
  return null;
}

function stateCodeFromName(stateName: string | null) {
  const normalized = String(stateName || "").toLowerCase();
  const states: Record<string, string> = {
    "jammu": "01",
    "himachal": "02",
    "punjab": "03",
    "chandigarh": "04",
    "uttarakhand": "05",
    "haryana": "06",
    "delhi": "07",
    "rajasthan": "08",
    "uttar pradesh": "09",
    "bihar": "10",
    "gujarat": "24",
    "maharashtra": "27",
    "karnataka": "29",
    "tamil nadu": "33",
    "telangana": "36"
  };
  const entry = Object.entries(states).find(([name]) => normalized.includes(name));
  return entry?.[1] || null;
}

async function postTally(xml: string, apiUrl?: string | null) {
  const url = tallyApiUrl(apiUrl);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TALLY_REQUEST_TIMEOUT_MS);
  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "text/xml; charset=utf-8" },
      body: xml,
      signal: controller.signal
    });
  } catch (error) {
    const reason = error instanceof Error && error.name === "AbortError" ? "timeout ho gaya" : "reachable nahi hai";
    throw new Error(`Tally API ${url} par ${reason}. Tally server/API service open hai aur XML POST allow hai ye confirm karo.`);
  } finally {
    clearTimeout(timeout);
  }

  const text = await response.text();
  if (!response.ok) {
    throw new Error(`Tally API error ${response.status}: ${text.slice(0, 180)}`);
  }
  return text;
}

export async function testTallyConnection(apiUrl?: string | null, companyNames?: string[]) {
  const xml = `
<ENVELOPE>
  <HEADER>
    <VERSION>1</VERSION>
    <TALLYREQUEST>Export Data</TALLYREQUEST>
    <TYPE>Collection</TYPE>
    <ID>RamSetuCompanyProbe</ID>
  </HEADER>
  <BODY>
    <DESC>
      <STATICVARIABLES>
        ${staticVariables()}
      </STATICVARIABLES>
      <TDL>
        <TDLMESSAGE>
          <COLLECTION NAME="RamSetuCompanyProbe" ISMODIFY="No">
            <TYPE>Company</TYPE>
            <FETCH>Name</FETCH>
          </COLLECTION>
        </TDLMESSAGE>
      </TDL>
    </DESC>
  </BODY>
</ENVELOPE>`;

  const started = Date.now();
  const response = await postTally(xml, apiUrl);
  const foundCompanies = blocks(response, "COMPANY")
    .map((company) => attrValue(company, "NAME") || tagValue(company, "NAME"))
    .filter(Boolean);
  const expectedCompanies = companyTargets(companyNames);
  const missingCompanies = expectedCompanies.filter(
    (company) => !matchFoundCompany(company, foundCompanies)
  );
  const companyCount = foundCompanies.length;
  const elapsedMs = Date.now() - started;
  return {
    endpoint: tallyApiUrl(apiUrl),
    elapsedMs,
    companyCount,
    foundCompanies,
    missingCompanies,
    responsePreview: response.replace(/\s+/g, " ").trim().slice(0, 240)
  };
}

async function fetchLedgers(apiUrl?: string | null, companyName?: string | null) {
  const xml = `
<ENVELOPE>
  <HEADER>
    <VERSION>1</VERSION>
    <TALLYREQUEST>Export Data</TALLYREQUEST>
    <TYPE>Collection</TYPE>
    <ID>RamSetuLedgers</ID>
  </HEADER>
  <BODY>
    <DESC>
      <STATICVARIABLES>
        ${staticVariables(companyName)}
      </STATICVARIABLES>
      <TDL>
        <TDLMESSAGE>
          <COLLECTION NAME="RamSetuLedgers" ISMODIFY="No">
            <TYPE>Ledger</TYPE>
            <FETCH>Name,GUID,MasterID,AlterID,Parent,LedgerMobile,LedgerPhone,Email,PartyGSTIN,GSTRegistrationNumber,StateName,CountryName,Address,ClosingBalance</FETCH>
          </COLLECTION>
        </TDLMESSAGE>
      </TDL>
    </DESC>
  </BODY>
</ENVELOPE>`;

  const response = await postTally(xml, apiUrl);
  return blocks(response, "LEDGER").map<TallyLedger>((ledger) => {
    const addresses = tagValues(ledger, "ADDRESS").filter(Boolean);
    return {
      name: attrValue(ledger, "NAME") || tagValue(ledger, "NAME"),
      companyName: companyName || null,
      guid: tagValue(ledger, "GUID") || null,
      masterId: tagValue(ledger, "MASTERID") || null,
      alterId: tagValue(ledger, "ALTERID") || null,
      parent: tagValue(ledger, "PARENT") || null,
      gstin: tagValue(ledger, "PARTYGSTIN") || tagValue(ledger, "GSTREGISTRATIONNUMBER") || null,
      phone: tagValue(ledger, "LEDGERMOBILE") || tagValue(ledger, "LEDGERPHONE") || null,
      email: tagValue(ledger, "EMAIL") || null,
      stateName: tagValue(ledger, "STATENAME") || null,
      address: addresses.join(", ") || null,
      closingBalance: Math.abs(parseAmount(tagValue(ledger, "CLOSINGBALANCE")))
    };
  }).filter((ledger) => ledger.name);
}

async function fetchVouchers(apiUrl?: string | null, companyName?: string | null) {
  const xml = `
<ENVELOPE>
  <HEADER>
    <VERSION>1</VERSION>
    <TALLYREQUEST>Export Data</TALLYREQUEST>
    <TYPE>Collection</TYPE>
    <ID>RamSetuVouchers</ID>
  </HEADER>
  <BODY>
    <DESC>
      <STATICVARIABLES>
        ${staticVariables(companyName)}
      </STATICVARIABLES>
      <TDL>
        <TDLMESSAGE>
          <COLLECTION NAME="RamSetuVouchers" ISMODIFY="No">
            <TYPE>Voucher</TYPE>
            <FETCH>Date,VoucherNumber,VoucherTypeName,PartyLedgerName,GUID,MasterID,AlterID,Amount,AllLedgerEntries</FETCH>
          </COLLECTION>
        </TDLMESSAGE>
      </TDL>
    </DESC>
  </BODY>
</ENVELOPE>`;

  const response = await postTally(xml, apiUrl);
  return blocks(response, "VOUCHER").map<TallyVoucher>((voucher) => {
    const amounts = tagValues(voucher, "AMOUNT").map(parseAmount).filter((amount) => amount !== 0);
    const amount = amounts.length ? Math.max(...amounts.map((entry) => Math.abs(entry))) : 0;
    return {
      companyName: companyName || null,
      guid: tagValue(voucher, "GUID") || null,
      masterId: tagValue(voucher, "MASTERID") || null,
      alterId: tagValue(voucher, "ALTERID") || null,
      voucherNumber: attrValue(voucher, "VCHKEY") || tagValue(voucher, "VOUCHERNUMBER") || tagValue(voucher, "REFERENCE"),
      voucherType: tagValue(voucher, "VOUCHERTYPENAME") || attrValue(voucher, "VCHTYPE"),
      partyName: tagValue(voucher, "PARTYLEDGERNAME") || null,
      date: parseTallyDate(tagValue(voucher, "DATE")),
      amount
    };
  }).filter((voucher) => voucher.voucherNumber && voucher.voucherType);
}

function isBuyerLedger(ledger: TallyLedger) {
  const parent = String(ledger.parent || "").toLowerCase();
  return parent.includes("sundry debtors") || parent.includes("debtor");
}

function invoiceTotals(total: number) {
  const subtotal = Math.round((total / 1.18) * 100) / 100;
  const tax = Math.round((total - subtotal) * 100) / 100;
  const halfTax = Math.round((tax / 2) * 100) / 100;
  return { subtotal, cgst: halfTax, sgst: halfTax, igst: 0, total };
}

async function ensureCustomer(
  supabase: any,
  organizationId: string,
  ledger: Pick<
    TallyLedger,
    "name" | "companyName" | "guid" | "gstin" | "phone" | "email" | "stateName" | "address" | "closingBalance" | "masterId" | "alterId"
  >
) {
  const lookup = ledger.guid
    ? supabase.from("customers").select("id").eq("organization_id", organizationId).eq("tally_guid", ledger.guid).limit(1).maybeSingle()
    : supabase.from("customers").select("id").eq("organization_id", organizationId).ilike("name", ledger.name).limit(1).maybeSingle();
  const { data: existing } = await lookup;
  const payload = {
    name: ledger.name,
    gstin: ledger.gstin,
    state_code: stateCodeFromName(ledger.stateName),
    email: ledger.email,
    phone: ledger.phone,
    whatsapp: ledger.phone,
    billing_address: ledger.address,
    opening_outstanding: ledger.closingBalance || 0,
    outstanding_as_of: new Date().toISOString().slice(0, 10),
    status: "active",
    priority: ledger.closingBalance > 0 ? "high" : "medium",
    tally_ledger_name: ledger.name,
    tally_guid: ledger.guid,
    tally_master_id: ledger.masterId,
    tally_alter_id: ledger.alterId,
    tally_synced_at: new Date().toISOString()
  };

  if (existing?.id) {
    const { error } = await supabase.from("customers").update(payload).eq("id", existing.id);
    if (error) throw new Error(`Tally client update failed: ${ledger.name}`);
    return existing.id as string;
  }

  const { data, error } = await supabase
    .from("customers")
    .insert({ organization_id: organizationId, ...payload })
    .select("id")
    .single();
  if (error || !data?.id) throw new Error(`Tally client insert failed: ${ledger.name}`);
  return data.id as string;
}

export async function syncTallyWithErp(
  supabase: any,
  organizationId: string,
  options: TallySyncOptions = {}
): Promise<SyncResult> {
  const warnings: string[] = [];
  const targets = companyTargets(options.companyNames);
  let syncTargets: Array<string | null> = targets.length ? targets : [null];

  if (targets.length) {
    const probe = await testTallyConnection(options.apiUrl, targets);
    const foundCompanies = probe.foundCompanies;
    const targetMatches = targets.map((company) => ({
      configured: company,
      found: matchFoundCompany(company, foundCompanies)
    }));
    const missingCompanies = targetMatches.filter((match) => !match.found).map((match) => match.configured);
    if (missingCompanies.length) {
      warnings.push(
        `Configured company missing in Tally XML: ${missingCompanies.join(
          ", "
        )}. Galat/current company ka data import avoid karne ke liye in companies ko skip kiya.`
      );
    }
    syncTargets = targetMatches.map((match) => match.found).filter(Boolean);
    if (!syncTargets.length) {
      return {
        ledgersRead: 0,
        clientsUpserted: 0,
        vouchersRead: 0,
        invoicesUpserted: 0,
        paymentsCreated: 0,
        warnings: [
          ...warnings,
          `Tally XML me target company open/load nahi mili. Found: ${probe.foundCompanies.join(", ") || "none"}.`
        ]
      };
    }
  }

  const multiCompany = syncTargets.length > 1;
  const allLedgers: TallyLedger[] = [];
  const allVouchers: TallyVoucher[] = [];
  const customerIdsByLedger = new Map<string, string>();

  for (const companyName of syncTargets) {
    try {
      const ledgers = await fetchLedgers(options.apiUrl, companyName);
      const buyerLedgers = ledgers.filter(isBuyerLedger);
      allLedgers.push(...ledgers);

      for (const ledger of buyerLedgers) {
        const id = await ensureCustomer(supabase, organizationId, ledger);
        customerIdsByLedger.set(`${companyName || ""}:${ledger.name}`.toLowerCase(), id);
        customerIdsByLedger.set(ledger.name.toLowerCase(), id);
      }
    } catch (error) {
      const prefix = companyName ? `${companyName}: ` : "";
      warnings.push(`${prefix}${error instanceof Error ? error.message : "Tally ledgers fetch failed."}`);
    }

    try {
      allVouchers.push(...(await fetchVouchers(options.apiUrl, companyName)));
    } catch (error) {
      const prefix = companyName ? `${companyName}: ` : "";
      warnings.push(`${prefix}${error instanceof Error ? error.message : "Tally vouchers fetch failed."}`);
    }
  }

  const buyerLedgers = allLedgers.filter(isBuyerLedger);
  if (!buyerLedgers.length) {
    warnings.push("Buyer ledgers nahi mile. Tally me requested company loaded/open hai aur debtor groups accessible hain ye confirm karo.");
  }
  let invoicesUpserted = 0;
  let paymentsCreated = 0;

  for (const voucher of allVouchers) {
    const type = voucher.voucherType.toLowerCase();
    if (!voucher.date || !voucher.partyName || !voucher.amount) continue;

    const customerId =
      customerIdsByLedger.get(`${voucher.companyName || ""}:${voucher.partyName}`.toLowerCase()) ||
      customerIdsByLedger.get(voucher.partyName.toLowerCase()) ||
      (await ensureCustomer(supabase, organizationId, {
        name: voucher.partyName,
        companyName: voucher.companyName,
        guid: null,
        gstin: null,
        phone: null,
        email: null,
        stateName: null,
        address: null,
        closingBalance: 0,
        masterId: null,
        alterId: null
      }));

    if (type.includes("sales")) {
      const totals = invoiceTotals(voucher.amount);
      const invoiceNumber = scopedInvoiceNumber(voucher.voucherNumber, voucher.companyName, multiCompany);
      const { error } = await supabase.from("invoices").upsert(
        {
          organization_id: organizationId,
          customer_id: customerId,
          invoice_number: invoiceNumber,
          invoice_type: "sales",
          status: "sent",
          invoice_date: voucher.date,
          subtotal: totals.subtotal,
          cgst: totals.cgst,
          sgst: totals.sgst,
          igst: totals.igst,
          total: totals.total,
          balance_due: totals.total
        },
        { onConflict: "organization_id,invoice_number" }
      );
      if (error) throw new Error(`Tally invoice sync failed: ${invoiceNumber}`);
      await supabase
        .from("sales_orders")
        .update({
          billing_status: "done",
          tally_invoice_number: voucher.voucherNumber,
          tally_invoice_guid: voucher.guid,
          tally_synced_at: new Date().toISOString()
        })
        .eq("organization_id", organizationId)
        .eq("order_number", voucher.voucherNumber);
      invoicesUpserted += 1;
    }

    if (type.includes("receipt")) {
      const reference = `Tally:${voucher.companyName || "default"}:${voucher.guid || voucher.voucherNumber}`;
      const { data: existingPayment } = await supabase
        .from("payments")
        .select("id")
        .eq("organization_id", organizationId)
        .eq("reference", reference)
        .limit(1)
        .maybeSingle();

      if (!existingPayment?.id) {
        const { error } = await supabase.from("payments").insert({
          organization_id: organizationId,
          payment_date: voucher.date,
          amount: voucher.amount,
          method: "tally_receipt",
          reference
        });
        if (error) throw new Error(`Tally receipt sync failed: ${voucher.voucherNumber}`);
        paymentsCreated += 1;
      }
    }
  }

  return {
    ledgersRead: allLedgers.length,
    clientsUpserted: buyerLedgers.length,
    vouchersRead: allVouchers.length,
    invoicesUpserted,
    paymentsCreated,
    warnings
  };
}

export async function syncTallyLedgersWithErp(
  supabase: any,
  organizationId: string,
  options: TallySyncOptions = {}
): Promise<SyncResult> {
  const warnings: string[] = [];
  const targets = companyTargets(options.companyNames);
  let syncTargets: Array<string | null> = targets.length ? targets : [null];

  if (targets.length) {
    const probe = await testTallyConnection(options.apiUrl, targets);
    const targetMatches = targets.map((company) => ({
      configured: company,
      found: matchFoundCompany(company, probe.foundCompanies)
    }));
    const missingCompanies = targetMatches.filter((match) => !match.found).map((match) => match.configured);
    if (missingCompanies.length) {
      warnings.push(`Configured company missing in Tally XML: ${missingCompanies.join(", ")}.`);
    }
    syncTargets = targetMatches.map((match) => match.found).filter(Boolean);
    if (!syncTargets.length) {
      return {
        ledgersRead: 0,
        clientsUpserted: 0,
        vouchersRead: 0,
        invoicesUpserted: 0,
        paymentsCreated: 0,
        warnings: [
          ...warnings,
          `Tally XML me target company open/load nahi mili. Found: ${probe.foundCompanies.join(", ") || "none"}.`
        ]
      };
    }
  }

  const allLedgers: TallyLedger[] = [];
  let clientsUpserted = 0;

  for (const companyName of syncTargets) {
    try {
      const ledgers = await fetchLedgers(options.apiUrl, companyName);
      allLedgers.push(...ledgers);
      const buyerLedgers = ledgers.filter(isBuyerLedger);
      for (const ledger of buyerLedgers) {
        await ensureCustomer(supabase, organizationId, ledger);
        clientsUpserted += 1;
      }
    } catch (error) {
      const prefix = companyName ? `${companyName}: ` : "";
      warnings.push(`${prefix}${error instanceof Error ? error.message : "Tally ledgers fetch failed."}`);
    }
  }

  if (!clientsUpserted) {
    warnings.push("Buyer ledgers nahi mile. Tally me debtor groups accessible hain ye confirm karo.");
  }

  return {
    ledgersRead: allLedgers.length,
    clientsUpserted,
    vouchersRead: 0,
    invoicesUpserted: 0,
    paymentsCreated: 0,
    warnings
  };
}
