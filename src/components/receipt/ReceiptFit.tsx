"use client";

import { useEffect, useRef, useState } from "react";
import { HALF_WIDTH } from "./receiptStyle";

export default function ReceiptFit({ children }: { children: React.ReactNode }) {
  const box = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [height, setHeight] = useState(0);

  useEffect(() => {
    const outer = box.current;
    if (!outer) return;
    const fit = () => {
      const next = Math.min(1, outer.clientWidth / HALF_WIDTH);
      setScale(next);
      setHeight((inner.current?.offsetHeight ?? 0) * next);
    };
    fit();
    const watcher = new ResizeObserver(fit);
    watcher.observe(outer);
    return () => watcher.disconnect();
  }, []);

  return (
    <div ref={box} style={{ height: height || undefined, overflow: "hidden" }}>
      <div
        ref={inner}
        style={{ width: HALF_WIDTH, transformOrigin: "top right", transform: `scale(${scale})` }}
      >
        {children}
      </div>
    </div>
  );
}
