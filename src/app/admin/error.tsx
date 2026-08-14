"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function AdminError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error("Admin page error:", error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center px-6 py-20 text-center gap-5">
      <div className="text-5xl">⚠️</div>
      <div>
        <h1 className="text-lg font-black" style={{ color: "var(--text-main)" }}>
          حدث خطأ في لوحة التحكم
        </h1>
        <p className="text-sm mt-1.5" style={{ color: "var(--text-muted)" }}>
          تعذّر عرض هذه الصفحة. يمكنك المحاولة مرة أخرى.
        </p>
      </div>

      {error.digest ? (
        <p className="text-xs font-mono" dir="ltr" style={{ color: "var(--text-muted)" }}>
          {error.digest}
        </p>
      ) : null}

      <div className="w-full max-w-xs flex flex-col gap-2.5">
        <button onClick={() => retry()} className="btn btn-primary">
          إعادة المحاولة
        </button>
        <Link href="/admin/dashboard" className="btn btn-ghost">
          لوحة التحكم
        </Link>
      </div>
    </div>
  );
}
