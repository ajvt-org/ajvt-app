"use client";

import { useEffect, useState } from "react";

const DISMISSED_KEY = "ajvt_install_dismissed";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    if (localStorage.getItem(DISMISSED_KEY)) return;

    function handler(e: Event) {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    }
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  if (!deferredPrompt) return null;

  async function install() {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
  }

  function dismiss() {
    localStorage.setItem(DISMISSED_KEY, "1");
    setDeferredPrompt(null);
  }

  return (
    <div
      className="fixed bottom-4 inset-x-4 z-50 card p-3 flex items-center gap-3 fade-up"
      style={{ maxWidth: "420px", margin: "0 auto", border: "1px solid var(--mint-200)" }}
    >
      <span className="text-2xl shrink-0">📲</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold" style={{ color: "var(--text-main)" }}>أضف التطبيق لشاشتك الرئيسية</p>
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>وصول أسرع، بدون فتح المتصفح في كل مرة</p>
      </div>
      <button onClick={install} className="text-xs px-3 py-2 rounded-lg font-bold shrink-0" style={{ background: "var(--mint-600)", color: "white" }}>
        تثبيت
      </button>
      <button onClick={dismiss} className="text-lg font-bold shrink-0 px-1" style={{ color: "var(--text-muted)" }}>
        ✕
      </button>
    </div>
  );
}
