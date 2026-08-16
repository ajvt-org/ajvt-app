"use client";

import { useEffect, useState } from "react";
import { useToast } from "@/components/Toast";
import IconLabel from "@/components/IconLabel";

export default function FollowTeamButton({ teamId }: { teamId: string }) {
  const [loading, setLoading] = useState(true);
  const [loggedIn, setLoggedIn] = useState(false);
  const [following, setFollowing] = useState(false);
  const [busy, setBusy] = useState(false);
  const showToast = useToast();

  useEffect(() => {
    fetch(`/api/teams/${teamId}/follow`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data) return;
        setLoggedIn(!!data.loggedIn);
        setFollowing(!!data.following);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [teamId]);

  async function toggle() {
    setBusy(true);
    try {
      const res = await fetch(`/api/teams/${teamId}/follow`, {
        method: following ? "DELETE" : "POST",
      });
      if (res.ok) {
        setFollowing((v) => !v);
        showToast(following ? "تم إلغاء المتابعة" : "تتابع الفريق الآن");
      }
    } finally {
      setBusy(false);
    }
  }

  if (loading) return null;

  if (!loggedIn) return null;

  return (
    <button
      onClick={toggle}
      disabled={busy}
      className="text-xs px-2 py-1 rounded-lg font-bold whitespace-nowrap"
      style={{
        background: following ? "var(--mint-600)" : "var(--mint-100)",
        color: following ? "white" : "var(--mint-700)",
      }}
    >
      <IconLabel name="star" size="1.1em" filled={following}>
        {following ? "متابَع" : "تابع"}
      </IconLabel>
    </button>
  );
}
