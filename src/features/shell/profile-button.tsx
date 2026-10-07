"use client";

import Link from "next/link";
import { useTranslations } from "use-intl";
import { useProfile } from "@/features/profile/use-profile";
import { useUserData } from "@/features/user-data/user-data-context";

/** Profile lives behind your initial in the header, freeing the bottom bar for Community. */
export function ProfileButton() {
  const t = useTranslations("profile");
  const profile = useProfile();
  const { user } = useUserData();
  const source = profile?.display_name || profile?.username || user.email || "?";
  const initial = source.trim().charAt(0).toUpperCase();

  return (
    <Link href="/profile" aria-label={t("openProfile")} className="flex size-11 items-center justify-center">
      <span className="heading flex size-9 items-center justify-center rounded-full bg-surface-2 text-base">
        {initial}
      </span>
    </Link>
  );
}
