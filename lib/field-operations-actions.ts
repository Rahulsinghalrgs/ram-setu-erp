"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

type Organization = {
  id: string;
  name: string;
};

async function requireUser() {
  const supabase = await createClient();
  const db = supabase as any;
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth");
  }

  return { supabase: db, user };
}

async function getCurrentOrganization(): Promise<Organization> {
  const { supabase, user } = await requireUser();
  const { data } = await supabase
    .from("organization_members")
    .select("organizations(id, name)")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  const organization = data?.organizations;
  const resolved = Array.isArray(organization) ? organization[0] : organization;

  if (!resolved) {
    redirect("/dashboard/setup");
  }

  return resolved;
}

async function hasFieldAccess(action: "view" | "edit" = "view") {
  const organization = await getCurrentOrganization();
  const { supabase } = await requireUser();
  const { data } = await supabase.rpc("has_module_permission", {
    target_organization_id: organization.id,
    target_module_key: "field_operations",
    target_action: action
  });
  return { organization, allowed: Boolean(data) };
}

function text(formData: FormData, key: string) {
  return String(formData.get(key) || "").trim();
}

function numberValue(formData: FormData, key: string, fallback = 0) {
  const value = Number(formData.get(key));
  return Number.isFinite(value) ? value : fallback;
}

function optionalNumberValue(formData: FormData, key: string) {
  const raw = text(formData, key);
  if (!raw) return null;
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
}

function fileName(formData: FormData, key: string) {
  const file = formData.get(key);
  return file instanceof File && file.name ? file.name : null;
}

function safeStorageName(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "field-proof";
}

async function uploadFieldProof(organizationId: string, userId: string, formData: FormData, key: string, label: string) {
  const file = formData.get(key);
  if (!(file instanceof File) || file.size === 0) {
    return null;
  }

  if (file.size > 8 * 1024 * 1024) {
    throw new Error(`${label} 8 MB se chhota hona chahiye.`);
  }

  const allowedTypes = ["image/", "application/pdf"];
  if (!allowedTypes.some((type) => file.type.startsWith(type))) {
    throw new Error(`${label} ke liye image ya PDF proof allowed hai.`);
  }

  const extension = file.name.includes(".") ? file.name.split(".").pop() : "jpg";
  const path = `${organizationId}/${userId}/${Date.now()}-${safeStorageName(label)}.${extension}`;
  const admin = createAdminClient() as any;
  const { error } = await admin.storage.from("field-visit-proofs").upload(path, file, {
    cacheControl: "3600",
    contentType: file.type || "application/octet-stream",
    upsert: false
  });

  if (error) {
    throw new Error(`${label} upload failed: ${error.message}`);
  }

  return path;
}

export async function addFieldVehicle(formData: FormData) {
  const { organization, allowed } = await hasFieldAccess("edit");
  if (!allowed) {
    throw new Error("You do not have access for this action.");
  }

  const { supabase } = await requireUser();
  await supabase.from("field_vehicles").insert({
    organization_id: organization.id,
    vehicle_no: text(formData, "vehicle_no").toUpperCase(),
    opening_km: numberValue(formData, "opening_km")
  });

  revalidatePath("/dashboard/field-operations");
}

export async function addFieldStaff(formData: FormData) {
  const { organization, allowed } = await hasFieldAccess("edit");
  if (!allowed) {
    throw new Error("You do not have access for this action.");
  }

  const { supabase } = await requireUser();
  await supabase.from("field_staff").insert({
    organization_id: organization.id,
    name: text(formData, "name"),
    phone: text(formData, "phone") || null
  });

  revalidatePath("/dashboard/field-operations");
}

export async function startFieldTrip(formData: FormData) {
  const { organization, allowed } = await hasFieldAccess();
  if (!allowed) {
    throw new Error("You do not have access for this action.");
  }

  const { supabase, user } = await requireUser();
  const fieldStaffId = text(formData, "field_staff_id");

  if (!fieldStaffId) {
    throw new Error("Please select field staff.");
  }

  const { data: selectedStaff } = await supabase
    .from("field_staff")
    .select("id")
    .eq("organization_id", organization.id)
    .eq("id", fieldStaffId)
    .eq("active", true)
    .limit(1)
    .maybeSingle();

  if (!selectedStaff) {
    throw new Error("Selected field staff was not found.");
  }

  const { data: existingTrip } = await supabase
    .from("field_trips")
    .select("id")
    .eq("organization_id", organization.id)
    .eq("field_staff_id", fieldStaffId)
    .eq("status", "open")
    .limit(1)
    .maybeSingle();

  if (existingTrip) {
    throw new Error("This staff member already has an open trip. Checkout first.");
  }

  await supabase.from("field_trips").insert({
    organization_id: organization.id,
    staff_user_id: user.id,
    field_staff_id: fieldStaffId,
    vehicle_id: text(formData, "vehicle_id"),
    visit_address: text(formData, "visit_address"),
    purpose: text(formData, "purpose"),
    checkin_km: numberValue(formData, "checkin_km"),
    checkin_lat: numberValue(formData, "gps_lat", null as any),
    checkin_lng: numberValue(formData, "gps_lng", null as any),
    checkin_accuracy_m: numberValue(formData, "gps_accuracy", null as any),
    checkin_photo_name: fileName(formData, "checkin_photo")
  });

  revalidatePath("/dashboard/field-operations");
}

export async function closeFieldTrip(formData: FormData) {
  const { organization, allowed } = await hasFieldAccess();
  if (!allowed) {
    throw new Error("You do not have access for this action.");
  }

  const { supabase, user } = await requireUser();
  const tripId = text(formData, "trip_id");
  const checkoutKm = numberValue(formData, "checkout_km");

  const { data: trip } = await supabase
    .from("field_trips")
    .select("id, checkin_km, staff_user_id")
    .eq("organization_id", organization.id)
    .eq("id", tripId)
    .eq("status", "open")
    .single();

  if (!trip) {
    throw new Error("Open trip was not found.");
  }

  if (trip.staff_user_id !== user.id) {
    const { allowed: canEdit } = await hasFieldAccess("edit");
    if (!canEdit) {
      throw new Error("You do not have access for this action.");
    }
  }

  if (checkoutKm < Number(trip.checkin_km)) {
    throw new Error("Checkout KM cannot be less than check-in KM.");
  }

  const fuelFilled = text(formData, "fuel_filled") === "yes";
  const fuelLitres = fuelFilled ? numberValue(formData, "fuel_litres") : 0;
  const fuelRate = fuelFilled ? numberValue(formData, "fuel_rate") : 0;

  await supabase
    .from("field_trips")
    .update({
      status: "closed",
      checkout_time: new Date().toISOString(),
      checkout_km: checkoutKm,
      distance_km: checkoutKm - Number(trip.checkin_km),
      checkout_lat: numberValue(formData, "gps_lat", null as any),
      checkout_lng: numberValue(formData, "gps_lng", null as any),
      checkout_accuracy_m: numberValue(formData, "gps_accuracy", null as any),
      checkout_photo_name: fileName(formData, "checkout_photo"),
      fuel_filled: fuelFilled,
      fuel_litres: fuelLitres,
      fuel_rate: fuelRate,
      fuel_bill_photo_name: fileName(formData, "fuel_bill_photo"),
      comments: text(formData, "comments") || null
    })
    .eq("id", tripId);

  revalidatePath("/dashboard/field-operations");
}

export async function markFieldVisitPunch(formData: FormData) {
  const { organization, allowed } = await hasFieldAccess();
  if (!allowed) {
    throw new Error("You do not have access for this action.");
  }

  const { supabase, user } = await requireUser();

  const action = text(formData, "action") || "check_in";
  if (!["check_in", "check_out", "visit_update", "fuel_update"].includes(action)) {
    throw new Error("Invalid field visit action.");
  }

  const visitAddress = text(formData, "visit_address");
  if (!visitAddress) {
    throw new Error("Visit address/route required hai.");
  }

  const lat = numberValue(formData, "gps_lat", NaN);
  const lng = numberValue(formData, "gps_lng", NaN);
  const accuracy = numberValue(formData, "gps_accuracy", NaN);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    throw new Error("Field visit punch ke liye live GPS location capture required hai.");
  }

  const selfie = formData.get("selfie");
  if ((action === "check_in" || action === "check_out") && (!(selfie instanceof File) || selfie.size === 0)) {
    throw new Error("Check in/out ke liye staff selfie required hai.");
  }

  const staffPhoneDigits = text(formData, "staff_phone").replace(/\D/g, "").slice(-10);
  const linkedStaffQuery = supabase
    .from("field_staff")
    .select("id, name, phone")
    .eq("organization_id", organization.id)
    .eq("active", true)
    .limit(1);

  const { data: linkedStaff } = staffPhoneDigits
    ? await linkedStaffQuery.ilike("phone", `%${staffPhoneDigits}%`).maybeSingle()
    : { data: null };

  const readingProofPath = await uploadFieldProof(organization.id, user.id, formData, "reading_proof", "vehicle-reading");
  const fuelBillPath = await uploadFieldProof(organization.id, user.id, formData, "fuel_bill", "fuel-bill");
  const selfiePath = await uploadFieldProof(organization.id, user.id, formData, "selfie", "field-selfie");

  const { error } = await supabase.from("field_visit_punches").insert({
    organization_id: organization.id,
    field_staff_id: linkedStaff?.id || null,
    user_id: user.id,
    staff_name: linkedStaff?.name || text(formData, "staff_name") || user.email?.split("@")[0] || "Field staff",
    staff_phone: linkedStaff?.phone || text(formData, "staff_phone") || null,
    action,
    visit_address: visitAddress,
    vehicle_no: text(formData, "vehicle_no") || null,
    vehicle_reading: optionalNumberValue(formData, "vehicle_reading"),
    cover_distance: optionalNumberValue(formData, "cover_distance"),
    fuel_litres: optionalNumberValue(formData, "fuel_litres"),
    fuel_rate: optionalNumberValue(formData, "fuel_rate"),
    gps_lat: lat,
    gps_lng: lng,
    gps_accuracy_m: Number.isFinite(accuracy) ? accuracy : null,
    reading_proof_path: readingProofPath,
    fuel_bill_path: fuelBillPath,
    selfie_path: selfiePath,
    comments: text(formData, "comments") || null,
    device_info: text(formData, "device_info") || null
  });

  if (error) {
    throw new Error(`Field visit punch failed: ${error.message}`);
  }

  revalidatePath("/dashboard/field-operations");
  revalidatePath("/dashboard/field-operations?system=field-tracking");
}
