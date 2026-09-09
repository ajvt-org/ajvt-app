export const activityDates = {
  twoDays: (first: string, second: string) => `يومي ${first} و ${second}`,
  atTime: (time: string) => `الساعة ${time}`,
  betweenTimes: (from: string, to: string) => `من ${from} إلى ${to}`,
  withClock: (dates: string, clock: string) => `${dates}، ${clock}`,
} as const;
