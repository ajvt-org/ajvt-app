"use client";

import { useEffect, useState } from "react";

type Status = "unsupported" | "default" | "subscribing" | "subscribed" | "denied" | "error";

const DISMISS_KEY = "ajvt_notif_prompt_dismissed";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}

export default function NotificationsButton({ dismissible = false }: { dismissible?: boolean }) {
  const [status, setStatus] = useState<Status>("default");
  const [dismissed, setDismissed] = useState(false);

  function checkStatus() {
    if (
      !("serviceWorker" in navigator) ||
      !("PushManager" in window) ||
      !("Notification" in window)
    ) {
      setStatus("unsupported");
      return;
    }
    if (Notification.permission === "denied") {
      setStatus("denied");
      return;
    }
    navigator.serviceWorker.register("/sw.js").then((reg) =>
      reg.pushManager.getSubscription().then((sub) => {
        if (sub) setStatus("subscribed");
      }),
    );
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    checkStatus();
    if (dismissible && localStorage.getItem(DISMISS_KEY)) {
      setDismissed(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, "1");
    setDismissed(true);
  }

  async function enable() {
    const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!vapidKey) {
      setStatus("error");
      return;
    }

    setStatus("subscribing");
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setStatus(permission === "denied" ? "denied" : "default");
        return;
      }

      const reg = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;
      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey) as BufferSource,
      });

      const json = subscription.toJSON();
      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint: json.endpoint, keys: json.keys }),
      });
      if (!res.ok) throw new Error();
      setStatus("subscribed");
    } catch {
      setStatus("error");
    }
  }

  if (status === "unsupported" || status === "subscribed" || dismissed) return null;

  return (
    <div className="card p-4 flex items-center justify-between gap-3">
      <div>
        <p className="text-sm font-bold" style={{ color: "var(--text-main)" }}>
          🔔 فعّل الإشعارات
        </p>
        <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
          {status === "denied"
            ? "الإشعارات محظورة — فعّلها من إعدادات المتصفح"
            : dismissible
              ? "لتصلك تذكيرات المباريات وأخبار الأنشطة أولاً بأول"
              : "لتصلك رسالة فور قبول أو رفض طلبك"}
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {status !== "denied" && (
          <button
            onClick={enable}
            disabled={status === "subscribing"}
            className="text-xs px-3 py-1.5 rounded-lg font-bold shrink-0"
            style={{ background: "var(--mint-600)", color: "white" }}
          >
            {status === "subscribing" ? "..." : "تفعيل"}
          </button>
        )}
        {dismissible && (
          <button
            onClick={dismiss}
            aria-label="إغلاق"
            className="text-lg font-bold px-1"
            style={{ color: "var(--text-muted)" }}
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
}
