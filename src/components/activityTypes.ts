import type { IconName } from "@/components/Icon";

// Shared by the activities list and the activity page.
export interface Team {
  id: string;
  name: string;
}

export interface Activity {
  id: string;
  title: string;
  description: string;
  when: string | null;
  photo: string | null;
  capacity: number | null;
  isOpen: boolean;
  isTournament: boolean;
  isVolunteer: boolean;
  whatsappLink: string | null;
  registrantCount: number;
  teams: Team[];
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
  registrations: MemberRegistration[];
  teamMemberships: MemberTeamMembership[];
}

// What /api/user/me hands back, cut down to what registering needs. The
// activities tab and an activity's own page both read the same endpoint, so
// the narrowing lives here rather than twice.
type ApiMember = {
  id: string;
  fullName: string;
  photo: string | null;
  status: string;
  registrations: { activityId: string; status: string; rejectionReason: string | null }[];
  teamMemberships: { status: string; team: { id: string; name: string; activityId: string } }[];
};

export function toEligibleMember(member: ApiMember | null | undefined): EligibleMember | null {
  if (!member || member.status !== "ACTIVE") return null;
  return {
    id: member.id,
    fullName: member.fullName,
    photo: member.photo,
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
