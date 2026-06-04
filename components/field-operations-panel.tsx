"use client";

import { useMemo, useState, useTransition } from "react";
import {
  Download,
  Fuel,
  Gauge,
  MapPin,
  MapPinned,
  Plus,
  Route,
  ShieldAlert,
  Truck,
  UserCheck
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

type AnyRecord = Record<string, any>;

type FieldOperationsPanelProps = {
  data: {
    currentUserId: string;
    vehicles: AnyRecord[];
    fieldStaff: AnyRecord[];
    trips: AnyRecord[];
    activeTrip: AnyRecord | null;
    members: AnyRecord[];
    exceptions: AnyRecord[];
    metrics: {
      trips: number;
      openTrips: number;
      totalDistance: number;
      totalFuelCost: number;
    };
    canEdit: boolean;
  };
  addStaffAction: (formData: FormData) => Promise<void>;
  addVehicleAction: (formData: FormData) => Promise<void>;
  startTripAction: (formData: FormData) => Promise<void>;
  closeTripAction: (formData: FormData) => Promise<void>;
};

type GpsState = {
  lat: string;
  lng: string;
  accuracy: string;
  status: string;
};

const initialGps: GpsState = {
  lat: "",
  lng: "",
  accuracy: "",
  status: "GPS not captured"
};

function formatDate(value: string | null | undefined) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date);
}

function toSafeNumber(value: unknown) {
  const number = Number(value || 0);
  return Number.isFinite(number) ? number : 0;
}

function km(value: unknown) {
  return `${toSafeNumber(value).toFixed(1)} km`;
}

function money(value: unknown) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0
  }).format(toSafeNumber(value));
}

function firstRelation(value: unknown) {
  if (Array.isArray(value)) return value[0] as AnyRecord | undefined;
  return value && typeof value === "object" ? (value as AnyRecord) : undefined;
}

function mapLink(lat: string | number | null | undefined, lng: string | number | null | undefined) {
  if (!lat || !lng) return "-";
  return (
    <a
      className="font-semibold text-primary hover:underline"
      href={`https://www.google.com/maps?q=${lat},${lng}`}
      target="_blank"
      rel="noreferrer"
    >
      Map
    </a>
  );
}

function staffName(item: AnyRecord) {
  return firstRelation(item.field_staff)?.name || firstRelation(item.profiles)?.full_name || "Field staff";
}

function vehicleNo(item: AnyRecord) {
  return firstRelation(item.field_vehicles)?.vehicle_no || "-";
}

function fieldStaffName(item: AnyRecord | undefined) {
  return item?.name || "Field staff";
}

function Badge({ children, tone = "blue" }: { children: React.ReactNode; tone?: "blue" | "green" | "amber" | "red" }) {
  const tones = {
    blue: "bg-primary/10 text-primary",
    green: "bg-emerald-50 text-emerald-700",
    amber: "bg-amber-50 text-amber-700",
    red: "bg-red-50 text-red-700"
  };
  return <span className={`rounded-sm px-2 py-1 text-xs font-semibold ${tones[tone]}`}>{children}</span>;
}

function GpsFields({ gps }: { gps: GpsState }) {
  return (
    <>
      <input type="hidden" name="gps_lat" value={gps.lat} />
      <input type="hidden" name="gps_lng" value={gps.lng} />
      <input type="hidden" name="gps_accuracy" value={gps.accuracy} />
    </>
  );
}

export function FieldOperationsPanel({
  data,
  addStaffAction,
  addVehicleAction,
  startTripAction,
  closeTripAction
}: FieldOperationsPanelProps) {
  const [gps, setGps] = useState<GpsState>(initialGps);
  const [fuelFilled, setFuelFilled] = useState("no");
  const [selectedFieldStaffId, setSelectedFieldStaffId] = useState(data.fieldStaff[0]?.id || "");
  const [view, setView] = useState<"staff" | "admin" | "masters">("staff");
  const [isPending, startTransition] = useTransition();

  const selectedStaffTrips = useMemo(
    () => data.trips.filter((trip) => trip.field_staff_id === selectedFieldStaffId),
    [selectedFieldStaffId, data.trips]
  );
  const openTrip = useMemo(
    () => selectedStaffTrips.find((trip) => trip.status === "open") || null,
    [selectedStaffTrips]
  );
  const selectedStaff = data.fieldStaff.find((staff) => staff.id === selectedFieldStaffId);

  function captureGps() {
    setGps((current) => ({ ...current, status: "Capturing GPS..." }));
    if (!navigator.geolocation) {
      setGps({ lat: "28.613900", lng: "77.209000", accuracy: "0", status: "Demo GPS set" });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setGps({
          lat: position.coords.latitude.toFixed(6),
          lng: position.coords.longitude.toFixed(6),
          accuracy: String(Math.round(position.coords.accuracy)),
          status: `GPS captured, accuracy ${Math.round(position.coords.accuracy)}m`
        });
      },
      () => {
        setGps({ lat: "28.613900", lng: "77.209000", accuracy: "0", status: "Demo GPS set, permission blocked" });
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );
  }

  function exportCsv() {
    const rows = [
      ["Status", "Staff", "Vehicle", "Route", "Check-in", "Checkout", "KM", "Fuel"],
      ...data.trips.map((trip) => [
        trip.status,
        staffName(trip),
        vehicleNo(trip),
        trip.visit_address,
        formatDate(trip.checkin_time),
        formatDate(trip.checkout_time),
        trip.distance_km || 0,
        Number(trip.fuel_litres || 0) * Number(trip.fuel_rate || 0)
      ])
    ];
    const csv = rows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "ram-setu-field-operations.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  const metricCards: Array<[string, string | number, LucideIcon]> = [
    ["Today trips", data.metrics.trips, Route],
    ["Open trips", data.metrics.openTrips, MapPin],
    ["Total distance", km(data.metrics.totalDistance), Gauge],
    ["Fuel cost", money(data.metrics.totalFuelCost), Fuel]
  ];
  const tabs: Array<["staff" | "admin" | "masters", string, LucideIcon]> = [
    ["staff", "Staff Trip", UserCheck],
    ["admin", "Admin Monitor", ShieldAlert],
    ["masters", "Staff & Vehicle Master", Truck]
  ];

  return (
    <div className="space-y-4">
      <section className="brand-panel rounded-md p-5 text-white shadow-xl shadow-blue-950/20">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-md border border-white/20 bg-white/12 px-3 py-1.5 text-xs font-semibold uppercase text-white/85">
              <MapPinned className="h-3.5 w-3.5" aria-hidden="true" />
              Ram Setu Field Operations
            </div>
            <h1 className="mt-4 text-3xl font-semibold tracking-normal">Staff visits, GPS proof and fuel control</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-white/82">
              Check-in, checkout, meter proof, vehicle KM, fuel bill record and admin monitoring now live inside Ram Setu ERP.
            </p>
          </div>
          <button
            type="button"
            onClick={exportCsv}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-white/25 bg-white/14 px-4 text-sm font-semibold"
          >
            <Download className="h-4 w-4" aria-hidden="true" />
            Export CSV
          </button>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-4">
        {metricCards.map(([label, value, Icon]) => (
          <div key={label} className="surface-panel rounded-md p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-muted-foreground">{label}</p>
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-primary text-white">
                <Icon className="h-4 w-4" aria-hidden="true" />
              </span>
            </div>
            <p className="mt-3 text-2xl font-semibold text-slate-950">{value}</p>
          </div>
        ))}
      </section>

      <section className="flex flex-wrap gap-2 rounded-md border bg-white/95 p-2 shadow-sm">
        {tabs.map(([key, label, Icon]) => (
          <button
            key={key}
            type="button"
            onClick={() => setView(key)}
            className={`inline-flex h-9 items-center gap-2 rounded-md px-3 text-sm font-semibold ${
              view === key ? "bg-primary text-white" : "text-slate-600 hover:bg-muted"
            }`}
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
            {label}
          </button>
        ))}
      </section>

      {view === "staff" ? (
        <section className="grid gap-4 xl:grid-cols-[0.85fr_1.15fr]">
          <div className="surface-panel rounded-md p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold">Current status</h2>
                <p className="text-sm text-muted-foreground">{fieldStaffName(selectedStaff)} trip state</p>
              </div>
              <Badge tone={openTrip ? "amber" : "green"}>{openTrip ? "Trip open" : "Ready"}</Badge>
            </div>
            <div className="mt-4 grid gap-3 text-sm">
              <div className="rounded-md bg-background p-3 ring-1 ring-border/70">
                <p className="text-muted-foreground">Vehicle</p>
                <p className="mt-1 font-semibold">{openTrip ? vehicleNo(openTrip) : "Not assigned"}</p>
              </div>
              <div className="rounded-md bg-background p-3 ring-1 ring-border/70">
                <p className="text-muted-foreground">Check-in</p>
                <p className="mt-1 font-semibold">{openTrip ? formatDate(openTrip.checkin_time) : "-"}</p>
              </div>
              <div className="rounded-md bg-background p-3 ring-1 ring-border/70">
                <p className="text-muted-foreground">Location</p>
                <p className="mt-1 font-semibold">
                  {openTrip ? mapLink(openTrip.checkin_lat, openTrip.checkin_lng) : gps.status}
                </p>
              </div>
            </div>
          </div>

          <div className="surface-panel rounded-md p-4">
            <div className="flex flex-col gap-3 border-b pb-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-base font-semibold">{openTrip ? "Check Out" : "Check In"}</h2>
                <p className="text-sm text-muted-foreground">{gps.status}</p>
              </div>
              <button
                type="button"
                onClick={captureGps}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-md border bg-white px-3 text-sm font-semibold text-primary shadow-sm"
              >
                <MapPin className="h-4 w-4" aria-hidden="true" />
                Capture GPS
              </button>
            </div>

            {openTrip ? (
              <form
                action={(formData) => startTransition(() => closeTripAction(formData))}
                className="mt-4 grid gap-3 md:grid-cols-2"
              >
                <input type="hidden" name="trip_id" value={openTrip.id} />
                <GpsFields gps={gps} />
                <label className="block text-sm">
                  <span className="font-medium">Field staff</span>
                  <select
                    name="field_staff_id"
                    value={selectedFieldStaffId}
                    onChange={(event) => setSelectedFieldStaffId(event.target.value)}
                    className="mt-1 h-10 w-full rounded-md border bg-white px-3"
                  >
                    {data.fieldStaff.map((staff) => (
                      <option key={staff.id} value={staff.id}>
                        {fieldStaffName(staff)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-sm">
                  <span className="font-medium">End KM reading</span>
                  <input
                    name="checkout_km"
                    type="number"
                    min={Number(openTrip.checkin_km)}
                    step="0.1"
                    required
                    className="mt-1 h-10 w-full rounded-md border bg-white px-3 outline-none focus:ring-2 focus:ring-ring"
                  />
                </label>
                <label className="block text-sm">
                  <span className="font-medium">Petrol filled?</span>
                  <select
                    name="fuel_filled"
                    value={fuelFilled}
                    onChange={(event) => setFuelFilled(event.target.value)}
                    className="mt-1 h-10 w-full rounded-md border bg-white px-3"
                  >
                    <option value="no">No</option>
                    <option value="yes">Yes</option>
                  </select>
                </label>
                {fuelFilled === "yes" ? (
                  <>
                    <label className="block text-sm">
                      <span className="font-medium">Litres</span>
                      <input name="fuel_litres" type="number" min="0" step="0.01" required className="mt-1 h-10 w-full rounded-md border bg-white px-3" />
                    </label>
                    <label className="block text-sm">
                      <span className="font-medium">Rate per litre</span>
                      <input name="fuel_rate" type="number" min="0" step="0.01" required className="mt-1 h-10 w-full rounded-md border bg-white px-3" />
                    </label>
                    <label className="block text-sm md:col-span-2">
                      <span className="font-medium">Petrol bill photo</span>
                      <input name="fuel_bill_photo" type="file" accept="image/*" capture="environment" className="mt-1 w-full rounded-md border bg-white px-3 py-2" />
                    </label>
                  </>
                ) : null}
                <label className="block text-sm md:col-span-2">
                  <span className="font-medium">Meter reading photo</span>
                  <input name="checkout_photo" type="file" accept="image/*" capture="environment" required className="mt-1 w-full rounded-md border bg-white px-3 py-2" />
                </label>
                <label className="block text-sm md:col-span-2">
                  <span className="font-medium">Comments</span>
                  <textarea name="comments" className="mt-1 min-h-20 w-full rounded-md border bg-white px-3 py-2" />
                </label>
                <div className="md:col-span-2">
                  <button disabled={isPending} className="h-10 rounded-md bg-red-600 px-4 text-sm font-medium text-white disabled:opacity-50">
                    Capture GPS & Check Out
                  </button>
                </div>
              </form>
            ) : (
              <form
                action={(formData) => startTransition(() => startTripAction(formData))}
                className="mt-4 grid gap-3 md:grid-cols-2"
              >
                <GpsFields gps={gps} />
                <label className="block text-sm">
                  <span className="font-medium">Field staff</span>
                  <select
                    name="field_staff_id"
                    value={selectedFieldStaffId}
                    onChange={(event) => setSelectedFieldStaffId(event.target.value)}
                    required
                    className="mt-1 h-10 w-full rounded-md border bg-white px-3"
                  >
                    <option value="">Select staff</option>
                    {data.fieldStaff.map((staff) => (
                      <option key={staff.id} value={staff.id}>
                        {fieldStaffName(staff)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-sm">
                  <span className="font-medium">Vehicle</span>
                  <select name="vehicle_id" required className="mt-1 h-10 w-full rounded-md border bg-white px-3">
                    <option value="">Select vehicle</option>
                    {data.vehicles.map((vehicle) => (
                      <option key={vehicle.id} value={vehicle.id}>
                        {vehicle.vehicle_no}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-sm">
                  <span className="font-medium">Start KM reading</span>
                  <input name="checkin_km" type="number" min="0" step="0.1" required className="mt-1 h-10 w-full rounded-md border bg-white px-3" />
                </label>
                <label className="block text-sm md:col-span-2">
                  <span className="font-medium">Visit address / route</span>
                  <textarea name="visit_address" required className="mt-1 min-h-20 w-full rounded-md border bg-white px-3 py-2" />
                </label>
                <label className="block text-sm md:col-span-2">
                  <span className="font-medium">Purpose</span>
                  <input name="purpose" required className="mt-1 h-10 w-full rounded-md border bg-white px-3" />
                </label>
                <label className="block text-sm md:col-span-2">
                  <span className="font-medium">Meter reading photo</span>
                  <input name="checkin_photo" type="file" accept="image/*" capture="environment" required className="mt-1 w-full rounded-md border bg-white px-3 py-2" />
                </label>
                <div className="md:col-span-2">
                  <button disabled={isPending} className="h-10 rounded-md bg-primary px-4 text-sm font-medium text-white disabled:opacity-50">
                    Capture GPS & Check In
                  </button>
                </div>
              </form>
            )}
          </div>
        </section>
      ) : null}

      {view === "staff" ? <TripTable title="Selected Staff Trips" trips={selectedStaffTrips} showStaff={data.canEdit} /> : null}

      {view === "admin" ? (
        <section className="grid gap-4 xl:grid-cols-[1fr_360px]">
          <TripTable title="Trip Monitor" trips={data.trips} showStaff />
          <div className="surface-panel rounded-md p-4">
            <h2 className="text-base font-semibold">Open exceptions</h2>
            <div className="mt-4 space-y-3">
              {data.exceptions.length ? (
                data.exceptions.map((item) => (
                  <div key={item.id} className="rounded-md bg-background p-3 ring-1 ring-border/70">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold">{item.type}</p>
                        <p className="mt-1 text-sm text-muted-foreground">{item.message}</p>
                      </div>
                      <Badge tone="red">Open</Badge>
                    </div>
                  </div>
                ))
              ) : (
                <p className="rounded-md border border-dashed bg-background p-4 text-center text-sm text-muted-foreground">
                  No open exceptions.
                </p>
              )}
            </div>
          </div>
        </section>
      ) : null}

      {view === "masters" ? (
        <section className="grid gap-4 xl:grid-cols-[360px_1fr]">
          <div className="grid gap-4">
            {data.canEdit ? (
              <>
                <form action={addStaffAction} className="surface-panel grid gap-3 rounded-md p-4">
                  <h2 className="text-base font-semibold">Add field staff</h2>
                  <label className="block text-sm">
                    <span className="font-medium">Staff name</span>
                    <input name="name" required placeholder="Rahul Sharma" className="mt-1 h-10 w-full rounded-md border bg-white px-3" />
                  </label>
                  <label className="block text-sm">
                    <span className="font-medium">Mobile number</span>
                    <input name="phone" placeholder="9876543210" className="mt-1 h-10 w-full rounded-md border bg-white px-3" />
                  </label>
                  <button className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-white">
                    <Plus className="h-4 w-4" aria-hidden="true" />
                    Add Staff
                  </button>
                </form>
                <form action={addVehicleAction} className="surface-panel grid gap-3 rounded-md p-4">
                  <h2 className="text-base font-semibold">Add vehicle</h2>
                  <label className="block text-sm">
                    <span className="font-medium">Vehicle number</span>
                    <input name="vehicle_no" required placeholder="DL 01 AB 1234" className="mt-1 h-10 w-full rounded-md border bg-white px-3" />
                  </label>
                  <label className="block text-sm">
                    <span className="font-medium">Opening KM</span>
                    <input name="opening_km" type="number" min="0" step="0.1" required className="mt-1 h-10 w-full rounded-md border bg-white px-3" />
                  </label>
                  <button className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-white">
                    <Plus className="h-4 w-4" aria-hidden="true" />
                    Add Vehicle
                  </button>
                </form>
              </>
            ) : null}
          </div>
          <div className="surface-panel rounded-md p-4">
            <h2 className="text-base font-semibold">Vehicles & staff</h2>
            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground">Field staff master</h3>
                <div className="mt-3 grid gap-3">
                  {data.fieldStaff.length ? (
                    data.fieldStaff.map((staff) => (
                      <div key={staff.id} className="rounded-md bg-background p-3 ring-1 ring-border/70">
                        <p className="font-semibold">{fieldStaffName(staff)}</p>
                        <p className="mt-1 text-sm text-muted-foreground">{staff.phone || "No mobile number"}</p>
                      </div>
                    ))
                  ) : (
                    <p className="rounded-md border border-dashed bg-background p-4 text-sm text-muted-foreground">No field staff added yet.</p>
                  )}
                </div>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground">Vehicle master</h3>
                <div className="mt-3 grid gap-3">
                  {data.vehicles.length ? (
                    data.vehicles.map((vehicle) => (
                      <div key={vehicle.id} className="rounded-md bg-background p-3 ring-1 ring-border/70">
                        <p className="font-semibold">{vehicle.vehicle_no}</p>
                        <p className="mt-1 text-sm text-muted-foreground">Opening KM: {km(vehicle.opening_km)}</p>
                      </div>
                    ))
                  ) : (
                    <p className="rounded-md border border-dashed bg-background p-4 text-sm text-muted-foreground">No vehicles added yet.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}

function TripTable({ title, trips, showStaff = false }: { title: string; trips: AnyRecord[]; showStaff?: boolean }) {
  return (
    <section className="surface-panel rounded-md">
      <div className="border-b px-4 py-3">
        <h2 className="text-base font-semibold">{title}</h2>
        <p className="text-sm text-muted-foreground">GPS, meter proof, KM and fuel records</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead className="bg-muted/70 text-xs uppercase text-muted-foreground">
            <tr>
              {["Status", ...(showStaff ? ["Staff"] : []), "Vehicle", "Route", "Check-in", "Checkout", "KM", "Fuel", "Map"].map((column) => (
                <th key={column} className="px-4 py-3 font-semibold">
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {trips.length ? (
              trips.map((trip) => (
                <tr key={trip.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <Badge tone={trip.status === "open" ? "amber" : "green"}>{trip.status}</Badge>
                  </td>
                  {showStaff ? <td className="px-4 py-3">{staffName(trip)}</td> : null}
                  <td className="px-4 py-3">{vehicleNo(trip)}</td>
                  <td className="px-4 py-3">{trip.visit_address}</td>
                  <td className="px-4 py-3">{formatDate(trip.checkin_time)}</td>
                  <td className="px-4 py-3">{formatDate(trip.checkout_time)}</td>
                  <td className="px-4 py-3">{km(trip.distance_km)}</td>
                  <td className="px-4 py-3">{money(Number(trip.fuel_litres || 0) * Number(trip.fuel_rate || 0))}</td>
                  <td className="px-4 py-3">
                    {mapLink(trip.checkout_lat || trip.checkin_lat, trip.checkout_lng || trip.checkin_lng)}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td className="px-4 py-6 text-muted-foreground" colSpan={showStaff ? 9 : 8}>
                  No field trips yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
