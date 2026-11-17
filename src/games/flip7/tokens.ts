/**
 * Flip 7 card colors (spec §6), copied from mockup Flip7Cards. They're an
 * exception to the "tokens only" rule, allowed only on Flip 7's entry
 * screens (the card selector and keypad). Cards keep these colors in dark mode.
 */
export const FLIP7 = {
  numberCard: '#F6EEDC',
  numberCardBorder: '#D9C9A3',
  numeralOutline: '#1F2430',
  /** Numeral color for cards 0 to 12. */
  numerals: ['#E8197D', '#A39384', '#C5D928', '#EE4560', '#2BB5C9', '#1FA34A', '#8E44C2', '#D27F72', '#8CD15A', '#F08A1C', '#E3262B', '#6A9BE0', '#8C7E78'],
  modifierCard: '#F5A623',
  modifierCardBorder: '#D98A12',
  modifierNumeral: '#E8524A',
  bust: '#B91C1C',
  bustText: '#FFFFFF',
} as const;
