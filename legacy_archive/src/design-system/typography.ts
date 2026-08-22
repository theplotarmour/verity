// Verity OS Enforced Typography Scale
export const typography = {
  // Giant Hero Stats / Highlights
  displayXL: "font-extrabold tracking-[-0.04em] leading-[1.1] text-3xl lg:text-5xl",
  displayL: "font-extrabold tracking-[-0.03em] leading-[1.15] text-2xl lg:text-4xl",

  // Page, Section, and Card Titles
  headingXL: "font-bold tracking-[-0.03em] leading-[1.2] text-xl lg:text-2xl",
  headingL: "font-semibold tracking-[-0.02em] leading-[1.3] text-lg lg:text-xl",
  headingM: "font-semibold tracking-[-0.01em] leading-normal text-md lg:text-lg",
  headingS: "font-semibold tracking-normal leading-normal text-sm lg:text-md",

  // Sub-headers and Labels
  titleL: "font-semibold tracking-normal text-sm",
  titleM: "font-medium tracking-normal text-sm",
  titleS: "font-medium tracking-normal text-xs",

  // Paragraphs & Descriptions
  bodyL: "font-normal leading-[1.5] text-sm lg:text-base text-text-secondary",
  bodyM: "font-normal leading-[1.5] text-xs lg:text-sm text-text-secondary",
  bodyS: "font-normal leading-[1.4] text-xs text-text-secondary/95",

  // Uppercase badges, navigation, and tiny labels
  labelL: "font-bold tracking-[0.12em] uppercase text-[10px] leading-none text-text-tertiary",
  labelM: "font-semibold tracking-[0.1em] uppercase text-[9px] leading-none text-text-tertiary",
  labelS: "font-medium tracking-[0.08em] uppercase text-[8px] leading-none text-text-tertiary/80",

  // Auxiliary details
  caption: "font-normal text-[10px] text-text-tertiary/75 leading-normal",
  mono: "font-mono tracking-normal",
  numeric: "tabular-nums lining-nums font-mono",
} as const;
