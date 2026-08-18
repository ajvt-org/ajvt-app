"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import Icon from "./Icon";
import {
  SNOOZE_KEY,
  SESSION_KEY,
  INSTALLED_KEY,
  alreadyInstalled,
  shouldOffer,
  snoozeUntil,
} from "@/lib/installPrompt";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function runningInstalled(): boolean {
  if (window.matchMedia("(display-mode: standalone)").matches) return true;
  if (window.matchMedia("(display-mode: minimal-ui)").matches) return true;
  return (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
}

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const pathname = usePathname();
  const shownOn = useRef<string | null>(null);

  useEffect(() => {
    const allowed = shouldOffer({
      snoozedUntil: localStorage.getItem(SNOOZE_KEY),
      seenThisSession: sessionStorage.getItem(SESSION_KEY) === "1",
      installed: runningInstalled() || alreadyInstalled(localStorage.getItem(INSTALLED_KEY)),
      now: new Date(),
    });
    if (!allowed) return;

    function handler(e: Event) {
      e.preventDefault();
      sessionStorage.setItem(SESSION_KEY, "1");
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    }
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  useEffect(() => {
    function installed() {
      localStorage.setItem(INSTALLED_KEY, "1");
      setDeferredPrompt(null);
    }
    window.addEventListener("appinstalled", installed);
    return () => window.removeEventListener("appinstalled", installed);
  }, []);

  useEffect(() => {
    if (!deferredPrompt) return;
    if (shownOn.current === null) {
      shownOn.current = pathname;
      return;
    }
    if (pathname !== shownOn.current) setDeferredPrompt(null);
  }, [pathname, deferredPrompt]);

  if (!deferredPrompt) return null;

  async function install() {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") localStorage.setItem(INSTALLED_KEY, "1");
    else snooze();
    setDeferredPrompt(null);
  }

  function snooze() {
    localStorage.setItem(SNOOZE_KEY, String(snoozeUntil(new Date())));
  }

  function dismiss() {
    snooze();
    setDeferredPrompt(null);
  }

  return (
    <div
      className="install-prompt fixed inset-x-4 z-30 card p-3 flex items-center gap-3 fade-up"
      style={{ maxWidth: "420px", margin: "0 auto", border: "1px solid var(--mint-200)" }}
    >
      <span className="shrink-0" style={{ color: "var(--mint-700)" }}>
        <Icon name="phone" size={22} />
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold" style={{ color: "var(--text-main)" }}>
          أضف التطبيق لشاشتك الرئيسية
        </p>
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          وصول أسرع، بدون فتح المتصفح في كل مرة
        </p>
      </div>
      <button
        onClick={install}
        className="text-xs px-3 py-2 rounded-lg font-bold shrink-0"
        style={{ background: "var(--mint-600)", color: "white" }}
      >
        تثبيت
      </button>
      <button
        onClick={dismiss}
        aria-label="إغلاق"
        className="px-1 shrink-0 flex items-center"
        style={{ color: "var(--text-muted)" }}
      >
        <Icon name="close" size={16} />
      </button>
    </div>
  );
}
