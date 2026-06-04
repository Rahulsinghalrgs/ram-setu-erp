import { NextRequest, NextResponse } from "next/server";
import { createHash, timingSafeEqual } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";

type EnquiryPayload = {
  company?: string;
  name?: string;
  client_name?: string;
  contact_person?: string;
  phone?: string;
  whatsapp?: string;
  email?: string;
  gstin?: string;
  city?: string;
  state?: string;
  source?: string;
  owner_name?: string;
  requirement?: string;
  product_requirement?: string;
  sku?: string;
  quantity?: string | number;
  next_follow_up_date?: string;
  remarks?: string;
  message?: string;
};

type PublicOrderPayload = EnquiryPayload & {
  product_name?: string;
  item_name?: string;
  unit_price?: string | number;
  order_date?: string;
  delivery_date?: string;
  priority?: string;
  po_url?: string;
  order_proof_url?: string;
};

function safeText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizePhone(value: unknown) {
  return safeText(value).replace(/[^\d+]/g, "");
}

function hash(value: string) {
  return createHash("sha256").update(value).digest();
}

function isValidApiKey(request: NextRequest) {
  const configuredKey = process.env.RAM_SETU_ERP_API_KEY || process.env.SETUP_SECRET || "";
  if (!configuredKey) return false;

  const bearer = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || "";
  const headerKey = request.headers.get("x-api-key") || "";
  const providedKey = bearer || headerKey;
  if (!providedKey) return false;

  const configuredHash = hash(configuredKey);
  const providedHash = hash(providedKey);
  return timingSafeEqual(configuredHash, providedHash);
}

async function getOrganizationId(admin: any) {
  const configuredOrgId = process.env.RAM_SETU_ORGANIZATION_ID;
  if (configuredOrgId) return configuredOrgId;

  const { data, error } = await admin
    .from("organizations")
    .select("id")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error || !data?.id) {
    throw new Error("ERP organization is not configured.");
  }

  return data.id as string;
}

function buildRemarks(payload: EnquiryPayload) {
  const parts = [
    safeText(payload.requirement || payload.product_requirement || payload.message),
    payload.sku ? `SKU: ${safeText(payload.sku)}` : "",
    payload.quantity ? `Qty: ${safeText(String(payload.quantity))}` : "",
    safeText(payload.remarks)
  ].filter(Boolean);

  return parts.join(" | ") || null;
}

async function upsertPublicCustomer(admin: any, organizationId: string, payload: EnquiryPayload) {
  const companyName = safeText(payload.company || payload.client_name || payload.name);
  if (!companyName) {
    throw new Error("company/name is required");
  }

  const phone = normalizePhone(payload.phone);
  const whatsapp = normalizePhone(payload.whatsapp) || phone;
  const email = safeText(payload.email).toLowerCase() || null;

  let existingId: string | null = null;
  const candidateFilters = [
    ["whatsapp", whatsapp],
    ["phone", phone],
    ["email", email],
    ["name", companyName]
  ] as Array<[string, string | null]>;

  for (const [column, value] of candidateFilters) {
    if (!value) continue;
    const query = admin
      .from("customers")
      .select("id")
      .eq("organization_id", organizationId)
      .limit(1);
    const { data } =
      column === "name"
        ? await query.ilike("name", value).maybeSingle()
        : await query.eq(column, value).maybeSingle();
    if (data?.id) {
      existingId = data.id;
      break;
    }
  }

  const customerPayload = {
    organization_id: organizationId,
    name: companyName,
    contact_person: safeText(payload.contact_person) || null,
    phone: phone || null,
    whatsapp: whatsapp || null,
    email,
    gstin: safeText(payload.gstin) || null,
    city: safeText(payload.city) || null,
    state_name: safeText(payload.state) || null,
    source: safeText(payload.source) || "api_enquiry",
    owner_name: safeText(payload.owner_name) || null,
    client_type: "lead",
    priority: "medium",
    status: "active",
    preferred_channel: whatsapp ? "whatsapp" : email ? "email" : "phone",
    next_follow_up_date: safeText(payload.next_follow_up_date) || null,
    remarks: buildRemarks(payload)
  };

  const result = existingId
    ? await admin.from("customers").update(customerPayload).eq("id", existingId).select("id").single()
    : await admin.from("customers").insert(customerPayload).select("id").single();

  if (result.error || !result.data?.id) {
    throw new Error(result.error?.message || "Enquiry save failed");
  }

  return {
    customerId: result.data.id as string,
    status: existingId ? "updated" : "created",
    companyName
  };
}

function numberFromPayload(value: unknown, fallback = 0) {
  const parsed = Number(String(value || "").replace(/[₹,\s]/g, ""));
  return Number.isFinite(parsed) ? parsed : fallback;
}

function dateFromPayload(value: unknown) {
  const text = safeText(value);
  return text || null;
}

async function findProduct(admin: any, organizationId: string, payload: PublicOrderPayload) {
  const sku = safeText(payload.sku);
  const productName = safeText(payload.product_name || payload.item_name || payload.product_requirement || payload.requirement);

  if (sku) {
    const { data } = await admin
      .from("products")
      .select("id, sku, name, unit, gst_rate, sales_price")
      .eq("organization_id", organizationId)
      .ilike("sku", sku)
      .limit(1)
      .maybeSingle();
    if (data) return data;
  }

  if (productName) {
    const { data } = await admin
      .from("products")
      .select("id, sku, name, unit, gst_rate, sales_price")
      .eq("organization_id", organizationId)
      .ilike("name", `%${productName}%`)
      .limit(1)
      .maybeSingle();
    if (data) return data;
  }

  return null;
}

async function generateOrderNumber(admin: any, organizationId: string) {
  const { data } = await admin
    .from("sales_orders")
    .select("order_number")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(100);

  const maxNumber = ((data || []) as Array<{ order_number?: string }>)
    .map((order) => Number(String(order.order_number || "").match(/(\d+)$/)?.[1] || 0))
    .filter(Number.isFinite)
    .reduce((max, value) => Math.max(max, value), 2452);

  return `ORD-${maxNumber + 1}`;
}

function calculateTotals(quantity: number, unitPrice: number, gstRate: number, overrideTotal = 0) {
  const lineTotal = Math.round(quantity * unitPrice * 100) / 100;
  const subtotal = overrideTotal > 0 ? Math.round((overrideTotal / (1 + gstRate / 100)) * 100) / 100 : lineTotal;
  const tax = Math.round(subtotal * (gstRate / 100) * 100) / 100;
  return {
    lineTotal,
    subtotal,
    cgst: Math.round((tax / 2) * 100) / 100,
    sgst: Math.round((tax / 2) * 100) / 100,
    igst: 0,
    total: overrideTotal > 0 ? overrideTotal : Math.round((subtotal + tax) * 100) / 100
  };
}

export async function handlePublicEnquiry(request: NextRequest) {
  if (!isValidApiKey(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  let payload: EnquiryPayload;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const admin = createAdminClient() as any;
  const organizationId = await getOrganizationId(admin);

  try {
    const result = await upsertPublicCustomer(admin, organizationId, payload);
    return NextResponse.json({
      ok: true,
      enquiry_id: result.customerId,
      client_id: result.customerId,
      status: result.status
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Enquiry save failed" },
      { status: error instanceof Error && error.message.includes("required") ? 400 : 500 }
    );
  }
}

export async function handlePublicOrder(request: NextRequest) {
  if (!isValidApiKey(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  let payload: PublicOrderPayload;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const admin = createAdminClient() as any;
  const organizationId = await getOrganizationId(admin);
  const quantity = numberFromPayload(payload.quantity, 0);
  if (quantity <= 0) {
    return NextResponse.json({ ok: false, error: "quantity is required" }, { status: 400 });
  }

  try {
    const customer = await upsertPublicCustomer(admin, organizationId, {
      ...payload,
      source: safeText(payload.source) || "website_order",
      remarks: [safeText(payload.remarks), "Website order intake"].filter(Boolean).join(" | ")
    });
    const product = await findProduct(admin, organizationId, payload);
    if (!product) {
      return NextResponse.json(
        { ok: false, error: "Product/SKU not found in ERP Product Master" },
        { status: 422 }
      );
    }

    const orderNumber = await generateOrderNumber(admin, organizationId);
    const unitPrice = numberFromPayload(payload.unit_price, Number(product.sales_price || 0));
    const gstRate = Number(product.gst_rate || 18);
    const totals = calculateTotals(quantity, unitPrice, gstRate);
    const requirement = safeText(payload.requirement || payload.product_requirement || payload.message);

    const { data: order, error: orderError } = await admin
      .from("sales_orders")
      .insert({
        organization_id: organizationId,
        customer_id: customer.customerId,
        order_number: orderNumber,
        status: "sent",
        order_date: dateFromPayload(payload.order_date) || undefined,
        delivery_date: dateFromPayload(payload.delivery_date),
        sales_executive: safeText(payload.owner_name) || null,
        order_source: safeText(payload.source) || "website_order",
        priority: safeText(payload.priority) || "medium",
        payment_check_status: "pending",
        stock_status: "pending",
        dispatch_status: "pending",
        billing_status: "pending",
        delivery_status: "pending",
        feedback_status: "pending",
        order_proof_url: safeText(payload.order_proof_url) || null,
        po_url: safeText(payload.po_url) || null,
        remarks: [requirement, safeText(payload.remarks), "Auto-created from website. Sales review required."]
          .filter(Boolean)
          .join(" | "),
        fms_stage_payload: {
          intake: "website",
          client_status: customer.status,
          product_sku: product.sku,
          product_name: product.name
        },
        fms_synced_at: new Date().toISOString(),
        subtotal: totals.subtotal,
        cgst: totals.cgst,
        sgst: totals.sgst,
        igst: totals.igst,
        total: totals.total
      })
      .select("id")
      .single();

    if (orderError || !order?.id) {
      throw new Error(orderError?.message || "Order save failed");
    }

    const { error: itemError } = await admin.from("sales_order_items").insert({
      sales_order_id: order.id,
      organization_id: organizationId,
      product_id: product.id,
      quantity,
      unit_price: unitPrice,
      gst_rate: gstRate,
      line_total: totals.lineTotal
    });

    if (itemError) throw new Error(itemError.message);

    return NextResponse.json({
      ok: true,
      order_id: order.id,
      order_number: orderNumber,
      client_id: customer.customerId,
      sku: product.sku,
      status: "pending_review"
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Order save failed" },
      { status: error instanceof Error && error.message.includes("required") ? 400 : 500 }
    );
  }
}
