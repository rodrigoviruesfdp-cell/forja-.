"use client";

import { ChartLine } from "lucide-react";
import { useTranslations } from "use-intl";
import { ComingSoon } from "@/features/shell/coming-soon";
import { PageHeader } from "@/features/shell/page-header";
import { PageTransition } from "@/features/shell/page-transition";

export default function ProgressPage() {
  const nav = useTranslations("nav");
  const t = useTranslations("placeholder");
  return (
    <PageTransition>
      <PageHeader title={nav("progress")} />
      <ComingSoon Icon={ChartLine} text={t("progress")} />
    </PageTransition>
  );
}
