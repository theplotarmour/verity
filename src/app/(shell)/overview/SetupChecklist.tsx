import Link from "next/link";
import { Panel } from "@/components/ui/primitives";

/**
 * §3 — the first screen a new client should see.
 *
 * "Do not drop them into an empty Overview." A dashboard of eight zeroes tells
 * a first-time user nothing: not that the figures are zero because nothing has
 * happened yet, not what to do next, and not whether the product is broken.
 *
 * The next actionable step is highlighted rather than all eight being equally
 * loud, because a list where everything is equally urgent is a list nobody
 * starts. A step that depends on an earlier one says which, instead of being
 * disabled with no explanation — you cannot price a board before there is one.
 */
export function SetupChecklist({
  checklist,
  businessName,
}: {
  checklist: {
    completedSteps: number;
    totalSteps: number;
    steps: Array<{
      key: string;
      label: string;
      description: string;
      href: string;
      done: boolean;
      blockedBy: string | null;
    }>;
  };
  businessName: string;
}) {
  const next = checklist.steps.find((step) => !step.done && step.blockedBy === null);

  return (
    <Panel
      title={`Set up ${businessName}`}
      action={
        <span className="tabular text-[12px] text-text-tertiary">
          {checklist.completedSteps} of {checklist.totalSteps}
        </span>
      }
    >
      <ol className="m-0 list-none p-0">
        {checklist.steps.map((step, index) => {
          const isNext = next?.key === step.key;
          return (
            <li
              key={step.key}
              className={
                "flex items-start gap-4 py-3 " + (index > 0 ? "border-t border-line" : "")
              }
            >
              <span
                aria-hidden="true"
                className={
                  "mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full text-[12px] " +
                  (step.done
                    ? "bg-accent-subtle text-accent-ink"
                    : "bg-glass-2 text-text-tertiary")
                }
              >
                {step.done ? "✓" : index + 1}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-baseline gap-2">
                  {step.done || step.blockedBy ? (
                    <span
                      className={
                        "text-[14px] " + (step.done ? "text-text-tertiary" : "text-text")
                      }
                    >
                      {step.label}
                    </span>
                  ) : (
                    <Link
                      href={step.href}
                      className="text-[14px] text-text no-underline hover:underline"
                    >
                      {step.label}
                    </Link>
                  )}
                  {isNext && <span className="text-[12px] text-accent-ink">Start here</span>}
                </span>
                {!step.done && (
                  <span className="mt-0.5 block text-[12px] text-text-tertiary">
                    {step.blockedBy
                      ? `Needs ${step.blockedBy} first.`
                      : step.description}
                  </span>
                )}
              </span>
            </li>
          );
        })}
      </ol>
    </Panel>
  );
}
