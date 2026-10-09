"use client";

import { Check, ChevronRight, Dumbbell, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { useTranslations } from "use-intl";
import { Stagger, StaggerItem } from "@/components/motion/stagger";
import { Button } from "@/components/ui/button";
import { Card, CardLink } from "@/components/ui/card";
import { Group, GroupRowLink } from "@/components/ui/group";
import { IconButton } from "@/components/ui/icon-button";
import { Spinner } from "@/components/ui/spinner";
import { createFromTemplate } from "@/data/repositories/routines";
import { weekStrip } from "@/domain/routines/plan";
import { TEMPLATE_KEYS, TEMPLATES, templateWeekStrip } from "@/domain/routines/templates";
import { useExercises } from "@/features/exercises/use-exercises";
import { useProfile } from "@/features/profile/use-profile";
import { setNavDirection } from "@/features/shell/nav-direction";
import { PageHeader } from "@/features/shell/page-header";
import { useUserData } from "@/features/user-data/user-data-context";
import { NewRoutineSheet } from "./new-routine-sheet";
import { useRoutineLabels } from "./use-routine-labels";
import { useRoutineSummaries } from "./use-routines";
import { useWeekdayLabels, WeekStrip } from "./weekdays";

const editorHref = (id: string) => `/routines/edit?id=${id}`;

export function RoutinesScreen() {
  const t = useTranslations("routines");
  const router = useRouter();
  const { db } = useUserData();
  const profile = useProfile();
  const summaries = useRoutineSummaries();
  const exercises = useExercises();
  const labels = useRoutineLabels();
  const weekdays = useWeekdayLabels();
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState(false);

  const active = summaries?.find((s) => s.routine.id === profile?.active_routine_id) ?? null;
  const others = summaries?.filter((s) => s !== active) ?? [];

  async function startFromTemplate(key: (typeof TEMPLATE_KEYS)[number]) {
    if (!profile || busy) return;
    setBusy(true);
    const template = TEMPLATES[key];
    const routine = await createFromTemplate(db, profile, template, labels.templateNames(template));
    toast.success(t("templateCreated", { name: routine.name }));
    setNavDirection("forward");
    router.push(editorHref(routine.id));
  }

  return (
    <>
      <PageHeader
        title={t("title")}
        actions={
          <IconButton aria-label={t("newRoutine")} onClick={() => setCreating(true)} disabled={!profile}>
            <Plus strokeWidth={2.4} />
          </IconButton>
        }
      />
      {summaries === undefined ? (
        <div className="flex justify-center p-10">
          <Spinner />
        </div>
      ) : (
        <Stagger className="flex flex-col gap-7 pb-8">
          {active ? (
            <StaggerItem className="px-4">
              <CardLink size="lg" href={editorHref(active.routine.id)} className="flex flex-col gap-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <span className="inline-flex items-center gap-1 rounded-full bg-done/14 px-2.5 py-0.5 text-caption font-semibold">
                      <Check className="size-3.5 text-done" strokeWidth={3} />
                      {t("active")}
                    </span>
                    <p className="mt-2 text-title-2 text-balance">{active.routine.name}</p>
                    <p className="text-subhead text-muted-foreground">
                      {labels.summary(active.routine, active.days)} · {t("exerciseCount", { count: active.exerciseCount })}
                    </p>
                  </div>
                  <ChevronRight aria-hidden className="mt-1 size-5 shrink-0 text-tertiary-foreground" />
                </div>
                <WeekStrip days={weekStrip(active.routine, active.days)} labels={weekdays} />
              </CardLink>
            </StaggerItem>
          ) : summaries.length === 0 ? (
            <StaggerItem className="px-4">
              <Card size="lg" className="flex flex-col items-start gap-3">
                <p className="text-title-2">{t("emptyTitle")}</p>
                <p className="text-muted-foreground">{t("emptyBody")}</p>
                <Button className="mt-1" onClick={() => setCreating(true)} disabled={!profile}>
                  <Plus strokeWidth={2.4} />
                  {t("create")}
                </Button>
              </Card>
            </StaggerItem>
          ) : null}

          {others.length > 0 ? (
            <StaggerItem className="px-4">
              <Group title={t("myRoutines")}>
                {others.map(({ routine, days }) => (
                  <GroupRowLink key={routine.id} href={editorHref(routine.id)}>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{routine.name}</span>
                      <span className="block truncate text-subhead text-muted-foreground">{labels.summary(routine, days)}</span>
                    </span>
                  </GroupRowLink>
                ))}
              </Group>
            </StaggerItem>
          ) : null}

          {/* App Store-style carousel: cards snap into place as you swipe. */}
          <StaggerItem as="section" className="flex flex-col gap-2">
            <h2 className="tracking-caption px-8 text-footnote text-muted-foreground uppercase">{t("templatesTitle")}</h2>
            <div className="scrollbar-none flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 pt-1 pb-4">
              {TEMPLATE_KEYS.map((key) => (
                <Card key={key} size="lg" className="flex w-[82%] max-w-80 shrink-0 snap-start flex-col gap-4">
                  <div className="flex flex-col gap-1">
                    <p className="text-title-3">{t(`templates.${key}.name`)}</p>
                    <p className="text-subhead text-muted-foreground">{t(`templates.${key}.description`)}</p>
                  </div>
                  <WeekStrip days={templateWeekStrip(TEMPLATES[key])} labels={weekdays} />
                  <Button
                    variant="secondary"
                    size="sm"
                    className="self-start"
                    disabled={!profile || busy}
                    onClick={() => void startFromTemplate(key)}
                  >
                    {t("useTemplate")}
                  </Button>
                </Card>
              ))}
            </div>
          </StaggerItem>

          <StaggerItem className="px-4">
            <CardLink size="tile" href="/exercises" className="flex items-center gap-3">
              <span className="flex size-12 shrink-0 items-center justify-center rounded-concentric bg-foreground text-background">
                <Dumbbell className="size-6" strokeWidth={2} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-headline">{t("libraryTitle")}</span>
                <span className="block truncate text-subhead text-muted-foreground">
                  {t("libraryBody", { count: exercises?.length ?? 0 })}
                </span>
              </span>
              <ChevronRight aria-hidden className="size-5 shrink-0 text-tertiary-foreground" />
            </CardLink>
          </StaggerItem>
        </Stagger>
      )}

      {profile ? <NewRoutineSheet open={creating} onOpenChange={setCreating} profile={profile} /> : null}
    </>
  );
}
