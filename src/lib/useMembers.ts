"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useInactivityLogout } from "@/lib/useInactivityLogout";
import { loginPathWithNext } from "@/lib/utils";

// The people on the signed-in account, for the two tabs that need them: the
// activities list, which asks who may register, and the profile, which shows
// each of them. Both also inherit the session handling, so an expired cookie
// lands on the login page from either.
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
  phone: string;
  age: string;
  paymentMethod: string;
  paymentProof: string | null;
  paidAmount: number | null;
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

export function useMembers() {
  const router = useRouter();
  const [members, setMembers] = useState<MemberData[]>([]);
  const [loading, setLoading] = useState(true);

  // A 401 here means the token was revoked, by a password change or an admin
  // reset. Dropping the cookie on the way out matters: left in place it still
  // parses, so the server keeps drawing the member bar for a session that
  // nothing will actually serve.
  function signOutAndReturnToLogin() {
    return fetch("/api/auth/logout", { method: "POST" })
      .catch(() => {})
      .finally(() => router.push(loginPathWithNext("/login")));
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
        setMembers(data.members || []);
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
    router.push("/");
  }

  useInactivityLogout(IDLE_TIMEOUT_MS, logout, !loading);

  return { members, setMembers, loading, reload, logout };
}
