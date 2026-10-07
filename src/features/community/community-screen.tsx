"use client";

import { AtSign, Heart, Lock, Newspaper, Share2 } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "use-intl";
import { buttonVariants } from "@/components/ui/button";
import { useProfile } from "@/features/profile/use-profile";
import { PageHeader } from "@/features/shell/page-header";

const FEATURES = [
  { key: "feed", Icon: Newspaper },
  { key: "kudos", Icon: Heart },
  { key: "cards", Icon: Share2 },
  { key: "privacy", Icon: Lock },
] as const;

export function CommunityScreen() {
  const t = useTranslations("community");
  const profile = useProfile();
  const username = profile?.username ?? null;

  return (
    <>
      <PageHeader title={t("title")} />
      <div className="flex flex-col gap-6 px-4 pt-4">
        <section className="flex flex-col gap-3">
          <span className="self-start rounded-full bg-planned/15 px-3 py-1 text-sm font-semibold text-planned">
            {t("soonTitle")}
          </span>
          <p className="text-lg">{t("soonBody")}</p>
        </section>

        <ul className="flex flex-col gap-3">
          {FEATURES.map(({ key, Icon }) => (
            <li key={key} className="flex items-start gap-3 rounded-lg bg-surface p-4">
              <Icon aria-hidden className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
              <span>{t(`features.${key}`)}</span>
            </li>
          ))}
        </ul>

        <section className="flex flex-col items-start gap-3 rounded-xl border p-5">
          <span className="flex items-center gap-2 font-semibold">
            <AtSign aria-hidden className="size-5 text-primary" />
            {username ? t("usernameSet", { username }) : t("usernameMissing")}
          </span>
          {username ? null : (
            <Link href="/profile#community" className={buttonVariants({ variant: "secondary" })}>
              {t("goToProfile")}
            </Link>
          )}
        </section>
      </div>
    </>
  );
}
