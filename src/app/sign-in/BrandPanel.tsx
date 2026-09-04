import { Icon, type IconName } from "@/components/ui/icons";
import { VerityLockup } from "@/components/brand/VerityMark";

/**
 * The sign-in page's left marketing panel — reference board, matched
 * structurally: headline, subcopy, and a floating "product preview" made of
 * real Verity material (`.glass-card`/`.glass-shell`, the actual nav
 * vocabulary) rather than a generic dashboard illustration. Purely
 * decorative — no live data, no query, same as the reference's own mockup —
 * so every figure here is placeholder content per the reference-image rule,
 * not a claim about a real tenant.
 */

const NAV: Array<{ icon: IconName; label: string; active?: boolean }> = [
  { icon: "overview", label: "Overview", active: true },
  { icon: "workspace", label: "Operations" },
  { icon: "assets", label: "Assets" },
  { icon: "people", label: "Workforce" },
  { icon: "schedule", label: "Tasks" },
  { icon: "audit", label: "Analytics" },
  { icon: "evidence", label: "Reports" },
  { icon: "configuration", label: "Settings" },
];

const ACTIVITY = [
  { label: "Camera deployed", when: "2m ago" },
  { label: "Maintenance scheduled", when: "12m ago" },
  { label: "Supply order confirmed", when: "28m ago" },
  { label: "New location added", when: "1h ago" },
];

const DOTS = [
  { x: "18%", y: "40%" },
  { x: "30%", y: "72%" },
  { x: "48%", y: "30%" },
  { x: "62%", y: "58%" },
  { x: "78%", y: "38%" },
];

export function BrandPanel() {
  return (
    <div className="relative hidden overflow-hidden bg-canvas lg:block">
      {/* A self-contained wash, confined to this column — NOT `.verity-
          atmosphere`, which is `position: fixed; inset: 0` (a single,
          whole-viewport layer meant for one use per page) and would ignore
          this element's own box entirely, painting full-screen at z-index
          -1 instead of staying inside the grid column. `globals.css`'s own
          comment already says sign-in's `main` "deliberately wants no
          atmosphere" for exactly this reason. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(1100px 800px at 30% -10%, color-mix(in srgb, transparent 88%, var(--accent-seed)) 0%, transparent 70%)," +
            "radial-gradient(900px 700px at 0% 110%, color-mix(in srgb, transparent 92%, var(--accent-seed)) 0%, transparent 75%)",
        }}
      />

      <div className="relative z-10 flex h-full flex-col px-14 pt-14">
        <div>
          <VerityLockup size={30} className="text-text" />
          <p className="m-0 mt-4 text-[11px] font-medium uppercase tracking-[0.28em] text-text-tertiary">
            Operate. Optimize. <span className="text-accent-ink">Outperform.</span>
          </p>
        </div>

        <div className="mt-16 max-w-[460px]">
          <h1 className="m-0 text-[44px] font-normal leading-[1.08] tracking-[-0.02em] text-text">
            A more intelligent way to operate.
          </h1>
          <p className="m-0 mt-5 text-[15px] leading-relaxed text-text-secondary">
            Unify your operations. Turn data into decisions. Drive real outcomes.
          </p>
        </div>

        {/* The product preview — angled, floating, matching the reference's
            "screen tilted back into the scene" composition. */}
        <div className="relative mt-12 flex-1" style={{ perspective: "2400px" }}>
          <div
            className="glass-shell absolute inset-x-0 top-0 mx-auto flex h-[420px] w-full max-w-[640px] overflow-hidden rounded-2xl"
            style={{ transform: "rotateX(8deg) rotateY(-6deg)", transformOrigin: "center top" }}
          >
            {/* Mini sidebar — the real nav vocabulary, not placeholder labels. */}
            <div className="glass-card flex w-[132px] shrink-0 flex-col gap-1 rounded-none border-y-0 border-l-0 p-3">
              <VerityLockup collapsed size={16} className="mb-3 px-1 text-text" />
              {NAV.map((item) => (
                <div
                  key={item.label}
                  className={
                    "flex items-center gap-2 rounded-md px-2 py-1.5 text-[10.5px] " +
                    (item.active ? "bg-accent-subtle text-accent-ink" : "text-text-tertiary")
                  }
                >
                  <Icon name={item.icon} size={12} />
                  {item.label}
                </div>
              ))}
            </div>

            {/* Map + stat cards. */}
            <div className="relative flex-1 p-4">
              <svg className="absolute inset-3 opacity-40" viewBox="0 0 100 60" preserveAspectRatio="none">
                {DOTS.slice(0, -1).map((d, i) => {
                  const next = DOTS[i + 1]!;
                  return (
                    <line
                      key={i}
                      x1={d.x}
                      y1={d.y}
                      x2={next.x}
                      y2={next.y}
                      stroke="var(--accent-seed)"
                      strokeWidth="0.3"
                      strokeDasharray="1.5 1.5"
                    />
                  );
                })}
              </svg>
              {DOTS.map((d, i) => (
                <span
                  key={i}
                  className="absolute size-1.5 rounded-full bg-accent"
                  style={{ left: d.x, top: d.y }}
                />
              ))}

              <div className="glass-card absolute left-4 top-2 w-[190px] rounded-xl p-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-text-secondary">Global Operations</span>
                  <span className="flex items-center gap-1 text-[10px] text-accent-ink">
                    <span className="size-1.5 rounded-full bg-accent" /> Live
                  </span>
                </div>
                <div className="mt-2 flex items-end gap-4">
                  <div>
                    <p className="tabular m-0 text-[20px] leading-none text-text">12</p>
                    <p className="m-0 text-[10px] text-text-tertiary">Locations</p>
                  </div>
                  <div>
                    <p className="tabular m-0 text-[20px] leading-none text-text">486</p>
                    <p className="m-0 text-[10px] text-text-tertiary">Active Assets</p>
                  </div>
                  <div>
                    <p className="tabular m-0 text-[20px] leading-none text-text">98%</p>
                    <p className="m-0 text-[10px] text-text-tertiary">Uptime</p>
                  </div>
                </div>
              </div>

              <div className="glass-card absolute right-2 top-16 w-[170px] rounded-xl p-3">
                <p className="m-0 text-[11px] text-text-secondary">Recent Activity</p>
                <ul className="m-0 mt-2 flex list-none flex-col gap-1.5 p-0">
                  {ACTIVITY.map((row) => (
                    <li key={row.label} className="flex items-center justify-between gap-2 text-[10px]">
                      <span className="flex items-center gap-1.5 text-text-secondary">
                        <span className="size-1 rounded-full bg-accent" />
                        {row.label}
                      </span>
                      <span className="shrink-0 text-text-tertiary">{row.when}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="glass-card absolute bottom-3 left-4 w-[150px] rounded-xl p-3">
                <p className="m-0 text-[11px] text-text-secondary">Active Workflows</p>
                <p className="tabular m-0 mt-1 text-[22px] leading-none text-text">28</p>
                <p className="m-0 mt-1 text-[10px] text-success">↑ +12%</p>
              </div>

              <div className="glass-card absolute bottom-3 right-3 w-[160px] rounded-xl p-3">
                <p className="m-0 text-[11px] text-text-secondary">Task Completion</p>
                <p className="tabular m-0 mt-1 text-[22px] leading-none text-text">94%</p>
              </div>
            </div>
          </div>
        </div>

        <p className="relative z-10 mb-10 mt-6 text-right text-[10px] uppercase tracking-[0.24em] text-text-tertiary">
          Real operations. Tangible impact.
        </p>
      </div>
    </div>
  );
}
