"use client";

import { useTranslations } from "use-intl";
import { SelectRow, TextAreaRow, TextRow } from "@/components/ui/form-rows";
import { Group } from "@/components/ui/group";
import { cleanText } from "@/data/repositories/profiles";
import { GOALS, LEVELS, type Profile } from "@/domain/schemas";
import { useUpdateProfile } from "../use-profile";

type Goal = (typeof GOALS)[number];
type Level = (typeof LEVELS)[number];

export function TrainingSection({ profile }: { profile: Profile }) {
  const t = useTranslations("profile");
  const common = useTranslations("common");
  const updateProfile = useUpdateProfile();

  return (
    <>
      <Group title={t("training")} footer={t("trainingHint")}>
        {/* Uncontrolled + key: re-mounts if the value changes on another device. Saved on blur. */}
        <TextRow
          id="display_name"
          label={t("name")}
          key={profile.display_name ?? ""}
          defaultValue={profile.display_name ?? ""}
          placeholder={common("notSet")}
          autoComplete="given-name"
          maxLength={80}
          onBlur={(e) => {
            const value = cleanText(e.target.value, 80);
            if (value !== profile.display_name) void updateProfile({ display_name: value });
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.currentTarget.blur();
          }}
        />
        <SelectRow
          id="goal"
          label={t("goal")}
          valueLabel={profile.goal ? t(`goals.${profile.goal}`) : common("notSet")}
          value={profile.goal ?? ""}
          onChange={(e) => void updateProfile({ goal: (e.target.value || null) as Goal | null })}
        >
          <option value="">{common("notSet")}</option>
          {GOALS.map((goal) => (
            <option key={goal} value={goal}>
              {t(`goals.${goal}`)}
            </option>
          ))}
        </SelectRow>
        <SelectRow
          id="level"
          label={t("level")}
          valueLabel={profile.level ? t(`levels.${profile.level}`) : common("notSet")}
          value={profile.level ?? ""}
          onChange={(e) => void updateProfile({ level: (e.target.value || null) as Level | null })}
        >
          <option value="">{common("notSet")}</option>
          {LEVELS.map((level) => (
            <option key={level} value={level}>
              {t(`levels.${level}`)}
            </option>
          ))}
        </SelectRow>
      </Group>
      <Group title={t("injuries")}>
        <TextAreaRow
          id="injury_notes"
          aria-label={t("injuries")}
          key={profile.injury_notes ?? ""}
          defaultValue={profile.injury_notes ?? ""}
          placeholder={t("injuriesPlaceholder")}
          maxLength={2000}
          onBlur={(e) => {
            const value = cleanText(e.target.value, 2000);
            if (value !== profile.injury_notes) void updateProfile({ injury_notes: value });
          }}
        />
      </Group>
    </>
  );
}
