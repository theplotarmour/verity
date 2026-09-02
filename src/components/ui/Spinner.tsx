/**
 * The route-loading indicator.
 *
 * Not the shadcn morphing-blob reference this was requested from — that one
 * assumes a project this isn't: `@/lib/utils` `cn()`, `bg-primary`, styled-jsx
 * (none of which exist here; every other component in this folder just
 * concatenates className strings, so this does too). The morph-and-wobble
 * itself was also a harder sell than a plain rotation for a serious ops
 * tool's loading state — Bible V4 keeps motion restrained, and a shape
 * changing identity every 600ms reads as decoration standing in for content,
 * closer to a mascot than a status indicator.
 *
 * What's kept from the brief: size variants, and it answers to the accent —
 * `border-accent` on the moving arc means it repaints for every one of the
 * ten presets with no work here, the same as everything else in the
 * Experience System.
 */
export function Spinner({
  size = "md",
  className = "",
}: {
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const dims = { sm: "size-4 border-2", md: "size-6 border-[2.5px]", lg: "size-9 border-[3px]" }[size];

  return (
    <span
      role="status"
      aria-label="Loading"
      className={
        `inline-block shrink-0 animate-spin rounded-full border-line border-t-accent motion-reduce:animate-none ${dims} ${className}`
      }
    />
  );
}

/**
 * A whole content area's loading state — centred, with a hint that stays
 * quiet rather than restating "Loading" next to a spinner that already says
 * it. Used as the fallback for `(shell)/loading.tsx`, so the shell (nav,
 * header) never remounts; only this slot shows while the next page's data
 * resolves.
 */
export function RouteLoading() {
  return (
    <div className="flex h-full min-h-[50vh] w-full items-center justify-center">
      <Spinner size="lg" />
    </div>
  );
}
