"use client";

import { FlaskConical } from "lucide-react";
import { useState } from "react";
import { useTranslations } from "use-intl";
import { Group, GroupRowButton } from "@/components/ui/group";
import { useDemo } from "./use-demo";

/** In Profile: try the app with made-up history, or go back to your data. */
export function DemoSection() {
  const t = useTranslations("demo");
  const { demo, enter, leave } = useDemo();
  const [busy, setBusy] = useState(false);

  return (
    <Group title={t("section")} footer={demo ? t("footerOn") : t("footerOff")}>
      {demo ? (
        <GroupRowButton tone="destructive" onClick={() => void leave()}>
          {t("leaveSection")}
        </GroupRowButton>
      ) : (
        <GroupRowButton
          tone="action"
          disabled={busy}
          onClick={() => {
            setBusy(true);
            void enter().finally(() => setBusy(false));
          }}
        >
          <span className="flex size-7 shrink-0 items-center justify-center rounded-[8px] bg-planned text-white">
            <FlaskConical className="size-4" strokeWidth={2.4} />
          </span>
          {t("enter")}
        </GroupRowButton>
      )}
    </Group>
  );
}
