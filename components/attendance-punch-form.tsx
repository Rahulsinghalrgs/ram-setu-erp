"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Camera, CheckCircle2, Loader2, LocateFixed, ShieldCheck } from "lucide-react";
import { markAttendancePunch } from "@/lib/erp-actions";

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
  status: "Location not captured"
};

export function AttendancePunchForm() {
  const [gps, setGps] = useState(initialGps);
  const [message, setMessage] = useState("");
  const [selfieSelected, setSelfieSelected] = useState(false);
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const didAutoCapture = useRef(false);
  const canSave = Boolean(gps.lat && gps.lng && selfieSelected);

  useEffect(() => {
    if (didAutoCapture.current) return;
    didAutoCapture.current = true;
    captureLocation();
  }, []);

  function captureLocation() {
    setMessage("");
    setGps((current) => ({ ...current, status: "Capturing live location..." }));

    if (!navigator.geolocation) {
      setGps({ lat: "", lng: "", accuracy: "", status: "Location not supported on this device" });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setGps({
          lat: position.coords.latitude.toFixed(6),
          lng: position.coords.longitude.toFixed(6),
          accuracy: String(Math.round(position.coords.accuracy)),
          status: `Location captured, accuracy ${Math.round(position.coords.accuracy)}m`
        });
      },
      () => {
        setGps({
          lat: "",
          lng: "",
          accuracy: "",
          status: "Location permission blocked. Please allow location and try again."
        });
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  }

  function submitPunch(formData: FormData) {
    setMessage("");
    formData.set("device_info", navigator.userAgent || "browser");
    startTransition(async () => {
      try {
        await markAttendancePunch(formData);
        formRef.current?.reset();
        setGps(initialGps);
        setSelfieSelected(false);
        setMessage("Attendance punch saved successfully.");
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Attendance punch failed.");
      }
    });
  }

  return (
    <section className="rounded-md border bg-white/95 shadow-sm">
      <div className="border-b p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">ERP Punch</p>
        <h2 className="text-xl font-semibold">Quick Location + Selfie Punch</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Employee login se name auto match hoga. Sirf punch type confirm karo, selfie lo, aur Save punch karo.
        </p>
      </div>
      <form ref={formRef} action={submitPunch} className="grid gap-4 p-4 lg:grid-cols-3">
        <input type="hidden" name="gps_lat" value={gps.lat} />
        <input type="hidden" name="gps_lng" value={gps.lng} />
        <input type="hidden" name="gps_accuracy" value={gps.accuracy} />
        <input type="hidden" name="device_info" value="" />

        <label className="block text-sm">
          <span className="font-medium">Punch type</span>
          <select name="punch_type" defaultValue="check_in" className="mt-1 h-10 w-full rounded-md border bg-white px-3">
            <option value="check_in">Check In</option>
            <option value="check_out">Check Out</option>
            <option value="leave">Leave / WFH note</option>
            <option value="manual_note">Manual note</option>
          </select>
        </label>

        <label className="block text-sm">
          <span className="font-medium">Selfie / face proof</span>
          <input
            name="selfie"
            type="file"
            accept="image/*"
            capture="user"
            required
            onChange={(event) => setSelfieSelected(Boolean(event.target.files?.length))}
            className="mt-1 block w-full rounded-md border bg-white px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-2 file:text-sm file:font-semibold file:text-primary-foreground"
          />
        </label>

        <div className="rounded-md border bg-slate-50 p-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold">GPS proof</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">{gps.status}</p>
            </div>
            <button
              type="button"
              onClick={captureLocation}
              className="inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-md border bg-white px-3 text-sm font-semibold text-primary"
            >
              <LocateFixed className="h-4 w-4" />
              Capture
            </button>
          </div>
          {gps.lat && gps.lng ? (
            <p className="mt-2 text-xs font-semibold text-emerald-700">
              {gps.lat}, {gps.lng}
            </p>
          ) : null}
        </div>

        <details className="rounded-md border bg-slate-50/70 p-3 lg:col-span-3">
          <summary className="cursor-pointer text-sm font-semibold text-primary">
            Advanced details, only if needed
          </summary>
          <div className="mt-3 grid gap-4 lg:grid-cols-2">
            <label className="block text-sm">
              <span className="font-medium">Employee code override</span>
              <input
                name="employee_code"
                placeholder="Auto from login, optional"
                className="mt-1 h-10 w-full rounded-md border bg-white px-3 outline-none focus:ring-2 focus:ring-ring"
              />
            </label>

            <label className="block text-sm">
              <span className="font-medium">Employee name override</span>
              <input
                name="employee_name"
                placeholder="Auto from login, optional"
                className="mt-1 h-10 w-full rounded-md border bg-white px-3 outline-none focus:ring-2 focus:ring-ring"
              />
            </label>

            <label className="block text-sm">
              <span className="font-medium">Location note</span>
              <input
                name="location_note"
                placeholder="Office / Wazirpur / Client site"
                className="mt-1 h-10 w-full rounded-md border bg-white px-3 outline-none focus:ring-2 focus:ring-ring"
              />
            </label>

            <label className="block text-sm">
              <span className="font-medium">Remark</span>
              <input
                name="remarks"
                placeholder="Late reason, leave note, shift note"
                className="mt-1 h-10 w-full rounded-md border bg-white px-3 outline-none focus:ring-2 focus:ring-ring"
              />
            </label>
          </div>
        </details>

        <div className="lg:col-span-3">
          <div className="flex flex-col gap-3 rounded-md border bg-blue-50/60 p-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex gap-3">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <p className="text-sm leading-5 text-slate-700">
                Privacy: photo private bucket me rahegi. Save punch GPS aur selfie capture hone ke baad active hoga.
              </p>
            </div>
            <button
              disabled={isPending || !canSave}
              className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
              {isPending ? "Saving..." : canSave ? "Save punch" : "GPS + selfie required"}
            </button>
          </div>
          {message ? (
            <p className={`mt-3 flex items-center gap-2 text-sm font-semibold ${message.includes("success") ? "text-emerald-700" : "text-rose-700"}`}>
              {message.includes("success") ? <CheckCircle2 className="h-4 w-4" /> : null}
              {message}
            </p>
          ) : null}
        </div>
      </form>
    </section>
  );
}
