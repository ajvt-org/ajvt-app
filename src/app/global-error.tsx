"use client";

export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <html lang="ar" dir="rtl">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f0faf5",
          color: "#1a2e24",
          fontFamily: "system-ui, sans-serif",
          textAlign: "center",
          padding: "1.5rem",
        }}
      >
        <div>
          <div style={{ fontSize: "3rem" }}>⚠️</div>
          <h1 style={{ fontSize: "1.125rem", fontWeight: 900, margin: "0.75rem 0 0" }}>
            حدث خطأ غير متوقع
          </h1>
          <p style={{ fontSize: "0.875rem", color: "#5a7868", margin: "0.5rem 0 0" }}>
            تعذّر تحميل التطبيق. يمكنك المحاولة مرة أخرى.
          </p>
          {error.digest ? (
            <p dir="ltr" style={{ fontSize: "0.75rem", color: "#5a7868", fontFamily: "monospace" }}>
              {error.digest}
            </p>
          ) : null}
          <button
            onClick={() => retry()}
            style={{
              marginTop: "1.25rem",
              minHeight: 52,
              padding: "0.9rem 1.5rem",
              borderRadius: "0.875rem",
              border: "none",
              background: "#265c49",
              color: "#fff",
              fontSize: "1.05rem",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            إعادة المحاولة
          </button>
        </div>
      </body>
    </html>
  );
}
