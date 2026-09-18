"use client";

import { useRef, useState } from "react";

/**
 * ADR-025 pattern 4 — chart card with a live hover tooltip.
 * Authority: `verity-spec/09_experience/design-system.md`
 * `REQ-EXPERIENCE-DESIGNSYSTEM-007`.
 *
 * Separate "use client" file, not added to `charts.tsx` — that file has no
 * client boundary today (`Donut`/`BarStrip`/`StairFigure`/`FeatureCard` are
 * all static), and pointer tracking needs hook state. Same reasoning as
 * `SplitButton.tsx`/`ProfileMenu.tsx`.
 *
 * Same house rule as every other chart in this repo (see `charts.tsx`'s own
 * header): every point is a real queried value. This component draws
 * whatever series it's given — it has no sample-data mode and generates
 * nothing itself.
 *
 * Scale math: x is evenly spaced by index (a categorical axis — dates,
 * weeks, whatever `labels` names), never data-driven, so gaps in reporting
 * don't compress or stretch the line. y is linear from 0 (never a data-
 * driven floor — a chart starting above zero visually exaggerates the
 * differences it's supposed to report honestly) to the highest value across
 * every series, with headroom so a peak point isn't clipped by the tooltip.
 *
 * Pointer tracking: continuous during the gesture, not just on click, per
 * apple-design §1/§2 — the guide line and tooltip follow the pointer across
 * the whole plot on every `pointermove`, snapped to the nearest index rather
 * than raw pixel position (there's one real value per index, nothing
 * in-between to show).
 */

export type ChartSeries = { name: string; color: string; values: number[] };

export function TrendChart({
  labels,
  series,
  height = 200,
  formatValue = (v: number) => String(v),
}: {
  /** One label per x position — dates, week-of, etc. Same length as every series' `values`. */
  labels: string[];
  series: ChartSeries[];
  height?: number;
  formatValue?: (value: number) => string;
}) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  const width = 100; // viewBox units; SVG scales to the container's actual width via CSS.
  const padTop = 12;
  const padBottom = 8;
  const plotHeight = height - padTop - padBottom;

  const count = labels.length;
  const allValues = series.flatMap((s) => s.values);
  const peak = Math.max(1, ...allValues);

  const xAt = (i: number) => (count <= 1 ? width / 2 : (i / (count - 1)) * width);
  const yAt = (v: number) => padTop + plotHeight - (v / peak) * plotHeight;

  const paths = series.map((s) => ({
    ...s,
    d: s.values.map((v, i) => `${i === 0 ? "M" : "L"}${xAt(i).toFixed(2)},${yAt(v).toFixed(2)}`).join(" "),
  }));

  const description =
    count === 0
      ? "No data for this range."
      : series
          .map((s) => `${s.name}: ${s.values.map((v, i) => `${labels[i]} ${formatValue(v)}`).join(", ")}`)
          .join(". ");

  function handlePointerMove(e: React.PointerEvent<SVGSVGElement>) {
    const svg = svgRef.current;
    if (!svg || count === 0) return;
    const rect = svg.getBoundingClientRect();
    const relativeX = ((e.clientX - rect.left) / rect.width) * width;
    const nearest = count <= 1 ? 0 : Math.round((relativeX / width) * (count - 1));
    setHoverIndex(Math.min(count - 1, Math.max(0, nearest)));
  }

  const tooltipLeftPct = hoverIndex === null || count <= 1 ? 0 : (hoverIndex / (count - 1)) * 100;

  return (
    <div className="relative" style={{ height }}>
      <svg
        ref={svgRef}
        role="img"
        aria-label={description}
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        className="size-full"
        onPointerMove={handlePointerMove}
        onPointerLeave={() => setHoverIndex(null)}
      >
        {hoverIndex !== null && (
          <line
            x1={xAt(hoverIndex)}
            x2={xAt(hoverIndex)}
            y1={padTop}
            y2={padTop + plotHeight}
            className="stroke-[var(--color-line)]"
            strokeWidth={0.4}
          />
        )}
        {paths.map((p) => (
          <path
            key={p.name}
            d={p.d}
            fill="none"
            stroke={p.color}
            strokeWidth={0.8}
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        ))}
        {hoverIndex !== null &&
          paths.map((p) => (
            <circle
              key={p.name}
              cx={xAt(hoverIndex)}
              cy={yAt(p.values[hoverIndex] ?? 0)}
              r={1.6}
              fill={p.color}
              vectorEffect="non-scaling-stroke"
            />
          ))}
      </svg>

      {/* The dense-content rule (ADR-024) applies here too: the tooltip sits
          over a chart, not chrome, so it stays solid, not glass. */}
      {hoverIndex !== null && (
        <div
          className="verity-solid pointer-events-none absolute top-1 -translate-x-1/2 whitespace-nowrap rounded-lg border border-line px-3 py-1.5 text-[12.5px] text-text shadow-sm"
          style={{ left: `${tooltipLeftPct}%` }}
        >
          <span className="text-text-tertiary">{labels[hoverIndex]}</span>
          {series.map((s) => (
            <span key={s.name}>
              {" · "}
              {s.name} <span className="tabular font-medium">{formatValue(s.values[hoverIndex] ?? 0)}</span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
