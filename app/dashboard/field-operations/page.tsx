import { FieldTrackingDashboard } from "@/components/field-tracking-dashboard";
import { FieldOperationsPanel } from "@/components/field-operations-panel";
import { addFieldStaff, addFieldVehicle, closeFieldTrip, startFieldTrip } from "@/lib/field-operations-actions";
import { getFieldOperationsData } from "@/lib/field-operations-queries";

type FieldOperationsPageProps = {
  searchParams?: Promise<{
    system?: string;
  }>;
};

export default async function FieldOperationsPage({ searchParams }: FieldOperationsPageProps) {
  const data = await getFieldOperationsData();
  const params = await searchParams;

  if (params?.system === "field-tracking") {
    return <FieldTrackingDashboard data={data} />;
  }

  return (
    <FieldOperationsPanel
      data={data}
      addStaffAction={addFieldStaff}
      addVehicleAction={addFieldVehicle}
      startTripAction={startFieldTrip}
      closeTripAction={closeFieldTrip}
    />
  );
}
