"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

export default function ProfileSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  const body = useRef<HTMLDivElement>(null);
  const [empty, setEmpty] = useState(false);

  useEffect(() => {
    const el = body.current;
    if (!el) return;
    const read = () => setEmpty(el.childElementCount === 0);
    read();
    const observer = new MutationObserver(read);
    observer.observe(el, { childList: true });
    return () => observer.disconnect();
  }, []);

  return (
    <section hidden={empty} className="space-y-2">
      <h2 className="text-xs font-black px-1" style={{ color: "var(--text-muted)" }}>
        {title}
      </h2>
      <div ref={body} className="space-y-4">
        {children}
      </div>
    </section>
  );
}
