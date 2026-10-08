"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useTranslations } from "use-intl";
import { useConfirm } from "@/components/ui/confirm";
import { Group, GroupRowButton } from "@/components/ui/group";
import { signOut } from "@/features/auth/auth-store";
import { usePendingChanges, useUserData } from "@/features/user-data/user-data-context";

export function AccountSection() {
  const t = useTranslations("profile");
  const common = useTranslations("common");
  const router = useRouter();
  const confirm = useConfirm();
  const { user, db, runner } = useUserData();
  const pending = usePendingChanges();
  const [busy, setBusy] = useState(false);

  async function handleSignOut() {
    const ok = await confirm({
      title: t("signOutTitle"),
      message: pending > 0 ? t("signOutPending", { count: pending }) : undefined,
      confirmLabel: t("signOut"),
      cancelLabel: common("cancel"),
      destructive: true,
    });
    if (!ok) return;
    setBusy(true);
    runner.stop();
    // Local data belongs to this account only: remove it from the phone.
    await db.delete().catch(() => undefined);
    await signOut();
    router.replace("/login");
  }

  return (
    <Group title={t("account")} footer={user.email ? t("signedInAs", { email: user.email }) : undefined}>
      <GroupRowButton tone="destructive" disabled={busy} onClick={() => void handleSignOut()}>
        {t("signOut")}
      </GroupRowButton>
    </Group>
  );
}
