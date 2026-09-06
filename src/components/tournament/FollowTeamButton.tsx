"use client";

import { useEffect, useState } from "react";
import { useToast } from "@/components/Toast";
import Icon from "@/components/Icon";
import { publicTournament as texts } from "@/lib/texts";
import type { EntrantKind } from "@/lib/entrant";

export default function FollowTeamButton({
  teamId,
  entrant = "team",
}: {
  teamId: string;
  entrant?: EntrantKind;
}) {
  const words = texts.entrant[entrant];
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
    const wanted = !following;
    setFollowing(wanted);
    setBusy(true);
    try {
      const res = await fetch(`/api/teams/${teamId}/follow`, {
        method: wanted ? "POST" : "DELETE",
      });
      if (!res.ok) throw new Error(texts.followFailed);
      showToast(wanted ? words.followed : words.unfollowed);
    } catch {
      setFollowing(!wanted);
      showToast(texts.followFailed, "error");
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
      aria-label={following ? words.following : words.follow}
      aria-pressed={following}
      className="btn btn-icon"
      style={{ background: "transparent", color: "var(--mint-600)" }}
    >
      <Icon name="star" size={22} filled={following} />
    </button>
  );
}
