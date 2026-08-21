#!/usr/bin/env python3
"""
MODEL LINT
==========
Checks the hand-authored model against the kernel invariants that the generator
turns into GAP records. Running this before generate_v2 is faster than reading a
2000-row gap register to find the twelve rows that are actually closable.

It reports only gaps a model author can close. It deliberately does NOT report the
unconditional gaps the generator emits for UX screens, permission matrices, API
query semantics and pack contents, because no model data closes those today.

Exit code 1 if anything is reported.
"""
import sys
from pathlib import Path
import yaml

ROOT = Path(__file__).resolve().parents[1]
MODEL = ROOT / "_model"
VOCAB = yaml.safe_load((MODEL / "_vocabulary.yaml").read_text())
RESERVED = VOCAB["reserved_states"]
VERBS = set(VOCAB["verbs"])
ERRORS = set(VOCAB["error_taxonomy"])

# The keys generate.py ACTION_QUESTIONS renders; a missing one becomes a GAP row.
ACTION_KEYS = ["actors", "preconditions", "inputs", "creates", "updates", "events",
               "notifications", "undoable", "concurrency", "audit_class"]
# Kernel K06 invariants.
KERNEL_ACTION_KEYS = ["idempotency_key_source", "offline_policy", "failure_modes", "edge_cases"]

INDUSTRY_NOUNS = ["restaurant", "clinic", "guard", "salon", "factory",
                  "vehicle", "patient", "diner", "table"]


def lint(path):
    m = yaml.safe_load(path.read_text())
    cap = m.get("key", path.stem)
    out = []
    owned = {e["key"] for e in m.get("entities", [])}

    for e in m.get("entities", []):
        ek = e["key"]
        states = e.get("states") or []
        if not states:
            out.append(f"{cap}.{ek}: no states declared (kernel K05)")
            continue
        if not e.get("initial_state"):
            out.append(f"{cap}.{ek}: no initial_state (kernel K05)")
        if not e.get("transitions"):
            out.append(f"{cap}.{ek}: no transitions (kernel K05)")
        pol = e.get("stuck_state_policy") or {}
        for s in states:
            # generate_v2 skips only states the vocabulary marks terminal
            if RESERVED.get(s, {}).get("terminal"):
                continue
            if s not in pol:
                out.append(f"{cap}.{ek}.stuck_state_policy.{s}: missing")
        for s in pol:
            if s not in states:
                out.append(f"{cap}.{ek}.stuck_state_policy.{s}: policy for a state that is not declared")
        for t in e.get("transitions") or []:
            for side in ("from", "to"):
                if t.get(side) not in states:
                    out.append(f"{cap}.{ek}: transition {side}={t.get(side)!r} is not a declared state")
        if not e.get("invariants"):
            out.append(f"{cap}.{ek}: no invariants declared")
        for f in e.get("fields", []):
            fk = f.get("fk")
            if fk and fk not in owned:
                out.append(f"{cap}.{ek}.{f['key']}: fk -> {fk!r} is not owned by this capability "
                           f"(kernel K04 forbids cross-capability foreign keys; use a Port)")

    for a in m.get("actions", []):
        ak = a.get("key")
        if a.get("entity") not in owned:
            out.append(f"{cap}.{ak}: entity {a.get('entity')!r} is not owned by this capability")
        for k in ACTION_KEYS:
            if k not in a:
                out.append(f"{cap}.{ak}.{k}: missing (generator emits a GAP)")
        for k in KERNEL_ACTION_KEYS:
            if not a.get(k):
                out.append(f"{cap}.{ak}.{k}: missing (kernel K06)")
        mutating = bool(a.get("creates") or a.get("updates"))
        if mutating and a.get("undoable") is False and not a.get("confirmation_specification"):
            out.append(f"{cap}.{ak}: undoable=false on a mutating action with no "
                       f"confirmation_specification (kernel K06)")
        for f in a.get("failure_modes") or []:
            if f.get("code") not in ERRORS:
                out.append(f"{cap}.{ak}: failure code {f.get('code')!r} is not in the error taxonomy")

    for p in m.get("ports", []):
        if p.get("direction") == "requires" and not p.get("unbound_behaviour"):
            out.append(f"{cap}.port.{p.get('port_key')}: requires-port with no unbound_behaviour (kernel K13)")

    for r in m.get("rules", []):
        if "default" not in r:
            out.append(f"{cap}.rule.{r.get('key')}: no shipped default (kernel K07)")

    if not m.get("open_questions"):
        out.append(f"{cap}: no open_questions - a capability that raised no question has not been thought about")
    return out


def main():
    total = []
    for f in sorted((MODEL / "capabilities").glob("*.yaml")):
        rows = lint(f)
        if rows:
            print(f"--- {f.name} ({len(rows)}) ---")
            for r in rows:
                print("  " + r)
        total += rows
    print(f"\n{len(total)} closable model gaps")
    sys.exit(1 if total else 0)


if __name__ == "__main__":
    main()
