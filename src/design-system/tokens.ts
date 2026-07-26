// Base design tokens for Verity OS
export const tokens = {
  // Spacing Scale (8pt System)
  spacing: {
    xs: "4px",
    sm: "8px",
    md: "12px",
    lg: "16px",
    xl: "24px",
    xxl: "32px",
    "3xl": "48px",
    "4xl": "64px",
  },

  // Color Definitions (Default palette mapped to CSS custom variables)
  colors: {
    background: "var(--background)",
    foreground: "var(--foreground)",
    surface: "var(--surface)",
    surfaceSecondary: "var(--surface-secondary)",
    border: "var(--border)",
    accent: "var(--accent)",
    accentSoft: "var(--accent-soft)",
    success: "var(--success)",
    successSoft: "var(--success-soft)",
    danger: "var(--danger)",
    dangerSoft: "var(--danger-soft)",
    warning: "var(--warning)",
    warningSoft: "var(--warning-soft)",
  },

  // Standard Border Radius Tokens
  radii: {
    sm: "8px",
    md: "12px",
    lg: "16px",
    xl: "20px",
    xxl: "24px",
    full: "9999px",
  },

  // Premium Shadows
  shadows: {
    soft: "0 2px 12px rgba(0, 0, 0, 0.03)",
    card: "0 8px 30px rgba(0, 0, 0, 0.06)",
    floating: "0 20px 50px rgba(0, 0, 0, 0.12)",
  },

  // Animations & Transitions
  motion: {
    fast: "100ms cubic-bezier(0.16, 1, 0.3, 1)",
    normal: "200ms cubic-bezier(0.16, 1, 0.3, 1)",
    slow: "350ms cubic-bezier(0.16, 1, 0.3, 1)",
  },
} as const;
