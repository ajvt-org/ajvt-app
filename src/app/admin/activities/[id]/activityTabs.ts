import type { WorkspaceTab } from "@/components/admin/WorkspaceTabs";
import { tournamentTabs, type TournamentShape } from "@/components/admin/tournament/tournamentTabs";
import { activityWorkspace as texts } from "@/lib/texts";

export interface TabbedActivity extends TournamentShape {
  isVolunteer: boolean;
  registrations: { status: string }[];
}

export function activityTabs(
  activity: TabbedActivity,
  pendingProposals: number,
  pendingJoinRequests = 0,
): WorkspaceTab[] {
  const pending = activity.registrations.filter((r) => r.status === "PENDING").length;
  const tabs: WorkspaceTab[] = [{ key: "details", label: texts.tabs.details, icon: "pencil" }];

  if (!activity.isVolunteer || activity.registrations.length > 0) {
    tabs.push({
      key: "registrations",
      label: texts.tabs.registrations,
      icon: "users",
      badge: pending,
    });
  }

  tabs.push(...tournamentTabs(activity, pendingProposals, pendingJoinRequests));
  tabs.push({ key: "finance", label: texts.tabs.finance, icon: "wallet" });
  tabs.push({ key: "log", label: texts.tabs.log, icon: "list" });
  return tabs;
}
