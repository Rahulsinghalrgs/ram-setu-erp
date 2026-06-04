"use server";

import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

function value(formData: FormData, key: string) {
  return String(formData.get(key) || "").trim();
}

function authRedirect(message: string) {
  redirect(`/auth?error=${encodeURIComponent(message)}`);
}

async function findUserIdByEmail(email: string) {
  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.listUsers();

  if (error) {
    throw new Error(error.message);
  }

  return data.users.find((user) => user.email?.toLowerCase() === email.toLowerCase())?.id || null;
}

async function seedAdminWorkspace(userId: string) {
  const admin = createAdminClient() as any;

  const { data: existingMembership } = await admin
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();

  if (existingMembership?.organization_id) {
    return;
  }

  const { data: organization, error: organizationError } = await admin
    .from("organizations")
    .insert({
      name: "Richa Global Sales",
      state_code: "07",
      currency: "INR"
    })
    .select("id")
    .single();

  if (organizationError) {
    throw new Error(organizationError.message);
  }

  await admin.from("organization_members").insert({
    organization_id: organization.id,
    user_id: userId,
    role: "owner"
  });

  const { data: warehouse } = await admin
    .from("warehouses")
    .insert({
      organization_id: organization.id,
      name: "Wazirpur Dispatch Hub",
      state_code: "07",
      address: "C-57, 3rd Floor, Wazirpur Industrial Area, Delhi"
    })
    .select("id")
    .single();

  const { data: products } = await admin
    .from("products")
    .insert([
      {
        organization_id: organization.id,
        sku: "PIN-TYPEC-001",
        name: "Type-C connector pin",
        hsn_sac: "8536",
        unit: "pcs",
        gst_rate: 18,
        sales_price: 4.8,
        purchase_price: 2.9,
        reorder_level: 5000
      },
      {
        organization_id: organization.id,
        sku: "BNC-CCTV-024",
        name: "CCTV BNC connector component",
        hsn_sac: "8536",
        unit: "pcs",
        gst_rate: 18,
        sales_price: 8.4,
        purchase_price: 5.1,
        reorder_level: 2500
      },
      {
        organization_id: organization.id,
        sku: "WIRE-BRD-100",
        name: "Braided charging/data cable wire",
        hsn_sac: "8544",
        unit: "roll",
        gst_rate: 18,
        sales_price: 2200,
        purchase_price: 1580,
        reorder_level: 40
      }
    ])
    .select("id, sku");

  const { data: customers } = await admin
    .from("customers")
    .insert([
      {
        organization_id: organization.id,
        name: "Mobile accessories manufacturer",
        state_code: "07",
        email: "purchase@mobile-accessories.example",
        phone: "+91 98100 00001",
        billing_address: "Delhi NCR",
        credit_limit: 500000
      },
      {
        organization_id: organization.id,
        name: "Cable assembly unit",
        state_code: "27",
        email: "orders@cable-assembly.example",
        phone: "+91 98100 00002",
        billing_address: "Maharashtra",
        credit_limit: 350000
      }
    ])
    .select("id");

  await admin.from("vendors").insert([
    {
      organization_id: organization.id,
      name: "Overseas wire supplier",
      state_code: "96",
      email: "imports@wire-supplier.example",
      phone: "+86 000 000 000",
      billing_address: "International supplier"
    },
    {
      organization_id: organization.id,
      name: "Precision pin processing unit",
      state_code: "07",
      email: "vendor@pin-processing.example",
      phone: "+91 98100 00004",
      billing_address: "Delhi"
    }
  ]);

  if (warehouse?.id && products?.length) {
    await admin.from("inventory_movements").insert(
      products.map((product: any) => ({
        organization_id: organization.id,
        product_id: product.id,
        warehouse_id: warehouse.id,
        movement_type: "purchase_receipt",
        quantity:
          product.sku === "PIN-TYPEC-001" ? 18400 : product.sku === "BNC-CCTV-024" ? 9800 : 430,
        reference_type: "opening_stock",
        notes: "Initial Richa stock setup",
        created_by: userId
      }))
    );
  }

  if (customers?.length) {
    await admin.from("sales_orders").insert({
      organization_id: organization.id,
      customer_id: customers[0].id,
      order_number: "SO-RGS-1007",
      status: "sent",
      subtotal: 242373,
      cgst: 21813.5,
      sgst: 21813.5,
      igst: 0,
      total: 286000
    });

    await admin.from("invoices").insert({
      organization_id: organization.id,
      customer_id: customers[0].id,
      invoice_number: "INV-RGS-3001",
      invoice_type: "sales",
      status: "sent",
      subtotal: 242373,
      cgst: 21813.5,
      sgst: 21813.5,
      igst: 0,
      total: 286000,
      balance_due: 286000
    });
  }
}

export async function createOrRepairAdmin(formData: FormData) {
  const email = value(formData, "email").toLowerCase();
  const password = value(formData, "password");
  const setupCode = value(formData, "setup_code");
  const requiredCode = process.env.SETUP_SECRET;

  if (!requiredCode || setupCode !== requiredCode) {
    authRedirect("Invalid setup code");
  }

  if (!email.endsWith("@richagroup.co")) {
    authRedirect("Use a richagroup.co email");
  }

  if (password.length < 8) {
    authRedirect("Password must be at least 8 characters");
  }

  const admin = createAdminClient();
  let userId = await findUserIdByEmail(email);

  if (userId) {
    const { error } = await admin.auth.admin.updateUserById(userId, {
      password,
      email_confirm: true,
      user_metadata: { full_name: "Richa Group Admin" }
    });

    if (error) {
      throw new Error(error.message);
    }
  } else {
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: "Richa Group Admin" }
    });

    if (error) {
      throw new Error(error.message);
    }

    userId = data.user?.id || null;
  }

  if (!userId) {
    throw new Error("Could not create admin user.");
  }

  await seedAdminWorkspace(userId);

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    redirect("/auth?created=1");
  }

  redirect("/dashboard");
}
