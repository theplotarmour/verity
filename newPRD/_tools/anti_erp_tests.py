#!/usr/bin/env python3
"""
ANTI-ERP TESTS
==============
Executable implementations of the falsifiable tests declared in
_model/_composition.yaml section 7. These are the objective answer to
"is this still a composable platform or has it become an ERP".

Implemented here (the four the composition model marks automatable: true):

  AET-01  No industry nouns in the capability library.
  AET-02  No conditional branching on tenant, pack or industry identity.
  AET-03  Every cross-capability reference resolves to a Port, never to a
          concrete entity owned by another capability.
  AET-05  Disabling a capability degrades its consumers per their declared
          unbound_behaviour, with no error and no orphaned affordance.

Not implemented, and why:
  AET-04  Requires instantiating two tenants and diffing them. The composition
          model marks it "partially" automatable and no runtime exists yet.
  AET-06  Requires a threshold the composition model marks VALIDATION_REQUIRED.
          The count is reported here as an observation, and no pass/fail is
          asserted against an unset threshold.

Exit code 1 if any implemented test fails.

Usage:  python3 _tools/anti_erp_tests.py [--verbose]
"""
import re
import sys
from collections import defaultdict
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parents[1]
MODEL = ROOT / "_model"
CAPS = MODEL / "capabilities"

COMPOSITION = yaml.safe_load((MODEL / "_composition.yaml").read_text())
KERNEL = yaml.safe_load((MODEL / "_kernel.yaml").read_text())
VOCAB = yaml.safe_load((MODEL / "_vocabulary.yaml").read_text())

VERBOSE = "--verbose" in sys.argv

# ---------------------------------------------------------------------------
# AET-01 — industry nouns
# ---------------------------------------------------------------------------
# The noun list is taken verbatim from the composition model's own test
# declaration so the test cannot drift from the specification it implements.
_AET01 = next(t for t in COMPOSITION["anti_erp_tests"] if t["id"] == "AET-01")
INDUSTRY_NOUNS = re.findall(r"\(([^)]*)\)", _AET01["test"])[0]
INDUSTRY_NOUNS = [n.strip() for n in INDUSTRY_NOUNS.split(",")]

# A term is EXCUSED only where it collides with a word the kernel, the
# vocabulary or ordinary database prose already owns. Every excusal is counted
# and listed under --verbose, never silently applied, because a silent excusal
# list is how this test quietly stops testing anything.
#
# The collisions are real and are a finding in their own right:
#   "guard"  is the name of a kernel K05 transition attribute and a K07 rule
#            kind, so it appears in every capability that declares a guard.
#   "table"  is used throughout in the database sense.
#   "Search Guard" is the name of a cited product in the search capability's
#            evidence_basis and must not be reworded, because the citation
#            has to remain accurate.
#
# The excusal for "guard" is deliberately narrowed: it does NOT apply where the
# line also contains a personnel word, so a capability describing a person as a
# guard still fails. The residual risk - a personnel usage with none of those
# words nearby - is stated rather than hidden.

# "guard" is excused as the kernel construct EXCEPT where the line matches a
# positive detector for the personnel sense. A positive detector is used rather
# than a proximity window, because transitions declare both a guard and an
# actor on one line and a proximity window therefore flags every transition in
# the library. The residual risk - a personnel usage phrased in none of these
# ways - is stated rather than hidden.
PERSONNEL_GUARD = re.compile(
    r"\b(security guard"
    r"|guard(s)?\s+(who|whom|on duty|staff|force|patrol|shift|roster|deployment)"
    r"|guard(s)?\s+(are|were|is|was)\s+(deployed|posted|assigned|absent|late)"
    r")", re.I)

# "table" is excused as the database sense EXCEPT where the line matches a
# positive detector for the furniture sense, for the same reason as "guard":
# the database sense is pervasive in a data model and a proximity window would
# flag most of the library.
HOSPITALITY_TABLE = re.compile(
    r"\b(table\s+(service|number|booking|reservation|turn|turnover|plan|layout)"
    r"|(book|booking|reserve|reserved|seat|seated|seating|party of|covers?)\s+"
    r"[a-z ]{0,12}\btables?\b"
    r"|tables?\s+(are|is|was|were)\s+(free|occupied|available|reserved))", re.I)

RECORDING_KEYS = re.compile(r"^\s*-?\s*\{?key:\s*(source_pack_key|tenant_id|pack_versions|"
                            r"capability_versions|source_capability_key|declaring_capability_key)\b")

# A capability model is declarative, so "branching" means an expression, guard,
# condition or rule that tests a tenant id, a pack id or an industry.
BRANCH_PATTERNS = [
    (re.compile(r"tenant_id\s*(==|!=|in\b|=)\s*['\"]?[0-9a-f-]{8,}", re.I),
     "comparison against a literal tenant identifier"),
    (re.compile(r"\b(if|when|where|case)\b[^\n]{0,80}\bpack(_key)?\s*(==|!=|in\b|=)", re.I),
     "branch on pack identity"),
    (re.compile(r"\b(if|when|where|case)\b[^\n]{0,80}\bindustry\b", re.I),
     "branch on industry"),
    (re.compile(r"\b(if|when|where|case)\b[^\n]{0,80}\btenant(_key)?\s*(==|!=|in\b)", re.I),
     "branch on tenant identity"),
    (re.compile(r"\bvertical\s*(==|!=|in\b)", re.I), "branch on vertical"),
]


def excuse(term, line, match_end=None):
    t = term.lower().rstrip("s")
    if t == "guard":
        # The YAML key form is unambiguously the kernel construct.
        if match_end is not None and line[match_end:match_end + 1] == ":":
            return "kernel K05 transition attribute or K07 rule kind, used as a key"
        if "Search Guard" in line:
            return "product name in a cited source; the citation must stay accurate"
        if PERSONNEL_GUARD.search(line):
            return None
        return "kernel K05 transition attribute and K07 rule kind"
    if t == "table":
        if HOSPITALITY_TABLE.search(line):
            return None
        return "database sense, not the industry noun"
    return None


# Nouns the kernel's own exclusion implies but the composition model's AET-01
# list omits. Reported as an ADVISORY rather than folded into AET-01, because
# AET-01 must remain faithful to the test as specified. That the specified list
# is narrower than the kernel rule is itself a finding.
EXTENDED_NOUNS = ["kitchen", "hotel", "ward", "surgery", "warehouse", "canteen",
                  "pharmacy", "workshop", "garage", "showroom"]


def scan(nouns, use_excusals):
    findings, excused = [], []
    pattern = re.compile(r"\b(" + "|".join(re.escape(n) for n in nouns) + r")(s|es)?\b",
                         re.IGNORECASE)
    for f in sorted(CAPS.glob("*.yaml")):
        text = f.read_text()
        # A capability may declare its own naming violation; that declaration is
        # evidence of the problem rather than an instance of it.
        declared = "naming_note:" in text
        for i, line in enumerate(text.split("\n"), 1):
            for m in pattern.finditer(line):
                reason = excuse(m.group(0), line, m.end()) if use_excusals else None
                if reason is None and declared and ("naming_note" in line or "AET-01" in line
                                                    or "industry noun" in line):
                    reason = "the capability declares this violation explicitly"
                row = {"file": f.name, "line": i, "term": m.group(0),
                       "text": line.strip()[:120]}
                (excused if reason else findings).append({**row, "reason": reason})
    return findings, excused


def aet_01():
    """Zero industry nouns in the capability library."""
    return scan(INDUSTRY_NOUNS, use_excusals=True)


def aet_01_extended():
    """Advisory: nouns the kernel exclusion implies but AET-01 does not list."""
    return scan(EXTENDED_NOUNS, use_excusals=True)


def aet_02():
    findings = []
    for f in sorted(CAPS.glob("*.yaml")):
        for i, line in enumerate(f.read_text().split("\n"), 1):
            if RECORDING_KEYS.match(line):
                continue
            for pattern, why in BRANCH_PATTERNS:
                if pattern.search(line):
                    findings.append({"file": f.name, "line": i, "why": why,
                                     "text": line.strip()[:160]})
    return findings


# ---------------------------------------------------------------------------
# AET-03 — no cross-capability foreign keys
# ---------------------------------------------------------------------------
def load_models():
    out = []
    for f in sorted(CAPS.glob("*.yaml")):
        m = yaml.safe_load(f.read_text())
        m["_file"] = f.name
        out.append(m)
    return out


def aet_03(models):
    owner = {}
    for m in models:
        for e in m.get("entities", []):
            owner.setdefault(e["key"], []).append(m["key"])

    findings, ambiguous = [], []
    for key, owners in owner.items():
        if len(owners) > 1:
            ambiguous.append({"entity": key, "claimed_by": owners})

    for m in models:
        mine = {e["key"] for e in m.get("entities", [])}
        for e in m.get("entities", []):
            for fld in e.get("fields", []):
                fk = fld.get("fk")
                if not fk:
                    continue
                if fk in mine:
                    continue
                holder = owner.get(fk)
                findings.append({
                    "capability": m["key"], "entity": e["key"], "field": fld["key"],
                    "fk": fk,
                    "owned_by": ", ".join(holder) if holder else "NOT OWNED BY ANY CAPABILITY",
                })
    return findings, ambiguous


# ---------------------------------------------------------------------------
# AET-05 — a disabled capability degrades its consumers as declared
# ---------------------------------------------------------------------------
NON_ANSWER = re.compile(r"^\s*(error|fail|n/?a|none|tbd|undefined)\s*\.?\s*$", re.I)


def aet_05(models):
    provides = defaultdict(list)   # port_key -> [capability]
    requires = defaultdict(list)   # port_key -> [(capability, unbound_behaviour)]

    for m in models:
        for p in m.get("ports", []) or []:
            pk = p.get("port_key")
            if p.get("direction") == "provides":
                provides[pk].append(m["key"])
            elif p.get("direction") == "requires":
                requires[pk].append((m["key"], (p.get("unbound_behaviour") or "").strip()))

    # Seed ports declared in the composition model count as declarations too.
    seed = {}
    for p in COMPOSITION["port_catalog_seed"]["ports"]:
        seed[p["key"]] = p

    missing, non_answers, unprovided, forbidden = [], [], [], []

    for pk, consumers in sorted(requires.items()):
        for cap, ub in consumers:
            if not ub:
                missing.append({"capability": cap, "port": pk})
            elif NON_ANSWER.match(ub):
                non_answers.append({"capability": cap, "port": pk, "unbound_behaviour": ub})
            elif re.match(r"^\s*FORBIDDEN\b", ub):
                forbidden.append({"capability": cap, "port": pk})
        if pk not in provides and pk not in seed:
            unprovided.append({"port": pk,
                               "required_by": sorted({c for c, _ in consumers})})

    # Simulated disable: for each capability, which consumers lose a provider
    # entirely, and do they all declare a survivable unbound behaviour.
    fatal_on_disable = []
    for m in models:
        disabled = m["key"]
        lost = [pk for pk, provs in provides.items()
                if provs == [disabled]]
        for pk in lost:
            for cap, ub in requires.get(pk, []):
                if cap == disabled:
                    continue
                if re.match(r"^\s*FORBIDDEN\b", ub or ""):
                    fatal_on_disable.append(
                        {"disabled": disabled, "port": pk, "consumer": cap})
    return missing, non_answers, unprovided, forbidden, fatal_on_disable


# ---------------------------------------------------------------------------
# AET-06 — observation only; the composition model marks the threshold
#          VALIDATION_REQUIRED, so no pass/fail is asserted.
# ---------------------------------------------------------------------------
def aet_06_observation(models):
    must_answer = []
    for m in models:
        for k in m.get("policy_knobs", []) or []:
            if not isinstance(k, dict):
                continue
            if "default" not in k or k.get("default") is None:
                must_answer.append({"capability": m["key"], "knob": k.get("key")})
    return must_answer


# ---------------------------------------------------------------------------
def report(name, statement, failures, note=None, excused=None):
    ok = not failures
    print(f"\n{'PASS' if ok else 'FAIL'}  {name}  —  {statement}")
    if note:
        print(f"      {note}")
    if excused:
        print(f"      {len(excused)} occurrence(s) excused as kernel-construct collisions"
              f"{' (use --verbose to list)' if not VERBOSE else ''}")
        if VERBOSE:
            for e in excused:
                print(f"        ~ {e['file']}:{e['line']}  {e['term']}  — {e['reason']}")
    for f in failures:
        print("      x " + "  ".join(f"{k}={v}" for k, v in f.items()))
    return ok


def main():
    models = load_models()
    print(f"Anti-ERP tests over {len(models)} capability models "
          f"({sum(len(m.get('entities', [])) for m in models)} entities).")

    results = []

    f01, x01 = aet_01()
    results.append(report(
        "AET-01", "zero industry nouns in the capability library",
        f01, note=f"nouns tested: {', '.join(INDUSTRY_NOUNS)}", excused=x01))

    e01, ex01 = aet_01_extended()
    print(f"\nOBSERVE  AET-01b  —  {len(e01)} occurrence(s) of industry nouns the KERNEL "
          f"exclusion implies but the composition model's AET-01 list omits.")
    print(f"      nouns tested: {', '.join(EXTENDED_NOUNS)}")
    print("      Advisory, not a pass/fail. AET-01 is implemented faithfully to the test as "
          "specified; that the specified list is narrower than the kernel rule is itself a "
          "finding, recorded in the report rather than silently corrected here.")
    for x in e01:
        print(f"        ? {x['file']}:{x['line']}  {x['term']}  {x['text']}")

    f02 = aet_02()
    results.append(report(
        "AET-02", "zero branches on tenant, pack or industry identity", f02,
        note="recording provenance (source_pack_key, tenant_id) is not branching and is excluded"))

    f03, ambiguous = aet_03(models)
    results.append(report(
        "AET-03", "zero foreign keys crossing a capability boundary", f03))
    if ambiguous:
        print("      ! entities claimed by more than one capability:")
        for a in ambiguous:
            print(f"        {a['entity']}: {', '.join(a['claimed_by'])}")

    missing, non_answers, unprovided, forbidden, fatal = aet_05(models)
    f05 = ([{**m, "problem": "no unbound_behaviour"} for m in missing]
           + [{**n, "problem": "unbound_behaviour is a non-answer"} for n in non_answers])
    results.append(report(
        "AET-05", "every requires-port declares a survivable unbound behaviour", f05))
    if forbidden:
        print(f"      i {len(forbidden)} requires-port(s) declare FORBIDDEN when unbound. "
              f"These are deliberate hard dependencies, not degradations:")
        for x in sorted(forbidden, key=lambda r: (r["port"], r["capability"])):
            print(f"        {x['capability']} requires {x['port']}")
    if unprovided:
        print(f"      i {len(unprovided)} required port(s) have no provider in the library "
              f"and are not in the composition seed:")
        for x in unprovided:
            print(f"        {x['port']}  required by {', '.join(x['required_by'])}")
    if fatal:
        print(f"      i disabling a sole provider would breach a FORBIDDEN dependency in "
              f"{len(fatal)} case(s) — a pack publication constraint, not a runtime failure:")
        for x in fatal:
            print(f"        disable {x['disabled']} -> {x['consumer']} loses {x['port']}")

    obs = aet_06_observation(models)
    print(f"\nOBSERVE  AET-06  —  {len(obs)} policy knob(s) ship with no default and must be "
          f"answered per tenant.")
    print("      The composition model marks the AET-06 threshold VALIDATION_REQUIRED, "
          "so no pass/fail is asserted.")
    if VERBOSE:
        for o in obs:
            print(f"        {o['capability']}.{o['knob']}")

    failed = [r for r in results if not r]
    print(f"\n{len(results) - len(failed)}/{len(results)} implemented tests passed.")
    sys.exit(1 if failed else 0)


if __name__ == "__main__":
    main()
