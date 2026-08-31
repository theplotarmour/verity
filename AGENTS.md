<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Verity Custom Design System Rules

To maintain high visual quality, premium feel, and avoid common layout defects, all agents working on this project MUST follow these guidelines:

## 1. Dark Mode Legibility & Semantic Tokens
- **NEVER** use hardcoded absolute dark color classes (like `text-slate-900`, `text-slate-950`, `text-slate-800`) inside cards, pages, or components unless they are explicitly wrapped with dark-mode counter-tokens.
- **ALWAYS** use the semantic theme tokens:
  - `text-text-primary` (resolves to dark text in light mode, light grey in dark mode).
  - `text-text-secondary` (resolves to medium grey in both modes).
  - `text-text-tertiary` (resolves to light-medium grey).
- **NEVER** use invalid Tailwind colors like `neutral-850`. Use standard classes like `bg-surface` (resolves to `#FFFFFF` / `#1C1C1E`) or standard Tailwind classes like `neutral-800` / `neutral-900`.

## 2. Page Heights & Bounded Scrollbars (Avoiding Page Scrolling)
- Avoid layouts that force scrollbars on the outer page viewports on standard desktop heights (under 900px).
- Bounding cards like settings configuration panels or dashboard catalog columns to smaller heights (e.g. `h-[520px]`) is preferred.
- **ALWAYS** set inner sub-panels or lists to scroll independently (`overflow-y-auto`) so the outer page layout remains static and fits clean in the viewport.

## 3. Symmetrical Grid Layouts
- **NEVER** use alignment classes like `items-start` on main dashboard columns or twin settings columns.
- **ALWAYS** use `items-stretch` (or default grid behavior) so adjacent cards stretch to equal height.
- Toggle elements (like tab selectors) using white active pills must use `bg-[var(--brand)] text-white` in their active state to avoid white-on-white text issues in dark mode.
