export interface ShownDonor {
  memberName: string;
  donorName?: string | null;
  userId?: string | null;
}

export interface ShownDonorNames {
  name: string;
  typed: string | null;
}

export function donorNamesShown(donor: ShownDonor): ShownDonorNames {
  const name = donor.memberName;
  if (donor.userId) return { name, typed: null };
  const typed = donor.donorName?.trim() || null;
  return { name, typed: typed && typed !== name ? typed : null };
}
