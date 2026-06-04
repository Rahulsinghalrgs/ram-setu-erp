import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type FieldVisitEntry = {
  timestamp: string;
  name: string;
  action: string;
  visitAddress: string;
  vehicleNo: string;
  vehicleReading: string;
  fuelLitres: string;
  fuelRate: string;
  readingImage: string;
  fuelBillImage: string;
  comments: string;
  date: string;
  coverDistance: string;
  trackingId: string;
  time: string;
  source?: "sheet" | "erp";
  mapUrl?: string;
  accuracy?: string;
  selfieImage?: string;
};

export type FieldVisitSummary = {
  todayVisits: number;
  activeStaff: number;
  checkIns: number;
  checkOuts: number;
  totalDistance: number;
  fuelEntries: number;
  total: number;
};

const defaultFieldVisitFormUrl = "https://forms.gle/ccnoSfa61RvCJEH36";
const defaultFieldVisitCsvUrl =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vQkzKIr1Jm_y1eUsdJAP5UqOUARqP_-crFaU11547wVHFXZIwnajhnpuGelELYNK28pvt4IUnzvnXkp/pub?output=csv";

export const fieldVisitFormUrl = process.env.FIELD_VISIT_FORM_URL || defaultFieldVisitFormUrl;
export const fieldVisitSheetUrl = process.env.FIELD_VISIT_SHEET_URL || defaultFieldVisitCsvUrl;

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
      if (char === "\r" && next === "\n") {
        index += 1;
      }
      row.push(cell.trim());
      if (row.some(Boolean)) {
        rows.push(row);
      }
      row = [];
      cell = "";
      continue;
    }

    cell += char;
  }

  row.push(cell.trim());
  if (row.some(Boolean)) {
    rows.push(row);
  }

  return rows;
}

function findColumn(headers: string[], options: string[]) {
  const normalizedHeaders = headers.map((header) => header.toLowerCase());

  for (const option of options) {
    const index = normalizedHeaders.findIndex((header) => header.includes(option));
    if (index >= 0) {
      return index;
    }
  }

  return -1;
}

function readCell(row: string[], index: number, fallback = "-") {
  return index >= 0 && row[index] ? row[index] : fallback;
}

function numberValue(value: string) {
  const number = Number(String(value || "").replace(/,/g, ""));
  return Number.isFinite(number) ? number : 0;
}

function isToday(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return false;
  }
  return parsed.toDateString() === new Date().toDateString();
}

function formatDateTime(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return { date: "-", time: "-" };
  }

  return {
    date: parsed.toLocaleDateString("en-IN"),
    time: parsed.toLocaleString("en-IN", {
      day: "numeric",
      month: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false
    })
  };
}

function actionLabel(action: string) {
  const labels: Record<string, string> = {
    check_in: "Check In",
    check_out: "Check Out",
    visit_update: "Visit Update",
    fuel_update: "Fuel Update"
  };
  return labels[action] || action;
}

async function getCurrentOrganizationId() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data } = await (supabase as any)
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  return data?.organization_id || null;
}

export async function getFieldVisitEntries() {
  const csvUrl = process.env.FIELD_VISIT_SHEET_CSV_URL || defaultFieldVisitCsvUrl;

  try {
    const response = await fetch(csvUrl, { next: { revalidate: 45 } });

    if (!response.ok) {
      return {
        entries: [] as FieldVisitEntry[],
        error: "Field visit response sheet is not accessible yet."
      };
    }

    const csv = await response.text();

    if (csv.includes("<!DOCTYPE html>") || csv.includes("Sign in to your Google Account")) {
      return {
        entries: [] as FieldVisitEntry[],
        error: "Google Sheet private hai. ERP ko field visit CSV/API access dena baaki hai."
      };
    }

    const rows = parseCsv(csv);
    const [headers = [], ...records] = rows;
    const timestampIndex = findColumn(headers, ["timestamp"]);
    const nameIndex = findColumn(headers, ["name"]);
    const actionIndex = findColumn(headers, ["action"]);
    const visitAddressIndex = findColumn(headers, ["visit address", "from where", "where"]);
    const vehicleNoIndex = findColumn(headers, ["vehicle no"]);
    const vehicleReadingIndex = findColumn(headers, ["vehicle reading", "reading in km"]);
    const fuelLitresIndex = findColumn(headers, ["filled", "litter", "litre"]);
    const fuelRateIndex = findColumn(headers, ["rate"]);
    const readingImageIndex = findColumn(headers, ["reading image"]);
    const fuelBillImageIndex = findColumn(headers, ["bill image"]);
    const commentsIndex = findColumn(headers, ["comment"]);
    const dateIndex = findColumn(headers, ["date"]);
    const coverDistanceIndex = findColumn(headers, ["cover distance", "distance"]);
    const trackingIdIndex = findColumn(headers, ["tracking id"]);
    const timeIndex = findColumn(headers, ["time"]);

    const entries: FieldVisitEntry[] = records
      .map((row) => ({
        timestamp: readCell(row, timestampIndex, readCell(row, 0)),
        name: readCell(row, nameIndex, readCell(row, 1, "Field staff")),
        action: readCell(row, actionIndex, "Visit update"),
        visitAddress: readCell(row, visitAddressIndex),
        vehicleNo: readCell(row, vehicleNoIndex),
        vehicleReading: readCell(row, vehicleReadingIndex),
        fuelLitres: readCell(row, fuelLitresIndex),
        fuelRate: readCell(row, fuelRateIndex),
        readingImage: readCell(row, readingImageIndex),
        fuelBillImage: readCell(row, fuelBillImageIndex),
        comments: readCell(row, commentsIndex),
        date: readCell(row, dateIndex),
        coverDistance: readCell(row, coverDistanceIndex),
        trackingId: readCell(row, trackingIdIndex),
        time: readCell(row, timeIndex),
        source: "sheet" as const
      }))
      .filter((entry) => entry.timestamp !== "-" || entry.name !== "Field staff")
      .reverse()
      .slice(0, 80);

    return {
      entries,
      error: null as string | null
    };
  } catch {
    return {
      entries: [] as FieldVisitEntry[],
      error: "Field visit feed could not be loaded."
    };
  }
}

export async function getSecureFieldVisitEntries() {
  const organizationId = await getCurrentOrganizationId();
  if (!organizationId) {
    return {
      entries: [] as FieldVisitEntry[],
      error: null as string | null
    };
  }

  const supabase = await createClient();
  const { data, error } = await (supabase as any)
    .from("field_visit_punches")
    .select("*")
    .eq("organization_id", organizationId)
    .order("captured_at", { ascending: false })
    .limit(80);

  if (error) {
    return {
      entries: [] as FieldVisitEntry[],
      error: error.code === "42P01" ? "Secure field visit table pending hai. Supabase migration run karni hogi." : error.message
    };
  }

  const admin = createAdminClient() as any;
  const entries: FieldVisitEntry[] = await Promise.all(
    ((data || []) as any[]).map(async (entry) => {
      const signed = async (path: string | null) => {
        if (!path) return "-";
        const { data: signedData } = await admin.storage.from("field-visit-proofs").createSignedUrl(path, 20 * 60);
        return signedData?.signedUrl || "-";
      };

      const dateTime = formatDateTime(entry.captured_at);
      const lat = Number(entry.gps_lat);
      const lng = Number(entry.gps_lng);
      return {
        timestamp: entry.captured_at,
        name: entry.staff_name || "Field staff",
        action: actionLabel(entry.action),
        visitAddress: entry.visit_address || "-",
        vehicleNo: entry.vehicle_no || "-",
        vehicleReading: entry.vehicle_reading != null ? String(entry.vehicle_reading) : "-",
        fuelLitres: entry.fuel_litres != null ? String(entry.fuel_litres) : "-",
        fuelRate: entry.fuel_rate != null ? String(entry.fuel_rate) : "-",
        readingImage: await signed(entry.reading_proof_path),
        fuelBillImage: await signed(entry.fuel_bill_path),
        selfieImage: await signed(entry.selfie_path),
        comments: entry.comments || "-",
        date: dateTime.date,
        coverDistance: entry.cover_distance != null ? String(entry.cover_distance) : "-",
        trackingId: entry.id?.slice(0, 8) || "ERP",
        time: dateTime.time,
        source: "erp" as const,
        mapUrl: Number.isFinite(lat) && Number.isFinite(lng) ? `https://www.google.com/maps?q=${lat},${lng}` : undefined,
        accuracy: entry.gps_accuracy_m != null ? `${Math.round(Number(entry.gps_accuracy_m))}m` : undefined
      };
    })
  );

  return {
    entries,
    error: null as string | null
  };
}

export function getFieldVisitSummary(entries: FieldVisitEntry[]): FieldVisitSummary {
  const actions = entries.map((entry) => entry.action.toLowerCase());
  return {
    todayVisits: entries.filter((entry) => isToday(entry.timestamp)).length,
    activeStaff: new Set(entries.map((entry) => entry.name).filter(Boolean)).size,
    checkIns: actions.filter((action) => action.includes("in")).length,
    checkOuts: actions.filter((action) => action.includes("out")).length,
    totalDistance: entries.reduce((sum, entry) => sum + numberValue(entry.coverDistance), 0),
    fuelEntries: entries.filter((entry) => numberValue(entry.fuelLitres) > 0 || numberValue(entry.fuelRate) > 0).length,
    total: entries.length
  };
}
