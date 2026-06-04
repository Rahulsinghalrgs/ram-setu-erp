"use client";

import { useEffect } from "react";

export function AppShellRegistration() {
  useEffect(() => {
    if (!("serviceWorker" in navigator) || process.env.NODE_ENV !== "production") {
      return;
    }

    navigator.serviceWorker.register("/sw.js").catch(() => {
      // The app should stay usable even if service worker registration fails.
    });
  }, []);

  return null;
}
