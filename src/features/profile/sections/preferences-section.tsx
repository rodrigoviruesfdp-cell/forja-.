"use client";

import { useTranslations } from "use-intl";
import { Field } from "@/components/ui/field";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { WEIGHT_UNITS, type WeightUnit } from "@/domain/units";
import { setPrefs, type Theme, THEMES, usePrefs } from "@/features/preferences/prefs";
import { LOCALE_NAMES, LOCALES, type Locale } from "@/i18n/config";
import { Section } from "./section";
import { useUpdateProfile } from "../use-profile";

export function PreferencesSection() {
  const t = useTranslations("profile");
  const prefs = usePrefs();
  const updateProfile = useUpdateProfile();

  const themeLabels: Record<Theme, string> = {
    dark: t("themeDark"),
    light: t("themeLight"),
    system: t("themeSystem"),
  };

  return (
    <Section title={t("preferences")}>
      <Field label={t("language")}>
        <SegmentedControl<Locale>
          aria-label={t("language")}
          value={prefs.locale}
          options={LOCALES.map((value) => ({ value, label: LOCALE_NAMES[value] }))}
          onValueChange={(locale) => void updateProfile({ locale })}
        />
      </Field>
      <Field label={t("units")}>
        <SegmentedControl<WeightUnit>
          aria-label={t("units")}
          value={prefs.units}
          options={WEIGHT_UNITS.map((value) => ({ value, label: value }))}
          onValueChange={(units) => void updateProfile({ units })}
        />
      </Field>
      <Field label={t("theme")}>
        <SegmentedControl<Theme>
          aria-label={t("theme")}
          value={prefs.theme}
          options={THEMES.map((value) => ({ value, label: themeLabels[value] }))}
          onValueChange={(theme) => setPrefs({ theme })}
        />
      </Field>
    </Section>
  );
}
