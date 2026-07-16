"use client";

import { useEffect } from "react";

/** Registers the minimal service worker (PWA installability). */
export function SwRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Non-fatal: the app works fine without it.
      });
    }
  }, []);
  return null;
}
