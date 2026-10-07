"use client";

import { ChartLine } from "lucide-react";
import { useTranslations } from "use-intl";
import { ComingSoon } from "@/features/shell/coming-soon";
import { PageHeader } from "@/features/shell/page-header";

export default function ProgressPage() {
  const nav = useTranslations("nav");
  const t = useTranslations("placeholder");
  return (
    <>
      <PageHeader title={nav("progress")} />
      <ComingSoon Icon={ChartLine} text={t("progress")} />
    </>
  );
}
