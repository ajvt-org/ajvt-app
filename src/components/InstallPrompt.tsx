"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import InstallBanner from "./InstallBanner";
import {
  SNOOZE_KEY,
  SESSION_KEY,
  INSTALLED_KEY,
  HINTED_KEY,
  flagSet,
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
  const [offer, setOffer] = useState<BeforeInstallPromptEvent | null>(null);
  const [hint, setHint] = useState(false);
  const pathname = usePathname();
  const shownOn = useRef<string | null>(null);

  useEffect(() => {
    const inApp = runningInstalled();
    const installed = inApp || flagSet(localStorage.getItem(INSTALLED_KEY));

    if (!inApp && installed && !flagSet(localStorage.getItem(HINTED_KEY))) {
      localStorage.setItem(HINTED_KEY, "1");
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setHint(true);
    }

    const allowed = shouldOffer({
      snoozedUntil: localStorage.getItem(SNOOZE_KEY),
      seenThisSession: sessionStorage.getItem(SESSION_KEY) === "1",
      installed,
      now: new Date(),
    });
    if (!allowed) return;

    function handler(e: Event) {
      e.preventDefault();
      sessionStorage.setItem(SESSION_KEY, "1");
      setOffer(e as BeforeInstallPromptEvent);
    }
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  useEffect(() => {
    function installed() {
      localStorage.setItem(INSTALLED_KEY, "1");
      setOffer(null);
    }
    window.addEventListener("appinstalled", installed);
    return () => window.removeEventListener("appinstalled", installed);
  }, []);

  useEffect(() => {
    if (!offer && !hint) return;
    if (shownOn.current === null) {
      shownOn.current = pathname;
      return;
    }
    if (pathname === shownOn.current) return;
    setOffer(null);
    setHint(false);
  }, [pathname, offer, hint]);

  function snooze() {
    localStorage.setItem(SNOOZE_KEY, String(snoozeUntil(new Date())));
  }

  async function install() {
    if (!offer) return;
    await offer.prompt();
    const { outcome } = await offer.userChoice;
    if (outcome === "accepted") localStorage.setItem(INSTALLED_KEY, "1");
    else snooze();
    setOffer(null);
  }

  if (offer) {
    return (
      <InstallBanner
        icon="phone"
        title="أضف التطبيق لشاشتك الرئيسية"
        note="وصول أسرع، بدون فتح المتصفح في كل مرة"
        action={{ label: "تثبيت", onClick: install }}
        onDismiss={() => {
          snooze();
          setOffer(null);
        }}
      />
    );
  }

  if (hint) {
    return (
      <InstallBanner
        icon="home"
        title="التطبيق مثبت على جهازك"
        note="افتحه من أيقونته في الشاشة الرئيسية"
        onDismiss={() => setHint(false)}
      />
    );
  }

  return null;
}
