export interface GiftTarget {
  published: boolean;
  isOpen: boolean;
}

export function takesGifts(activity: GiftTarget): boolean {
  return activity.published && activity.isOpen;
}

export function giftActivityId(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const id = raw.trim();
  return id ? id : null;
}

export function donateHref(activityId: string): string {
  return `/donate?activityId=${encodeURIComponent(activityId)}`;
}
