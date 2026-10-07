"use client";

import { SerwistProvider } from "@serwist/turbopack/react";
import { type ReactNode, useEffect, useSyncExternalStore } from "react";
import { IntlProvider } from "use-intl";
import { isSupabaseConfigured } from "@/data/supabase/env";
import { initAuth } from "@/features/auth/auth-store";
import { usePrefs } from "@/features/preferences/prefs";
import { PrefsEffects } from "@/features/preferences/prefs-effects";
import { SetupMissing } from "@/features/shell/setup-missing";
import { Splash } from "@/features/shell/splash";
import { MESSAGES } from "@/i18n/config";

const noopSubscribe = () => () => {};

/** True only after hydration. The app renders on the device (local-first): the server HTML is just a splash. */
function useMounted(): boolean {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
}

function AuthBoot({ children }: { children: ReactNode }) {
  useEffect(() => initAuth(), []);
  return children;
}

export function ClientRoot({ children }: { children: ReactNode }) {
  const mounted = useMounted();
  const { locale } = usePrefs();

  if (!mounted) return <Splash />;

  return (
    <SerwistProvider
      swUrl="/serwist/sw.js"
      disable={process.env.NODE_ENV !== "production"}
      // Never reload on reconnect: it would interrupt a workout being logged.
      reloadOnOnline={false}
    >
      <IntlProvider
        locale={locale}
        messages={MESSAGES[locale]}
        timeZone={Intl.DateTimeFormat().resolvedOptions().timeZone}
      >
        <PrefsEffects />
        {isSupabaseConfigured ? <AuthBoot>{children}</AuthBoot> : <SetupMissing />}
      </IntlProvider>
    </SerwistProvider>
  );
}
