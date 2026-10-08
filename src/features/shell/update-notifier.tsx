"use client";

import { useSerwist } from "@serwist/turbopack/react";
import { useEffect } from "react";
import { toast } from "sonner";
import { useTranslations } from "use-intl";
import { UPDATE_UI_MARKER } from "@/service-worker/update-marker";

const CHECK_EVERY_MS = 15 * 60 * 1000;
const TOAST_ID = "app-update";

/**
 * A new deploy downloads in the background and waits. A notification offers the switch,
 * so the app never reloads in the middle of a workout.
 */
export function UpdateNotifier() {
  const t = useTranslations("update");
  const { serwist } = useSerwist();

  useEffect(() => {
    if (!serwist) return;
    // Tells the next versions that this device can show the notice, so they wait for the tap.
    void globalThis.caches?.open(UPDATE_UI_MARKER).catch(() => null);

    const announce = () =>
      toast(t("available"), {
        id: TOAST_ID,
        duration: Number.POSITIVE_INFINITY,
        action: { label: t("action"), onClick: () => serwist.messageSkipWaiting() },
      });
    const onControlling = () => window.location.reload();
    serwist.addEventListener("waiting", announce);
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
      if (registration?.waiting && navigator.serviceWorker.controller) announce();
    });

    return () => {
      serwist.removeEventListener("waiting", announce);
      serwist.removeEventListener("controlling", onControlling);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [serwist, t]);

  return null;
}
