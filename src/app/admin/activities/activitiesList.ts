export function registeredCount(activity: { registrations: { status: string }[] }): number {
  return activity.registrations.filter((r) => r.status !== "REJECTED").length;
}

export function pendingCount(activity: { registrations: { status: string }[] }): number {
  return activity.registrations.filter((r) => r.status === "PENDING").length;
}
