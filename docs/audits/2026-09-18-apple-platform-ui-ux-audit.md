# Verity UI/UX audit — Apple iOS and macOS comparison

**Date:** 2026-09-18  
**Scope:** The shared authenticated shell and global primitives, plus the
Outreach dashboard shown in the supplied screenshots. This is not an audit of
the business rules, tenant isolation, or data accuracy.  
**Visual baseline:** `design/newlighttheme.jpeg` and `design/newdarktheme.jpeg`.
Those screens are the required reference, not a mood board.

## Verdict

**Not yet Apple-platform quality.** The shared foundation has started moving in
the right direction (system blue, neutral canvases, semantic tokens, native
modal mechanics), but the working application remains a web dashboard that
borrows some Apple surface styling. It does not yet provide a consistently
Apple-like information hierarchy, control behavior, responsive navigation, or
keyboard/menu model.

The important distinction is deliberate: **Liquid Glass is deferred**, so this
audit does not require reproducing the 2025 material effect. It measures the
parts of Apple quality that must ship now: clarity, hierarchy, platform-familiar
controls, spatial rhythm, direct feedback, and recovery.

## Evidence used

- The supplied reference screens: [light](../../design/newlighttheme.jpeg) and
  [dark](../../design/newdarktheme.jpeg).
- The local unauthenticated preview was visually checked on 2026-09-18. The
  authenticated shell could not be walked because no launch account was used in
  this audit. Findings for it are source-backed and should receive a signed-in
  visual verification before closure.
- Source inventory: 109 native `button`, `input`, `select`, `textarea`, or
  `dialog` elements remain across `src/app` and `src/components`; not all go
  through a shared primitive.
- Apple guidance: [Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines),
  [designing for macOS](https://developer.apple.com/design/human-interface-guidelines/designing-for-macos/),
  [designing for iOS](https://developer.apple.com/design/human-interface-guidelines/designing-for-ios/),
  [sidebars](https://developer.apple.com/design/human-interface-guidelines/sidebars),
  [toolbars](https://developer.apple.com/design/human-interface-guidelines/toolbars),
  [materials](https://developer.apple.com/design/human-interface-guidelines/materials),
  [buttons](https://developer.apple.com/design/human-interface-guidelines/buttons),
  [feedback](https://developer.apple.com/design/human-interface-guidelines/feedback),
  and [accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility).

## Comparison scorecard

Scores judge the current application against the supplied references and the
applicable Apple principles, not against native SwiftUI/AppKit implementation.

| Area | Current state | Score | Audit conclusion |
| --- | --- | ---: | --- |
| Visual foundation | Semantic light/dark tokens and blue baseline exist. | 6/10 | Now close in palette; older page-specific surfaces still need visual verification. |
| Desktop shell | 240px sidebar, top search, organization and profile controls. | 5/10 | Correct ingredients, but search is inert and toolbar behavior remains web-dashboard-like. |
| Mobile adaptation | Sidebar becomes a sheet. | 4/10 | Functional fallback, not iOS-first navigation; needs a deliberate compact navigation model. |
| Navigation hierarchy | Groups and icons exist; roles drive visibility. | 5/10 | Good authorization model, but no desktop sidebar collapse/hide and some deep route structure is not split-view-like. |
| Buttons and commands | Shared button variants, overflow menu, command palette. | 6/10 | Primary-action hierarchy is mostly sound; cancel role and menu conventions have gaps. |
| Forms and selection | `Field`, `Input`, `Select`, `Combobox`, `Checkbox`, `Textarea` exist. | 5/10 | The system is good; page-local controls bypass it too often. |
| Lists and tables | Identity-first rows, local filter/sort/paging, mobile transformation. | 6/10 | Operationally solid, but table selection and row affordances are not consistently touch/keyboard polished. |
| Record workspaces | Header, tabs, activity, next action pattern exists in Outreach. | 6/10 | Strong Odoo-like work structure; tab keyboard semantics and cross-capability consistency remain incomplete. |
| Overlays and menus | Native modal, Escape/outside close, reduced motion. | 7/10 | Best global area; focus return and menu keyboard semantics need finishing. |
| Feedback and recovery | Field errors, empty states, pending labels, native dialog. | 6/10 | Good intent; no universal success/toast/undo contract and some loading is a blank spinner. |
| Accessibility and input | Semantic tokens, `aria-live` in places, focus styles, reduced motion. | 6/10 | Foundation exists; raw controls and incomplete composite-widget keyboard handling prevent closure. |

## What already aligns well

1. **Content stays solid.** `Surface`/`Panel`, forms, tables, and record data
   use solid content surfaces. This matches Apple’s guidance that Liquid Glass
   belongs to the functional control layer rather than dense content.
2. **Clear interaction hierarchy.** The shared primary/secondary/ghost/danger
   button model and OverflowMenu correctly separate the likely action from
   destructive or terminal work.
3. **Native modal behavior.** `Modal.tsx` uses `<dialog>` and `showModal()`,
   preserving focus containment, Escape handling, and an inert backdrop instead
   of rebuilding these incorrectly in divs.
4. **Semantically meaningful state.** Status uses a label plus a visual cue;
   state is not communicated by color alone.
5. **Productive desktop defaults.** `DataTable` provides sorting, filtering,
   row identity, bounded paging, and a mobile presentation rather than an
   unbounded desktop grid.
6. **Motion safeguards.** Shared motion honors reduced-motion preference and
   avoids decorative page-scale animation.

## Detailed findings and required fixes

### P0 — Fix before calling the global theme complete

| ID | Finding | Apple comparison | Evidence | Required completion test |
| --- | --- | --- | --- | --- |
| APPLE-P0-01 | The shell presents a large “Search this page” field with no query handling, result state, or shortcut action. It is a false affordance. | A toolbar search field must facilitate navigation or finding content in the current view; a visual-only field violates clarity and feedback. | `src/components/shell/ShellChrome.tsx` | Either wire it to an explicit current-page search contract, or replace it with a real `Cmd/Ctrl+K` command affordance that opens `CommandPalette`. Test keyboard and pointer activation. |
| APPLE-P0-02 | Shared form adoption is incomplete. The audit found many direct textareas and inputs in Outreach, import, ITC, custom fields, and table selection. Their focus, disabled, error, sizing, and dark-mode behavior can drift. | Apple’s consistency principle depends on repeating the same interaction and visual behavior. | `src/app/(shell)/outreach/**`, `ImportWizard.tsx`, `ItcView.tsx`, `CustomFieldsPanel.tsx`, `DataTable.tsx` | Replace page-local ordinary entries with `Field` + `Input`/`Textarea`/`Select`/`Checkbox`, or document a justified exception. Add a lintable inventory check so the count cannot grow. |
| APPLE-P0-03 | The global visual system has only been visually checked at sign-in after the blue correction. The authenticated Outreach page shown by the user has not been re-captured in both themes. | Reference matching is visual work; token/type checks cannot prove geometry, density, or contrast. | User screenshots; `src/app/(shell)/outreach/page.tsx` | Run signed-in browser screenshots for light and dark at desktop plus mobile widths. Compare to the supplied reference by shell, cards, controls, and text contrast; attach the evidence to this audit. |
| APPLE-P0-04 | `ModalCancel` renders the default `Button` variant, which is primary. A cancel action can accidentally look like the main commit action. | Apple uses visual hierarchy to make the likely action unambiguous and lets people safely escape a scoped task. | `src/components/ui/Modal.tsx` | Make cancel secondary/tertiary by default; inspect every modal footer for exactly one primary commit action. |

### P1 — Required for consistent macOS/iPadOS-quality operation

| ID | Finding | Apple comparison | Evidence | Required completion test |
| --- | --- | --- | --- | --- |
| APPLE-P1-01 | `Tabs` has tab roles but lacks roving `tabIndex`, `aria-controls`/panel IDs, and Arrow/Home/End keyboard behavior. | Familiar platform controls must work consistently with keyboard and accessibility input. | `src/components/ui/Tabs.tsx` | Tab through the strip; use Left/Right/Home/End; verify selected tab and panel are announced. |
| APPLE-P1-02 | `ProfileMenu` and `OverflowMenu` close on Escape/outside click but do not move focus into the menu, restore it to the trigger, or support arrow navigation. | Menus are familiar command containers; keyboard users expect predictable entry, movement, and exit. | `ProfileMenu.tsx`, `OverflowMenu.tsx` | Trigger with keyboard, navigate items, activate one, Escape, and verify focus restoration. |
| APPLE-P1-03 | `CommandPalette` has keyboard result navigation but no focus trap/restore and searches only Outreach entities while being mounted globally. | A global command surface must either search the globally available scope or describe its narrow scope honestly. | `CommandPalette.tsx` | Add focus lifecycle and capability-contributed search providers, or relabel/mount it only for Outreach. Verify no unavailable records/actions leak. |
| APPLE-P1-04 | The desktop sidebar cannot be collapsed or hidden, and critical workspace identity is anchored at its bottom. | macOS guidance recommends giving people room by hiding/revealing a sidebar and avoiding critical bottom-edge dependencies. | `ShellChrome.tsx`, `OrganizationSwitcher.tsx` | Provide a reversible desktop collapse/hide control and keyboard shortcut; preserve organization context elsewhere when collapsed. |
| APPLE-P1-05 | The mobile experience is an overlay menu, not a deliberate iOS navigation hierarchy. The app needs an explicit decision between a compact tab bar, a primary-only navigator, or a responsive split view. | iOS guidance prioritizes primary tasks and limits persistent onscreen controls; Apple advises against treating a desktop sidebar as the primary phone navigator. | `ShellChrome.tsx` | Write the mobile navigation decision, then verify phone layouts at 320px, 390px, and 768px with a real task flow. |
| APPLE-P1-06 | Table checkboxes are visually 15px and raw. Their interactive target and focus are not normalized with the shared checkbox. | Touch and pointer controls need comfortable, consistent targets and visible focus. | `DataTable.tsx` | Use a table-selection primitive with a 40–44px hit target, label, selected-row feedback, and keyboard check/uncheck behavior. |
| APPLE-P1-07 | `RouteLoading` is a centered spinner only. It gives no context and makes a dense operational page feel blank during data work. | Apple feedback should match significance and communicate what is happening without needless interruption. | `Spinner.tsx`, `(shell)/loading.tsx` | Use route-shaped skeletons for known pages and retain a labelled compact spinner for unknown work; check reduced motion. |

### P2 — Product depth after the launch-critical consistency pass

| ID | Finding | Decision needed |
| --- | --- | --- |
| APPLE-P2-01 | The reference screens use a richer desktop dashboard composition: short greeting context, balanced stat tiles, chart/activity/task/quick-action columns. Current Outreach uses long stacked panels and dense tables. | Design the Outreach dashboard as an Outreach-specific execution dashboard; do not copy fake charts or generic “Create” actions from the reference. |
| APPLE-P2-02 | Typography still primarily uses Inter before platform system fonts in several places; the reference is closer to SF hierarchy and line spacing. | Decide whether web-platform `-apple-system` should lead everywhere or whether Inter is a deliberate Verity brand exception. Validate non-Apple fallback metrics. |
| APPLE-P2-03 | Fixed global blue is the correct temporary product decision, but it diverges from macOS personalization guidance. | Reintroduce accent choice only after the shared-component and contrast audit is complete; user choice must update every shared state consistently. |
| APPLE-P2-04 | macOS productivity affordances are incomplete: no window/sidebar command model, limited keyboard shortcuts beyond Cmd/Ctrl+K, and no high-precision multi-select pattern. | Prioritize only after real team workflows identify repeated desktop actions. |
| APPLE-P2-05 | Exact Liquid Glass remains deferred. | When approved, implement it only in navigation/transient controls; do not apply it to tables, dense forms, or record content. |

## Recommended execution order

1. **Truthful shell:** APPLE-P0-01, P0-04, then screen-level signed-in visual
   proof (P0-03).
2. **Control convergence:** APPLE-P0-02 and P1-06. Convert shared primitives
   first, then migrate the Outreach launch path, then other modules.
3. **Keyboard and recovery:** P1-01 through P1-03 and P1-07.
4. **Responsive information architecture:** P1-04 and P1-05; this requires a
   product decision, not cosmetic CSS.
5. **Dashboard/product depth:** P2 items, using real available data only.
6. **Liquid Glass:** only after the foregoing is stable and explicitly approved.

## Audit gates

Do not mark an item complete because it compiles. Each completed slice needs:

- Light and dark screenshot at the affected desktop size; mobile screenshot
  whenever navigation, forms, or a list changes.
- Pointer, keyboard, and screen-reader-name check for every changed control.
- Empty, loading, denied, and failure state check when the surface reads data.
- No unguarded server write or new client-only authorization decision.
- A corresponding update to this audit and the relevant requirement in
  `verity-spec/09_experience/`.

## Non-goals

- Mimicking Apple assets, private fonts, or native APIs in a web application.
- Replacing Verity’s operational workflows with generic dashboard widgets.
- Adding charts, AI actions, or integrations solely to resemble the reference.
- Calling an unverified deployed screen “Apple-like” because its CSS uses blue.
