/** Цветовая палитра и общие константы UI. */

export const COLORS = {
  bg: "#0f1115",
  surface: "#1a1d24",
  surfaceAlt: "#22262f",
  primary: "#6c8cff",
  primaryDark: "#4a6bd6",
  accent: "#ffb86b",
  success: "#4ade80",
  error: "#f87171",
  warning: "#fbbf24",
  text: "#f2f3f5",
  textMuted: "#8b909a",
  border: "#2a2f3a",
  overlay: "rgba(0,0,0,0.7)",
} as const;

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const RADIUS = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
} as const;
