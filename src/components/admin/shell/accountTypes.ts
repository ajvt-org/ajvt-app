export interface ActivityOption {
  id: string;
  title: string;
}

export interface AdminAccountSummary {
  id: string;
  username: string;
}

export interface AdminAccount extends AdminAccountSummary {
  role: string;
  activities: ActivityOption[];
  lastLoginAt: string | null;
  lastLoginIp: string | null;
  createdAt: string;
}

export type AdminAccountRow = AdminAccount | AdminAccountSummary;

export function isFullAccount(account: AdminAccountRow): account is AdminAccount {
  return "role" in account;
}
