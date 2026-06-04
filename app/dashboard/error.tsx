"use client";

import { useEffect } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";

export default function DashboardError({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Surface the full error in the browser/server console for debugging.
    console.error("Dashboard render error:", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-4">
      <div className="w-full max-w-lg rounded-md border bg-white p-6 text-center shadow-sm">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-rose-50 text-rose-600">
          <AlertTriangle className="h-6 w-6" aria-hidden="true" />
        </span>
        <h1 className="mt-4 text-xl font-semibold text-slate-900">Kuch galat ho gaya</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Yeh page load karte waqt ek error aaya. Dobara try karein. Agar dikkat bani rahe to admin ko ye reference
          code bhej dein.
        </p>
        {error.digest ? (
          <p className="mt-3 inline-block rounded-md bg-slate-100 px-3 py-1 font-mono text-xs text-slate-600">
            Ref: {error.digest}
          </p>
        ) : null}
        <div className="mt-5 flex justify-center gap-3">
          <button
            type="button"
            onClick={reset}
            className="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            Retry
          </button>
          <a
            href="/dashboard"
            className="inline-flex h-10 items-center rounded-md border bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Dashboard
          </a>
        </div>
      </div>
    </div>
  );
}
