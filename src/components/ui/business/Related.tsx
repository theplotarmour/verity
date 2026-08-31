import Link from "next/link";
import { Panel } from "@/components/ui/primitives";

/**
 * §70 — the Related section every detail screen carries.
 *
 * This is the single most load-bearing piece of the connected-system feel. A
 * record without it is a dead end: the reader has the purchase order in front
 * of them and must go back to a list and search for the supplier they were
 * already looking at (§71).
 *
 * Deliberately dumb. It renders links a caller assembled, because what counts
 * as a neighbour is knowledge the record has and this component does not, and a
 * component that went looking for neighbours itself would need to know every
 * entity in the capability.
 */
export function Related({
  title = "Related",
  links,
}: {
  title?: string;
  links: Array<{ href: string; label: string; note?: string }>;
}) {
  return (
    <Panel flush title={title}>
      <ul className="m-0 list-none divide-y divide-line p-0">
        {links.map((link) => (
          <li key={`${link.href}-${link.label}`}>
            <Link
              href={link.href}
              className="flex items-center justify-between gap-4 px-5 py-3 text-[14px] text-text no-underline transition-colors hover:bg-glass-2"
            >
              <span>{link.label}</span>
              {link.note && (
                <span className="tabular shrink-0 text-[13px] text-text-tertiary">
                  {link.note}
                </span>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </Panel>
  );
}
