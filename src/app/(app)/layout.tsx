"use client";

import { useRouter } from "next/navigation";
import { type ReactNode, useEffect } from "react";
import { AchievementsProvider } from "@/features/achievements/achievements-provider";
import { useAuth } from "@/features/auth/auth-store";
import { ProfilePrefsBridge } from "@/features/profile/profile-prefs-bridge";
import { AppShell } from "@/features/shell/app-shell";
import { InitialSyncGate } from "@/features/shell/initial-sync-gate";
import { Splash } from "@/features/shell/splash";
import { UserDataProvider } from "@/features/user-data/user-data-context";

export default function SignedInLayout({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (auth.status === "signed-out") router.replace("/login");
  }, [auth.status, router]);

  if (auth.status !== "signed-in") return <Splash />;

  return (
    <UserDataProvider user={auth.user}>
      <InitialSyncGate>
        <ProfilePrefsBridge />
        <AchievementsProvider>
          <AppShell>{children}</AppShell>
        </AchievementsProvider>
      </InitialSyncGate>
    </UserDataProvider>
  );
}
