import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type AttendanceEntry = {
  timestamp: string;
  doer: string;
  empCode: string;
  punch: string;
  proofUrl: string;
  date: string;
  time: string;
  month: string;
  location: string;
  remarks: string;
  source?: "sheet" | "erp";
  proofLabel?: string;
  mapUrl?: string;
  accuracy?: string;
};

export type AttendanceSummary = {
  present: number;
  punchIn: number;
  punchOut: number;
  leaveRequests: number;
  latePunches: number;
  missingCheckout: number;
  completeDays: number;
  todayPunches: number;
  total: number;
};

export type AttendanceDailyReview = {
  key: string;
  doer: string;
  empCode: string;
  firstIn: string;
  lastOut: string;
  status: "Present" | "Late" | "Missing checkout" | "Leave" | "Manual note";
  proofStatus: string;
  locationStatus: string;
  actionNeeded: string;
  source: string;
};

export type AttendanceException = {
  key: string;
  doer: string;
  empCode: string;
  type: string;
  detail: string;
  action: string;
  severity: "high" | "medium" | "low";
};

export type AttendanceOperations = {
  dailyReviews: AttendanceDailyReview[];
  exceptions: AttendanceException[];
  latePunches: number;
  missingCheckout: number;
  completeDays: number;
};

const INDIA_TIME_ZONE = "Asia/Kolkata";
const defaultFormUrl =
  "https://docs.google.com/forms/d/1zj3OhXaEyEtAXOJo63woLdLex4yR49jA1Uje8XWpbyk/viewform";
const defaultSheetUrl =
  "https://docs.google.com/spreadsheets/d/1DrwoQn-7xyQfKNLJop1W-oiL_B0exn0S6d5hhReVDDc/edit?usp=sharing";
const defaultSheetCsvUrl =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vSfCL61a3aGOTaAKvT0gAy3hYwg2cmiXhrMiBsPkuGeoa8PGEWzdpeCqe5tEL7zmZ-XuTyjG5REuA6i/pub?output=csv";

export const attendanceFormUrl = process.env.ATTENDANCE_FORM_URL || defaultFormUrl;
export const attendanceSheetUrl = process.env.ATTENDANCE_SHEET_URL || defaultSheetUrl;

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

function isToday(value: string) {
  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return false;
  }

  const now = new Date();
  return formatIndianDateKey(parsed) === formatIndianDateKey(now);
}

function parseAttendanceDate(value: string) {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatIndianDateKey(value: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: INDIA_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(value);
}

function getIndianTimeParts(value: Date) {
  const parts = new Intl.DateTimeFormat("en-IN", {
    timeZone: INDIA_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).formatToParts(value);
  const hour = Number(parts.find((part) => part.type === "hour")?.value || 0);
  const minute = Number(parts.find((part) => part.type === "minute")?.value || 0);
  return { hour, minute };
}

function isPunchIn(value: string) {
  const normalized = value.toLowerCase();
  return (
    normalized.includes("check in") ||
    normalized.includes("check-in") ||
    normalized === "in" ||
    normalized.includes("punch in")
  );
}

function isPunchOut(value: string) {
  const normalized = value.toLowerCase();
  return (
    normalized.includes("check out") ||
    normalized.includes("check-out") ||
    normalized === "out" ||
    normalized.includes("punch out")
  );
}

function isLeave(value: string) {
  return value.toLowerCase().includes("leave");
}

function isManualNote(value: string) {
  return value.toLowerCase().includes("manual") || value.toLowerCase().includes("note");
}

function employeeKey(entry: AttendanceEntry) {
  return `${entry.empCode !== "-" ? entry.empCode : entry.doer}`.trim().toLowerCase();
}

function safeCsv(value: string | number) {
  const text = String(value ?? "");
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

export async function getAttendanceEntries() {
  const csvUrl = process.env.ATTENDANCE_SHEET_CSV_URL || defaultSheetCsvUrl;

  try {
    const response = await fetch(csvUrl, { next: { revalidate: 45 } });

    if (!response.ok) {
      return {
        entries: [] as AttendanceEntry[],
        configured: true,
        error: "Attendance response sheet is not accessible yet."
      };
    }

    const csv = await response.text();

    if (csv.includes("<!DOCTYPE html>") || csv.includes("Sign in to your Google Account")) {
      return {
        entries: [] as AttendanceEntry[],
        configured: true,
        error: "Google Sheet private hai. ERP ko response CSV/API access dena baaki hai."
      };
    }

    const rows = parseCsv(csv);
    const [headers = [], ...records] = rows;
    const timestampIndex = findColumn(headers, ["timestamp", "time", "date"]);
    const doerIndex = findColumn(headers, ["doer", "employee", "name", "email"]);
    const empCodeIndex = findColumn(headers, ["emp code", "employee code", "code"]);
    const punchIndex = findColumn(headers, ["action", "punch", "attendance", "leave", "status", "in/out"]);
    const proofIndex = findColumn(headers, ["image", "photo", "proof", "selfie"]);
    const dateIndex = findColumn(headers, ["date"]);
    const timeIndex = findColumn(headers, ["time"]);
    const monthIndex = findColumn(headers, ["month"]);
    const locationIndex = findColumn(headers, ["location", "place", "site", "address"]);
    const remarksIndex = findColumn(headers, ["comment", "remark", "note"]);

    const entries = records
      .map((row) => ({
        timestamp: readCell(row, timestampIndex, readCell(row, 0)),
        doer: readCell(row, doerIndex, readCell(row, 1, "Doer")),
        empCode: readCell(row, empCodeIndex),
        punch: readCell(row, punchIndex, "Punch marked"),
        proofUrl: readCell(row, proofIndex),
        date: readCell(row, dateIndex),
        time: readCell(row, timeIndex),
        month: readCell(row, monthIndex),
        location: readCell(row, locationIndex),
        remarks: readCell(row, remarksIndex),
        source: "sheet" as const,
        proofLabel: "View"
      }))
      .filter((entry) => entry.timestamp !== "-" || entry.doer !== "Doer")
      .reverse()
      .slice(0, 50);

    return {
      entries,
      configured: true,
      error: null as string | null
    };
  } catch {
    return {
      entries: [] as AttendanceEntry[],
      configured: true,
      error: "Attendance feed could not be loaded."
    };
  }
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return { date: "-", time: "-", timestamp: "-" };
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return { date: value, time: "-", timestamp: value };

  return {
    timestamp: parsed.toISOString(),
    date: parsed.toLocaleDateString("en-IN", { timeZone: INDIA_TIME_ZONE }),
    time: parsed.toLocaleTimeString("en-IN", {
      timeZone: INDIA_TIME_ZONE,
      hour: "2-digit",
      minute: "2-digit"
    })
  };
}

function punchLabel(value: string) {
  if (value === "check_in") return "Check In";
  if (value === "check_out") return "Check Out";
  if (value === "leave") return "Leave";
  return "Manual Note";
}

export async function getSecureAttendanceEntries() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return { entries: [] as AttendanceEntry[], error: null as string | null };
  }

  const { data: membership } = await (supabase as any)
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (!membership?.organization_id) {
    return { entries: [] as AttendanceEntry[], error: null as string | null };
  }

  const { data, error } = await (supabase as any)
    .from("attendance_punches")
    .select("*")
    .eq("organization_id", membership.organization_id)
    .order("captured_at", { ascending: false })
    .limit(50);

  if (error) {
    return {
      entries: [] as AttendanceEntry[],
      error: "ERP attendance table pending hai. Supabase migration run karte hi location/selfie punch live ho jayega."
    };
  }

  let signedUrls = new Map<string, string>();
  const selfiePaths = (data || []).map((entry: any) => entry.selfie_path).filter(Boolean);

  if (selfiePaths.length) {
    try {
      const admin = createAdminClient() as any;
      const { data: signed } = await admin.storage
        .from("attendance-selfies")
        .createSignedUrls(selfiePaths, 60 * 20);
      signedUrls = new Map((signed || []).map((item: any) => [item.path, item.signedUrl]));
    } catch {
      signedUrls = new Map();
    }
  }

  return {
    entries: (data || []).map((entry: any) => {
      const formatted = formatDateTime(entry.captured_at);
      const hasLocation = entry.gps_lat && entry.gps_lng;
      return {
        timestamp: formatted.timestamp,
        doer: entry.employee_name || "Employee",
        empCode: entry.employee_code || "-",
        punch: punchLabel(entry.punch_type),
        proofUrl: entry.selfie_path ? signedUrls.get(entry.selfie_path) || "-" : "-",
        proofLabel: "Selfie",
        date: formatted.date,
        time: formatted.time,
        month: "-",
        location: entry.location_note || (hasLocation ? `${entry.gps_lat}, ${entry.gps_lng}` : "-"),
        mapUrl: hasLocation ? `https://www.google.com/maps?q=${entry.gps_lat},${entry.gps_lng}` : undefined,
        accuracy: entry.gps_accuracy_m ? `${entry.gps_accuracy_m}m` : "-",
        remarks: entry.remarks || "-",
        source: "erp" as const
      };
    }) as AttendanceEntry[],
    error: null as string | null
  };
}

export function getAttendanceSummary(entries: AttendanceEntry[]): AttendanceSummary {
  const normalizedPunches = entries.map((entry) => entry.punch.toLowerCase());
  const punchIn = entries.filter((entry) => isPunchIn(entry.punch)).length;
  const punchOut = entries.filter((entry) => isPunchOut(entry.punch)).length;
  const leaveRequests = normalizedPunches.filter((value) => value.includes("leave")).length;
  const todayPunches = entries.filter((entry) => isToday(entry.timestamp)).length;
  const operations = getAttendanceOperations(entries);

  return {
    present: new Set(entries.map((entry) => entry.doer).filter(Boolean)).size,
    punchIn,
    punchOut,
    leaveRequests,
    latePunches: operations.latePunches,
    missingCheckout: operations.missingCheckout,
    completeDays: operations.completeDays,
    todayPunches,
    total: entries.length
  };
}

export function getAttendanceOperations(entries: AttendanceEntry[]): AttendanceOperations {
  const todayEntries = entries
    .filter((entry) => isToday(entry.timestamp))
    .sort((a, b) => {
      const aDate = parseAttendanceDate(a.timestamp)?.getTime() || 0;
      const bDate = parseAttendanceDate(b.timestamp)?.getTime() || 0;
      return aDate - bDate;
    });
  const grouped = new Map<string, AttendanceEntry[]>();

  for (const entry of todayEntries) {
    const key = employeeKey(entry);
    if (!key) continue;
    grouped.set(key, [...(grouped.get(key) || []), entry]);
  }

  const dailyReviews: AttendanceDailyReview[] = [];
  const exceptions: AttendanceException[] = [];
  const lateCutoffHour = 10;
  const lateCutoffMinute = 15;

  for (const [key, employeeEntries] of grouped) {
    const first = employeeEntries[0];
    const ins = employeeEntries.filter((entry) => isPunchIn(entry.punch));
    const outs = employeeEntries.filter((entry) => isPunchOut(entry.punch));
    const leaves = employeeEntries.filter((entry) => isLeave(entry.punch));
    const notes = employeeEntries.filter((entry) => isManualNote(entry.punch));
    const firstIn = ins[0];
    const lastOut = outs[outs.length - 1];
    const firstInDate = parseAttendanceDate(firstIn?.timestamp || "");
    const firstInIndianTime = firstInDate ? getIndianTimeParts(firstInDate) : null;
    const isLate =
      Boolean(firstInIndianTime) &&
      ((firstInIndianTime?.hour || 0) > lateCutoffHour ||
        ((firstInIndianTime?.hour || 0) === lateCutoffHour &&
          (firstInIndianTime?.minute || 0) > lateCutoffMinute));
    const hasProof = employeeEntries.some((entry) => entry.proofUrl !== "-");
    const hasLocation = employeeEntries.some((entry) => Boolean(entry.mapUrl) || entry.location !== "-");

    let status: AttendanceDailyReview["status"] = "Present";
    let actionNeeded = "No action";

    if (leaves.length) {
      status = "Leave";
      actionNeeded = "HR approval / leave note review";
    } else if (firstIn && !lastOut) {
      status = "Missing checkout";
      actionNeeded = "Checkout follow-up";
    } else if (isLate) {
      status = "Late";
      actionNeeded = "Late mark review";
    } else if (notes.length && !firstIn) {
      status = "Manual note";
      actionNeeded = "Admin verification";
    }

    dailyReviews.push({
      key,
      doer: first.doer,
      empCode: first.empCode,
      firstIn: firstIn?.time || "-",
      lastOut: lastOut?.time || "-",
      status,
      proofStatus: hasProof ? "Selfie/proof available" : "Proof pending",
      locationStatus: hasLocation ? "GPS/location available" : "Location pending",
      actionNeeded,
      source: employeeEntries.some((entry) => entry.source === "erp") ? "ERP" : "Sheet"
    });

    if (status === "Missing checkout") {
      exceptions.push({
        key: `${key}-missing-checkout`,
        doer: first.doer,
        empCode: first.empCode,
        type: "Missing checkout",
        detail: `Check-in ${firstIn?.time || "-"} ke baad checkout missing hai.`,
        action: "Doer ko checkout reminder bhejo",
        severity: "high"
      });
    }

    if (status === "Late") {
      exceptions.push({
        key: `${key}-late`,
        doer: first.doer,
        empCode: first.empCode,
        type: "Late check-in",
        detail: `First check-in ${firstIn?.time || "-"} par hua.`,
        action: "HR late approval / reason capture",
        severity: "medium"
      });
    }

    if (leaves.length) {
      exceptions.push({
        key: `${key}-leave`,
        doer: first.doer,
        empCode: first.empCode,
        type: "Leave request",
        detail: leaves[0]?.remarks || "Leave marked from attendance form.",
        action: "Approve, reject, ya remarks update karo",
        severity: "low"
      });
    }

    if (!hasProof && first.source === "erp") {
      exceptions.push({
        key: `${key}-proof`,
        doer: first.doer,
        empCode: first.empCode,
        type: "Proof pending",
        detail: "ERP punch me selfie/proof missing hai.",
        action: "Admin verification required",
        severity: "medium"
      });
    }
  }

  return {
    dailyReviews,
    exceptions: exceptions.slice(0, 8),
    latePunches: dailyReviews.filter((entry) => entry.status === "Late").length,
    missingCheckout: dailyReviews.filter((entry) => entry.status === "Missing checkout").length,
    completeDays: dailyReviews.filter((entry) => entry.firstIn !== "-" && entry.lastOut !== "-").length
  };
}

export function buildAttendanceReportCsv(entries: AttendanceEntry[], reviews: AttendanceDailyReview[]) {
  const reviewRows = [
    ["Report Type", "Employee", "Emp Code", "First In", "Last Out", "Status", "Proof", "Location", "Action", "Source"],
    ...reviews.map((entry) => [
      "Daily Review",
      entry.doer,
      entry.empCode,
      entry.firstIn,
      entry.lastOut,
      entry.status,
      entry.proofStatus,
      entry.locationStatus,
      entry.actionNeeded,
      entry.source
    ])
  ];
  const registerRows = [
    ["Report Type", "Date", "Time", "Employee", "Emp Code", "Punch", "Location", "Proof", "Source", "Remarks"],
    ...entries.map((entry) => [
      "Punch Register",
      entry.date,
      entry.time,
      entry.doer,
      entry.empCode,
      entry.punch,
      entry.location,
      entry.proofUrl,
      entry.source || "sheet",
      entry.remarks
    ])
  ];

  return [...reviewRows, [], ...registerRows]
    .map((row) => row.map((cell) => safeCsv(cell)).join(","))
    .join("\n");
}
