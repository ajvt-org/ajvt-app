"use client";

import { useEffect, useState } from "react";

export default function FollowTeamButton({ teamId }: { teamId: string }) {
  const [loading, setLoading] = useState(true);
  const [loggedIn, setLoggedIn] = useState(false);
  const [following, setFollowing] = useState(false);
  const [busy, setBusy] = useState(false);

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
      const res = await fetch(`/api/teams/${teamId}/follow`, { method: following ? "DELETE" : "POST" });
      if (res.ok) setFollowing((v) => !v);
    } finally {
      setBusy(false);
    }
  }

  if (loading) return null;

  if (!loggedIn) {
    return (
      <a href="/login" className="text-xs" style={{ color: "var(--mint-600)" }}>
        سجّل الدخول للمتابعة
      </a>
    );
  }

  return (
    <button
      onClick={toggle}
      disabled={busy}
      className="text-xs px-2 py-1 rounded-lg font-bold"
      style={{
        background: following ? "var(--mint-600)" : "var(--mint-100)",
        color: following ? "white" : "var(--mint-700)",
      }}
    >
      {following ? "★ متابَع" : "☆ تابع"}
    </button>
  );
}
