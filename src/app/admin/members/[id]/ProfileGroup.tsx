import type { ReactNode } from "react";

export default function ProfileGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="text-xs font-black" style={{ color: "var(--text-muted)" }}>
        {title}
      </h2>
      <div className="grid gap-3 lg:grid-cols-2 items-start">{children}</div>
    </section>
  );
}
