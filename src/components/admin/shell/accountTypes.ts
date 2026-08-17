export interface ActivityOption {
  id: string;
  title: string;
}

export interface AdminAccount {
  id: string;
  username: string;
  role: string;
  activities: ActivityOption[];
  lastLoginAt: string | null;
  lastLoginIp: string | null;
  createdAt: string;
}
