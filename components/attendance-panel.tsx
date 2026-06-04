import Link from "next/link";
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Download,
  ExternalLink,
  LogIn,
  LogOut,
  MapPin,
  ShieldCheck,
  TimerReset,
  UserCheck,
  UserX,
  Users
} from "lucide-react";
import {
  type AttendanceEntry,
  buildAttendanceReportCsv,
  getAttendanceOperations,
  getSecureAttendanceEntries,
  getAttendanceSummary
} from "@/lib/attendance";
import { AttendancePunchForm } from "@/components/attendance-punch-form";

export async function AttendancePanel() {
  const secureAttendance = await getSecureAttendanceEntries();
  const combinedEntries = secureAttendance.entries.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
  const summary = getAttendanceSummary(combinedEntries);
  const operations = getAttendanceOperations(combinedEntries);
  const attendanceReportHref = `data:text/csv;charset=utf-8,${encodeURIComponent(
    buildAttendanceReportCsv(combinedEntries, operations.dailyReviews)
  )}`;
  const latestRows = combinedEntries.slice(0, 14);
  const rows: AttendanceEntry[] = latestRows.length
    ? latestRows
    : [
        {
          timestamp: "-",
          doer: "ERP punch pending",
          empCode: "-",
          punch: "Waiting for first punch",
          proofUrl: "-",
          date: "-",
          time: "-",
          month: "-",
          location: "-",
          remarks: "Dashboard layout is ready",
          source: "erp" as const,
          proofLabel: "Selfie"
        }
      ];

  const metrics = [
    { label: "Today punches", value: summary.todayPunches, note: "Current day entries", icon: CalendarDays },
    { label: "Present doers", value: summary.present, note: "Unique doers", icon: Users },
    { label: "Punch in", value: summary.punchIn, note: "In entries", icon: LogIn },
    { label: "Punch out", value: summary.punchOut, note: "Out entries", icon: LogOut },
    { label: "Late review", value: summary.latePunches, note: "After 10:15 AM", icon: TimerReset },
    { label: "Missing checkout", value: summary.missingCheckout, note: "Needs follow-up", icon: UserX },
    { label: "Leave requests", value: summary.leaveRequests, note: "Leave marked", icon: ClipboardList },
    { label: "Complete days", value: summary.completeDays, note: "In and out done", icon: UserCheck }
  ];

  const setupSteps = [
    {
      label: "ERP punch system",
      status: secureAttendance.error ? "Blocked" : "Ready",
      detail: secureAttendance.error || "Doers can mark attendance directly inside Ram Setu ERP."
    },
    {
      label: "Dashboard reporting",
      status: "Ready",
      detail: "Metrics, live register, exception queue, and CSV report are prepared."
    },
    {
      label: "GPS + selfie proof",
      status: secureAttendance.error ? "Blocked" : "Ready",
      detail: secureAttendance.error || "ERP attendance keeps proof private and shows signed links only to approved users."
    }
  ];

  return (
    <div className="space-y-4">
      <section className="overflow-hidden rounded-md border bg-white/95 shadow-sm">
        <div className="brand-panel px-5 py-5 text-white">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-100/80">
                HR Attendance Command Center
              </p>
              <h1 className="mt-2 text-3xl font-semibold tracking-normal">Attendance & Leave Dashboard</h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-cyan-50/82">
                ERP-native doer punch, selfie proof, live location capture, leave visibility, and HR follow-up review in one secure view.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <a
                href={attendanceReportHref}
                download="ram-setu-attendance-report.csv"
                className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-white/30 bg-white/10 px-4 text-sm font-semibold text-white transition-colors hover:bg-white/16"
              >
                <Download className="h-4 w-4" aria-hidden="true" />
                Download Report
              </a>
            </div>
          </div>
        </div>

        <div className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-8">
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

        {secureAttendance.error && (
          <div className="mx-4 mb-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
            <div className="flex gap-3">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <div>
                <p className="font-semibold">ERP attendance setup pending</p>
                <p className="mt-1 leading-5">{secureAttendance.error}</p>
              </div>
            </div>
          </div>
        )}
      </section>

      <AttendancePunchForm />

      <section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-md border bg-white/95 shadow-sm">
          <div className="flex flex-col gap-2 border-b px-4 py-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-xl font-semibold">Daily HR Review</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Aaj ke employee-wise attendance status, proof, GPS aur action list.
              </p>
            </div>
            <span className="rounded-md border bg-muted/40 px-3 py-1 text-xs font-semibold uppercase text-muted-foreground">
              Shift check: 10:15 AM
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[840px] text-left text-sm">
              <thead className="bg-muted/70 text-xs uppercase text-muted-foreground">
                <tr>
                  {["Employee", "First in", "Last out", "Status", "Proof", "Location", "Action"].map((column) => (
                    <th key={column} className="px-4 py-3 font-semibold">
                      {column}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {(operations.dailyReviews.length
                  ? operations.dailyReviews
                  : [
                      {
                        key: "empty",
                        doer: "No punch yet",
                        empCode: "-",
                        firstIn: "-",
                        lastOut: "-",
                        status: "Manual note" as const,
                        proofStatus: "Waiting",
                        locationStatus: "Waiting",
                        actionNeeded: "Aaj ka first punch aane ke baad review auto ready hoga.",
                        source: "-"
                      }
                    ]
                ).map((row) => (
                  <tr key={row.key}>
                    <td className="px-4 py-3">
                      <p className="font-semibold">{row.doer}</p>
                      <p className="text-xs text-muted-foreground">{row.empCode}</p>
                    </td>
                    <td className="px-4 py-3">{row.firstIn}</td>
                    <td className="px-4 py-3">{row.lastOut}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-md px-2 py-1 text-xs font-semibold ${
                          row.status === "Missing checkout"
                            ? "bg-red-50 text-red-700"
                            : row.status === "Late"
                              ? "bg-amber-50 text-amber-700"
                              : row.status === "Leave"
                                ? "bg-slate-100 text-slate-700"
                                : "bg-emerald-50 text-emerald-700"
                        }`}
                      >
                        {row.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{row.proofStatus}</td>
                    <td className="px-4 py-3 text-muted-foreground">{row.locationStatus}</td>
                    <td className="px-4 py-3 font-medium">{row.actionNeeded}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-md border bg-white/95 shadow-sm">
          <div className="border-b px-4 py-3">
            <h2 className="text-xl font-semibold">Exception Queue</h2>
            <p className="mt-1 text-sm text-muted-foreground">HR ko jahan action lena hai woh yahan dikhega.</p>
          </div>
          <div className="space-y-3 p-4">
            {(operations.exceptions.length
              ? operations.exceptions
              : [
                  {
                    key: "clear",
                    doer: "No exception",
                    empCode: "-",
                    type: "All clear",
                    detail: "Aaj ke punches me koi urgent issue nahi mila.",
                    action: "No action",
                    severity: "low" as const
                  }
                ]
            ).map((exception) => (
              <div key={exception.key} className="rounded-md border bg-muted/25 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold">{exception.type}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {exception.doer} {exception.empCode !== "-" ? `(${exception.empCode})` : ""}
                    </p>
                  </div>
                  <span
                    className={`rounded-sm px-2 py-1 text-[10px] font-bold uppercase ${
                      exception.severity === "high"
                        ? "bg-red-50 text-red-700"
                        : exception.severity === "medium"
                          ? "bg-amber-50 text-amber-700"
                          : "bg-emerald-50 text-emerald-700"
                    }`}
                  >
                    {exception.severity}
                  </span>
                </div>
                <p className="mt-3 text-sm leading-5">{exception.detail}</p>
                <p className="mt-2 text-xs font-semibold text-primary">{exception.action}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.4fr_0.8fr]">
        <div className="rounded-md border bg-white/95 shadow-sm">
          <div className="border-b px-4 py-3">
            <h2 className="text-xl font-semibold">Live Attendance Register</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Latest punches from ERP selfie and location capture system.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead className="bg-muted/70 text-xs uppercase text-muted-foreground">
                <tr>
                  {["Date", "Time", "Doer", "Emp Code", "Action", "Location", "Proof", "Source", "Comments"].map((column) => (
                    <th key={column} className="px-4 py-3 font-semibold">
                      {column}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {rows.map((row) => (
                  <tr key={`${row.timestamp}-${row.doer}-${row.punch}`}>
                    <td className="px-4 py-3">{row.date !== "-" ? row.date : row.timestamp}</td>
                    <td className="px-4 py-3">{row.time}</td>
                    <td className="px-4 py-3 font-medium">{row.doer}</td>
                    <td className="px-4 py-3">{row.empCode}</td>
                    <td className="px-4 py-3">{row.punch}</td>
                    <td className="px-4 py-3">
                      {row.mapUrl ? (
                        <Link
                          href={row.mapUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 font-semibold text-primary hover:underline"
                        >
                          Map
                          <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                        </Link>
                      ) : (
                        row.location
                      )}
                      {row.accuracy && row.accuracy !== "-" ? (
                        <p className="mt-1 text-xs text-muted-foreground">Accuracy {row.accuracy}</p>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">
                      {row.proofUrl !== "-" ? (
                        <Link
                          href={row.proofUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 font-semibold text-primary hover:underline"
                        >
                          {row.proofLabel || "View"}
                          <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                        </Link>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold uppercase text-slate-600">
                        {row.source || "erp"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{row.remarks}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-md border bg-white/95 shadow-sm">
            <div className="border-b px-4 py-3">
              <h2 className="text-xl font-semibold">Leave Queue</h2>
              <p className="mt-1 text-sm text-muted-foreground">Requests marked from attendance form.</p>
            </div>
            <div className="space-y-3 p-4">
              <div className="flex items-center justify-between rounded-md border bg-muted/30 px-3 py-3">
                <div>
                  <p className="text-sm font-semibold">Pending review</p>
                  <p className="text-xs text-muted-foreground">HR/Admin action</p>
                </div>
                <span className="text-2xl font-semibold">{summary.leaveRequests}</span>
              </div>
              <div className="flex items-center justify-between rounded-md border bg-muted/30 px-3 py-3">
                <div>
                  <p className="text-sm font-semibold">Same-day punches</p>
                  <p className="text-xs text-muted-foreground">Today's register</p>
                </div>
                <span className="text-2xl font-semibold">{summary.todayPunches}</span>
              </div>
              <div className="flex items-center justify-between rounded-md border bg-muted/30 px-3 py-3">
                <div>
                  <p className="text-sm font-semibold">Missing checkout</p>
                  <p className="text-xs text-muted-foreground">Reminder required</p>
                </div>
                <span className="text-2xl font-semibold">{summary.missingCheckout}</span>
              </div>
            </div>
          </div>

          <div className="rounded-md border bg-white/95 shadow-sm">
            <div className="border-b px-4 py-3">
              <h2 className="text-xl font-semibold">System Health</h2>
              <p className="mt-1 text-sm text-muted-foreground">Attendance setup status.</p>
            </div>
            <div className="space-y-3 p-4">
              {setupSteps.map((step) => (
                <div key={step.label} className="flex gap-3 rounded-md border bg-muted/25 p-3">
                  {step.status === "Blocked" ? (
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-hidden="true" />
                  ) : (
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
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
              <MapPin className="h-4 w-4" aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-lg font-semibold">GPS Proof Control</h2>
              <p className="text-sm text-muted-foreground">Location link, accuracy and selfie proof HR/admin access ke andar rahenge.</p>
            </div>
          </div>
        </div>
        <div className="rounded-md border bg-white/95 p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <ShieldCheck className="h-4 w-4" aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-lg font-semibold">Admin Visibility</h2>
              <p className="text-sm text-muted-foreground">Attendance and leave data stays access controlled inside Ram Setu.</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
