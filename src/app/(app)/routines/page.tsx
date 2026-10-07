"use client";

import { ListChecks } from "lucide-react";
import { useTranslations } from "use-intl";
import { ComingSoon } from "@/features/shell/coming-soon";
import { PageHeader } from "@/features/shell/page-header";

export default function RoutinesPage() {
  const nav = useTranslations("nav");
  const t = useTranslations("placeholder");
  return (
    <>
      <PageHeader title={nav("routines")} />
      <ComingSoon Icon={ListChecks} text={t("routines")} />
    </>
  );
}
