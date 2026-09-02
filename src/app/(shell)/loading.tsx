import { RouteLoading } from "@/components/ui/Spinner";

/**
 * Next's own Suspense boundary around `{children}` in `(shell)/layout.tsx`.
 *
 * One file, not one per route folder: it wraps everything the shell layout
 * renders as its content slot, so navigating between ANY two pages under the
 * shell shows this instantly while the target page's server work resolves —
 * the sidebar, header and shell chrome are all part of the layout ABOVE this
 * boundary and never unmount or flash. This is what makes the loading state
 * feel scoped to "the page changed" rather than "the app reloaded."
 */
export default function ShellLoading() {
  return <RouteLoading />;
}
