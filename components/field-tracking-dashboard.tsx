import Link from "next/link";
import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  ClipboardList,
  ExternalLink,
  Fuel,
  Gauge,
  LogIn,
  LogOut,
  MapPinned,
  Route,
  ShieldCheck,
  Smartphone,
  Truck,
  UserCheck,
  Users
} from "lucide-react";
import { FieldVisitPunchForm } from "@/components/field-visit-punch-form";
import {
  getSecureFieldVisitEntries,
  getFieldVisitSummary
} from "@/lib/field-tracking";

type AnyRecord = Record<string, any>;

type FieldTrackingDashboardProps = {
  data?: AnyRecord;
};

function km(value: number) {
  return `${value.toFixed(1)} km`;
}

function statusTone(action: string) {
  return action.toLowerCase().includes("out")
    ? "bg-emerald-50 text-emerald-700"
    : "bg-amber-50 text-amber-700";
}

function sortByLatest(rows: Awaited<ReturnType<typeof getSecureFieldVisitEntries>>["entries"]) {
  return [...rows].sort((a, b) => {
    const first = new Date(a.timestamp).getTime();
    const second = new Date(b.timestamp).getTime();
    return (Number.isFinite(second) ? second : 0) - (Number.isFinite(first) ? first : 0);
  });
}

export async function FieldTrackingDashboard(_props: FieldTrackingDashboardProps) {
  const secureVisit = await getSecureFieldVisitEntries();
  const allEntries = sortByLatest(secureVisit.entries);
  const summary = getFieldVisitSummary(allEntries);
  const rows = allEntries.slice(0, 18);
  const checkInRows = allEntries.filter((entry) => entry.action.toLowerCase().includes("in")).slice(0, 6);
  const gpsProofCount = allEntries.filter((entry) => entry.mapUrl).length;
  const imageProofCount = allEntries.filter(
    (entry) => entry.selfieImage || entry.readingImage !== "-" || entry.fuelBillImage !== "-"
  ).length;

  const metrics = [
    { label: "Today visits", value: summary.todayVisits, note: "Current day entries", icon: MapPinned },
    { label: "Active staff", value: summary.activeStaff, note: "Unique field staff", icon: Users },
    { label: "Check in", value: summary.checkIns, note: "Visit starts", icon: LogIn },
    { label: "Check out", value: summary.checkOuts, note: "Visit closes", icon: LogOut },
    { label: "Distance", value: km(summary.totalDistance), note: "Covered distance", icon: Gauge },
    { label: "GPS proof", value: gpsProofCount, note: "ERP location captured", icon: MapPinned },
    { label: "Image proof", value: imageProofCount, note: "Selfie / reading / bill", icon: Camera },
    { label: "Fuel entries", value: summary.fuelEntries, note: "Fuel bill/reading rows", icon: Fuel }
  ];

  const setupSteps = [
    {
      label: "ERP field punch",
      status: secureVisit.error ? "Blocked" : "Ready",
      detail: secureVisit.error || `${secureVisit.entries.length} secure ERP visit punches loaded.`
    },
    {
      label: "Operations Dashboard",
      status: "Ready",
      detail: "Visit register, GPS map links, private proof images, fuel and distance metrics are live."
    }
  ];

  return (
    <div className="space-y-4">
      <section className="overflow-hidden rounded-md border bg-white/95 shadow-sm">
        <div className="brand-panel px-5 py-5 text-white">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-100/80">
                Dispatch & Operations
              </p>
              <h1 className="mt-2 text-3xl font-semibold tracking-normal">Field Visit Tracking Dashboard</h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-cyan-50/82">
                ERP-native GPS check-in, checkout, route, vehicle reading, distance, fuel and private image proof tracking.
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-4">
          {metrics.map((metric) => {
            const Icon = metric.icon;
            return (
              <div key={metric.label} className="rounded-md border bg-muted/30 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium text-muted-foreground">{metric.label}</p>
                  <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </span>
                </div>
                <p className="mt-3 text-2xl font-semibold">{metric.value}</p>
                <p className="mt-1 text-xs text-muted-foreground">{metric.note}</p>
              </div>
            );
          })}
        </div>

        {secureVisit.error && (
          <div className="mx-4 mb-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
            <div className="flex gap-3">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <div>
                <p className="font-semibold">Secure ERP field punch setup required</p>
                <p className="mt-1 leading-5">{secureVisit.error}</p>
              </div>
            </div>
          </div>
        )}
      </section>

      <FieldVisitPunchForm />

      <section className="grid gap-4 xl:grid-cols-[1.4fr_0.8fr]">
        <div className="rounded-md border bg-white/95 shadow-sm">
          <div className="border-b px-4 py-3">
            <h2 className="text-xl font-semibold">Live Field Visit Register</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Latest entries from ERP secure field staff punch system.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1180px] text-left text-sm">
              <thead className="bg-muted/70 text-xs uppercase text-muted-foreground">
                <tr>
                  {[
                    "Date",
                    "Time",
                    "Staff",
                    "Action",
                    "Route / Visit Address",
                    "Vehicle",
                    "KM Reading",
                    "Distance",
                    "GPS Location",
                    "Selfie",
                    "Reading Proof",
                    "Fuel Bill",
                    "Comments",
                    "Source"
                  ].map((column) => (
                    <th key={column} className="px-4 py-3 font-semibold">
                      {column}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {rows.length ? (
                  rows.map((entry) => (
                    <tr key={`${entry.timestamp}-${entry.name}-${entry.action}-${entry.vehicleReading}`}>
                      <td className="px-4 py-3">{entry.date !== "-" ? entry.date : entry.timestamp}</td>
                      <td className="px-4 py-3">{entry.time}</td>
                      <td className="px-4 py-3 font-medium">{entry.name}</td>
                      <td className="px-4 py-3">
                        <span className={`rounded-sm px-2 py-1 text-xs font-semibold ${statusTone(entry.action)}`}>
                          {entry.action}
                        </span>
                      </td>
                      <td className="max-w-[280px] px-4 py-3">
                        <span className="block truncate">{entry.visitAddress}</span>
                        <span className="mt-1 block text-xs text-muted-foreground">Tracking ID: {entry.trackingId}</span>
                      </td>
                      <td className="px-4 py-3">{entry.vehicleNo}</td>
                      <td className="px-4 py-3">{entry.vehicleReading}</td>
                      <td className="px-4 py-3">{entry.coverDistance}</td>
                      <td className="px-4 py-3">
                        {entry.mapUrl ? (
                          <Link
                            href={entry.mapUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 font-semibold text-primary hover:underline"
                          >
                            Map {entry.accuracy ? `(${entry.accuracy})` : ""}
                            <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                          </Link>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {entry.selfieImage && entry.selfieImage !== "-" ? (
                          <Link
                            href={entry.selfieImage}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 font-semibold text-primary hover:underline"
                          >
                            Selfie
                            <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                          </Link>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {entry.readingImage !== "-" ? (
                          <Link
                            href={entry.readingImage}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 font-semibold text-primary hover:underline"
                          >
                            View
                            <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                          </Link>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {entry.fuelBillImage !== "-" ? (
                          <Link
                            href={entry.fuelBillImage}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 font-semibold text-primary hover:underline"
                          >
                            View
                            <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                          </Link>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td className="max-w-[220px] px-4 py-3 text-muted-foreground">
                        <span className="block truncate">{entry.comments}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1 rounded-sm bg-muted px-2 py-1 text-xs font-semibold uppercase text-muted-foreground">
                          {entry.source === "erp" ? <Smartphone className="h-3.5 w-3.5" /> : <ClipboardList className="h-3.5 w-3.5" />}
                          {entry.source || "erp"}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="px-4 py-6 text-muted-foreground" colSpan={14}>
                      No field visit records yet. Submit the first visit from ERP Field Punch.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-md border bg-white/95 shadow-sm">
            <div className="border-b px-4 py-3">
              <h2 className="text-xl font-semibold">Visit Queue</h2>
              <p className="mt-1 text-sm text-muted-foreground">Latest check-in rows from field staff.</p>
            </div>
            <div className="space-y-3 p-4">
              {checkInRows.length ? (
                checkInRows.map((entry) => (
                  <div key={`${entry.timestamp}-${entry.name}`} className="rounded-md border bg-muted/25 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold">{entry.name}</p>
                      <span className={`rounded-sm px-2 py-1 text-xs font-semibold ${statusTone(entry.action)}`}>
                        {entry.action}
                      </span>
                    </div>
                    <p className="mt-1 truncate text-xs text-muted-foreground">{entry.visitAddress}</p>
                    <p className="mt-2 text-xs font-medium text-muted-foreground">
                      {entry.date} {entry.time}
                    </p>
                  </div>
                ))
              ) : (
                <div className="rounded-md border bg-muted/25 p-3">
                  <p className="text-sm font-semibold">No active check-ins</p>
                  <p className="mt-1 text-xs text-muted-foreground">Field visit form entries will appear here.</p>
                </div>
              )}
            </div>
          </div>

          <div className="rounded-md border bg-white/95 shadow-sm">
            <div className="border-b px-4 py-3">
              <h2 className="text-xl font-semibold">System Health</h2>
              <p className="mt-1 text-sm text-muted-foreground">Field visit setup status.</p>
            </div>
            <div className="space-y-3 p-4">
              {setupSteps.map((step) => (
                <div key={step.label} className="flex gap-3 rounded-md border bg-muted/25 p-3">
                  {step.status === "Ready" ? (
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
                  ) : (
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-hidden="true" />
                  )}
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold">{step.label}</p>
                      <span className="rounded-sm bg-muted px-1.5 py-0.5 text-[10px] font-bold uppercase text-muted-foreground">
                        {step.status}
                      </span>
                    </div>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">{step.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-md border bg-white/95 p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <UserCheck className="h-4 w-4" aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-lg font-semibold">Field Visit Control</h2>
              <p className="text-sm text-muted-foreground">Staff movement, route, GPS, vehicle reading and private visit proof from ERP.</p>
            </div>
          </div>
        </div>
        <div className="rounded-md border bg-white/95 p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <ShieldCheck className="h-4 w-4" aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-lg font-semibold">Operations Visibility</h2>
              <p className="text-sm text-muted-foreground">Distance, fuel, vehicle and proof links stay organized inside Dispatch & Operations.</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
