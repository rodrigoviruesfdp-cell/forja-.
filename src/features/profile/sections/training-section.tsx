"use client";

import { useTranslations } from "use-intl";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { cleanText } from "@/data/repositories/profiles";
import { GOALS, LEVELS, type Profile } from "@/domain/schemas";
import { Section } from "./section";
import { useUpdateProfile } from "../use-profile";

type Goal = (typeof GOALS)[number];
type Level = (typeof LEVELS)[number];

export function TrainingSection({ profile }: { profile: Profile }) {
  const t = useTranslations("profile");
  const common = useTranslations("common");
  const updateProfile = useUpdateProfile();

  return (
    <Section title={t("training")} hint={t("trainingHint")}>
      <Field label={t("name")} htmlFor="display_name">
        {/* Uncontrolled + key: re-mounts if the value changes on another device. Saved on blur. */}
        <Input
          id="display_name"
          key={profile.display_name ?? ""}
          defaultValue={profile.display_name ?? ""}
          autoComplete="given-name"
          maxLength={80}
          onBlur={(e) => {
            const value = cleanText(e.target.value, 80);
            if (value !== profile.display_name) void updateProfile({ display_name: value });
          }}
        />
      </Field>
      <Field label={t("goal")} htmlFor="goal">
        <NativeSelect
          id="goal"
          value={profile.goal ?? ""}
          onChange={(e) => void updateProfile({ goal: (e.target.value || null) as Goal | null })}
        >
          <option value="">{common("notSet")}</option>
          {GOALS.map((goal) => (
            <option key={goal} value={goal}>
              {t(`goals.${goal}`)}
            </option>
          ))}
        </NativeSelect>
      </Field>
      <Field label={t("level")} htmlFor="level">
        <NativeSelect
          id="level"
          value={profile.level ?? ""}
          onChange={(e) => void updateProfile({ level: (e.target.value || null) as Level | null })}
        >
          <option value="">{common("notSet")}</option>
          {LEVELS.map((level) => (
            <option key={level} value={level}>
              {t(`levels.${level}`)}
            </option>
          ))}
        </NativeSelect>
      </Field>
      <Field label={t("injuries")} htmlFor="injury_notes">
        <Textarea
          id="injury_notes"
          key={profile.injury_notes ?? ""}
          defaultValue={profile.injury_notes ?? ""}
          placeholder={t("injuriesPlaceholder")}
          maxLength={2000}
          onBlur={(e) => {
            const value = cleanText(e.target.value, 2000);
            if (value !== profile.injury_notes) void updateProfile({ injury_notes: value });
          }}
        />
      </Field>
    </Section>
  );
}
