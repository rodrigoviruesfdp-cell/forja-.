"use client";

import { useSerwist } from "@serwist/turbopack/react";
import { RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslations } from "use-intl";
import { Button } from "@/components/ui/button";

const CHECK_EVERY_MS = 15 * 60 * 1000;

/**
 * A new deploy downloads in the background and waits. The user decides when to switch,
 * so the app never reloads in the middle of a workout.
 */
export function UpdateBanner() {
  const t = useTranslations("update");
  const { serwist } = useSerwist();
  const [waiting, setWaiting] = useState(false);

  useEffect(() => {
    if (!serwist) return;
    const onWaiting = () => setWaiting(true);
    const onControlling = () => window.location.reload();
    serwist.addEventListener("waiting", onWaiting);
    serwist.addEventListener("controlling", onControlling);

    // Look for new versions when the app comes back to the foreground.
    let lastCheck = Date.now();
    const onVisible = () => {
      if (document.visibilityState !== "visible" || Date.now() - lastCheck < CHECK_EVERY_MS) return;
      lastCheck = Date.now();
      void serwist.update();
    };
    document.addEventListener("visibilitychange", onVisible);

    // A version may already be waiting from a previous visit.
    void navigator.serviceWorker?.getRegistration().then((registration) => {
      if (registration?.waiting && navigator.serviceWorker.controller) setWaiting(true);
    });

    return () => {
      serwist.removeEventListener("waiting", onWaiting);
      serwist.removeEventListener("controlling", onControlling);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [serwist]);

  if (!waiting) return null;

  return (
    <div
      role="status"
      className="fixed inset-x-0 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-40 mx-auto flex max-w-lg items-center justify-between gap-3 border-t bg-surface px-4 py-2"
    >
      <span className="flex items-center gap-2 text-sm font-medium">
        <RefreshCw aria-hidden className="size-4 text-primary" />
        {t("available")}
      </span>
      <Button size="sm" onClick={() => serwist?.messageSkipWaiting()}>
        {t("action")}
      </Button>
    </div>
  );
}
