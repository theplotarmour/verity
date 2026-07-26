"use client";

import { motion } from "framer-motion";
import {
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Factory,
  FileText,
  Layers3,
  MonitorSmartphone,
  QrCode,
  ShieldCheck,
  Sparkles,
  TriangleAlert,
  Workflow,
} from "lucide-react";

const highlights = [
  { label: "Traceability", value: "End-to-end" },
  { label: "Offline ready", value: "Yes" },
  { label: "Mobile-first", value: "Workers" },
  { label: "Passport output", value: "QR verified" },
];

const modules = [
  {
    title: "Production",
    desc: "Orders, batches, departments, live floor progress, and dispatch readiness in one command center.",
    icon: Layers3,
  },
  {
    title: "Quality Control",
    desc: "Digital inspections with evidence, checkpoints, rework loops, approvals, and audit history.",
    icon: ClipboardList,
  },
  {
    title: "Inventory",
    desc: "Materials, stock movement, low-stock visibility, barcode flow, and controlled issue tracking.",
    icon: Factory,
  },
  {
    title: "Documents",
    desc: "Invoices, work orders, challans, inspection reports, and digital customer-ready proof pages.",
    icon: FileText,
  },
  {
    title: "Workforce",
    desc: "Workers, inspectors, roles, shifts, attendance, and accountability without ERP complexity.",
    icon: MonitorSmartphone,
  },
  {
    title: "Quality Passport",
    desc: "A premium QR-verifiable certificate for every finished product that builds customer trust.",
    icon: QrCode,
  },
];

const workflow = [
  "Client order",
  "Quotation",
  "Approval",
  "Production order",
  "Material allocation",
  "Department tasks",
  "QC review",
  "Rework if needed",
  "Dispatch",
  "Digital passport",
];

const proofCards = [
  "Worker captures evidence on mobile",
  "Inspector reviews every checkpoint",
  "Owner sees the factory in real time",
  "Customer verifies the finished product",
];

const reasons = [
  "Manufacturing still runs on paper, WhatsApp, Excel, and manual QC.",
  "ERP systems are too heavy, too slow, and too expensive for MSMEs.",
  "Factories need a modern operating system, not another generic dashboard.",
];

export default function VerityPitchClient() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(0,122,255,0.08),transparent_25%),linear-gradient(180deg,#0b0b0d_0%,#111113_42%,#0b0b0d_100%)] text-white">
      <section className="relative overflow-hidden border-b border-white/10">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,69,58,0.12),transparent_24%),radial-gradient(circle_at_bottom_left,rgba(0,122,255,0.12),transparent_22%)]" />
        <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col justify-between px-5 py-6 sm:px-6 lg:px-8">
          <header className="flex items-center justify-between gap-4 border-b border-white/10 pb-5">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand text-white shadow-[0_18px_50px_rgba(0,122,255,0.3)]">
                <Factory className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-white/45">
                  Verity
                </p>
                <p className="text-sm font-semibold text-white/90">
                  Vision For Enterprise Digital Advancement
                </p>
              </div>
            </div>
            <div className="hidden items-center gap-2 md:flex">
              <BadgePill>Factory OS</BadgePill>
              <BadgePill>Premium SaaS</BadgePill>
              <BadgePill>Offline ready</BadgePill>
            </div>
          </header>

          <div className="grid flex-1 items-center gap-12 py-10 lg:grid-cols-[1.1fr_0.9fr] lg:py-14">
            <div className="space-y-8">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-brand" />
                <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-white/50">
                  Premium manufacturing software
                </p>
              </div>

              <div className="max-w-3xl space-y-5">
                <h1 className="text-5xl font-semibold tracking-[-0.06em] text-white sm:text-6xl lg:text-7xl">
                  The operating system for modern factories.
                </h1>
                <p className="max-w-2xl text-base leading-7 text-white/72 sm:text-lg">
                  Verity digitizes the entire factory journey from order to production, quality control, dispatch,
                  and customer verification. It is built for MSMEs that need speed, traceability, and trust without
                  the weight of a traditional ERP.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <a
                  href="#workflow"
                  className="inline-flex h-12 items-center gap-2 rounded-full bg-white px-5 text-sm font-semibold text-neutral-950 transition hover:scale-[1.01]"
                >
                  Explore workflow
                  <ArrowRight className="h-4 w-4" />
                </a>
                <a
                  href="#proof"
                  className="inline-flex h-12 items-center gap-2 rounded-full border border-white/15 bg-white/5 px-5 text-sm font-semibold text-white transition hover:bg-white/10"
                >
                  See the proof layer
                  <ChevronRight className="h-4 w-4" />
                </a>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {highlights.map((item) => (
                  <div
                    key={item.label}
                    className="rounded-[20px] border border-white/10 bg-white/5 p-4 backdrop-blur-sm"
                  >
                    <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-white/40">
                      {item.label}
                    </p>
                    <p className="mt-2 text-lg font-semibold text-white">{item.value}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative">
              <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                className="overflow-hidden rounded-[32px] border border-white/10 bg-[linear-gradient(180deg,rgba(24,24,27,0.88),rgba(10,10,12,0.92))] shadow-[0_30px_120px_rgba(0,0,0,0.45)]"
              >
                <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-white/40">
                      Live command center
                    </p>
                    <p className="mt-1 text-sm font-medium text-white/85">
                      Owner dashboard with QC visibility
                    </p>
                  </div>
                  <div className="rounded-full border border-success/20 bg-success/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-success">
                    Active
                  </div>
                </div>

                <div className="grid gap-4 p-5">
                  <div className="grid gap-3 sm:grid-cols-2">
                    {[
                      ["Today", "128 inspections"],
                      ["QC", "98.4% pass rate"],
                    ].map(([label, value]) => (
                      <div key={label} className="rounded-[24px] border border-white/10 bg-white/5 p-4">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-white/40">
                          {label}
                        </p>
                        <p className="mt-2 text-2xl font-semibold tracking-[-0.05em] text-white">{value}</p>
                      </div>
                    ))}
                  </div>

                  <div className="rounded-[24px] border border-white/10 bg-black/30 p-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-white">Factory today</p>
                      <p className="text-xs text-white/40">Live feed</p>
                    </div>
                    <div className="mt-4 space-y-3">
                      {[
                        "Inspection completed for Batch #442",
                        "Rework requested on stitching checkpoint",
                        "Customer quality passport generated",
                      ].map((row) => (
                        <div
                          key={row}
                          className="flex items-center gap-3 rounded-2xl border border-white/8 bg-white/5 px-3 py-3 text-sm text-white/80"
                        >
                          <CheckCircle2 className="h-4 w-4 text-success" />
                          <span>{row}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-20 sm:px-6 lg:px-8">
        <SectionLabel eyebrow="The problem" title="Factories are still glued together by paper, chat, and memory." />
        <div className="mt-10 grid gap-4 lg:grid-cols-3">
          {reasons.map((reason, index) => (
            <Card key={reason} index={index} className="min-h-[160px]">
              <TriangleAlert className="h-5 w-5 text-danger" />
              <p className="mt-5 text-lg font-medium leading-7 text-white">{reason}</p>
            </Card>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-20 sm:px-6 lg:px-8">
        <SectionLabel
          eyebrow="The solution"
          title="Verity is a configurable Manufacturing Operating System, not another ERP."
        />
        <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {modules.map((module, index) => {
            const Icon = module.icon;
            return (
              <Card key={module.title} index={index} className="min-h-[220px]">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/6">
                    <Icon className="h-5 w-5 text-brand" />
                  </div>
                  <BadgePill>{String(index + 1).padStart(2, "0")}</BadgePill>
                </div>
                <h3 className="mt-6 text-2xl font-semibold tracking-[-0.04em] text-white">
                  {module.title}
                </h3>
                <p className="mt-3 max-w-md text-sm leading-6 text-white/65">{module.desc}</p>
              </Card>
            );
          })}
        </div>
      </section>

      <section id="workflow" className="mx-auto max-w-7xl px-5 py-20 sm:px-6 lg:px-8">
        <SectionLabel
          eyebrow="Workflow"
          title="One clear flow from order to digital proof."
        />
        <div className="mt-10 overflow-hidden rounded-[32px] border border-white/10 bg-white/4 p-5">
          <div className="grid gap-3 md:grid-cols-5 xl:grid-cols-10">
            {workflow.map((step, index) => (
              <div
                key={step}
                className="rounded-[20px] border border-white/10 bg-black/30 p-4 text-center"
              >
                <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-full bg-brand text-sm font-semibold text-white">
                  {index + 1}
                </div>
                <p className="mt-3 text-sm font-medium leading-6 text-white/85">{step}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="proof" className="mx-auto max-w-7xl px-5 py-20 sm:px-6 lg:px-8">
        <SectionLabel
          eyebrow="Customer proof"
          title="Every finished product becomes a premium verified certificate."
        />
        <div className="mt-10 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-[32px] border border-white/10 bg-[linear-gradient(180deg,rgba(28,28,30,0.9),rgba(12,12,14,0.96))] p-6 shadow-[0_30px_100px_rgba(0,0,0,0.35)]">
            <div className="flex items-center justify-between border-b border-white/10 pb-5">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-white/40">
                  Quality Verified
                </p>
                <h3 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-white">
                  Verity Quality Passport
                </h3>
              </div>
              <div className="rounded-2xl border border-success/20 bg-success/10 px-4 py-3 text-success">
                <ShieldCheck className="h-5 w-5" />
              </div>
            </div>

            <div className="mt-6 grid gap-3 md:grid-cols-2">
              {proofCards.map((item) => (
                <div key={item} className="rounded-[24px] border border-white/10 bg-white/5 p-4">
                  <CheckCircle2 className="h-5 w-5 text-success" />
                  <p className="mt-3 text-sm leading-6 text-white/80">{item}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-4">
            {[
              ["Worker UX", "Blinkit-simple, mobile-first, camera-first, and fast on factory floors."],
              ["Owner UX", "A premium command center for operations, quality, and team visibility."],
              ["Inspector UX", "Approval-focused, evidence-driven, and designed to reduce friction."],
              ["Customer UX", "A shareable verification page that makes quality visible and trustworthy."],
            ].map(([title, body]) => (
              <div key={title} className="rounded-[24px] border border-white/10 bg-white/5 p-5">
                <p className="text-sm font-semibold uppercase tracking-[0.22em] text-white/45">{title}</p>
                <p className="mt-2 text-sm leading-6 text-white/72">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-20 sm:px-6 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-[32px] border border-white/10 bg-white/5 p-6">
            <SectionLabel eyebrow="Why now" title="Indian manufacturers want digital traceability without ERP complexity." />
            <div className="mt-6 space-y-4">
              {[
                "Factories want speed of adoption more than feature depth.",
                "Managers need visibility, not spreadsheet overhead.",
                "Customers now expect quality proof with every shipped order.",
              ].map((item) => (
                <div key={item} className="flex items-start gap-3 rounded-2xl border border-white/10 bg-black/20 p-4">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 text-success" />
                  <p className="text-sm leading-6 text-white/80">{item}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[32px] border border-white/10 bg-[linear-gradient(180deg,rgba(0,122,255,0.14),rgba(0,0,0,0.08))] p-6">
            <SectionLabel eyebrow="Positioning" title="Verity bridges the gap between heavy ERP and shallow apps." />
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <ComparisonCard
                title="Traditional ERP"
                bullets={["Heavy", "Slow", "Expensive", "Training-heavy"]}
              />
              <ComparisonCard
                title="Verity"
                bullets={["Modern", "Fast", "Mobile-first", "Offline-ready", "Configurable", "Premium UI"]}
                highlighted
              />
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-20 pb-28 sm:px-6 lg:px-8">
        <div className="rounded-[36px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.07),rgba(255,255,255,0.02))] p-8 text-center shadow-[0_30px_100px_rgba(0,0,0,0.35)]">
          <p className="text-[10px] font-semibold uppercase tracking-[0.34em] text-white/45">
            Closing
          </p>
          <h2 className="mt-4 text-4xl font-semibold tracking-[-0.05em] text-white sm:text-5xl">
            Build the operating system for the next generation of manufacturing.
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-white/70">
            Verity unifies orders, production, QC, inventory, documents, workforce, and customer verification
            into one premium factory experience.
          </p>
        </div>
      </section>
    </main>
  );
}

function SectionLabel({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="max-w-3xl">
      <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-white/38">{eyebrow}</p>
      <h2 className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-white sm:text-4xl">
        {title}
      </h2>
    </div>
  );
}

function BadgePill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-white/10 bg-white/6 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/65">
      {children}
    </span>
  );
}

function Card({
  children,
  className = "",
  index,
}: {
  children: React.ReactNode;
  className?: string;
  index?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.45, delay: (index || 0) * 0.04 }}
      className={`rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.03))] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.18)] ${className}`}
    >
      {children}
    </motion.div>
  );
}

function ComparisonCard({
  title,
  bullets,
  highlighted = false,
}: {
  title: string;
  bullets: string[];
  highlighted?: boolean;
}) {
  return (
    <div
      className={`rounded-[24px] border p-5 ${
        highlighted
          ? "border-brand/30 bg-brand/10"
          : "border-white/10 bg-black/20"
      }`}
    >
      <p className="text-sm font-semibold uppercase tracking-[0.22em] text-white/45">{title}</p>
      <div className="mt-4 space-y-3">
        {bullets.map((bullet) => (
          <div key={bullet} className="flex items-center gap-2 text-sm text-white/75">
            <div className={`h-2 w-2 rounded-full ${highlighted ? "bg-brand" : "bg-white/30"}`} />
            <span>{bullet}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
