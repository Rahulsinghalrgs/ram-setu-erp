export type OrderDeliveryEntry = {
  orderNumber: string;
  stepCode: string;
  deliveryDate: string;
  salesExecutive: string;
  vendorName: string;
  estimateNo: string;
  sku: string;
  itemName: string;
  qty: string;
  unit: string;
  imageUrl: string;
  dispatchImageUrl: string;
  invoiceImageUrl: string;
  dispatchLocationUrl: string;
  poImageUrl: string;
  returnFormUrl: string;
  overdueStatus: string;
  overduePlanned: string;
  overdueActual: string;
  overdueDelay: string;
  overdueDoer: string;
  stockStatus: string;
  stockPlanned: string;
  stockActual: string;
  stockDelay: string;
  stockDoer: string;
  inventoryAvailable: string;
  dispatchStatus: string;
  dispatchPlanned: string;
  dispatchActual: string;
  dispatchDelay: string;
  dispatchDoer: string;
  billingStatus: string;
  billingPlanned: string;
  billingActual: string;
  billingDelay: string;
  billingDoer: string;
  feedbackStatus: string;
  feedbackPlanned: string;
  feedbackActual: string;
  feedbackDelay: string;
  pendingOrder: string;
  dispatchQuantity: string;
  returnQuantity: string;
  status: string;
  timestamp: string;
};

export type OrderDeliveryProcess = {
  department: string;
  process: string;
  doer: string;
  startDate: string;
  auditor: string;
  problemSolver: string;
  executive: string;
  form: string;
  fms: string;
  checklist: string;
  dashboard: string;
};

export type OrderDeliveryFeed = {
  mode: "orders" | "process";
  entries: OrderDeliveryEntry[];
  processes: OrderDeliveryProcess[];
  error: string | null;
};

const defaultOrderFormUrl =
  "https://script.google.com/a/macros/richagroup.co/s/AKfycbzMd66-_jnygvvAg4YZcZ9GWFGkqBPTHGskMAI5NZFZU6mlupxWRxpnFmgQwhRXSj0kkw/exec";
const defaultOrderCsvUrl =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vQqVh2WjGE_n7ZzAN5TJVS7EjEj2Zfi6lDpnAYu5O--_qrH2BPqGl6cAmRT312iflavEVD_f1ePurxt/pub?gid=663292535&single=true&output=csv";

export const orderDeliveryFormUrl = process.env.ORDER_DELIVERY_FORM_URL || defaultOrderFormUrl;
export const orderDeliverySheetUrl = process.env.ORDER_DELIVERY_SHEET_URL || defaultOrderCsvUrl;

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
    if (index >= 0) return index;
  }
  return -1;
}

function readCell(row: string[], index: number, fallback = "-") {
  return index >= 0 && row[index] ? row[index] : fallback;
}

function findOrderHeaderIndex(rows: string[][]) {
  return rows.findIndex((row) => {
    const normalized = row.join(" ").toLowerCase();
    return (
      (normalized.includes("timestamp") && normalized.includes("order number") && normalized.includes("vendor name")) ||
      (normalized.includes("order") && (normalized.includes("vendor") || normalized.includes("delivery"))) ||
      (normalized.includes("unique key") && normalized.includes("step code"))
    );
  });
}

function statusAt(row: string[], headers: string[], occurrence: number) {
  const statusIndexes = headers.reduce<number[]>((indexes, header, index) => {
    if (header.toLowerCase().includes("status")) indexes.push(index);
    return indexes;
  }, []);
  return readCell(row, statusIndexes[occurrence]);
}

function repeatedColumnAt(row: string[], headers: string[], columnName: string, occurrence: number) {
  const normalizedName = columnName.toLowerCase();
  const indexes = headers.reduce<number[]>((matches, header, index) => {
    if (header.trim().toLowerCase() === normalizedName) matches.push(index);
    return matches;
  }, []);
  return readCell(row, indexes[occurrence]);
}

function stageField(row: string[], headers: string[], stageOccurrence: number, field: "Planned" | "Actual" | "Time Delay" | "Doer's") {
  return repeatedColumnAt(row, headers, field, stageOccurrence);
}

function parseOrderRows(rows: string[][], headerIndex: number): OrderDeliveryEntry[] {
  const headers = rows[headerIndex] || [];
  const records = rows.slice(headerIndex + 1);
  const timestampIndex = findColumn(headers, ["timestamp", "time"]);
  const orderIndex = findColumn(headers, ["unique key", "order number", "order no", "order"]);
  const stepIndex = findColumn(headers, ["step code", "step"]);
  const deliveryDateIndex = findColumn(headers, ["delivery date"]);
  const executiveIndex = findColumn(headers, ["sales executive", "executive"]);
  const vendorIndex = findColumn(headers, ["vendor", "buyer", "customer"]);
  const estimateIndex = findColumn(headers, ["estimate", "invoice"]);
  const skuIndex = findColumn(headers, ["sku"]);
  const itemIndex = findColumn(headers, ["item name", "product"]);
  const qtyIndex = findColumn(headers, ["qty", "quantity"]);
  const unitIndex = findColumn(headers, ["unit"]);
  const imageIndex = findColumn(headers, ["image", "photo", "proof"]);
  const orderImageIndex = findColumn(headers, ["order image"]);
  const dispatchImageIndex = findColumn(headers, ["dispatch image"]);
  const invoiceImageIndex = findColumn(headers, ["invoice image"]);
  const dispatchLocationIndex = findColumn(headers, ["dispatch location"]);
  const poImageIndex = findColumn(headers, ["po image"]);
  const returnFormIndex = findColumn(headers, ["return quantity prefilled"]);
  const inventoryIndex = findColumn(headers, ["inventory available"]);
  const pendingIndex = findColumn(headers, ["pending order"]);
  const dispatchQtyIndex = findColumn(headers, ["dispatch quantity"]);
  const returnQtyIndex = findColumn(headers, ["return quantity"]);
  const statusIndex = findColumn(headers, ["status", "stage"]);

  return records
    .map((row) => ({
      orderNumber: readCell(row, orderIndex, readCell(row, 0)),
      stepCode: readCell(row, stepIndex),
      deliveryDate: readCell(row, deliveryDateIndex),
      salesExecutive: readCell(row, executiveIndex),
      vendorName: readCell(row, vendorIndex),
      estimateNo: readCell(row, estimateIndex),
      sku: readCell(row, skuIndex),
      itemName: readCell(row, itemIndex),
      qty: readCell(row, qtyIndex),
      unit: readCell(row, unitIndex),
      imageUrl: readCell(row, orderImageIndex, readCell(row, imageIndex)),
      dispatchImageUrl: readCell(row, dispatchImageIndex),
      invoiceImageUrl: readCell(row, invoiceImageIndex),
      dispatchLocationUrl: readCell(row, dispatchLocationIndex),
      poImageUrl: readCell(row, poImageIndex),
      returnFormUrl: readCell(row, returnFormIndex),
      overdueStatus: statusAt(row, headers, 0),
      overduePlanned: stageField(row, headers, 0, "Planned"),
      overdueActual: stageField(row, headers, 0, "Actual"),
      overdueDelay: stageField(row, headers, 0, "Time Delay"),
      overdueDoer: stageField(row, headers, 0, "Doer's"),
      stockStatus: statusAt(row, headers, 1),
      stockPlanned: stageField(row, headers, 1, "Planned"),
      stockActual: stageField(row, headers, 1, "Actual"),
      stockDelay: stageField(row, headers, 1, "Time Delay"),
      stockDoer: stageField(row, headers, 1, "Doer's"),
      inventoryAvailable: readCell(row, inventoryIndex),
      dispatchStatus: statusAt(row, headers, 2),
      dispatchPlanned: stageField(row, headers, 2, "Planned"),
      dispatchActual: stageField(row, headers, 2, "Actual"),
      dispatchDelay: stageField(row, headers, 2, "Time Delay"),
      dispatchDoer: stageField(row, headers, 2, "Doer's"),
      billingStatus: statusAt(row, headers, 3),
      billingPlanned: stageField(row, headers, 3, "Planned"),
      billingActual: stageField(row, headers, 3, "Actual"),
      billingDelay: stageField(row, headers, 3, "Time Delay"),
      billingDoer: stageField(row, headers, 3, "Doer's"),
      feedbackStatus: statusAt(row, headers, 4),
      feedbackPlanned: stageField(row, headers, 4, "Planned"),
      feedbackActual: stageField(row, headers, 4, "Actual"),
      feedbackDelay: stageField(row, headers, 4, "Time Delay"),
      pendingOrder: readCell(row, pendingIndex),
      dispatchQuantity: readCell(row, dispatchQtyIndex),
      returnQuantity: readCell(row, returnQtyIndex),
      status: readCell(row, statusIndex, readCell(row, stepIndex, statusAt(row, headers, 2))),
      timestamp: readCell(row, timestampIndex)
    }))
    .filter((entry) => entry.orderNumber !== "-" || entry.vendorName !== "-")
    .reverse()
    .slice(0, 80);
}

export function parseOrderDeliveryCsv(csv: string): OrderDeliveryFeed {
  const rows = parseCsv(csv);
  const orderHeaderIndex = findOrderHeaderIndex(rows);
  if (orderHeaderIndex >= 0) {
    return {
      mode: "orders",
      entries: parseOrderRows(rows, orderHeaderIndex),
      processes: [],
      error: null
    };
  }

  return {
    mode: "process",
    entries: [],
    processes: parseProcessRows(rows),
    error: "Provided CSV abhi system master sheet hai. Actual order response CSV milega to live order register dikhega."
  };
}

function parseProcessRows(rows: string[][]): OrderDeliveryProcess[] {
  const headerIndex = rows.findIndex((row) => row.some((cell) => cell.toLowerCase().includes("list of all processes")));
  const headers = rows[headerIndex] || [];
  const records = rows.slice(headerIndex + 1);
  const departmentIndex = findColumn(headers, ["deptt", "department"]);
  const processIndex = findColumn(headers, ["list of all processes", "process"]);
  const doerIndex = findColumn(headers, ["doer's", "doer"]);
  const startIndex = findColumn(headers, ["date of start", "start"]);
  const auditorIndex = findColumn(headers, ["pc", "auditor"]);
  const problemSolverIndex = findColumn(headers, ["problem solver"]);
  const executiveIndex = findColumn(headers, ["executive"]);
  const formIndex = findColumn(headers, ["google form"]);
  const fmsIndex = findColumn(headers, ["f.m.s", "fms"]);
  const checklistIndex = findColumn(headers, ["checklist"]);
  const dashboardIndex = findColumn(headers, ["dashboard"]);

  let lastDepartment = "";

  return records
    .map((row) => {
      const department = readCell(row, departmentIndex, lastDepartment);
      if (department !== "-") {
        lastDepartment = department;
      }

      return {
        department: department === "-" ? lastDepartment : department,
        process: readCell(row, processIndex),
        doer: readCell(row, doerIndex),
        startDate: readCell(row, startIndex),
        auditor: readCell(row, auditorIndex),
        problemSolver: readCell(row, problemSolverIndex),
        executive: readCell(row, executiveIndex),
        form: readCell(row, formIndex),
        fms: readCell(row, fmsIndex),
        checklist: readCell(row, checklistIndex),
        dashboard: readCell(row, dashboardIndex)
      };
    })
    .filter((row) => {
      const haystack = `${row.department} ${row.process}`.toLowerCase();
      return haystack.includes("sales") || haystack.includes("order to delivery") || haystack.includes("delivery");
    })
    .slice(0, 30);
}

export async function getOrderDeliveryFeed(): Promise<OrderDeliveryFeed> {
  const csvUrl = process.env.ORDER_DELIVERY_SHEET_CSV_URL || defaultOrderCsvUrl;

  try {
    const response = await fetch(csvUrl, { next: { revalidate: 45 } });
    if (!response.ok) {
      return { mode: "orders", entries: [], processes: [], error: "Order response sheet is not accessible yet." };
    }

    const csv = await response.text();
    if (csv.includes("<!DOCTYPE html>") || csv.includes("Sign in to your Google Account")) {
      return { mode: "orders", entries: [], processes: [], error: "Order sheet private hai. CSV/API access chahiye." };
    }

    return parseOrderDeliveryCsv(csv);
  } catch {
    return { mode: "orders", entries: [], processes: [], error: "Order to Delivery feed could not be loaded." };
  }
}
