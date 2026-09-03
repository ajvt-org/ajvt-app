export const ouguiya = {
  singular: "أوقية",
  dual: "أوقيتان",
  plural: "أوقيات",
  one: "أوقية واحدة",
  amount: (value: number) => {
    const digits = String(Math.trunc(Math.abs(value))).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    const sign = value < 0 ? "-" : "";
    return `${sign}${digits} أوقية`;
  },
} as const;
