"use client";

import { useTranslations } from "use-intl";
import { Spinner } from "@/components/ui/spinner";
import { PageHeader } from "@/features/shell/page-header";
import { AccountSection } from "./sections/account-section";
import { PreferencesSection } from "./sections/preferences-section";
import { SyncSection } from "./sections/sync-section";
import { TrainingSection } from "./sections/training-section";
import { useProfile } from "./use-profile";

export function ProfileScreen() {
  const t = useTranslations("profile");
  const profile = useProfile();

  return (
    <>
      <PageHeader title={t("title")} />
      <div className="flex flex-col gap-10 px-4 pt-4 pb-8">
        <PreferencesSection />
        {profile ? <TrainingSection profile={profile} /> : <Spinner />}
        <SyncSection />
        <AccountSection />
        <p className="text-center text-xs text-muted-foreground">
          {t("version", { version: process.env.NEXT_PUBLIC_APP_VERSION ?? "dev" })}
        </p>
      </div>
    </>
  );
}
