import { redirect } from "next/navigation";
import { canAccessModule, getAppContext } from "@/lib/erp-queries";
import { createClient } from "@/lib/supabase/server";

type AnyRecord = Record<string, any>;

export async function getFieldOperationsData() {
  const context = await getAppContext();
  if (!canAccessModule(context, "field_operations")) {
    redirect("/dashboard");
  }

  const supabase = await createClient();
  const db = supabase as any;
  const {
    data: { user }
  } = await supabase.auth.getUser();

  const [vehicles, fieldStaff, trips, members, exceptions] = await Promise.all([
    db
      .from("field_vehicles")
      .select("*")
      .eq("organization_id", context.organization.id)
      .order("vehicle_no"),
    db
      .from("field_staff")
      .select("*")
      .eq("organization_id", context.organization.id)
      .eq("active", true)
      .order("name"),
    db
      .from("field_trips")
      .select("*, field_vehicles(vehicle_no), field_staff(name, phone), profiles(full_name)")
      .eq("organization_id", context.organization.id)
      .order("checkin_time", { ascending: false })
      .limit(80),
    db
      .from("organization_members")
      .select("user_id, role, profiles(full_name, phone)")
      .eq("organization_id", context.organization.id)
      .order("created_at", { ascending: false }),
    db
      .from("field_exceptions")
      .select("*, field_trips(visit_address, field_vehicles(vehicle_no), profiles(full_name))")
      .eq("organization_id", context.organization.id)
      .eq("status", "open")
      .order("created_at", { ascending: false })
      .limit(20)
  ]);

  const tripRows = (trips.data || []) as AnyRecord[];
  const activeTrip = tripRows.find((trip) => trip.staff_user_id === user?.id && trip.status === "open") || null;
  const totalDistance = tripRows.reduce((sum, trip) => sum + Number(trip.distance_km || 0), 0);
  const totalFuelCost = tripRows.reduce(
    (sum, trip) => sum + Number(trip.fuel_litres || 0) * Number(trip.fuel_rate || 0),
    0
  );

  return {
    access: context,
    currentUserId: user?.id || "",
    vehicles: (vehicles.data || []) as AnyRecord[],
    fieldStaff: (fieldStaff.data || []) as AnyRecord[],
    trips: tripRows,
    activeTrip,
    members: (members.data || []) as AnyRecord[],
    exceptions: (exceptions.data || []) as AnyRecord[],
    metrics: {
      trips: tripRows.length,
      openTrips: tripRows.filter((trip) => trip.status === "open").length,
      totalDistance,
      totalFuelCost
    },
    canEdit: canAccessModule(context, "field_operations", "edit")
  };
}
