"use client";

import type { EmailOtpType } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useTranslations } from "use-intl";
import { ButtonLink } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { getSupabase } from "@/data/supabase/client";
import { Wordmark } from "@/features/shell/wordmark";
import { useAuth } from "./auth-store";

/**
 * Landing page of the email link. Two formats arrive here:
 *  - our template: ?token_hash=...&type=email  -> verified here;
 *  - Supabase's default template: #access_token=... -> picked up by the client automatically.
 */
type EmailLink =
  | { kind: "invalid" }
  | { kind: "token"; tokenHash: string; type: EmailOtpType }
  | { kind: "session-in-hash" };

function readEmailLink(): EmailLink {
  const url = new URL(window.location.href);
  const hash = new URLSearchParams(url.hash.slice(1));
  if (url.searchParams.get("error") || hash.get("error")) return { kind: "invalid" };
  const tokenHash = url.searchParams.get("token_hash");
  if (tokenHash) {
    return { kind: "token", tokenHash, type: (url.searchParams.get("type") ?? "email") as EmailOtpType };
  }
  return hash.get("access_token") ? { kind: "session-in-hash" } : { kind: "invalid" };
}

export function ConfirmScreen() {
  const t = useTranslations("confirm");
  const router = useRouter();
  const auth = useAuth();
  const [link] = useState(readEmailLink);
  const [failed, setFailed] = useState(link.kind === "invalid");
  const started = useRef(false);

  useEffect(() => {
    if (auth.status === "signed-in") router.replace("/today");
  }, [auth.status, router]);

  useEffect(() => {
    if (link.kind === "token" && !started.current) {
      started.current = true;
      void getSupabase()
        .auth.verifyOtp({ token_hash: link.tokenHash, type: link.type })
        .then(({ error }) => {
          if (error) setFailed(true);
        });
    }
    if (link.kind === "session-in-hash") {
      // The Supabase client reads the session from the URL on its own; give up if nothing happens.
      const timer = setTimeout(() => setFailed(true), 8000);
      return () => clearTimeout(timer);
    }
  }, [link]);

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-6 px-6">
      <Wordmark />
      {failed ? (
        <>
          <p className="text-title-3">{t("failed")}</p>
          <ButtonLink href="/login" size="lg" className="w-full">
            {t("backToLogin")}
          </ButtonLink>
        </>
      ) : (
        <div className="flex items-center gap-3">
          <Spinner />
          <p className="text-title-3">{t("verifying")}</p>
        </div>
      )}
    </main>
  );
}
