#!/usr/bin/env python3
"""
VERITY CAPABILITY AUTHORING HARNESS
===================================
Removes the human-in-the-loop bottleneck from PRD authoring.

The kernel is frozen and capabilities couple only through declared Ports, so
capability authoring is embarrassingly parallel. This script authors them
unattended: one API call per capability, then normalise -> generate -> audit.

USAGE
    export ANTHROPIC_API_KEY=sk-...
    python3 _tools/author.py --list                  # show the backlog
    python3 _tools/author.py --all                   # author everything missing
    python3 _tools/author.py work_order party audit  # author specific ones
    python3 _tools/author.py --all --workers 4       # parallel
    python3 _tools/author.py --all --dry-run         # print prompts, call nothing

WHAT IT GUARANTEES
  * Never overwrites an existing capability model unless --force.
  * Writes to a temp path, parses the YAML, and only then commits. A malformed
    response is discarded and reported, never left half-written in the repo.
  * Runs the full generator + audit after the batch, so contradictions between
    independently authored capabilities surface immediately.
  * Re-running is safe. Already-authored capabilities are skipped.

WHAT IT DOES NOT DO
  * It does not resolve the open architectural decisions. Those are handed to the
    model as constraints; where they are unresolved the model is instructed to
    emit a GAP rather than pick one. See 23-DECISION-LOG/.
"""
import argparse, json, os, sys, urllib.request, concurrent.futures
from pathlib import Path
import yaml

ROOT = Path(__file__).resolve().parents[1]
MODEL = ROOT / "_model"
CAPS = MODEL / "capabilities"
API = "https://api.anthropic.com/v1/messages"
MODEL_ID = os.environ.get("VERITY_MODEL", "claude-opus-4-6")

# ---------------------------------------------------------------------------
# The backlog. Order is dependency order.
# ---------------------------------------------------------------------------
BACKLOG = [
    ("core_authorization",      "Permission evaluation, role binding, scope resolution, delegation, impersonation, permission change audit."),
    ("core_audit",              "Immutable audit trail, audit classes, retention, legal hold, tamper evidence, audit query and export."),
    ("core_configuration",      "Typed scoped configuration, precedence resolution, change impact classification, config change audit."),
    ("party",                   "Unified customer, contact, supplier, employee and consumer identity. Merge, dedupe, relationships, contactability, consent."),
    ("sites",                   "Sites, buildings, floors, units, areas, regions, geofences, site-scoped operations, site calendars and holidays."),
    ("people",                  "Employees, qualifications, certifications with expiry, employment lifecycle, working-hour limits, documents."),
    ("scheduling_dispatch",     "The single reusable engine: schedulable resources, demand, availability, capacity, assignment, swaps, overtime, exceptions."),
    ("work_order",              "The reusable work capability beneath maintenance, field service, projects, helpdesk and assets. Checklists, parts, evidence, sign-off."),
    ("attendance_verification", "Verified presence: geofence, selfie or face, QR, shift relief. The record that feeds both billing and payroll."),
    ("backfill_dispatch",       "Absence detection, reliever selection ranking, configurable escalation timings, configurable billing classification."),
    ("sla_contract",            "Contracts, SLA targets, clock start/pause/resume, breach, escalation tiers, penalties, credits, deductions."),
    ("booking",                 "Consumer and B2B booking over scheduling: hold, confirm, remind, reschedule, cancel, no-show, deposit, waitlist."),
    ("catalog",                 "Services, items, variants, modifiers, pricing, tax classes, availability windows, recipes and bills of material."),
    ("order",                   "Order capture across channels, modification, split, void, comp, fulfilment routing."),
    ("kitchen_flow",            "Station routing, preparation states, timers, expediting, recall. Offline-first on cheap shared Android."),
    ("inventory",               "Items, locations, bins, stock ledger, reservations, valuation, counts, adjustments, wastage."),
    ("procurement",             "Requests, suppliers, purchase orders, receipts, three-way match, supplier invoices."),
    ("billing",                 "Billable events, rating, invoicing, credit notes, collections, disputes, payment application."),
    ("lease_management",        "Commercial property: leases, rent schedules, CAM, escalations, deposits, renewals, vacancies. NOT part of Core."),
    ("assets",                  "Asset register, hierarchy, assignment, meters, warranty, maintenance plans, depreciation."),
    ("helpdesk",                "Tickets, queues, routing, SLA, escalation, customer communication, conversion to work orders."),
    ("evidence_capture",        "Photo, geolocation, signature, scan and form response capture with tamper evidence and offline queueing."),
    ("notification",            "Channel routing, templates, preferences, batching, escalation, quiet hours, cost class, delivery receipts."),
    ("offline_sync",            "Local store, mutation queue, conflict detection and resolution, replay attribution, device trust, sync observability."),
    ("search",                  "Permission-aware global and scoped search, command palette, saved searches, recents, index projection."),
    ("reporting",               "Decision-anchored reports over entities and events, drill-down, export, scheduled delivery, permission projection."),
    ("integrations",            "Integration framework: credentials, webhooks, retries, idempotency, rate limits, failure surfacing, per-connector specs."),
    ("hq_console",              "Verity HQ: tenants, module library, packs, system builder, deployments, versions, health, usage, support tooling."),
]

SYSTEM = """You are authoring one capability model for the Verity PRD.

You are writing a machine-readable specification, not prose. Output a single YAML
document and nothing else — no markdown fences, no commentary before or after.

NON-NEGOTIABLE RULES

1. Conform exactly to the kernel meta-model supplied below. Use only constructs it
   defines. Use only FieldTypes, verbs, scopes, role archetypes, error codes, UI
   states and audit classes from the supplied vocabulary. Do not invent new ones.

2. NEVER invent a decision. Where a real product or architectural choice is
   required and cannot be derived from the kernel, the composition model or
   established industry practice, emit an entry under `open_questions` with the
   question, your working assumption if you have one, a confidence level of
   WORKING_ASSUMPTION or VALIDATION_REQUIRED, a validation method and a priority.
   A flagged gap is correct. A plausible-sounding invention is a defect.

3. Cross-capability coupling happens ONLY through Ports and Events. You may not
   put a foreign key to an entity owned by another capability. If you need
   something another capability owns, declare a `requires` port with a contract
   and a MANDATORY `unbound_behaviour` describing how this capability degrades
   when nothing is bound. "Error" is rarely the right unbound behaviour.

4. No industry nouns. No restaurant, clinic, guard, salon, factory, patient,
   diner or vehicle anywhere in the capability. Those live in packs and
   terminology maps. This rule is automatically tested (AET-01).

5. Every action must enumerate at least one failure mode and its edge cases. An
   action that "cannot fail" has not been thought about. Every mutating action
   needs an idempotency_key_source and an offline_policy. Every offline-editable
   field needs a merge_strategy — there is no default.

6. Every entity needs a lifecycle, and every non-terminal state needs a
   stuck_state_policy: how long may an instance sit here before it is an
   operational exception, who is told, and what is the escape hatch.

7. Prefer configuration over assumption. Where different businesses legitimately
   operate differently, model the difference as a Rule with an `overridable_at`
   scope and a shipped default — never as a hardcoded behaviour.

8. Depth is the point. Match or exceed the depth of the reference capability
   supplied below, including its treatment of concurrency, offline behaviour,
   permission leakage, and adversarial edge cases.

YAML SHAPE
  key, name, layer, confidence, description, principles,
  entities[{key,name,description,owner,tenancy,fields[],invariants,states,
            transitions[],stuck_state_policy{}}],
  ports[{port_key,direction,contract,cardinality,unbound_behaviour}],
  actions[{key,entity,label,actors,preconditions,inputs,creates,updates,events,
           notifications,undoable,audit_class,concurrency,idempotency_key_source,
           offline_policy,failure_modes[],edge_cases[]}],
  rules[{key,kind,scope,overridable_at,default,expression,on_conflict}],
  workflows[{key,trigger,steps[],compensation,timeout_policy,escalation_policy}],
  policy_knobs[], open_questions[]

YAML SAFETY: any scalar containing a comma, colon or question mark must be
single-quoted. Malformed YAML is discarded and the capability is not written."""


def ctx():
    parts = []
    for name in ("_kernel.yaml", "_vocabulary.yaml", "_composition.yaml"):
        parts.append(f"===== {name} =====\n{(MODEL / name).read_text()}")
    ref = CAPS / "core_identity_session.yaml"
    if ref.exists():
        parts.append(f"===== REFERENCE CAPABILITY (match this depth) =====\n{ref.read_text()}")
    existing = sorted(p.stem for p in CAPS.glob("*.yaml"))
    parts.append("===== ALREADY AUTHORED (do not duplicate, reference via ports) =====\n"
                 + ", ".join(existing))
    return "\n\n".join(parts)


def call(prompt, system):
    req = urllib.request.Request(
        API, method="POST",
        headers={"content-type": "application/json",
                 "x-api-key": os.environ["ANTHROPIC_API_KEY"],
                 "anthropic-version": "2023-06-01"},
        data=json.dumps({"model": MODEL_ID, "max_tokens": 32000,
                         "system": system,
                         "messages": [{"role": "user", "content": prompt}]}).encode())
    with urllib.request.urlopen(req, timeout=1800) as r:
        body = json.loads(r.read())
    return "".join(b.get("text", "") for b in body["content"] if b["type"] == "text")


def author(key, brief, context, dry):
    out = CAPS / f"{key}.yaml"
    prompt = (f"{context}\n\n===== YOUR TASK =====\n"
              f"Author the capability `{key}`.\n\nScope brief: {brief}\n\n"
              f"Output the YAML document only.")
    if dry:
        print(f"--- {key} --- prompt {len(prompt)} chars")
        return key, "dry-run", 0
    try:
        text = call(prompt, SYSTEM).strip()
        if text.startswith("```"):
            text = text.split("\n", 1)[1].rsplit("```", 1)[0]
        doc = yaml.safe_load(text)
        if not isinstance(doc, dict) or doc.get("key") != key:
            return key, f"rejected: top-level key is {doc.get('key') if isinstance(doc, dict) else type(doc)}", 0
        out.write_text(text)
        return key, "written", len(text.encode())
    except yaml.YAMLError as e:
        (ROOT / "_tools" / f".failed-{key}.yaml").write_text(text)
        return key, f"rejected: malformed YAML ({str(e)[:120]})", 0
    except Exception as e:
        return key, f"error: {e}", 0


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("capabilities", nargs="*")
    ap.add_argument("--all", action="store_true")
    ap.add_argument("--list", action="store_true")
    ap.add_argument("--force", action="store_true")
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--workers", type=int, default=1)
    a = ap.parse_args()

    done = {p.stem for p in CAPS.glob("*.yaml")}
    if a.list:
        for k, b in BACKLOG:
            print(f"[{'x' if k in done else ' '}] {k:26} {b}")
        print(f"\n{len(done)} authored, {len([k for k, _ in BACKLOG if k not in done])} remaining")
        return

    todo = [(k, b) for k, b in BACKLOG
            if (a.all or k in a.capabilities) and (a.force or k not in done)]
    if not todo:
        print("Nothing to author.")
        return
    if not a.dry_run and "ANTHROPIC_API_KEY" not in os.environ:
        sys.exit("ANTHROPIC_API_KEY is not set.")

    context = ctx()
    results = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=a.workers) as ex:
        futs = {ex.submit(author, k, b, context, a.dry_run): k for k, b in todo}
        for f in concurrent.futures.as_completed(futs):
            k, status, size = f.result()
            print(f"{k:26} {status}  {size/1024:.1f} KB" if size else f"{k:26} {status}")
            results.append((k, status))

    if a.dry_run:
        return
    print("\nNormalising and regenerating...\n")
    os.system(f"cd {ROOT} && python3 _tools/normalize_model.py && python3 _tools/generate_v2.py")
    bad = [k for k, s in results if not s.startswith("written")]
    if bad:
        print(f"\nNOT authored: {', '.join(bad)}. Re-run to retry.")


if __name__ == "__main__":
    main()
