"use client";

import { useTranslations } from "use-intl";
import { Stagger, StaggerItem } from "@/components/motion/stagger";
import { Spinner } from "@/components/ui/spinner";
import { HighlightsRow } from "@/features/achievements/highlights-row";
import { PageHeader } from "@/features/shell/page-header";
import { useUserData } from "@/features/user-data/user-data-context";
import { AccountSection } from "./sections/account-section";
import { CommunitySection } from "./sections/community-section";
import { PreferencesSection } from "./sections/preferences-section";
import { SyncSection } from "./sections/sync-section";
import { TrainingSection } from "./sections/training-section";
import { useProfile } from "./use-profile";

/** Settings-style screen: an identity card on top, then inset grouped sections. */
export function ProfileScreen() {
  const t = useTranslations("profile");
  const profile = useProfile();
  const { user } = useUserData();
  const name = profile?.display_name || profile?.username || user.email || "?";

  return (
    <>
      <PageHeader title={t("title")} backFallback="/today" hideProfile />
      <Stagger className="flex flex-col gap-7 px-4 pb-8">
        <StaggerItem className="flex flex-col items-center gap-2 pt-1 text-center">
          <span className="flex size-20 items-center justify-center rounded-full bg-linear-to-b from-[#a5abb8] to-[#858994] text-large-title text-white shadow-card">
            {name.trim().charAt(0).toUpperCase()}
          </span>
          <div>
            <p className="text-title-2">{profile?.display_name || t("noName")}</p>
            <p className="text-subhead text-muted-foreground">
              {profile?.username ? `@${profile.username}` : user.email}
            </p>
          </div>
        </StaggerItem>
        <StaggerItem>
          <HighlightsRow />
        </StaggerItem>
        <StaggerItem>
          <PreferencesSection />
        </StaggerItem>
        {profile ? (
          <>
            <StaggerItem className="flex flex-col gap-7">
              <TrainingSection profile={profile} />
            </StaggerItem>
            <StaggerItem>
              <CommunitySection profile={profile} />
            </StaggerItem>
          </>
        ) : (
          <Spinner className="mx-auto" />
        )}
        <StaggerItem className="flex flex-col gap-7">
          <SyncSection />
        </StaggerItem>
        <StaggerItem>
          <AccountSection />
        </StaggerItem>
        <p className="text-center text-caption text-tertiary-foreground">
          {t("version", { version: process.env.NEXT_PUBLIC_APP_VERSION ?? "dev" })}
        </p>
      </Stagger>
    </>
  );
}
