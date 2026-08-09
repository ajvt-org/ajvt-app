"use client";

import { useEffect, useState } from "react";

type Status = "unsupported" | "default" | "subscribing" | "subscribed" | "denied" | "error";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}

export default function NotificationsButton() {
  const [status, setStatus] = useState<Status>("default");

  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
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
      })
    );
  }, []);

  async function enable() {
    const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!vapidKey) { setStatus("error"); return; }

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

  if (status === "unsupported" || status === "subscribed") return null;

  return (
    <div className="card p-4 flex items-center justify-between gap-3">
      <div>
        <p className="text-sm font-bold" style={{ color: "var(--text-main)" }}>🔔 فعّل الإشعارات</p>
        <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
          {status === "denied"
            ? "الإشعارات محظورة — فعّلها من إعدادات المتصفح"
            : "لتصلك رسالة فور قبول أو رفض طلبك"}
        </p>
      </div>
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
    </div>
  );
}
