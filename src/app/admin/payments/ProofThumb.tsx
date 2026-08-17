"use client";

import { toThumbUrl } from "@/lib/utils";
import Icon from "@/components/Icon";

export default function ProofThumb({ proof, alt }: { proof: string | null; alt: string }) {
  if (!proof) {
    return (
      <div
        className="w-14 h-14 rounded-lg flex items-center justify-center text-xl shrink-0"
        style={{ background: "var(--mint-50)", border: "1px solid var(--mint-100)" }}
      >
        <Icon name="contact" size={18} className="icon-inline" />
      </div>
    );
  }

  return (
    <a href={`/api/files/${proof}`} target="_blank" rel="noopener noreferrer" className="shrink-0">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={toThumbUrl(`/api/files/${proof}`)}
        alt={alt}
        width={56}
        height={56}
        loading="lazy"
        decoding="async"
        className="w-14 h-14 rounded-lg object-cover"
        style={{ border: "1px solid var(--mint-100)" }}
      />
    </a>
  );
}
