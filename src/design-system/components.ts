// Unified sizing and class configurations for components in Verity OS
export const components = {
  // Height configurations across viewports
  heights: {
    desktop: "h-[44px]",
    tablet: "h-[52px]",
    mobile: "h-[56px]",
    interactive: "h-[44px] md:h-[52px] lg:h-[44px]",
  },

  // Standard Button preset classes
  button: {
    base: "inline-flex items-center justify-center gap-2 text-sm font-semibold transition-all duration-200 border disabled:cursor-not-allowed disabled:opacity-50 h-[44px] md:h-[52px] lg:h-[44px] rounded-[12px] px-4",
    primary: "bg-transparent text-[var(--brand)] border-[var(--brand)]/60 hover:border-[var(--brand)] hover:bg-[var(--brand)]/8 shadow-[inset_0_0_0_0_var(--brand)] hover:shadow-[inset_0_0_14px_-4px_var(--brand)]/25",
    secondary: "bg-transparent text-text-primary border-border hover:border-border/80 hover:bg-surface-2/60 hover:shadow-[inset_0_0_10px_-4px_rgba(0,0,0,0.08)]",
    ghost: "bg-transparent text-text-secondary border-transparent hover:bg-surface-2 hover:text-text-primary",
    danger: "bg-transparent text-danger border-danger/50 hover:border-danger hover:bg-danger/8 hover:shadow-[inset_0_0_14px_-4px_rgba(239,68,68,0.25)]",
    success: "bg-transparent text-success border-success/50 hover:border-success hover:bg-success/8 hover:shadow-[inset_0_0_14px_-4px_rgba(16,185,129,0.25)]",
  },

  // Input Preset classes
  input: "w-full rounded-[12px] border border-border bg-transparent px-3 text-sm text-text-primary outline-none transition-all duration-200 placeholder:text-text-tertiary focus:border-[var(--brand)]/70 focus:shadow-[inset_0_0_14px_-4px_var(--brand)]/15 focus:ring-0 h-[44px] md:h-[52px] lg:h-[44px]",

  // Enforced Card layout structures
  card: {
    identity: "overflow-hidden rounded-[24px] border border-border/40 bg-surface/50 backdrop-blur-md p-6 shadow-[0_8px_30px_rgba(0,0,0,0.04)]",
    metric: "rounded-[20px] border border-border bg-surface p-5 shadow-[0_4px_20px_rgba(0,0,0,0.02)] flex flex-col justify-between",
    configuration: "rounded-[24px] border border-border bg-surface p-6 shadow-sm space-y-4",
    gateway: "rounded-[24px] border border-border/80 bg-surface/65 backdrop-blur-md p-6 hover:border-[var(--brand)]/30 hover:shadow-[0_12px_40px_rgba(0,0,0,0.08)] transition-all duration-300 shadow-[0_8px_30px_rgba(0,0,0,0.04)]",
    explorer: "rounded-[20px] border border-border bg-surface/50 p-4 hover:bg-surface-2/40 hover:border-border/80 transition-all duration-200 cursor-pointer flex items-center justify-between",
    status: "rounded-[20px] border p-5 shadow-[0_8px_30px_rgba(0,0,0,0.03)]",
  },
} as const;
