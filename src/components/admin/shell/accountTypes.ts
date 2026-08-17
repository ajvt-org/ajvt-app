export interface AdminAccount {
  id: string;
  username: string;
  role: string;
  activities: { activityId: string }[];
  lastLoginAt: string | null;
  lastLoginIp: string | null;
  createdAt: string;
}

export interface ActivityOption {
  id: string;
  title: string;
}
