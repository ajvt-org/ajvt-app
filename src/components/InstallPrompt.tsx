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

type RelatedApps = () => Promise<unknown[]>;

function runningInstalled(): boolean {
  if (window.matchMedia("(display-mode: standalone)").matches) return true;
  return (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
}

function remembered(): boolean {
  return flagSet(localStorage.getItem(INSTALLED_KEY));
}

async function knownInstalled(): Promise<boolean> {
  const related = (navigator as Navigator & { getInstalledRelatedApps?: RelatedApps })
    .getInstalledRelatedApps;
  if (!related) return remembered();
  try {
    return (await related.call(navigator)).length > 0;
  } catch {
    return remembered();
  }
}

export default function InstallPrompt() {
  const [offer, setOffer] = useState<BeforeInstallPromptEvent | null>(null);
  const [hint, setHint] = useState(false);
  const [installed, setInstalled] = useState<boolean | null>(null);
  const pathname = usePathname();
  const shownOn = useRef<string | null>(null);
  const offered = useRef(false);

  useEffect(() => {
    if (runningInstalled()) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setInstalled(true);
      return;
    }

    let live = true;

    knownInstalled().then((yes) => {
      if (!live || offered.current) return;
      if (yes) {
        localStorage.setItem(INSTALLED_KEY, "1");
        if (!flagSet(localStorage.getItem(HINTED_KEY))) {
          localStorage.setItem(HINTED_KEY, "1");
          setHint(true);
        }
      } else {
        localStorage.removeItem(INSTALLED_KEY);
        localStorage.removeItem(HINTED_KEY);
      }
      setInstalled(yes);
    });

    const allowed = shouldOffer({
      snoozedUntil: localStorage.getItem(SNOOZE_KEY),
      seenThisSession: sessionStorage.getItem(SESSION_KEY) === "1",
      installed: false,
      now: new Date(),
    });
    if (!allowed) {
      return () => {
        live = false;
      };
    }

    function handler(e: Event) {
      e.preventDefault();
      sessionStorage.setItem(SESSION_KEY, "1");
      offered.current = true;
      localStorage.removeItem(INSTALLED_KEY);
      localStorage.removeItem(HINTED_KEY);
      if (live) {
        setInstalled(false);
        setHint(false);
        setOffer(e as BeforeInstallPromptEvent);
      }
    }
    window.addEventListener("beforeinstallprompt", handler);

    return () => {
      live = false;
      window.removeEventListener("beforeinstallprompt", handler);
    };
  }, []);

  useEffect(() => {
    function done() {
      localStorage.setItem(INSTALLED_KEY, "1");
      setInstalled(true);
      setOffer(null);
    }
    window.addEventListener("appinstalled", done);
    return () => window.removeEventListener("appinstalled", done);
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

  if (installed === null) return null;

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

  if (installed || !offer) return null;

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
