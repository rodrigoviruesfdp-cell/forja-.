"use client";

import { AtSign, ChevronRight, Heart, Lock, Newspaper, Share2 } from "lucide-react";
import { useTranslations } from "use-intl";
import { Stagger, StaggerItem } from "@/components/motion/stagger";
import { Card, CardLink } from "@/components/ui/card";
import { useProfile } from "@/features/profile/use-profile";
import { PageHeader } from "@/features/shell/page-header";
import { cn } from "@/lib/utils";

/** Bento layout: wide tiles for the headline features, square ones for the rest. */
const FEATURES = [
  { key: "feed", Icon: Newspaper, span: "col-span-2", tint: "bg-planned/12 text-planned" },
  { key: "kudos", Icon: Heart, span: "col-span-1", tint: "bg-pr/12 text-pr" },
  { key: "cards", Icon: Share2, span: "col-span-1", tint: "bg-done/14 text-done" },
  { key: "privacy", Icon: Lock, span: "col-span-2", tint: "bg-surface-2 text-foreground" },
] as const;

export function CommunityScreen() {
  const t = useTranslations("community");
  const profile = useProfile();
  const username = profile?.username ?? null;

  return (
    <>
      <PageHeader title={t("title")} />
      <Stagger className="grid grid-cols-2 gap-3 px-4 pb-8">
        <StaggerItem className="col-span-2">
          <Card size="lg" className="flex flex-col items-start gap-3">
            <span className="rounded-full bg-planned/12 px-3 py-1 text-footnote font-semibold text-planned">
              {t("soonTitle")}
            </span>
            <p className="text-title-3 font-semibold text-balance">{t("soonBody")}</p>
          </Card>
        </StaggerItem>

        {FEATURES.map(({ key, Icon, span, tint }) => (
          <StaggerItem key={key} className={span}>
            <Card size="tile" className="flex h-full flex-col gap-3">
              <span className={cn("flex size-10 items-center justify-center rounded-concentric", tint)}>
                <Icon aria-hidden className="size-5" strokeWidth={2.1} />
              </span>
              <p className="px-1 pb-1 text-subhead text-balance">{t(`features.${key}`)}</p>
            </Card>
          </StaggerItem>
        ))}

        <StaggerItem className="col-span-2">
          {username ? (
            <Card size="tile" className="flex items-center gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-concentric bg-primary text-primary-foreground">
                <AtSign aria-hidden className="size-5" strokeWidth={2.4} />
              </span>
              <span className="font-medium">{t("usernameSet", { username })}</span>
            </Card>
          ) : (
            <CardLink size="tile" href="/profile#community" className="flex items-center gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-concentric bg-primary text-primary-foreground">
                <AtSign aria-hidden className="size-5" strokeWidth={2.4} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-medium">{t("usernameMissing")}</span>
                <span className="block text-subhead text-muted-foreground">{t("goToProfile")}</span>
              </span>
              <ChevronRight aria-hidden className="size-5 shrink-0 text-tertiary-foreground" />
            </CardLink>
          )}
        </StaggerItem>
      </Stagger>
    </>
  );
}
