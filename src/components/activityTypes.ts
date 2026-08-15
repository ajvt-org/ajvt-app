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
