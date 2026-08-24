import "server-only";

/**
 * The Experience System's accent.
 *
 * Authority: ADR-011 and the approved design source `Verity App.dc.html`, whose
 * palette and `onAccent` rule are reproduced exactly.
 *
 * BRAND IS NOT ACCENT. The Verity mark and wordmark are fixed assets and are
 * never recoloured by this. Warm Sand Gold is the DEFAULT accent because it is
 * the brand's colour, but a tenant choosing Ocean Blue changes the interface,
 * not the identity.
 *
 * Only two things are computed here rather than in CSS. The 50→900 tonal ladder
 * is derived by `color-mix` in `globals.css`, because a stylesheet that can
 * derive a value should not need a script to exist. What CSS cannot express is
 * a CONTRAST COMPARISON — choosing whether a label on the accent should be dark
 * or light — so that decision, and validating a custom hex, live here.
 */

/** The approved presets, names and values exactly as the design source lists them. */
export const ACCENT_PRESETS = [
  { name: "Warm Sand Gold", hex: "#D4A017" },
  { name: "Champagne", hex: "#C39B4E" },
  { name: "Verity Mint", hex: "#0FA894" },
  { name: "Ocean Blue", hex: "#2E7BE8" },
  { name: "Slate Blue", hex: "#4C6FE0" },
  { name: "Indigo", hex: "#6C5CE0" },
  { name: "Violet", hex: "#8B5CF6" },
  { name: "Emerald", hex: "#1F9E57" },
  { name: "Rose", hex: "#DB4468" },
  { name: "Graphite", hex: "#5A5F66" },
] as const;

/** Warm Sand Gold. The brand's own colour, and the default the design source sets. */
export const DEFAULT_ACCENT = "#D4A017";

/**
 * The two candidates for text ON the accent.
 *
 * The design source picks between exactly these, and so does this: an accent is
 * a filled surface, and a filled surface takes either near-black or white. A
 * third option would be a colour nobody chose.
 */
const DARK_INK = "#191A1C";
const LIGHT_INK = "#FFFFFF";

function channel(value: number): number {
  const s = value / 255;
  return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}

function luminance(hex: string): number {
  const n = hex.replace("#", "");
  const [r, g, b] = [0, 2, 4].map((i) => channel(parseInt(n.slice(i, i + 2), 16)));
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
}

export function contrastRatio(a: string, b: string): number {
  const [x, y] = [luminance(a), luminance(b)];
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

/**
 * Text colour for a label sitting on the accent fill.
 *
 * Whichever of the two candidates contrasts better wins. This is why a light
 * accent like Warm Sand Gold takes dark ink (7.46:1 rather than white's 2.38:1)
 * while Ocean Blue takes white — and why neither is hard-coded. Assuming white
 * works on every accent is the specific mistake this function exists to prevent.
 */
export function onAccentFor(accent: string): string {
  return contrastRatio(accent, DARK_INK) >= contrastRatio(accent, LIGHT_INK)
    ? DARK_INK
    : LIGHT_INK;
}

const HEX = /^#[0-9a-fA-F]{6}$/;

/**
 * Accepts a stored accent, or falls back.
 *
 * Custom hex values are permitted — §7 requires it — but only well-formed ones.
 * An unvalidated value would be interpolated into a `style` attribute, so this
 * is an injection boundary as much as a correctness one.
 */
export function resolveAccent(stored: string | undefined): string {
  if (!stored || !HEX.test(stored)) return DEFAULT_ACCENT;
  return stored.toUpperCase();
}

/** Mixes toward `target` by `t`, matching the design source's `tonal()`. */
function mix(a: string, b: string, t: number): string {
  const parse = (h: string) =>
    [0, 2, 4].map((i) => parseInt(h.replace("#", "").slice(i, i + 2), 16));
  const [x, y] = [parse(a), parse(b)];
  return (
    "#" +
    x
      .map((v, i) => Math.round(v + (y[i]! - v) * t).toString(16).padStart(2, "0"))
      .join("")
  );
}

/** The better of the two inks for a fill, with the ratio it achieves. */
function bestInk(fill: string): { ink: string; ratio: number } {
  const dark = contrastRatio(fill, DARK_INK);
  const light = contrastRatio(fill, LIGHT_INK);
  return dark >= light ? { ink: DARK_INK, ratio: dark } : { ink: LIGHT_INK, ratio: light };
}

/** WCAG AA for normal-size text. Buttons and chips carry labels at that size. */
const AA = 4.5;

/**
 * Picks the accent FILL and its ink together, per theme.
 *
 * The design source chooses the ink by comparing against the raw seed, then
 * fills with a different step — `sc[600]` in light, `sc[300]` in dark. For most
 * accents that is harmless, but it is measuring the wrong colour, and three of
 * the ten presets land below AA because of it. Emerald fails outright: at the
 * 600 step neither ink reaches 4.5:1.
 *
 * So the fill and the ink are chosen together, against each other, and the
 * ladder is walked until the pair clears AA — darker in light, lighter in dark.
 * ADR-011 constraint 1 is explicit that where a material costs contrast, the
 * material changes and the requirement does not. This is that rule, executed
 * rather than asserted.
 *
 * The walk is bounded and always terminates: three steps in either direction
 * reach 800 or 100, which are far enough from mid-tone that one ink always
 * clears. The final step is returned regardless, so a pathological custom hex
 * degrades to the best available pair rather than looping.
 */
function pairFor(seed: string, mode: "light" | "dark"): { fill: string; ink: string } {
  const steps =
    mode === "light"
      ? [0.12, 0.26, 0.42] // toward #0D0D0F — the 600, 700, 800 steps
      : [0.42, 0.7, 0.86]; // toward #FFFFFF — the 300, 200, 100 steps
  const target = mode === "light" ? "#0D0D0F" : "#FFFFFF";

  let last = { fill: mix(seed, target, steps[0]!), ink: DARK_INK };
  for (const t of steps) {
    const fill = mix(seed, target, t);
    const { ink, ratio } = bestInk(fill);
    last = { fill, ink };
    if (ratio >= AA) return last;
  }
  return last;
}

export type AccentTokens = {
  "--accent-seed": string;
  "--accent-fill-light": string;
  "--accent-fill-dark": string;
  "--accent-ink-light": string;
  "--accent-ink-dark": string;
};

/**
 * The custom properties the document carries.
 *
 * Five, and no more: the 50→900 ladder and every accent-tinted material derive
 * from the seed in CSS. Only the fill/ink pairs are computed here, because
 * choosing them needs a contrast comparison CSS cannot express.
 */
export function accentStyle(accent: string): AccentTokens {
  const light = pairFor(accent, "light");
  const dark = pairFor(accent, "dark");
  return {
    "--accent-seed": accent,
    "--accent-fill-light": light.fill,
    "--accent-fill-dark": dark.fill,
    "--accent-ink-light": light.ink,
    "--accent-ink-dark": dark.ink,
  };
}

/** Exposed so a test can assert every preset clears AA in both themes. */
export function accentContrast(accent: string) {
  const light = pairFor(accent, "light");
  const dark = pairFor(accent, "dark");
  return {
    light: { ...light, ratio: contrastRatio(light.fill, light.ink) },
    dark: { ...dark, ratio: contrastRatio(dark.fill, dark.ink) },
  };
}
