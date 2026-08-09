import type { ResolvedAnswers } from "./types";

export type Token =
  | { kind: "text"; text: string }
  | { kind: "field"; key: string };

/**
 * Split a template into literal text and {field} tokens.
 * An unclosed brace is treated as literal text rather than an error — a
 * half-typed template in the Configure editor should preview, not throw.
 */
export function parseTemplate(template: string): Token[] {
  if (!template) return [];
  const tokens: Token[] = [];
  let cursor = 0;

  while (cursor < template.length) {
    const open = template.indexOf("{", cursor);
    if (open === -1) {
      tokens.push({ kind: "text", text: template.slice(cursor) });
      break;
    }
    const close = template.indexOf("}", open);
    if (close === -1) {
      tokens.push({ kind: "text", text: template.slice(cursor) });
      break;
    }
    if (open > cursor) {
      tokens.push({ kind: "text", text: template.slice(cursor, open) });
    }
    tokens.push({ kind: "field", key: template.slice(open + 1, close).trim() });
    cursor = close + 1;
  }

  return tokens;
}

/**
 * Render a template against resolved answers.
 *
 * An unanswered token collapses along with the separator that follows it, so a
 * half-filled spec still reads cleanly — this is what lets the wizard show a
 * live preview while the owner is still choosing dropdowns.
 */
export function renderTemplate(
  template: string,
  answers: ResolvedAnswers,
  mode: "name" | "code"
): string {
  const tokens = parseTemplate(template);
  const parts: string[] = [];

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];

    if (token.kind === "text") {
      // Text at index 0 is a prefix ("Kit {brand}"), not a separator — there is
      // no preceding field that could have gone unanswered, so it is kept as
      // long as something follows. Text anywhere else is a separator and is
      // dropped unless it actually sits between two emitted values.
      const rest = tokens.slice(i + 1);
      if (i === 0) {
        // A prefix survives if *any* later field is answered: "Embroidered
        // {design} {panelType}" still reads "Embroidered Seat Back" when only
        // the panel type is known.
        const anyAnswered = rest.some((t) => t.kind === "field" && answers[t.key]);
        if (anyAnswered) parts.push(token.text);
        continue;
      }
      // A separator only survives between two emitted values, so a missing
      // field does not leave a dangling dash or double space.
      const nextField = rest.find((t) => t.kind === "field");
      const nextAnswered = nextField && answers[(nextField as { key: string }).key];
      if (parts.length > 0 && nextAnswered) parts.push(token.text);
      continue;
    }

    const value = answers[token.key];
    if (!value) continue;
    const text = mode === "name" ? value.name : value.code;
    if (text) parts.push(text);
  }

  const out = parts.join("").replace(/\s+/g, " ").trim();
  if (mode === "name") return out;

  // Codes are punctuation-heavy, so an unanswered field between two separators
  // leaves a run like "EMB--SK". Collapse those and trim the ends.
  return out.replace(/([-_/.])\1+/g, "$1").replace(/^[-_/.]+|[-_/.]+$/g, "");
}
