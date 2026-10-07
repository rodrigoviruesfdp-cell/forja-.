"use client";

import { useState } from "react";
import { useTranslations } from "use-intl";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { normalizeUsername } from "@/data/repositories/profiles";
import { type Profile, USERNAME_PATTERN } from "@/domain/schemas";
import { useUpdateProfile } from "../use-profile";
import { Section } from "./section";

export function CommunitySection({ profile }: { profile: Profile }) {
  const t = useTranslations("profile");
  const updateProfile = useUpdateProfile();
  const [invalid, setInvalid] = useState(false);
  const current = profile.username ?? null;

  function save(raw: string) {
    const value = normalizeUsername(raw);
    if (value === "") {
      setInvalid(false);
      if (current !== null) void updateProfile({ username: null });
      return;
    }
    if (!USERNAME_PATTERN.test(value)) {
      setInvalid(true);
      return;
    }
    setInvalid(false);
    if (value !== current) void updateProfile({ username: value });
  }

  return (
    <Section id="community" title={t("community")}>
      <Field label={t("username")} htmlFor="username" hint={t("usernameHint")} error={invalid ? t("usernameInvalid") : undefined}>
        <div className="relative">
          <span aria-hidden className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-muted-foreground">
            @
          </span>
          <Input
            id="username"
            key={current ?? ""}
            defaultValue={current ?? ""}
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            maxLength={31}
            aria-invalid={invalid}
            className="pl-9"
            onBlur={(e) => save(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") e.currentTarget.blur();
            }}
          />
        </div>
      </Field>
    </Section>
  );
}
