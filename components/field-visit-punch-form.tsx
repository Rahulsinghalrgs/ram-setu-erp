"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Camera, CheckCircle2, Loader2, LocateFixed, MapPinned, ShieldCheck } from "lucide-react";
import { markFieldVisitPunch } from "@/lib/field-operations-actions";

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

export function FieldVisitPunchForm() {
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
    setGps((current) => ({ ...current, status: "Capturing live GPS..." }));

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
          status: `GPS captured, accuracy ${Math.round(position.coords.accuracy)}m`
        });
      },
      () => {
        setGps({
          lat: "",
          lng: "",
          accuracy: "",
          status: "Location permission blocked. Please allow location and capture again."
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
        await markFieldVisitPunch(formData);
        formRef.current?.reset();
        setGps(initialGps);
        setSelfieSelected(false);
        setMessage("Field visit punch saved successfully.");
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Field visit punch failed.");
      }
    });
  }

  return (
    <section className="rounded-md border bg-white/95 shadow-sm">
      <div className="border-b p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">ERP Field Punch</p>
        <h2 className="text-xl font-semibold">GPS + Image Field Visit</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Field staff mobile se route, vehicle reading, fuel proof, selfie aur live GPS ke saath visit update karega.
        </p>
      </div>

      <form ref={formRef} action={submitPunch} className="grid gap-4 p-4 lg:grid-cols-4">
        <input type="hidden" name="gps_lat" value={gps.lat} />
        <input type="hidden" name="gps_lng" value={gps.lng} />
        <input type="hidden" name="gps_accuracy" value={gps.accuracy} />
        <input type="hidden" name="device_info" value="" />

        <label className="block text-sm">
          <span className="font-medium">Action</span>
          <select name="action" defaultValue="check_in" className="mt-1 h-10 w-full rounded-md border bg-white px-3">
            <option value="check_in">Check In</option>
            <option value="check_out">Check Out</option>
            <option value="visit_update">Visit Update</option>
            <option value="fuel_update">Fuel Update</option>
          </select>
        </label>

        <label className="block text-sm">
          <span className="font-medium">Staff name</span>
          <input
            name="staff_name"
            placeholder="Auto from login, optional"
            className="mt-1 h-10 w-full rounded-md border bg-white px-3 outline-none focus:ring-2 focus:ring-ring"
          />
        </label>

        <label className="block text-sm">
          <span className="font-medium">Staff phone</span>
          <input
            name="staff_phone"
            placeholder="10 digit mobile"
            inputMode="tel"
            className="mt-1 h-10 w-full rounded-md border bg-white px-3 outline-none focus:ring-2 focus:ring-ring"
          />
        </label>

        <label className="block text-sm">
          <span className="font-medium">Vehicle no.</span>
          <input
            name="vehicle_no"
            placeholder="DL..."
            className="mt-1 h-10 w-full rounded-md border bg-white px-3 uppercase outline-none focus:ring-2 focus:ring-ring"
          />
        </label>

        <label className="block text-sm lg:col-span-2">
          <span className="font-medium">Route / visit address</span>
          <input
            name="visit_address"
            required
            placeholder="Office to client / visit location"
            className="mt-1 h-10 w-full rounded-md border bg-white px-3 outline-none focus:ring-2 focus:ring-ring"
          />
        </label>

        <label className="block text-sm">
          <span className="font-medium">Vehicle reading</span>
          <input
            name="vehicle_reading"
            type="number"
            step="0.1"
            placeholder="KM"
            className="mt-1 h-10 w-full rounded-md border bg-white px-3 outline-none focus:ring-2 focus:ring-ring"
          />
        </label>

        <label className="block text-sm">
          <span className="font-medium">Distance</span>
          <input
            name="cover_distance"
            type="number"
            step="0.1"
            placeholder="Covered KM"
            className="mt-1 h-10 w-full rounded-md border bg-white px-3 outline-none focus:ring-2 focus:ring-ring"
          />
        </label>

        <label className="block text-sm">
          <span className="font-medium">Fuel litres</span>
          <input
            name="fuel_litres"
            type="number"
            step="0.01"
            placeholder="0"
            className="mt-1 h-10 w-full rounded-md border bg-white px-3 outline-none focus:ring-2 focus:ring-ring"
          />
        </label>

        <label className="block text-sm">
          <span className="font-medium">Fuel rate</span>
          <input
            name="fuel_rate"
            type="number"
            step="0.01"
            placeholder="Rate"
            className="mt-1 h-10 w-full rounded-md border bg-white px-3 outline-none focus:ring-2 focus:ring-ring"
          />
        </label>

        <label className="block text-sm">
          <span className="font-medium">Staff selfie</span>
          <input
            name="selfie"
            type="file"
            accept="image/*"
            capture="user"
            required
            onChange={(event) => setSelfieSelected(Boolean(event.target.files?.length))}
            className="mt-1 block w-full rounded-md border bg-white px-3 py-2 text-sm"
          />
        </label>

        <label className="block text-sm">
          <span className="font-medium">Reading proof</span>
          <input name="reading_proof" type="file" accept="image/*,application/pdf" capture="environment" className="mt-1 block w-full rounded-md border bg-white px-3 py-2 text-sm" />
        </label>

        <label className="block text-sm">
          <span className="font-medium">Fuel bill proof</span>
          <input name="fuel_bill" type="file" accept="image/*,application/pdf" capture="environment" className="mt-1 block w-full rounded-md border bg-white px-3 py-2 text-sm" />
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
            <p className="mt-2 flex items-center gap-1 text-xs font-semibold text-emerald-700">
              <MapPinned className="h-3.5 w-3.5" />
              {gps.lat}, {gps.lng}
            </p>
          ) : null}
        </div>

        <label className="block text-sm lg:col-span-4">
          <span className="font-medium">Comments</span>
          <input
            name="comments"
            placeholder="Client met, delivery pending, fuel note, route issue"
            className="mt-1 h-10 w-full rounded-md border bg-white px-3 outline-none focus:ring-2 focus:ring-ring"
          />
        </label>

        <div className="lg:col-span-4">
          <div className="flex flex-col gap-3 rounded-md border bg-blue-50/60 p-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex gap-3">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <p className="text-sm leading-5 text-slate-700">
                Privacy: GPS aur images private Supabase bucket me rahenge. Save field punch GPS aur selfie ke baad active hoga.
              </p>
            </div>
            <button
              disabled={isPending || !canSave}
              className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
              {isPending ? "Saving..." : canSave ? "Save field punch" : "GPS + selfie required"}
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
