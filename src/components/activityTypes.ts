import type { IconName } from "@/components/Icon";
import type { TournamentStage } from "@/lib/tournamentStage";
import { membershipState } from "@/lib/membershipState";

export interface Team {
  id: string;
  name: string;
}

export interface Activity {
  id: string;
  title: string;
  description: string;
  when: string | null;
  startsAt: string | null;
  endsAt: string | null;
  photo: string | null;
  capacity: number | null;
  isOpen: boolean;
  isTournament: boolean;
  isVolunteer: boolean;
  whatsappLink: string | null;
  registrantCount: number;
  unplayedMatches?: number;
  awaitingStage?: TournamentStage | null;
  joinableTeams: Team[];
}

export interface MemberRegistration {
  activityId: string;
  status: "PENDING" | "ACTIVE" | "REJECTED";
  rejectionReason: string | null;
}

export interface MemberTeamMembership {
  teamId: string;
  teamName: string;
  activityId: string;
  status: "PENDING" | "ACTIVE";
}

export interface EligibleMember {
  id: string;
  fullName: string;
  photo: string | null;
  canJoinNew: boolean;
  registrations: MemberRegistration[];
  teamMemberships: MemberTeamMembership[];
}

type ApiMember = {
  id: string;
  fullName: string;
  photo: string | null;
  status: string;
  membershipYear: number;
  registrations: { activityId: string; status: string; rejectionReason: string | null }[];
  teamMemberships: { status: string; team: { id: string; name: string; activityId: string } }[];
};

export function toEligibleMember(
  member: ApiMember | null | undefined,
  currentYear?: number | null,
): EligibleMember | null {
  if (!member || member.status !== "ACTIVE") return null;
  const behind =
    typeof currentYear === "number" &&
    membershipState({ status: "ACTIVE", membershipYear: member.membershipYear }, currentYear) ===
      "BEHIND";
  return {
    id: member.id,
    fullName: member.fullName,
    photo: member.photo,
    canJoinNew: !behind,
    registrations: member.registrations.map((r) => ({
      activityId: r.activityId,
      status: r.status as MemberRegistration["status"],
      rejectionReason: r.rejectionReason,
    })),
    teamMemberships: member.teamMemberships.map((tm) => ({
      teamId: tm.team.id,
      teamName: tm.team.name,
      activityId: tm.team.activityId,
      status: tm.status as MemberTeamMembership["status"],
    })),
  };
}

export const STATUS_LABEL: Record<string, { icon: IconName; text: string }> = {
  PENDING: { icon: "clock", text: "قيد المراجعة" },
  ACTIVE: { icon: "check", text: "مقبول" },
  REJECTED: { icon: "close", text: "مرفوض" },
};

export const STATUS_CLASS: Record<string, string> = {
  PENDING: "badge-pending",
  ACTIVE: "badge-active",
  REJECTED: "badge-rejected",
};
