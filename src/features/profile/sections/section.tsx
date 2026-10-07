import type { ReactNode } from "react";

export function Section({ title, hint, id, children }: { title: string; hint?: string; id?: string; children: ReactNode }) {
  return (
    <section id={id} className="flex scroll-mt-4 flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h2 className="heading text-xl">{title}</h2>
        {hint ? <p className="text-sm text-muted-foreground">{hint}</p> : null}
      </div>
      {children}
    </section>
  );
}
