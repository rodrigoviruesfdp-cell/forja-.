"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useTranslations } from "use-intl";
import { Button } from "@/components/ui/button";
import { signOut } from "@/features/auth/auth-store";
import { usePendingChanges, useUserData } from "@/features/user-data/user-data-context";
import { Section } from "./section";

export function AccountSection() {
  const t = useTranslations("profile");
  const router = useRouter();
  const { user, db, runner } = useUserData();
  const pending = usePendingChanges();
  const [busy, setBusy] = useState(false);

  async function handleSignOut() {
    if (pending > 0 && !window.confirm(t("signOutPending", { count: pending }))) return;
    setBusy(true);
    runner.stop();
    // Local data belongs to this account only: remove it from the phone.
    await db.delete().catch(() => undefined);
    await signOut();
    router.replace("/login");
  }

  return (
    <Section title={t("account")}>
      {user.email ? <p className="text-muted-foreground">{t("signedInAs", { email: user.email })}</p> : null}
      <Button variant="destructive" className="self-start" disabled={busy} onClick={() => void handleSignOut()}>
        {t("signOut")}
      </Button>
    </Section>
  );
}
