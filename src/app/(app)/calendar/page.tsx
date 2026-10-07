"use client";

import { CalendarDays } from "lucide-react";
import { useTranslations } from "use-intl";
import { ComingSoon } from "@/features/shell/coming-soon";
import { PageHeader } from "@/features/shell/page-header";

export default function CalendarPage() {
  const nav = useTranslations("nav");
  const t = useTranslations("placeholder");
  return (
    <>
      <PageHeader title={nav("calendar")} />
      <ComingSoon Icon={CalendarDays} text={t("calendar")} />
    </>
  );
}
