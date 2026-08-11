"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";

interface ToastItem {
  id: number;
  message: string;
  kind: "success" | "error";
}

type ShowToast = (message: string, kind?: "success" | "error") => void;

const ToastContext = createContext<ShowToast>(() => {});

export function useToast(): ShowToast {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(0);

  const showToast = useCallback<ShowToast>((message, kind = "success") => {
    const id = ++nextId.current;
    setToasts((prev) => [...prev, { id, message, kind }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3000);
  }, []);

  return (
    <ToastContext.Provider value={showToast}>
      {children}
      <div
        className="fixed bottom-4 inset-x-0 z-[100] flex flex-col items-center gap-2 px-4 pointer-events-none"
        aria-live="polite"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className="pointer-events-auto px-4 py-2.5 rounded-xl text-sm font-bold shadow-lg fade-up text-center"
            style={{
              background: t.kind === "success" ? "var(--mint-700)" : "#dc2626",
              color: "white",
              maxWidth: "90vw",
            }}
          >
            {t.kind === "success" ? "✅ " : "⚠️ "}{t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
