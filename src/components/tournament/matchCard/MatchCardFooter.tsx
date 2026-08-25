import type { ReactNode } from "react";

export default function MatchCardFooter({ children }: { children: ReactNode }) {
  return <div className="flex justify-end pt-1">{children}</div>;
}
