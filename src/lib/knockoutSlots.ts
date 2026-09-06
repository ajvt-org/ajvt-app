import { bracketSize } from "./bracketDraw";
import { isPowerOfTwo } from "./tournament";

export interface QualifierSlot {
  groupIndex: number;
  position: number;
}

export interface SlotPair {
  home: QualifierSlot;
  away: QualifierSlot;
}

export function qualifierSlots(groupCount: number, qualifierCount: number): QualifierSlot[] {
  const perGroup = qualifierCount / groupCount;
  const slots: QualifierSlot[] = [];
  for (let position = 1; position <= perGroup; position++) {
    for (let groupIndex = 0; groupIndex < groupCount; groupIndex++) {
      slots.push({ groupIndex, position });
    }
  }
  return slots;
}

export function slotsCanPair(groupCount: number, qualifierCount: number): boolean {
  if (groupCount < 2 || groupCount % 2 !== 0) return false;
  if (!isPowerOfTwo(qualifierCount)) return false;
  return qualifierCount % groupCount === 0;
}

export function pairQualifierSlots(groupCount: number, qualifierCount: number): SlotPair[] {
  if (!slotsCanPair(groupCount, qualifierCount)) return [];

  const perGroup = qualifierCount / groupCount;
  const pairs: SlotPair[] = [];
  for (let block = 0; block < perGroup; block++) {
    for (let seat = 0; seat < groupCount / 2; seat++) {
      const first = { groupIndex: seat * 2, position: block + 1 };
      const second = { groupIndex: seat * 2 + 1, position: perGroup - block };
      pairs.push(
        first.position <= second.position
          ? { home: first, away: second }
          : { home: second, away: first },
      );
    }
  }
  return pairs;
}

export function knockoutRoundSizes(qualifierCount: number): number[] {
  if (qualifierCount < 2) return [];
  const sizes: number[] = [];
  for (let left = bracketSize(qualifierCount); left >= 2; left /= 2) sizes.push(left / 2);
  return sizes;
}
