"use client";

import { Dumbbell } from "lucide-react";
import Link from "next/link";
import { useFormatter, useTranslations } from "use-intl";
import { buttonVariants } from "@/components/ui/button";
import { useProfile } from "@/features/profile/use-profile";
import { PageHeader } from "@/features/shell/page-header";

export function TodayScreen() {
  const t = useTranslations("today");
  const format = useFormatter();
  const profile = useProfile();

  const name = profile?.display_name;
  const profileIncomplete = profile ? !profile.goal || !profile.level : false;
  const today = format.dateTime(new Date(), { weekday: "long", day: "numeric", month: "long" });

  return (
    <>
      <PageHeader subtitle={today} title={name ? t("greeting", { name }) : t("greetingAnonymous")} />
      <section className="mx-4 mt-4 flex flex-col gap-4 rounded-xl bg-surface p-5">
        <Dumbbell className="size-8 text-primary" strokeWidth={1.8} aria-hidden />
        <div className="flex flex-col gap-2">
          <h2 className="heading text-xl">{t("emptyTitle")}</h2>
          <p className="text-muted-foreground">{t("emptyBody")}</p>
        </div>
        {profileIncomplete ? (
          <Link href="/profile" className={buttonVariants({ variant: "secondary", className: "self-start" })}>
            {t("setupProfile")}
          </Link>
        ) : null}
      </section>
    </>
  );
}
