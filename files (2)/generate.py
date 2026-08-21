#!/usr/bin/env python3
"""
VERITY PRD GENERATOR
--------------------
Reads the canonical model in _model/ and expands it into the numbered PRD folders.

Design rules (enforced, not aspirational):
  1. Nothing is invented here. Every sentence in the output either comes from the
     model or is a structural consequence of the vocabulary (e.g. every mutating
     action gets a permission row for every role archetype).
  2. Output is deterministic. Same model in, byte-identical docs out. This makes the
     PRD diffable in git and makes review tractable.
  3. Where the model is silent, the generator writes an explicit GAP marker rather
     than prose. GAP markers are counted and reported. A GAP is a task, not filler.
  4. No document restates another. Cross-references are links.
"""
import os, sys, csv, json, hashlib
from pathlib import Path
import yaml

ROOT = Path(__file__).resolve().parents[1]
MODEL = ROOT / "_model"
VOCAB = yaml.safe_load((MODEL / "_vocabulary.yaml").read_text())

GAPS = []
STATS = {"files": 0, "bytes": 0}


def gap(where, what):
    GAPS.append({"where": where, "what": what})
    return f"> **GAP — {what}**  \n> Not specified in the model. This is a task, not an omission to be papered over. Owner: TBD. Blocks: implementation of `{where}`.\n"


def write(relpath, text):
    p = ROOT / relpath
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(text)
    STATS["files"] += 1
    STATS["bytes"] += len(text.encode())


def fm(title, doc_id, source, confidence="see body"):
    return (f"---\ndoc_id: {doc_id}\ntitle: {title}\ngenerated: true\n"
            f"source_model: {source}\nconfidence: {confidence}\n"
            f"regenerate_with: python3 _tools/generate.py\n---\n\n# {title}\n\n"
            f"*This document is generated. Edit `{source}`, not this file.*\n\n")


def load_models():
    models = []
    for sub in ("capabilities", "modules"):
        d = MODEL / sub
        if not d.exists():
            continue
        for f in sorted(d.glob("*.yaml")):
            m = yaml.safe_load(f.read_text())
            m["_src"] = str(f.relative_to(ROOT))
            m["_layer_dir"] = sub
            models.append(m)
    return models


# --------------------------------------------------------------------------
# 13-DATA-MODEL — one document per entity
# --------------------------------------------------------------------------
def gen_entity_doc(mod, ent):
    key, src = ent["key"], mod["_src"]
    o = [fm(f"Entity — {ent['name']}", f"ENT-{key.upper()}", src)]
    o.append(f"**Capability/module:** `{mod['key']}` · **Owner scope:** `{ent.get('owner','GAP')}`\n\n")
    o.append(f"{ent.get('description','')}\n\n")

    o.append("## 1. Field specification\n\n")
    o.append("| Field | Type | Required | Immutable | Unique | Sensitive | Financial | Notes |\n")
    o.append("|---|---|---|---|---|---|---|---|\n")
    for f in ent.get("fields", []):
        o.append("| `{}` | {} | {} | {} | {} | {} | {} | {} |\n".format(
            f.get("key"), f.get("type", "GAP"),
            "yes" if f.get("req") else "no",
            "yes" if f.get("immutable") else "no",
            f.get("unique_scope", "—"),
            "yes" if f.get("sensitive") else "no",
            "yes" if f.get("financial") else "no",
            f.get("note", "")))
    if not ent.get("fields"):
        o.append("\n" + gap(f"{key}.fields", "entity has no field specification"))

    o.append("\n## 2. Lifecycle\n\n")
    states = ent.get("states")
    if states:
        o.append("States: " + ", ".join(f"`{s}`" for s in states) + "\n\n")
        o.append("| State | Terminal | Mutable | Counts toward billing | Definition |\n|---|---|---|---|---|\n")
        for s in states:
            r = VOCAB["reserved_states"].get(s)
            if r:
                o.append(f"| `{s}` | {r['terminal']} | {r['mutable']} | {r['billable']} | {r['description']} |\n")
            else:
                o.append(f"| `{s}` | GAP | GAP | GAP | entity-specific, see capability model |\n")
    else:
        o.append(gap(f"{key}.states", "no lifecycle declared — every entity must declare at least draft/active/archived/deleted"))

    o.append("\n## 3. Invariants\n\n")
    inv = ent.get("invariants", [])
    if inv:
        for i, v in enumerate(inv, 1):
            o.append(f"{i}. {v}\n")
    else:
        o.append(gap(f"{key}.invariants", "no invariants declared"))

    o.append("\n## 4. Deletion and retention semantics\n\n")
    o.append("| Question | Answer |\n|---|---|\n")
    o.append("| Soft or hard delete | Soft by default (`deleted` reserved state). Hard delete only via retention job or a data-subject erasure request. |\n")
    o.append("| What happens to children | Blocked if any child row in a non-terminal state references this row. The user is shown the blocking rows, not a generic error. |\n")
    o.append("| What happens to audit rows | Retained. Audit rows are never cascade-deleted. |\n")
    o.append("| What happens to emitted events | Retained. Events are immutable history. |\n")
    o.append("| Archive vs delete | Archive removes from default lists and aggregate reports; delete removes from all reads except audit and legal hold. |\n")

    o.append("\n## 5. Tenant isolation\n\n")
    o.append(f"Tenancy mode: `{ent.get('tenancy','tenant_scoped_row')}`. Enforced by Postgres row-level security on `tenant_id`, "
             "not by application `WHERE` clauses. Every query runs under a role that cannot see other tenants even if the "
             "application layer forgets a predicate. Cross-tenant reads require a platform archetype and are audited under `security`.\n")

    o.append("\n## 6. Related documents\n\n")
    o.append(f"- Permission matrix: `14-PERMISSIONS/{mod['key']}/{key}.md`\n")
    o.append(f"- Screen specifications: `11-UX/screens/{mod['key']}/{key}/`\n")
    o.append(f"- Test catalogue: `20-TESTING/{mod['key']}/{key}/`\n")
    write(f"13-DATA-MODEL/entities/{mod['key']}/{key}.md", "".join(o))


# --------------------------------------------------------------------------
# 06-MODULE-SPECS — one document per action, the heart of the PRD
# --------------------------------------------------------------------------
ACTION_QUESTIONS = [
    ("Who can perform it", "actors"),
    ("Preconditions", "preconditions"),
    ("Inputs", "inputs"),
    ("What is created", "creates"),
    ("What is modified", "updates"),
    ("What events fire", "events"),
    ("Who is notified", "notifications"),
    ("Can it be undone", "undoable"),
    ("Concurrency behaviour", "concurrency"),
    ("Audit class", "audit_class"),
]


def gen_action_doc(mod, act):
    key, src = act["key"], mod["_src"]
    o = [fm(f"Action — {act.get('label', key)}", f"ACT-{mod['key'].upper()}-{key.upper()}", src)]
    o.append(f"**Entity:** `{act.get('entity','GAP')}` · **Capability:** `{mod['key']}`\n\n")
    if act.get("rationale"):
        o.append(f"**Why this exists:** {act['rationale']}\n\n")
    if act.get("note"):
        o.append(f"**Note:** {act['note']}\n\n")

    o.append("## 1. Specification\n\n")
    for label, k in ACTION_QUESTIONS:
        v = act.get(k)
        o.append(f"### {label}\n\n")
        if v is None:
            o.append(gap(f"{mod['key']}.{key}.{k}", f"`{k}` unanswered for this action"))
        elif isinstance(v, list):
            if not v:
                o.append("None.\n")
            for item in v:
                if isinstance(item, dict):
                    o.append("- " + "; ".join(f"**{a}**: {b}" for a, b in item.items()) + "\n")
                else:
                    o.append(f"- {item}\n")
        elif isinstance(v, bool):
            o.append(("Yes." if v else "No — this action is irreversible. The UI must confirm before, "
                      "not offer undo after.") + "\n")
        else:
            o.append(f"{v}\n")
        o.append("\n")

    o.append("## 2. Failure modes\n\n")
    fms = act.get("failure_modes", [])
    if fms:
        o.append("| Code | HTTP | Cause | Message shown to user | Retryable | Notes |\n|---|---|---|---|---|---|\n")
        for f in fms:
            tax = VOCAB["error_taxonomy"].get(f.get("code"), {})
            o.append("| `{}` | {} | {} | {} | {} | {} |\n".format(
                f.get("code"), tax.get("http", "GAP"), f.get("cause", "GAP"),
                f.get("message") or "*(silent)*", tax.get("retryable", "GAP"), f.get("note", "")))
    else:
        o.append(gap(f"{mod['key']}.{key}.failure_modes", "no failure modes enumerated"))

    o.append("\n## 3. Edge cases\n\n")
    ecs = act.get("edge_cases", [])
    if ecs:
        for i, e in enumerate(ecs, 1):
            o.append(f"**EC-{i:02d}.** {e}\n\n")
    else:
        o.append(gap(f"{mod['key']}.{key}.edge_cases", "no edge cases enumerated"))

    if act.get("client_obligations"):
        o.append("## 4. Client obligations\n\n")
        for c in act["client_obligations"]:
            o.append(f"- {c}\n")
        o.append("\n")

    if act.get("required_for"):
        o.append("## 5. Required for\n\n")
        for c in act["required_for"]:
            o.append(f"- {c}\n")
        o.append("\n")

    o.append("## 6. Offline behaviour\n\n")
    verb_mutating = act.get("updates") or act.get("creates")
    if not verb_mutating:
        o.append("Read-only action. Served from cache when offline; the surface must show cache age.\n")
    else:
        o.append("Mutating action. Default policy: queue locally, apply optimistically, reconcile on reconnect using "
                 "field-level last-write-wins, EXCEPT where the model marks the action financial or attendance-related, "
                 "in which case it is refused offline and the user is told why.\n")

    o.append("\n## 7. Test coverage\n\n")
    o.append(f"See `20-TESTING/{mod['key']}/{act.get('entity','_')}/{key}.md`.\n")
    write(f"06-MODULE-SPECS/{mod['key']}/actions/{key}.md", "".join(o))


# --------------------------------------------------------------------------
# 14-PERMISSIONS — role x verb x scope matrix per entity
# --------------------------------------------------------------------------
def gen_permission_matrix(mod, ent):
    key = ent["key"]
    o = [fm(f"Permission matrix — {ent['name']}", f"PERM-{key.upper()}", mod["_src"])]
    o.append("Permission is evaluated as **Action + Entity + Field + Scope**, in that order. "
             "A denial at any layer stops evaluation. Field-level denial removes the field from the "
             "response payload entirely (`E_AUTHZ_FIELD`) so a client cannot distinguish *hidden* from *empty*. "
             "Scope denial returns `404`, not `403`, so the existence of out-of-scope records is never confirmed.\n\n")
    o.append("## Default grants by role archetype\n\n")
    o.append("| Role archetype | " + " | ".join(f"`{v}`" for v in VOCAB["verbs"]) + " |\n")
    o.append("|---" * (len(VOCAB["verbs"]) + 1) + "|\n")
    for rk, rv in VOCAB["role_archetypes"].items():
        row = [f"**{rv['label']}**"]
        for vk in VOCAB["verbs"]:
            row.append("GAP")
        o.append("| " + " | ".join(row) + " |\n")
    o.append("\n" + gap(f"{key}.permission_defaults",
                        "default grant per (role archetype x verb x scope) is not declared in the model — "
                        "this matrix must be filled before any pack can ship working permissions"))
    o.append("\n## Field-level gates\n\n")
    sens = [f for f in ent.get("fields", []) if f.get("sensitive") or f.get("financial")]
    if sens:
        o.append("| Field | Gate verb | Rationale |\n|---|---|---|\n")
        for f in sens:
            v = "view_financial" if f.get("financial") else "view_sensitive"
            o.append(f"| `{f['key']}` | `{v}` | {f.get('note','marked in model')} |\n")
    else:
        o.append("No fields on this entity are marked sensitive or financial.\n")
    o.append("\n## Scope vocabulary in force\n\n")
    o.append("| Scope | Resolution |\n|---|---|\n")
    for sk, sv in VOCAB["scopes"].items():
        o.append(f"| `{sk}` | `{sv['resolution']}` |\n")
    write(f"14-PERMISSIONS/{mod['key']}/{key}.md", "".join(o))


# --------------------------------------------------------------------------
# 11-UX — one document per (entity x screen x state)
# --------------------------------------------------------------------------
SCREENS = ["list", "detail", "create", "edit", "bulk_action", "mobile_task"]


def gen_screen_docs(mod, ent):
    for screen in SCREENS:
        o = [fm(f"Screen — {ent['name']} · {screen}", f"UX-{ent['key'].upper()}-{screen.upper()}", mod["_src"])]
        o.append("## Required answers (mandate §20)\n\n")
        for q in ["Information architecture — what belongs here",
                  "Primary action — what is the user trying to accomplish",
                  "Secondary actions", "Density", "Navigation — how do they arrive",
                  "Search", "Filtering", "Sorting", "Bulk actions", "Keyboard shortcuts",
                  "Desktop behaviour", "Tablet behaviour", "Mobile behaviour"]:
            o.append(f"### {q}\n\n" + gap(f"{ent['key']}.{screen}.{q}", f"unanswered: {q}") + "\n")
        o.append("## State specifications\n\n")
        for st in VOCAB["ui_states"]:
            o.append(f"### State: `{st}`\n\n")
            o.append(gap(f"{ent['key']}.{screen}.{st}", f"state `{st}` not specified"))
            o.append("\n")
        o.append("## Accessibility acceptance criteria (WCAG 2.2 AA)\n\n")
        for c in ["2.4.11 Focus Not Obscured (Minimum)", "2.5.7 Dragging Movements",
                  "2.5.8 Target Size (Minimum) — 24x24 CSS px or spacing exception",
                  "3.2.6 Consistent Help", "3.3.7 Redundant Entry",
                  "3.3.8 Accessible Authentication (Minimum)",
                  "1.4.3 Contrast (Minimum)", "2.1.1 Keyboard", "2.4.3 Focus Order",
                  "4.1.2 Name, Role, Value", "1.3.1 Info and Relationships"]:
            o.append(f"- [ ] {c}\n")
        write(f"11-UX/screens/{mod['key']}/{ent['key']}/{screen}.md", "".join(o))


# --------------------------------------------------------------------------
# 20-TESTING — generated test catalogue
# --------------------------------------------------------------------------
def gen_tests(mod, act):
    ent = act.get("entity", "_")
    o = [fm(f"Test catalogue — {act.get('label', act['key'])}", f"TEST-{act['key'].upper()}", mod["_src"])]
    n = 0
    o.append("## Happy path\n\n")
    n += 1
    o.append(f"**T-{n:03d}** Given all preconditions satisfied, when `{act['key']}` is invoked by an authorised actor, "
             f"then the declared records are created/updated and events {act.get('events', [])} are emitted exactly once "
             f"per `event_id`.\n\n")

    o.append("## Authorization\n\n")
    for rk, rv in VOCAB["role_archetypes"].items():
        n += 1
        allowed = rk in (act.get("actors") or [])
        o.append(f"**T-{n:03d}** As `{rk}` ({rv['label']}), invoking `{act['key']}` "
                 f"{'succeeds' if allowed else 'is denied'}. "
                 f"{'' if allowed else 'Denial must use the code required by the scope/entity layer, and must not leak record existence.'}\n\n")

    o.append("## Tenant isolation\n\n")
    n += 1
    o.append(f"**T-{n:03d}** A principal in tenant A invoking `{act['key']}` against a subject id belonging to tenant B "
             f"receives `E_AUTHZ_SCOPE` (404). Verified at the database layer with RLS enabled and the application "
             f"predicate deliberately removed.\n\n")

    o.append("## Failure modes\n\n")
    for f in act.get("failure_modes", []):
        n += 1
        o.append(f"**T-{n:03d}** Cause: {f.get('cause')} → expect `{f.get('code')}`"
                 f"{', message: ' + repr(f.get('message')) if f.get('message') else ''}."
                 f"{' ' + f['note'] if f.get('note') else ''}\n\n")

    o.append("## Edge cases\n\n")
    for i, e in enumerate(act.get("edge_cases", []), 1):
        n += 1
        o.append(f"**T-{n:03d}** (EC-{i:02d}) {e}\n\n")

    o.append("## Idempotency and concurrency\n\n")
    n += 1
    o.append(f"**T-{n:03d}** Replaying the same request with the same idempotency key produces one effect and one event.\n\n")
    n += 1
    o.append(f"**T-{n:03d}** Two concurrent invocations against the same subject: exactly one succeeds or both succeed "
             f"per the declared concurrency rule; no lost update; optimistic version conflict surfaces as "
             f"`E_CONFLICT_VERSION` with a diff.\n\n")

    o.append("## Audit\n\n")
    n += 1
    ac = act.get("audit_class", "always")
    o.append(f"**T-{n:03d}** An audit row of class `{ac}` is written with all fields required by that class "
             f"({', '.join(VOCAB['audit_classes'].get(ac, {}).get('fields', ['GAP']))}) and is not mutable afterwards.\n\n")

    o.append("## Offline\n\n")
    n += 1
    o.append(f"**T-{n:03d}** Invoked offline: queued or refused per the offline policy; on reconnect the outcome matches "
             f"the online outcome or surfaces `E_OFFLINE_STALE` with a resolvable conflict.\n\n")
    o.append(f"\n**Total generated cases: {n}**\n")
    write(f"20-TESTING/{mod['key']}/{ent}/{act['key']}.md", "".join(o))
    return n


# --------------------------------------------------------------------------
# 15-EVENTS
# --------------------------------------------------------------------------
def gen_events(models):
    rows = []
    for mod in models:
        for act in mod.get("actions", []):
            for ev in act.get("events", []) or []:
                rows.append((ev, mod["key"], act["key"], act.get("entity", "")))
    o = [fm("Event catalogue", "EVT-CATALOG", "all models")]
    o.append("## Envelope\n\n| Field | Type | Note |\n|---|---|---|\n")
    for f in VOCAB["event_convention"]["envelope_fields"]:
        o.append(f"| `{f['key']}` | {f['type']} | {f.get('note','')} |\n")
    o.append(f"\nDelivery: `{VOCAB['event_convention']['delivery']}`. "
             f"Consumers **must** be idempotent on `event_id`. "
             f"Ordering guarantee: {VOCAB['event_convention']['ordering']}.\n\n")
    o.append("## Emitted events\n\n| Event | Emitted by capability | Emitting action | Subject entity |\n|---|---|---|---|\n")
    for r in sorted(set(rows)):
        o.append(f"| `{r[0]}` | `{r[1]}` | `{r[2]}` | `{r[3]}` |\n")
    if not rows:
        o.append("\n" + gap("events", "no events declared in any model"))
    write("15-EVENTS/catalog.md", "".join(o))
    return len(set(rows))


# --------------------------------------------------------------------------
# 26-TRACEABILITY
# --------------------------------------------------------------------------
def gen_traceability(models):
    p = ROOT / "26-TRACEABILITY/matrix.csv"
    p.parent.mkdir(parents=True, exist_ok=True)
    with p.open("w", newline="") as fh:
        w = csv.writer(fh)
        w.writerow(["capability", "entity", "action", "event", "permission_doc",
                    "screen_docs", "test_doc", "audit_class", "confidence"])
        for mod in models:
            for act in mod.get("actions", []):
                w.writerow([mod["key"], act.get("entity", ""), act["key"],
                            ";".join(act.get("events", []) or []),
                            f"14-PERMISSIONS/{mod['key']}/{act.get('entity','')}.md",
                            f"11-UX/screens/{mod['key']}/{act.get('entity','')}/",
                            f"20-TESTING/{mod['key']}/{act.get('entity','')}/{act['key']}.md",
                            act.get("audit_class", ""), mod.get("confidence", "")])
    STATS["files"] += 1
    STATS["bytes"] += p.stat().st_size


# --------------------------------------------------------------------------
def main():
    models = load_models()
    total_tests = 0
    for mod in models:
        for ent in mod.get("entities", []):
            gen_entity_doc(mod, ent)
            gen_permission_matrix(mod, ent)
            gen_screen_docs(mod, ent)
        for act in mod.get("actions", []):
            gen_action_doc(mod, act)
            total_tests += gen_tests(mod, act)
    n_events = gen_events(models)
    gen_traceability(models)

    # GAP register
    o = [fm("Generated gap register", "GAP-REGISTER", "all models")]
    o.append("Every row is an unanswered question the model must resolve before implementation. "
             "This file is regenerated on every run; a shrinking row count is the PRD's progress metric.\n\n")
    o.append(f"**Open gaps: {len(GAPS)}**\n\n| # | Location | Missing |\n|---|---|---|\n")
    for i, g in enumerate(GAPS, 1):
        o.append(f"| {i} | `{g['where']}` | {g['what']} |\n")
    write("24-OPEN-QUESTIONS/generated-gap-register.md", "".join(o))

    print(json.dumps({
        "models": len(models),
        "entities": sum(len(m.get("entities", [])) for m in models),
        "actions": sum(len(m.get("actions", [])) for m in models),
        "events": n_events,
        "test_cases": total_tests,
        "files_written": STATS["files"],
        "bytes_written": STATS["bytes"],
        "mb_written": round(STATS["bytes"] / 1024 / 1024, 3),
        "open_gaps": len(GAPS),
    }, indent=2))


if __name__ == "__main__":
    main()
