"use client";

import { useTranslations } from "use-intl";
import { Wordmark } from "./wordmark";

export function SetupMissing() {
  const t = useTranslations("setup");
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-4 px-6">
      <Wordmark />
      <h1 className="heading text-2xl">{t("title")}</h1>
      <p className="text-muted-foreground">{t("body")}</p>
    </main>
  );
}
