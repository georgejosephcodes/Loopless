// Shared pin palette. `fg` is the numeral color that stays readable on `bg`.
export const PINS = [
  { bg: '#f59e0b', fg: '#1a1204' },
  { bg: '#10b981', fg: '#ffffff' },
  { bg: '#0ea5e9', fg: '#ffffff' },
  { bg: '#8b5cf6', fg: '#ffffff' },
  { bg: '#f43f5e', fg: '#ffffff' },
  { bg: '#14b8a6', fg: '#ffffff' },
];

export const RETURN_PIN = { bg: '#f97316', fg: '#ffffff' };

export const pinFor = (index) => PINS[index % PINS.length];
