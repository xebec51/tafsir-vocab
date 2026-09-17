export const JUZ_14 = {
  number: 14,
  firstMushafPage: 262,
  lastMushafPage: 281,
  totalUnits: 20,
  units: Array.from({ length: 20 }, (_, index) => ({
    unitNumber: index + 1,
    mushafPage: 262 + index
  }))
} as const;
