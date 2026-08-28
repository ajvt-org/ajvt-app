"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useInactivityLogout } from "@/lib/useInactivityLogout";
import { loginPathWithNext } from "@/lib/utils";
import { goAfterAuthChange } from "@/lib/authNav";

// The membership on the signed-in account, for the two tabs that need it: the
// activities list, which asks whether it may register, and the profile, which
// shows it. Both also inherit the session handling, so an expired cookie lands
// on the login page from either. An account carries at most one membership,
// so /api/user/me returns a list of nought or one.
const IDLE_TIMEOUT_MS = 30 * 60 * 1000;

export type Status = "PENDING" | "ACTIVE" | "REJECTED";

export interface RegistrationData {
  id: string;
  activityId: string;
  status: "PENDING" | "ACTIVE" | "REJECTED";
  rejectionReason: string | null;
  activity: { id: string; title: string };
}

export interface TeamMembershipData {
  status: "PENDING" | "ACTIVE";
  team: { id: string; name: string; activityId: string };
}

export interface MemberData {
  id: string;
  fullName: string;
  user: { phone: string } | null;
  age: string | null;
  village: string;
  paymentMethod: string;
  paymentProof: string | null;
  paidAmount: number | null;
  supportAmount: number;
  surplusAnonymous: boolean;
  status: Status;
  rejectionReason: string | null;
  createdAt: string;
  updatedAt: string;
  memberNumber: string | null;
  verifyToken: string | null;
  photo: string | null;
  registrations: RegistrationData[];
  teamMemberships: TeamMembershipData[];
}

export function useMember() {
  const router = useRouter();
  const [member, setMember] = useState<MemberData | null>(null);
  const [loading, setLoading] = useState(true);

  // A 401 here means the token was revoked, by a password change or an admin
  // reset. Dropping the cookie on the way out matters: left in place it still
  // parses, so the server keeps drawing the member bar for a session that
  // nothing will actually serve.
  function signOutAndReturnToLogin() {
    return fetch("/api/auth/logout", { method: "POST" })
      .catch(() => {})
      .finally(() => goAfterAuthChange(router, loginPathWithNext("/login")));
  }

  function reload() {
    return fetch("/api/user/me")
      .then((r) => {
        if (r.status === 401) {
          signOutAndReturnToLogin();
          return null;
        }
        return r.json();
      })
      .then((data) => {
        if (!data) return;
        setMember(data.members?.[0] ?? null);
      })
      .catch(() => signOutAndReturnToLogin());
  }

  useEffect(() => {
    reload().finally(() => setLoading(false));
    if (typeof navigator !== "undefined" && "clearAppBadge" in navigator) {
      navigator.clearAppBadge().catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    goAfterAuthChange(router, "/");
  }

  useInactivityLogout(IDLE_TIMEOUT_MS, logout, !loading);

  return { member, setMember, loading, reload, logout };
}
