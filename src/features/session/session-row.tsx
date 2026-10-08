"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { ChevronRight, Trophy } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { useTranslations } from "use-intl";
import { sessionSummary } from "@/data/repositories/sessions";
import type { Session } from "@/domain/schemas";
import { SportIcon } from "@/features/sports/sport-icon";
import { usePlaceNames } from "@/features/sports/use-places";
import { useSessionTitle, useSportSummary } from "@/features/sports/use-sport-format";
import { useUserData } from "@/features/user-data/user-data-context";
import { cn } from "@/lib/utils";
import { useSessionFormat } from "./use-session-format";

/** The numbers of a session in one line: sets and volume for the gym, duration, spot… for a sport. */
export function useSessionLine(session: Session): { line: string; records: number } | undefined {
  const tSession = useTranslations("session");
  const fmt = useSessionFormat();
  const sportSummary = useSportSummary();
  const places = usePlaceNames();
  const { db } = useUserData();
  const summary = useLiveQuery(
    () => (session.kind === "gym" && session.status !== "skipped" ? sessionSummary(db, session) : undefined),
    [db, session],
  );
  if (session.kind === "sport") {
    return { line: sportSummary(session, session.place_id ? places?.get(session.place_id) : null), records: 0 };
  }
  if (!summary) return undefined;
  const parts = [
    fmt.duration(summary.durationMin),
    tSession("setsCount", { count: summary.workSets }),
    summary.volumeKg > 0 ? fmt.volume(summary.volumeKg) : null,
  ];
  return { line: parts.filter(Boolean).join(" · "), records: summary.records.length };
}

interface SessionRowProps {
  session: Session;
  /** Small caps label above the title ("Hecho hoy", "En curso"…). */
  label?: string;
  href?: string;
  onSelect?: () => void;
  /** Replaces the chevron (e.g. an "Undo" button). */
  trailing?: ReactNode;
  className?: string;
}

/** A logged session as a tappable row: icon, title, its numbers and records. */
export function SessionRow({ session, label, href, onSelect, trailing, className }: SessionRowProps) {
  const title = useSessionTitle();
  const info = useSessionLine(session);
  const done = session.status === "completed";
  const body = (
    <>
      <span
        className={cn(
          "flex size-11 shrink-0 items-center justify-center rounded-concentric",
          done ? "bg-done text-white" : session.status === "in_progress" ? "bg-done/15 text-done" : "bg-surface-2 text-muted-foreground",
        )}
      >
        <SportIcon kind={session.kind} sport={session.sport} className="size-5" />
      </span>
      <span className="min-w-0 flex-1">
        {label ? <span className="tracking-caption block text-footnote text-muted-foreground uppercase">{label}</span> : null}
        <span className={cn("block truncate text-headline", session.status === "skipped" && "text-muted-foreground line-through")}>
          {title(session)}
        </span>
        {info?.line ? <span className="numeric block truncate text-subhead text-muted-foreground">{info.line}</span> : null}
      </span>
      {info && info.records > 0 ? (
        <span className="flex shrink-0 items-center gap-1 rounded-full bg-pr/12 px-2 py-1 text-caption font-semibold text-pr">
          <Trophy className="size-3.5" strokeWidth={2.4} />
          {info.records}
        </span>
      ) : null}
      {trailing ?? (href || onSelect ? <ChevronRight aria-hidden className="size-5 shrink-0 text-tertiary-foreground" /> : null)}
    </>
  );
  const base = cn("flex w-full items-center gap-3 text-left", className);
  if (href) {
    return (
      <Link href={href} data-nav="forward" className={cn(base, "cursor-pointer")}>
        {body}
      </Link>
    );
  }
  if (onSelect) {
    return (
      <button type="button" onClick={onSelect} className={cn(base, "cursor-pointer")}>
        {body}
      </button>
    );
  }
  // A span: the row also sits inside card buttons and links.
  return <span className={base}>{body}</span>;
}
