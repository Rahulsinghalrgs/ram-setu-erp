import "dotenv/config";
import cors from "cors";
import express from "express";
import morgan from "morgan";

const app = express();
const port = Number(process.env.PORT || 8080);
const apiKey = process.env.BRIDGE_API_KEY || "";
const allowedOrigin = process.env.ALLOWED_ORIGIN || "https://setu-erp-ruddy.vercel.app";
const accessMode = String(process.env.TALLY_ACCESS_MODE || (process.env.TALLY_XML_URL ? "xml" : "odbc")).toLowerCase();
const companies = String(process.env.TALLY_COMPANY_NAMES || "Richa Global Sales (25-26),Richa Industries")
  .split(/[\n,]/)
  .map((entry) => entry.trim())
  .filter(Boolean);
let odbc;

app.use(cors({ origin: allowedOrigin }));
app.use(express.json({ limit: "2mb" }));
app.use(morgan("combined"));

function requireAuth(req, res, next) {
  if (!apiKey) return res.status(500).json({ error: "BRIDGE_API_KEY is not configured" });
  const token = String(req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  if (token !== apiKey) return res.status(401).json({ error: "Unauthorized" });
  next();
}

function connectionString() {
  if (process.env.TALLY_ODBC_CONNECTION_STRING) return process.env.TALLY_ODBC_CONNECTION_STRING;
  const host = process.env.TALLY_ODBC_HOST;
  const portValue = process.env.TALLY_ODBC_PORT || "6456";
  if (host) return `Driver={Tally ODBC Driver};Server=${host};Port=${portValue};`;
  return "DSN=TallyODBC64_9000;";
}

async function query(sql, params = []) {
  if (!odbc) {
    try {
      odbc = await import("odbc");
    } catch {
      const error = new Error("ODBC package/driver is not available. Set TALLY_ACCESS_MODE=xml and TALLY_XML_URL=http://127.0.0.1:8080, or install/configure ODBC.");
      error.status = 500;
      throw error;
    }
  }
  const connection = await odbc.connect(connectionString());
  try {
    return await connection.query(sql, params);
  } finally {
    await connection.close();
  }
}

function companyFromRequest(req) {
  const company = String(req.query.company || companies[0] || "").trim();
  if (!company) throw new Error("Company name is required");
  return company;
}

function safeCompanyFilter(company) {
  return company.replace(/'/g, "''");
}

async function xmlPost(xml) {
  const url = process.env.TALLY_XML_URL;
  if (!url) {
    const error = new Error("TALLY_XML_URL is not configured for posting");
    error.status = 501;
    throw error;
  }
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "text/xml; charset=utf-8" },
    body: xml
  });
  const text = await response.text();
  if (!response.ok) {
    const error = new Error(`Tally XML returned ${response.status}: ${text.slice(0, 200)}`);
    error.status = 502;
    throw error;
  }
  return text;
}

function decodeXml(value = "") {
  return String(value)
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

function tagValue(block, tag) {
  const match = String(block).match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`, "i"));
  return match ? decodeXml(match[1]) : "";
}

function tagValues(block, tag) {
  return [...String(block).matchAll(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`, "gi"))].map((match) =>
    decodeXml(match[1])
  );
}

function attrValue(block, name) {
  const match = String(block).match(new RegExp(`\\b${name}="([^"]*)"`, "i"));
  return match ? decodeXml(match[1]) : "";
}

function blocks(xml, tag) {
  return [...String(xml).matchAll(new RegExp(`<${tag}(?:\\s[^>]*)?>[\\s\\S]*?</${tag}>`, "gi"))].map((match) => match[0]);
}

function tallyAmount(value) {
  const number = Number(String(value || "").replace(/[₹,\s]/g, ""));
  return Number.isFinite(number) ? Math.abs(number) : 0;
}

function tallyDate(value) {
  const raw = String(value || "").trim();
  const compact = raw.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (compact) return `${compact[1]}-${compact[2]}-${compact[3]}`;
  return raw;
}

function dateToTally(value) {
  const raw = String(value || "").trim();
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return match ? `${match[1]}${match[2]}${match[3]}` : "";
}

function voucherDateFilters(req) {
  const from = dateToTally(req.query.from);
  const to = dateToTally(req.query.to);
  return `
        ${from ? `<SVFROMDATE TYPE="Date">${from}</SVFROMDATE>` : ""}
        ${to ? `<SVTODATE TYPE="Date">${to}</SVTODATE>` : ""}`;
}

async function fetchXmlLedgers(companyName) {
  const xml = `
<ENVELOPE>
  <HEADER><VERSION>1</VERSION><TALLYREQUEST>Export Data</TALLYREQUEST><TYPE>Collection</TYPE><ID>RamSetuBridgeLedgers</ID></HEADER>
  <BODY><DESC>
    <STATICVARIABLES>
      <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
      <SVCURRENTCOMPANY>${xmlEscape(companyName)}</SVCURRENTCOMPANY>
    </STATICVARIABLES>
    <TDL><TDLMESSAGE>
      <COLLECTION NAME="RamSetuBridgeLedgers" ISMODIFY="No">
        <TYPE>Ledger</TYPE>
        <FETCH>Name,Parent,ClosingBalance,LedgerMobile,LedgerPhone,Email,PartyGSTIN,GSTRegistrationNumber</FETCH>
      </COLLECTION>
    </TDLMESSAGE></TDL>
  </DESC></BODY>
</ENVELOPE>`;
  const response = await xmlPost(xml);
  return blocks(response, "LEDGER").map((ledger) => ({
    name: attrValue(ledger, "NAME") || tagValue(ledger, "NAME"),
    parent: tagValue(ledger, "PARENT"),
    closingBalance: tallyAmount(tagValue(ledger, "CLOSINGBALANCE")),
    mobile: tagValue(ledger, "LEDGERMOBILE") || tagValue(ledger, "LEDGERPHONE"),
    email: tagValue(ledger, "EMAIL"),
    gstin: tagValue(ledger, "PARTYGSTIN") || tagValue(ledger, "GSTREGISTRATIONNUMBER")
  })).filter((ledger) => ledger.name);
}

async function fetchXmlVouchers(companyName, voucherType, req) {
  const xml = `
<ENVELOPE>
  <HEADER><VERSION>1</VERSION><TALLYREQUEST>Export Data</TALLYREQUEST><TYPE>Collection</TYPE><ID>RamSetuBridgeVouchers</ID></HEADER>
  <BODY><DESC>
    <STATICVARIABLES>
      <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
      <SVCURRENTCOMPANY>${xmlEscape(companyName)}</SVCURRENTCOMPANY>
      ${voucherDateFilters(req)}
    </STATICVARIABLES>
    <TDL><TDLMESSAGE>
      <COLLECTION NAME="RamSetuBridgeVouchers" ISMODIFY="No">
        <TYPE>Voucher</TYPE>
        <FETCH>Date,VoucherNumber,VoucherTypeName,PartyLedgerName,Amount,AllLedgerEntries</FETCH>
      </COLLECTION>
    </TDLMESSAGE></TDL>
  </DESC></BODY>
</ENVELOPE>`;
  const response = await xmlPost(xml);
  return blocks(response, "VOUCHER")
    .map((voucher) => {
      const amounts = tagValues(voucher, "AMOUNT").map(tallyAmount).filter(Boolean);
      return {
        date: tallyDate(tagValue(voucher, "DATE")),
        voucherNumber: tagValue(voucher, "VOUCHERNUMBER") || tagValue(voucher, "REFERENCE") || attrValue(voucher, "VCHKEY"),
        voucherType: tagValue(voucher, "VOUCHERTYPENAME") || attrValue(voucher, "VCHTYPE"),
        partyName: tagValue(voucher, "PARTYLEDGERNAME"),
        amount: amounts.length ? Math.max(...amounts) : 0
      };
    })
    .filter((voucher) => voucher.voucherType.toLowerCase().includes(voucherType.toLowerCase()));
}

function xmlEscape(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function wrapTallyImport(body) {
  return `<ENVELOPE><HEADER><TALLYREQUEST>Import Data</TALLYREQUEST></HEADER><BODY><IMPORTDATA><REQUESTDESC><REPORTNAME>All Masters</REPORTNAME></REQUESTDESC><REQUESTDATA>${body}</REQUESTDATA></IMPORTDATA></BODY></ENVELOPE>`;
}

app.get("/health", requireAuth, async (_req, res) => {
  res.json({
    ok: true,
    bridge: "ram-setu-tally-bridge",
    mode: accessMode,
    xmlUrl: process.env.TALLY_XML_URL || null,
    odbcHost: process.env.TALLY_ODBC_HOST || null,
    odbcPort: process.env.TALLY_ODBC_PORT || "6456",
    companies
  });
});

app.get("/companies", requireAuth, async (_req, res, next) => {
  try {
    res.json({ companies });
  } catch (error) {
    next(error);
  }
});

app.get("/ledgers", requireAuth, async (req, res, next) => {
  try {
    if (accessMode === "xml") {
      const rows = await fetchXmlLedgers(companyFromRequest(req));
      res.json({ rows });
      return;
    }
    const company = safeCompanyFilter(companyFromRequest(req));
    const rows = await query(
      `select $Name as name, $Parent as parent, $ClosingBalance as closingBalance, $LedgerMobile as mobile, $Email as email, $PartyGSTIN as gstin from Ledger where $_CompanyName='${company}'`
    );
    res.json({ rows });
  } catch (error) {
    next(error);
  }
});

app.get("/outstandings", requireAuth, async (req, res, next) => {
  try {
    if (accessMode === "xml") {
      const rows = (await fetchXmlLedgers(companyFromRequest(req)))
        .filter((ledger) => Number(ledger.closingBalance || 0) !== 0)
        .map((ledger) => ({ ledger: ledger.name, outstanding: ledger.closingBalance }));
      res.json({ rows });
      return;
    }
    const company = safeCompanyFilter(companyFromRequest(req));
    const rows = await query(
      `select $Name as ledger, $ClosingBalance as outstanding from Ledger where $_CompanyName='${company}' and $ClosingBalance <> 0`
    );
    res.json({ rows });
  } catch (error) {
    next(error);
  }
});

app.get("/sales-register", requireAuth, async (req, res, next) => {
  try {
    if (accessMode === "xml") {
      const rows = await fetchXmlVouchers(companyFromRequest(req), "Sales", req);
      res.json({ rows });
      return;
    }
    const company = safeCompanyFilter(companyFromRequest(req));
    const rows = await query(
      `select $Date as date, $VoucherNumber as voucherNumber, $PartyLedgerName as partyName, $Amount as amount from Voucher where $_CompanyName='${company}' and $VoucherTypeName='Sales'`
    );
    res.json({ rows });
  } catch (error) {
    next(error);
  }
});

app.get("/receipt-register", requireAuth, async (req, res, next) => {
  try {
    if (accessMode === "xml") {
      const rows = await fetchXmlVouchers(companyFromRequest(req), "Receipt", req);
      res.json({ rows });
      return;
    }
    const company = safeCompanyFilter(companyFromRequest(req));
    const rows = await query(
      `select $Date as date, $VoucherNumber as voucherNumber, $PartyLedgerName as partyName, $Amount as amount from Voucher where $_CompanyName='${company}' and $VoucherTypeName='Receipt'`
    );
    res.json({ rows });
  } catch (error) {
    next(error);
  }
});

app.post("/ledgers", requireAuth, async (req, res, next) => {
  try {
    const ledger = req.body || {};
    const xml = wrapTallyImport(
      `<TALLYMESSAGE><LEDGER NAME="${xmlEscape(ledger.name)}" ACTION="Create"><NAME>${xmlEscape(ledger.name)}</NAME><PARENT>${xmlEscape(ledger.parent || "Sundry Debtors")}</PARENT><LEDGERMOBILE>${xmlEscape(ledger.mobile)}</LEDGERMOBILE><EMAIL>${xmlEscape(ledger.email)}</EMAIL><PARTYGSTIN>${xmlEscape(ledger.gstin)}</PARTYGSTIN></LEDGER></TALLYMESSAGE>`
    );
    const response = await xmlPost(xml);
    res.json({ ok: true, response: response.slice(0, 500) });
  } catch (error) {
    next(error);
  }
});

app.post("/sales-invoices", requireAuth, async (_req, res) => {
  res.status(501).json({
    error:
      "Sales invoice posting XML must be finalized with Tally team voucher fields, tax ledgers, item ledgers, godown and numbering rules."
  });
});

app.post("/receipts", requireAuth, async (_req, res) => {
  res.status(501).json({
    error:
      "Receipt posting XML must be finalized with Tally team bank/cash ledger, receipt numbering and allocation rules."
  });
});

app.use((error, _req, res, _next) => {
  const status = error.status || 500;
  res.status(status).json({ error: error.message || "Bridge error" });
});

app.listen(port, () => {
  console.log(`Ram Setu Tally Bridge listening on ${port}`);
});
