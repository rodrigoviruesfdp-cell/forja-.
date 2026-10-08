"use client";

import { useState } from "react";
import { useTranslations } from "use-intl";
import { Group, GroupRow } from "@/components/ui/group";
import { normalizeUsername } from "@/data/repositories/profiles";
import { type Profile, USERNAME_PATTERN } from "@/domain/schemas";
import { useUpdateProfile } from "../use-profile";

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
    <Group
      id="community"
      title={t("community")}
      footer={
        invalid ? (
          <span role="alert" className="text-destructive">
            {t("usernameInvalid")}
          </span>
        ) : (
          t("usernameHint")
        )
      }
    >
      <GroupRow className="py-0">
        <label htmlFor="username" className="w-32 shrink-0">
          {t("username")}
        </label>
        <span aria-hidden className="ml-auto text-tertiary-foreground">
          @
        </span>
        <input
          id="username"
          key={current ?? ""}
          defaultValue={current ?? ""}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          maxLength={31}
          aria-invalid={invalid}
          className="h-12 w-36 min-w-0 bg-transparent text-body text-muted-foreground outline-none placeholder:text-tertiary-foreground focus:text-foreground aria-invalid:text-destructive"
          onBlur={(e) => save(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.currentTarget.blur();
          }}
        />
      </GroupRow>
    </Group>
  );
}
