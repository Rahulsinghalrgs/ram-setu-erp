import { createClient } from "@/lib/supabase/server";

export type PaymentBill = {
  billKey: string;
  company: string;
  partyName: string;
  gstin: string;
  billNo: string;
  billDate: string;
  billAmount: number;
  received: number;
  outstanding: number;
  creditDays: number;
  dueDate: string;
  contactPerson: string;
  phone: string;
  email: string;
  daysOverdue: number;
  ageingBucket: string;
  priority: string;
  lastFollowupDate: string;
  mode: string;
  remarks: string;
  promisedPayDate: string;
  status: string;
};

export type PaymentFollowupLog = {
  id: string;
  bill_key: string;
  party_name: string;
  company: string | null;
  bill_no: string | null;
  mode: string;
  status: string;
  followup_date: string;
  promised_pay_date: string | null;
  promised_amount: number;
  next_followup_date: string | null;
  remarks: string | null;
  created_at: string;
};

const defaultPaymentCsvUrl =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vTtRQcaY2Sn-5Cyl-xCj3TqFfpLU2JjMfrLCD6EERg0YXabtCenDhsJYjqeKg5Wd6lrG-T9DXBjhfdR/pub?output=csv";

export const paymentCsvUrl = process.env.PAYMENT_FOLLOWUP_CSV_URL || defaultPaymentCsvUrl;

function parseCsv(csv: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let insideQuote = false;

  for (let index = 0; index < csv.length; index += 1) {
    const char = csv[index];
    const next = csv[index + 1];

    if (char === '"' && next === '"' && insideQuote) {
      cell += '"';
      index += 1;
      continue;
    }

    if (char === '"') {
      insideQuote = !insideQuote;
      continue;
    }

    if (char === "," && !insideQuote) {
      row.push(cell.trim());
      cell = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !insideQuote) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(cell.trim());
      if (row.some(Boolean)) rows.push(row);
      row = [];
      cell = "";
      continue;
    }

    cell += char;
  }

  row.push(cell.trim());
  if (row.some(Boolean)) rows.push(row);
  return rows;
}

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function findColumn(headers: string[], options: string[]) {
  const normalizedHeaders = headers.map(normalize);
  for (const option of options.map(normalize)) {
    const index = normalizedHeaders.findIndex((header) => header.includes(option));
    if (index >= 0) return index;
  }
  return -1;
}

function readCell(row: string[], index: number, fallback = "-") {
  return index >= 0 && row[index] ? row[index].trim() : fallback;
}

function amount(value: string) {
  const cleaned = String(value || "")
    .replace(/₹/g, "")
    .replace(/,/g, "")
    .replace(/\s/g, "")
    .replace(/-/g, "");
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
}

function integer(value: string) {
  const parsed = Number(String(value || "").replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function inferPriority(priority: string, daysOverdue: number, outstanding: number) {
  if (priority && priority !== "-") return priority;
  if (daysOverdue > 90 || outstanding >= 500000) return "Critical";
  if (daysOverdue > 30 || outstanding >= 100000) return "High";
  if (daysOverdue > 0) return "Medium";
  return "Normal";
}

export function paymentBillKey(company: string, partyName: string, billNo: string) {
  return [company || "company", partyName || "party", billNo || "bill"]
    .map((part) => normalize(part).replace(/\s+/g, "-"))
    .join("__");
}

export async function getPaymentSheetData() {
  try {
    const response = await fetch(paymentCsvUrl, { next: { revalidate: 45 } });
    if (!response.ok) throw new Error("Payment CSV not accessible");
    const csv = await response.text();
    const rows = parseCsv(csv);
    const headerIndex = rows.findIndex((row) =>
      row.some((cell) => normalize(cell).includes("party name"))
    );
    const headers = rows[headerIndex] || [];
    const records = rows.slice(headerIndex + 1);
    const columns = {
      company: findColumn(headers, ["company"]),
      partyName: findColumn(headers, ["party name", "ledger"]),
      gstin: findColumn(headers, ["gstin"]),
      billNo: findColumn(headers, ["voucher", "bill no"]),
      billDate: findColumn(headers, ["bill date"]),
      billAmount: findColumn(headers, ["bill amount"]),
      received: findColumn(headers, ["received so far"]),
      outstanding: findColumn(headers, ["outstanding"]),
      creditDays: findColumn(headers, ["credit days"]),
      dueDate: findColumn(headers, ["due date"]),
      contactPerson: findColumn(headers, ["contact person"]),
      phone: findColumn(headers, ["mobile", "whatsapp"]),
      email: findColumn(headers, ["email"]),
      daysOverdue: findColumn(headers, ["days overdue"]),
      ageingBucket: findColumn(headers, ["ageing bucket"]),
      priority: findColumn(headers, ["priority"]),
      lastFollowupDate: findColumn(headers, ["last follow"]),
      mode: findColumn(headers, ["mode"]),
      remarks: findColumn(headers, ["response", "remarks"]),
      promisedPayDate: findColumn(headers, ["promised pay"]),
      status: findColumn(headers, ["status"])
    };

    const bills = records
      .map((row) => {
        const company = readCell(row, columns.company, "Richa Group");
        const partyName = readCell(row, columns.partyName);
        const billNo = readCell(row, columns.billNo);
        const outstanding = amount(readCell(row, columns.outstanding, "0"));
        const daysOverdue = integer(readCell(row, columns.daysOverdue, "0"));
        const priority = inferPriority(readCell(row, columns.priority, ""), daysOverdue, outstanding);

        return {
          billKey: paymentBillKey(company, partyName, billNo),
          company,
          partyName,
          gstin: readCell(row, columns.gstin),
          billNo,
          billDate: readCell(row, columns.billDate),
          billAmount: amount(readCell(row, columns.billAmount, "0")),
          received: amount(readCell(row, columns.received, "0")),
          outstanding,
          creditDays: integer(readCell(row, columns.creditDays, "0")),
          dueDate: readCell(row, columns.dueDate),
          contactPerson: readCell(row, columns.contactPerson),
          phone: readCell(row, columns.phone),
          email: readCell(row, columns.email),
          daysOverdue,
          ageingBucket: readCell(row, columns.ageingBucket),
          priority,
          lastFollowupDate: readCell(row, columns.lastFollowupDate),
          mode: readCell(row, columns.mode),
          remarks: readCell(row, columns.remarks),
          promisedPayDate: readCell(row, columns.promisedPayDate),
          status: readCell(row, columns.status, "Pending")
        } satisfies PaymentBill;
      })
      .filter((bill) => bill.partyName !== "-" && bill.outstanding > 0);

    return { bills, error: null as string | null };
  } catch {
    return { bills: [] as PaymentBill[], error: "Payment follow-up sheet could not be loaded." };
  }
}

export async function getPaymentFollowupLogs(organizationId: string) {
  try {
    const supabase = await createClient();
    const db = supabase as any;
    const { data, error } = await db
      .from("payment_followups")
      .select("*")
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false })
      .limit(250);

    if (error) throw error;
    return { logs: (data || []) as PaymentFollowupLog[], error: null as string | null };
  } catch {
    return {
      logs: [] as PaymentFollowupLog[],
      error: "Supabase follow-up log table is not active yet."
    };
  }
}

export function getPaymentSummary(bills: PaymentBill[], logs: PaymentFollowupLog[]) {
  const openBills = bills.filter((bill) => bill.outstanding > 0);
  const latestByBill = new Map<string, PaymentFollowupLog>();
  for (const log of logs) {
    if (!latestByBill.has(log.bill_key)) latestByBill.set(log.bill_key, log);
  }

  return {
    totalOutstanding: openBills.reduce((sum, bill) => sum + bill.outstanding, 0),
    openBills: openBills.length,
    criticalBills: openBills.filter((bill) =>
      ["critical", "high"].includes(bill.priority.toLowerCase())
    ).length,
    promisedAmount: logs.reduce((sum, log) => sum + Number(log.promised_amount || 0), 0),
    pendingFollowups: openBills.filter((bill) => !latestByBill.has(bill.billKey)).length,
    overdue90: openBills
      .filter((bill) => bill.daysOverdue > 90)
      .reduce((sum, bill) => sum + bill.outstanding, 0)
  };
}
