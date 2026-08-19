export const ROLE_LABELS: Record<string, string> = {
  SUPER: "كامل الصلاحيات",
  MEMBERS: "الأعضاء فقط",
  ACTIVITIES: "الأنشطة فقط",
  QUIZ: "المسابقات الثقافية فقط",
  ACTIVITY: "أنشطة محددة فقط",
};

export function adminRoleLabel(role: string): string {
  return ROLE_LABELS[role] ?? role;
}
