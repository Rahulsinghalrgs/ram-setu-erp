export type ImsStockItem = {
  itemCode: string;
  itemName: string;
  average: number;
  maxLevel: number;
  inTransit: number;
  godown1: number;
  godown2: number;
  shop: number;
  chinaGodown: number;
  todayIn: number;
  todayOut: number;
  totalStock: number;
};

export type ImsMovement = {
  date: string;
  type: string;
  sku: string;
  item: string;
  qty: number;
  challan: string;
  party: string;
  godown: string;
  remarks: string;
};

const defaultImsFormUrl =
  "https://script.google.com/macros/s/AKfycbwFDj7mSOIU4KTvr-WZDx_pB2bVSPdVSIerZsRm9UIJbeDgwhwQkT0fSAtkM-ZSC3puuQ/exec";
const stockDataCsvUrl =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vSKc7QPP1-Ax606ie59G_WsZGfvAHgiBGmPEMmtXnKo77sXrZrLNfHBmQg6j80whOiRQ6n9pe_Awej9/pub?gid=1840707914&single=true&output=csv";
const stockInOutCsvUrl =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vSKc7QPP1-Ax606ie59G_WsZGfvAHgiBGmPEMmtXnKo77sXrZrLNfHBmQg6j80whOiRQ6n9pe_Awej9/pub?gid=666881685&single=true&output=csv";

export const imsFormUrl = process.env.IMS_FORM_URL || defaultImsFormUrl;
export const imsStockSheetUrl = process.env.IMS_STOCK_SHEET_URL || stockDataCsvUrl;
export const imsMovementSheetUrl = process.env.IMS_MOVEMENT_SHEET_URL || stockInOutCsvUrl;

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

function num(value: string) {
  const parsed = Number(String(value || "").replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

async function fetchCsvRows(url: string) {
  const response = await fetch(url, { next: { revalidate: 45 } });
  if (!response.ok) throw new Error("CSV not accessible");
  const csv = await response.text();
  if (csv.includes("<!DOCTYPE html>") || csv.includes("Sign in to your Google Account")) {
    throw new Error("CSV needs access");
  }
  return parseCsv(csv);
}

export async function getImsData() {
  try {
    const [stockRows, movementRows] = await Promise.all([
      fetchCsvRows(process.env.IMS_STOCK_CSV_URL || stockDataCsvUrl),
      fetchCsvRows(process.env.IMS_MOVEMENT_CSV_URL || stockInOutCsvUrl)
    ]);

    const stockHeaders = stockRows[0] || [];
    const stockRecords = stockRows.slice(1);
    const stockIndexes = {
      itemCode: findColumn(stockHeaders, ["item code"]),
      itemName: findColumn(stockHeaders, ["item name"]),
      average: findColumn(stockHeaders, ["average"]),
      maxLevel: findColumn(stockHeaders, ["max level"]),
      inTransit: findColumn(stockHeaders, ["in transit"]),
      godown1: findColumn(stockHeaders, ["godown 1"]),
      godown2: findColumn(stockHeaders, ["godown 2"]),
      shop: findColumn(stockHeaders, ["shop"]),
      chinaGodown: findColumn(stockHeaders, ["china godown"]),
      todayIn: findColumn(stockHeaders, ["today in"]),
      todayOut: findColumn(stockHeaders, ["today out"]),
      totalStock: findColumn(stockHeaders, ["total stock"])
    };

    const stockItems = stockRecords
      .map((row) => ({
        itemCode: readCell(row, stockIndexes.itemCode),
        itemName: readCell(row, stockIndexes.itemName),
        average: num(readCell(row, stockIndexes.average, "0")),
        maxLevel: num(readCell(row, stockIndexes.maxLevel, "0")),
        inTransit: num(readCell(row, stockIndexes.inTransit, "0")),
        godown1: num(readCell(row, stockIndexes.godown1, "0")),
        godown2: num(readCell(row, stockIndexes.godown2, "0")),
        shop: num(readCell(row, stockIndexes.shop, "0")),
        chinaGodown: num(readCell(row, stockIndexes.chinaGodown, "0")),
        todayIn: num(readCell(row, stockIndexes.todayIn, "0")),
        todayOut: num(readCell(row, stockIndexes.todayOut, "0")),
        totalStock: num(readCell(row, stockIndexes.totalStock, "0"))
      }))
      .filter((item) => item.itemCode !== "-" || item.itemName !== "-");

    const movementHeaders = movementRows[0] || [];
    const movementRecords = movementRows.slice(1);
    const movementIndexes = {
      date: findColumn(movementHeaders, ["date"]),
      type: findColumn(movementHeaders, ["in/out"]),
      sku: findColumn(movementHeaders, ["sku"]),
      item: findColumn(movementHeaders, ["item"]),
      qty: findColumn(movementHeaders, ["qty"]),
      challan: findColumn(movementHeaders, ["challan"]),
      party: findColumn(movementHeaders, ["party"]),
      godown: findColumn(movementHeaders, ["godown"]),
      remarks: findColumn(movementHeaders, ["remarks"])
    };

    const movements = movementRecords
      .map((row) => ({
        date: readCell(row, movementIndexes.date),
        type: readCell(row, movementIndexes.type),
        sku: readCell(row, movementIndexes.sku),
        item: readCell(row, movementIndexes.item),
        qty: num(readCell(row, movementIndexes.qty, "0")),
        challan: readCell(row, movementIndexes.challan),
        party: readCell(row, movementIndexes.party),
        godown: readCell(row, movementIndexes.godown),
        remarks: readCell(row, movementIndexes.remarks)
      }))
      .filter((movement) => movement.sku !== "-" || movement.item !== "-")
      .reverse()
      .slice(0, 80);

    return {
      stockItems,
      movements,
      error: null as string | null
    };
  } catch {
    return {
      stockItems: [] as ImsStockItem[],
      movements: [] as ImsMovement[],
      error: "IMS stock sheet could not be loaded."
    };
  }
}

export function getImsSummary(stockItems: ImsStockItem[], movements: ImsMovement[]) {
  return {
    skuCount: stockItems.length,
    totalStock: stockItems.reduce((sum, item) => sum + item.totalStock, 0),
    todayIn: stockItems.reduce((sum, item) => sum + item.todayIn, 0),
    todayOut: stockItems.reduce((sum, item) => sum + item.todayOut, 0),
    inTransit: stockItems.reduce((sum, item) => sum + item.inTransit, 0),
    movementRows: movements.length,
    godown1: stockItems.reduce((sum, item) => sum + item.godown1, 0),
    godown2: stockItems.reduce((sum, item) => sum + item.godown2, 0),
    shop: stockItems.reduce((sum, item) => sum + item.shop, 0),
    chinaGodown: stockItems.reduce((sum, item) => sum + item.chinaGodown, 0)
  };
}
