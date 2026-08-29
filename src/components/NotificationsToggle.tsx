"use client";

import { useEffect, useState } from "react";
import Icon from "./Icon";
import Toggle from "./Toggle";
import NotificationCategories from "./NotificationCategories";

type Status = "unsupported" | "off" | "busy" | "on" | "denied" | "error";

const VAPID_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}

export default function NotificationsToggle({
  awaitingDecision = false,
}: {
  awaitingDecision?: boolean;
}) {
  const [status, setStatus] = useState<Status>("off");

  useEffect(() => {
    const supported =
      Boolean(VAPID_KEY) &&
      "serviceWorker" in navigator &&
      "PushManager" in window &&
      "Notification" in window;
    const settled: Status | null = !supported
      ? "unsupported"
      : Notification.permission === "denied"
        ? "denied"
        : null;

    if (settled) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setStatus(settled);
      return;
    }

    navigator.serviceWorker.register("/sw.js").then((reg) =>
      reg.pushManager.getSubscription().then((sub) => {
        if (sub) setStatus("on");
      }),
    );
  }, []);

  async function enable() {
    setStatus("busy");
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setStatus(permission === "denied" ? "denied" : "off");
        return;
      }

      const reg = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;
      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_KEY as string) as BufferSource,
      });

      const json = subscription.toJSON();
      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint: json.endpoint, keys: json.keys }),
      });
      if (!res.ok) throw new Error();
      setStatus("on");
    } catch {
      setStatus("error");
    }
  }

  async function disable() {
    setStatus("busy");
    try {
      const reg = await navigator.serviceWorker.ready;
      const subscription = await reg.pushManager.getSubscription();
      if (subscription) {
        await fetch("/api/push/unsubscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        });
        await subscription.unsubscribe();
      }
      setStatus("off");
    } catch {
      setStatus("error");
    }
  }

  if (status === "unsupported") return null;

  const on = status === "on";
  const hint =
    status === "denied"
      ? "الإشعارات محظورة — فعّلها من إعدادات المتصفح"
      : status === "error"
        ? "تعذّر تغيير الإعداد، حاول مرة أخرى"
        : on
          ? "ستصلك أخبار الأنشطة وقرارات الطلبات"
          : awaitingDecision
            ? "لتصلك رسالة فور قبول أو رفض طلبك"
            : "لتصلك تذكيرات المباريات وأخبار الأنشطة أولاً بأول";

  return (
    <>
      <div className="card p-4 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-bold" style={{ color: "var(--text-main)" }}>
            <Icon name="bell" size={15} className="icon-inline" /> الإشعارات
          </p>
          <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
            {hint}
          </p>
        </div>
        <Toggle
          label="الإشعارات"
          checked={on}
          disabled={status === "denied" || status === "busy"}
          onChange={(next) => (next ? enable() : disable())}
        />
      </div>
      {on && <NotificationCategories />}
    </>
  );
}
