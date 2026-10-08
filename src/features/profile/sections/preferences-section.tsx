"use client";

import { useTranslations } from "use-intl";
import { Group, GroupRow } from "@/components/ui/group";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { WEIGHT_UNITS, type WeightUnit } from "@/domain/units";
import { setPrefs, type Theme, THEMES, usePrefs } from "@/features/preferences/prefs";
import { LOCALE_NAMES, LOCALES, type Locale } from "@/i18n/config";
import { useUpdateProfile } from "../use-profile";

function PrefRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <GroupRow className="flex-col items-stretch gap-2 py-3">
      <span className="text-subhead text-muted-foreground">{label}</span>
      {children}
    </GroupRow>
  );
}

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
    <Group title={t("preferences")}>
      <PrefRow label={t("language")}>
        <SegmentedControl<Locale>
          aria-label={t("language")}
          value={prefs.locale}
          options={LOCALES.map((value) => ({ value, label: LOCALE_NAMES[value] }))}
          onValueChange={(locale) => void updateProfile({ locale })}
        />
      </PrefRow>
      <PrefRow label={t("units")}>
        <SegmentedControl<WeightUnit>
          aria-label={t("units")}
          value={prefs.units}
          options={WEIGHT_UNITS.map((value) => ({ value, label: value }))}
          onValueChange={(units) => void updateProfile({ units })}
        />
      </PrefRow>
      <PrefRow label={t("theme")}>
        <SegmentedControl<Theme>
          aria-label={t("theme")}
          value={prefs.theme}
          options={THEMES.map((value) => ({ value, label: themeLabels[value] }))}
          onValueChange={(theme) => setPrefs({ theme })}
        />
      </PrefRow>
    </Group>
  );
}
