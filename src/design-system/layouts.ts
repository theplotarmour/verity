// Standard layouts for Verity OS pages
export const layouts = {
  // Desktop layouts (persistent sidebar grids)
  desktop: {
    sidebar: "w-64 shrink-0 border-r border-border bg-surface/50 backdrop-blur-md flex flex-col h-full",
    header: "h-16 border-b border-border bg-surface/50 backdrop-blur-md flex items-center justify-between px-6 shrink-0",
    content: "flex-1 overflow-y-auto p-8 max-w-7xl mx-auto w-full space-y-8",
  },

  // Mobile viewport layouts
  mobile: {
    header: "h-14 border-b border-border bg-surface flex items-center justify-between px-4 shrink-0",
    content: "flex-1 overflow-y-auto p-4 space-y-6 pb-24",
    nav: "fixed bottom-0 left-0 right-0 h-16 border-t border-border bg-surface/90 backdrop-blur-md flex items-center justify-around px-4 z-40",
  },
} as const;
