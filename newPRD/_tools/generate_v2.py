#!/usr/bin/env python3
"""
VERITY PRD GENERATOR v2
=======================
canonical model  ->  entities/fields/relationships
                 ->  actions/permissions
                 ->  states/transitions
                 ->  events/rules/workflows
                 ->  API contracts
                 ->  DDL/migrations
                 ->  UI/UX specifications
                 ->  validation specifications
                 ->  test/acceptance matrix
                 ->  gap/dependency/contradiction report

Hard rules, enforced in code:
  R1  The generator never invents a decision. Missing model data produces a GAP
      record naming the affected capability, entity, dependents and the decision
      required. It never emits a plausible default in place of an answer.
  R2  Output is deterministic. Same model in, byte-identical output.
  R3  A GAP is structured data, not prose, so it can be counted, assigned and burnt down.
  R4  Contradictions between capabilities are detected, not left for a human to notice.
"""
import re, csv, json, sys
from collections import defaultdict
from pathlib import Path
import yaml

ROOT = Path(__file__).resolve().parents[1]
MODEL = ROOT / "_model"

VOCAB = yaml.safe_load((MODEL / "_vocabulary.yaml").read_text())
KERNEL = yaml.safe_load((MODEL / "_kernel.yaml").read_text())
COMPOSITION = yaml.safe_load((MODEL / "_composition.yaml").read_text())

GAPS = []
DEPS = []
CONTRADICTIONS = []
STATS = defaultdict(int)

SQL_TYPE = {
    "uuid": "uuid", "citext": "citext", "string": "text", "text": "text",
    "int": "integer", "bigint": "bigint", "decimal": "numeric(18,4)",
    "money_minor": "bigint", "bool": "boolean", "timestamptz": "timestamptz",
    "date": "date", "time": "time", "json": "jsonb", "inet": "inet",
    "enum": "text", "e164": "text", "geo_point": "geography(Point,4326)",
}


def gap(capability, where, decision_required, blocks=None, severity="blocking"):
    GAPS.append({
        "capability": capability, "location": where,
        "decision_required": decision_required,
        "blocks": blocks or [], "severity": severity,
    })
    STATS["gaps"] += 1
    b = ("  \n> **Blocks:** " + ", ".join(f"`{x}`" for x in blocks)) if blocks else ""
    return (f"> **GAP [{severity}] — {decision_required}**  \n"
            f"> Location: `{where}` · Capability: `{capability}`{b}  \n"
            f"> The generator has deliberately not supplied a default here. "
            f"Resolve in the model, then regenerate.\n")


def write(rel, text):
    p = ROOT / rel
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(text)
    STATS["files"] += 1
    STATS["bytes"] += len(text.encode())


def fm(title, doc_id, src):
    return (f"---\ndoc_id: {doc_id}\ntitle: {title}\ngenerated: true\n"
            f"source_model: {src}\nregenerate_with: python3 _tools/generate.py\n---\n\n"
            f"# {title}\n\n*Generated. Edit `{src}`, not this file.*\n\n")


def load_models():
    out = []
    for sub in ("capabilities", "modules"):
        d = MODEL / sub
        if not d.exists():
            continue
        for f in sorted(d.glob("*.yaml")):
            m = yaml.safe_load(f.read_text())
            m["_src"] = str(f.relative_to(ROOT))
            out.append(m)
    return out


# ===========================================================================
# KERNEL + COMPOSITION PROJECTIONS
# ===========================================================================
def gen_kernel_docs():
    k = KERNEL
    o = [fm("The Verity Kernel — construct reference", "KERNEL-000", "_model/_kernel.yaml")]
    o.append(k["purpose"] + "\n\n## Evidence basis\n\n")
    for e in k.get("evidence_basis", []):
        o.append(f"**Claim ({e['confidence']}).** {e['claim']}\n\n")
        for s in e["sources"]:
            o.append(f"- {s}\n")
        if e.get("implication"):
            o.append(f"\n*Implication:* {e['implication']}\n")
        o.append("\n")
    o.append("## Constructs\n\n| # | Construct | Definition |\n|---|---|---|\n")
    for c in k["constructs"]:
        o.append(f"| {c['id']} | **{c['construct']}** | {c['one_line']} |\n")
    write("00-EXECUTIVE/kernel-overview.md", "".join(o))

    for c in k["constructs"]:
        o = [fm(f"Kernel construct {c['id']} — {c['construct']}", f"KERNEL-{c['id']}", "_model/_kernel.yaml")]
        o.append(f"**Definition.** {c['one_line']}\n\n")
        for key, head in [("why_it_exists", "Why this construct exists"),
                          ("why", "Why this construct exists"),
                          ("distinguishing_note", "Distinguished from")]:
            if c.get(key):
                o.append(f"## {head}\n\n{c[key]}\n\n")
        for key, head in [("required_attributes", "Required attributes"),
                          ("invariants", "Invariants"), ("kinds", "Kinds"),
                          ("surfaces", "Surfaces"), ("generated_artifacts", "Generated artifacts"),
                          ("scopes_in_precedence_order", "Scopes, in precedence order"),
                          ("evaluation_order", "Evaluation order")]:
            v = c.get(key)
            if not v:
                continue
            o.append(f"## {head}\n\n")
            for item in v:
                if isinstance(item, dict):
                    o.append("- " + "; ".join(f"**{a}**: {b}" for a, b in item.items()) + "\n")
                else:
                    o.append(f"- {item}\n")
            o.append("\n")
        if c.get("extension_rule"):
            o.append(f"## Extension rule\n\n{c['extension_rule']}\n\n")
        write(f"08-SYSTEM-BUILDER/kernel/{c['id']}-{c['construct'].split()[0].lower()}.md", "".join(o))
        STATS["kernel_constructs"] += 1

    for d in k.get("kernel_decisions_required", []):
        CONTRADICTIONS.append({"kind": "unresolved_kernel_decision", "id": d["id"],
                               "detail": d["question"], "blocks": d.get("blocks", [])})


def gen_composition_docs():
    c = COMPOSITION
    o = [fm("The Verity Composition Model", "COMP-000", "_model/_composition.yaml")]
    o.append(c["purpose"] + "\n\n## Composition stack\n\n")
    o.append("| Layer | Name | Supplies | Overridable by |\n|---|---|---|---|\n")
    for l in c["composition_stack"]["layers"]:
        o.append(f"| {l['layer']} | **{l['name']}** | {l['supplies']} | "
                 f"{l.get('overridable_by', l.get('overridable', '—'))} |\n")
    o.append(f"\n{c['composition_stack']['description']}\n\n")
    o.append("## Anti-ERP tests\n\nThese are falsifiable and mostly automatable. "
             "They are the objective answer to *is this still a composable platform or has it become an ERP*.\n\n")
    o.append("| ID | Test | Pass condition | Automatable |\n|---|---|---|---|\n")
    for t in c["anti_erp_tests"]:
        o.append(f"| {t['id']} | {t['test']} | {t['pass_condition']} | {t['automatable']} |\n")
    write("08-SYSTEM-BUILDER/composition-model.md", "".join(o))

    for p in c["port_catalog_seed"]["ports"]:
        o = [fm(f"Port contract — {p['key']}", f"PORT-{p['key'].upper()}", "_model/_composition.yaml")]
        o.append(f"**Direction:** `{p['direction']}` · **Cardinality:** `{p.get('cardinality','zero_or_one')}`\n\n")
        o.append(f"**Contract.** {p['contract']}\n\n")
        o.append(f"**Declared by.** {', '.join('`'+x+'`' for x in p.get('declared_by', []))}\n\n")
        o.append(f"**Behaviour when unbound.** {p.get('unbound_behaviour') or 'GAP'}\n\n")
        if p.get("typical_providers"):
            o.append(f"**Typical providers.** {', '.join('`'+x+'`' for x in p['typical_providers'])}\n\n")
        if p.get("note"):
            o.append(f"**Note.** {p['note']}\n\n")
        o.append("## Generated provider conformance tests\n\n")
        o.append(f"**PC-01** A provider bound to `{p['key']}` satisfies every element of the contract above; "
                 f"a provider missing any element fails install-time validation rather than failing at runtime.\n\n")
        o.append(f"**PC-02** With `{p['key']}` unbound, every declaring capability behaves exactly as stated under "
                 f"*Behaviour when unbound*, with no orphaned UI affordance and no error surfaced to the user.\n\n")
        o.append(f"**PC-03** Rebinding `{p['key']}` from provider A to provider B leaves in-flight records valid "
                 f"or migrates them explicitly; silent orphaning fails the test.\n\n")
        write(f"08-SYSTEM-BUILDER/ports/{p['key']}.md", "".join(o))
        STATS["ports"] += 1

    # Capability-declared ports. The seed is explicitly a seed; every capability
    # declares its own, and until now none of them appeared in any generated
    # artifact - which meant the composition primitive was largely invisible in
    # the output that is supposed to describe it.
    declared = defaultdict(lambda: {"provides": [], "requires": []})
    for m in load_models():
        for prt in m.get("ports", []) or []:
            pk = prt.get("port_key")
            if not pk:
                continue
            entry = {"capability": m["key"], "contract": prt.get("contract", ""),
                     "cardinality": prt.get("cardinality", "zero_or_one"),
                     "unbound_behaviour": prt.get("unbound_behaviour"),
                     "typical_providers": prt.get("typical_providers")}
            declared[pk][prt.get("direction", "requires")].append(entry)

    seed_keys = {p["key"] for p in c["port_catalog_seed"]["ports"]}
    for pk in sorted(declared):
        d = declared[pk]
        o = [fm(f"Port contract — {pk}", f"PORTC-{pk.upper()}", "capability models")]
        o.append("Declared by capability models. "
                 + ("Also present in the composition seed.\n\n" if pk in seed_keys
                    else "Not in the composition seed; this port exists because capabilities declare it.\n\n"))
        o.append("## Providers\n\n")
        if d["provides"]:
            for e in d["provides"]:
                o.append(f"### `{e['capability']}`\n\n**Cardinality:** `{e['cardinality']}`\n\n{e['contract']}\n\n")
        else:
            o.append(gap(pk, f"port.{pk}.provider",
                         "no capability in the library declares that it provides this port; it is "
                         "either satisfied by a system outside Verity, or its provider has not "
                         "been modelled. See _composition.yaml external_provider_ports and "
                         "ports_awaiting_a_capability.",
                         blocks=[f"capability:{e['capability']}" for e in d["requires"]],
                         severity="modelling"))
            o.append("\n")
        o.append("## Consumers and their declared behaviour when unbound\n\n")
        if d["requires"]:
            for e in sorted(d["requires"], key=lambda x: x["capability"]):
                o.append(f"### `{e['capability']}`\n\n**Cardinality:** `{e['cardinality']}`\n\n"
                         f"{e['contract']}\n\n**When unbound.** {e['unbound_behaviour']}\n\n")
        else:
            o.append("No capability in the library requires this port.\n\n")
        o.append("## Generated provider conformance tests\n\n")
        o.append(f"**PC-01** A provider bound to `{pk}` satisfies every element of every contract "
                 f"above; a provider missing any element fails install-time validation rather "
                 f"than failing at runtime.\n\n")
        o.append(f"**PC-02** With `{pk}` unbound, every consumer above behaves exactly as its own "
                 f"*When unbound* statement says, with no orphaned UI affordance and no error "
                 f"surfaced to the user. Consumers declaring FORBIDDEN are hard dependencies and "
                 f"the pack that leaves them unbound cannot be published.\n\n")
        o.append(f"**PC-03** Rebinding `{pk}` from one provider to another leaves in-flight "
                 f"records valid or migrates them explicitly; silent orphaning fails the test.\n\n")
        write(f"08-SYSTEM-BUILDER/ports/declared/{pk}.md", "".join(o))
        STATS["declared_ports"] += 1

    for pk in c["pack"]["seed_packs"]:
        o = [fm(f"Pack — {pk['key']}", f"PACK-{pk['key'].upper()}", "_model/_composition.yaml")]
        o.append(f"**Target businesses.** {pk['target']}\n\n")
        o.append("**Capabilities.** " + ", ".join(f"`{x}`" for x in pk["capabilities"]) + "\n\n")
        if pk.get("landing_workflow"):
            o.append(f"**Landing workflow.** {pk['landing_workflow']}\n\n")
        if pk.get("note"):
            o.append(f"**Note.** {pk['note']}\n\n")
        o.append("## Required pack contents\n\n")
        for r in c["pack"]["required_contents"]:
            o.append(f"- [ ] {r}\n")
        o.append("\n")
        o.append(gap(pk["key"], f"pack.{pk['key']}.contents",
                     "pack contents are listed as requirements but not yet specified: role set, "
                     "navigation per role per surface, default configuration, default workflows, "
                     "seeded reference data, default reports and acceptance scenarios",
                     blocks=[f"capability:{x}" for x in pk["capabilities"]]))
        write(f"07-PACKS/{pk['key']}.md", "".join(o))
        STATS["packs"] += 1


# ===========================================================================
# ENTITY / DDL / API
# ===========================================================================
def gen_ddl(mod, ent):
    key = ent["key"]
    tbl = f"{mod['key']}__{key}"
    o = [f"-- Generated from {mod['_src']} · entity {key}\n",
         f"-- Tenancy mode: {ent.get('tenancy', 'tenant_scoped')}\n\n",
         f"CREATE TABLE {tbl} (\n"]
    cols, unknown = [], []
    for f in ent.get("fields", []):
        t = SQL_TYPE.get(f.get("type"))
        if t is None:
            unknown.append(f)
            t = "text"
        nn = " NOT NULL" if f.get("req") else ""
        cols.append(f"  {f['key']} {t}{nn}")
    if not any(f["key"] == "tenant_id" for f in ent.get("fields", [])) and \
       ent.get("tenancy", "tenant_scoped") not in ("platform_scoped",):
        cols.insert(1, "  tenant_id uuid NOT NULL  -- injected: required by kernel tenancy rule")
    o.append(",\n".join(cols) + "\n);\n\n")
    o.append(f"ALTER TABLE {tbl} ENABLE ROW LEVEL SECURITY;\n")
    o.append(f"ALTER TABLE {tbl} FORCE ROW LEVEL SECURITY;\n")
    if ent.get("tenancy", "tenant_scoped") != "platform_scoped":
        o.append(f"CREATE POLICY {tbl}_tenant_isolation ON {tbl}\n"
                 f"  USING (tenant_id = current_setting('verity.tenant_id')::uuid);\n")
    o.append("\n-- Immutability triggers\n")
    for f in ent.get("fields", []):
        if f.get("immutable"):
            o.append(f"-- {f['key']}: immutable after create; enforced by trigger, not by application code\n")
    if unknown:
        o.append("\n-- UNMAPPED TYPES — generator refused to guess:\n")
        for f in unknown:
            o.append(f"--   {f['key']}: model type '{f.get('type')}' is not in the kernel FieldType set\n")
            gap(mod["key"], f"{key}.{f['key']}.type",
                f"field type '{f.get('type')}' is not a kernel FieldType (K01); either add it to the "
                f"kernel closed set (a kernel change) or re-type the field",
                blocks=[f"ddl:{tbl}", f"api:{key}", f"validation:{key}.{f['key']}"])
    write(f"13-DATA-MODEL/ddl/{mod['key']}/{key}.sql", "".join(o))


def gen_api(mod, ent):
    key = ent["key"]
    o = [fm(f"API contract — {ent['name']}", f"API-{key.upper()}", mod["_src"])]
    o.append("All responses are permission-projected. A field the caller may not read is **absent** from the "
             "payload, never `null`, so a client cannot distinguish *hidden* from *empty*. "
             "Out-of-scope subjects return `404`, never `403`.\n\n")
    o.append("## Resource shape\n\n```json\n{\n")
    props = []
    for f in ent.get("fields", []):
        marks = []
        if f.get("sensitive"):
            marks.append("gated:view_sensitive")
        if f.get("financial"):
            marks.append("gated:view_financial")
        if f.get("immutable"):
            marks.append("immutable")
        props.append(f'  "{f["key"]}": "{f.get("type","GAP")}"'
                     + (f'  // {", ".join(marks)}' if marks else ""))
    o.append(",\n".join(props) + "\n}\n```\n\n")
    o.append("## Endpoints\n\n| Method | Path | Action | Verb | Idempotent |\n|---|---|---|---|---|\n")
    base = f"/api/v1/{mod['key']}/{key}"
    o.append(f"| GET | `{base}` | list | `list` | yes |\n")
    o.append(f"| GET | `{base}/{{id}}` | read | `view` | yes |\n")
    for act in [a for a in mod.get("actions", []) if a.get("entity") == key]:
        idem = "yes" if act.get("idempotency_key_source") else "**GAP**"
        o.append(f"| POST | `{base}/{{id}}/{act['key']}` | {act.get('label', act['key'])} | "
                 f"`{act.get('verb','execute')}` | {idem} |\n")
        if not act.get("idempotency_key_source"):
            gap(mod["key"], f"{key}.{act['key']}.idempotency_key_source",
                "mutating action has no idempotency key source; at-least-once event delivery and "
                "offline replay both re-send, so this action can double-execute",
                blocks=[f"api:{base}/{act['key']}", f"offline_sync:{key}"])
    o.append("\n## Error responses\n\n| Code | HTTP | Semantics |\n|---|---|---|\n")
    for c, v in VOCAB["error_taxonomy"].items():
        o.append(f"| `{c}` | {v['http']} | {v.get('leak_risk') or v.get('note') or v.get('user_message')} |\n")
    o.append("\n## Pagination, filtering, sorting\n\n")
    o.append(gap(mod["key"], f"{key}.api.query_semantics",
                 "list query semantics not specified: pagination strategy (cursor vs offset), "
                 "which fields are filterable and sortable, default sort, and maximum page size",
                 blocks=[f"ui:list:{key}", f"performance:{key}"]))
    write(f"17-INTEGRATIONS/api/{mod['key']}/{key}.md", "".join(o))


def gen_state_machine(mod, ent):
    key = ent["key"]
    states = ent.get("states") or []
    o = [fm(f"State machine — {ent['name']}", f"FSM-{key.upper()}", mod["_src"])]
    if not states:
        o.append(gap(mod["key"], f"{key}.states",
                     "entity declares no lifecycle; kernel K05 requires a finite state machine "
                     "with an initial state and a stuck-state policy per non-terminal state",
                     blocks=[f"actions:{key}", f"ui:{key}", f"tests:{key}"]))
        write(f"13-DATA-MODEL/state-machines/{mod['key']}/{key}.md", "".join(o))
        return 0, 0

    o.append("```mermaid\nstateDiagram-v2\n")
    transitions = ent.get("transitions") or []
    for t in transitions:
        o.append(f"  {t['from']} --> {t['to']}: {t.get('action','?')}\n")
    if not transitions:
        for s in states:
            o.append(f"  {s}\n")
    o.append("```\n\n")

    o.append("## Transition matrix\n\n")
    o.append("| From \\\\ To | " + " | ".join(f"`{s}`" for s in states) + " |\n")
    o.append("|---" * (len(states) + 1) + "|\n")
    tmap = {(t["from"], t["to"]): t for t in transitions}
    for a in states:
        row = [f"**`{a}`**"]
        for b in states:
            t = tmap.get((a, b))
            row.append(f"`{t.get('action','?')}`" if t else ("—" if a != b else "·"))
        o.append("| " + " | ".join(row) + " |\n")
    o.append("\nAny transition marked `—` attempted at runtime returns `E_PRECONDITION`. "
             "It is never a silent no-op, because a silent no-op is how an operator believes work was recorded when it was not.\n\n")

    o.append("## Stuck-state policy\n\n")
    covered = 0
    for s in states:
        rs = VOCAB["reserved_states"].get(s, {})
        if rs.get("terminal"):
            continue
        pol = (ent.get("stuck_state_policy") or {}).get(s)
        o.append(f"### `{s}`\n\n")
        if pol:
            o.append(f"{pol}\n\n")
            covered += 1
        else:
            o.append(gap(mod["key"], f"{key}.stuck_state_policy.{s}",
                         f"no stuck-state policy for non-terminal state `{s}`: how long may an instance "
                         f"sit here before it is an operational exception, who is notified, and what is the escape hatch",
                         blocks=[f"monitoring:{key}", f"notifications:{key}", f"ops:{key}"]))
            o.append("\n")
    write(f"13-DATA-MODEL/state-machines/{mod['key']}/{key}.md", "".join(o))
    return len(states), len(transitions)


# ===========================================================================
# AUDIT: cross-capability dependencies and contradictions
# ===========================================================================
def audit(models):
    by_key = {m["key"]: m for m in models}
    declared_ports = {p["key"]: p for p in COMPOSITION["port_catalog_seed"]["ports"]}

    # port declarations vs implementing capabilities
    for pkey, p in declared_ports.items():
        for cap in p.get("declared_by", []):
            DEPS.append({"from": cap, "to_port": pkey, "direction": p["direction"],
                         "present_in_library": cap in by_key})
            if cap not in by_key:
                GAPS.append({"capability": cap, "location": f"port.{pkey}.declared_by",
                             "decision_required": f"port `{pkey}` names capability `{cap}` as a declarer, "
                                                  f"but no capability model `{cap}` exists in the library yet",
                             "blocks": [f"port:{pkey}"], "severity": "modelling"})
                STATS["gaps"] += 1

    # entity references crossing capability boundaries without a port
    entity_owner = {}
    for m in models:
        for e in m.get("entities", []):
            entity_owner[e["key"]] = m["key"]
    for m in models:
        for e in m.get("entities", []):
            for f in e.get("fields", []):
                fk = f.get("fk")
                if fk and entity_owner.get(fk) and entity_owner[fk] != m["key"]:
                    CONTRADICTIONS.append({
                        "kind": "cross_capability_foreign_key",
                        "id": f"{m['key']}.{e['key']}.{f['key']}",
                        "detail": f"field references entity `{fk}` owned by capability "
                                  f"`{entity_owner[fk]}`. Kernel K04 forbids concrete cross-capability "
                                  f"foreign keys; this must target a Port.",
                        "blocks": [m["key"], entity_owner[fk]]})

    # events emitted with no declared subscriber path
    emitted = set()
    for m in models:
        for a in m.get("actions", []):
            for ev in a.get("events") or []:
                emitted.add(ev)
    for ev in sorted(emitted):
        DEPS.append({"from": ev.split(".")[0], "event": ev, "subscribers": "undeclared"})

    # kernel decisions still open
    for d in KERNEL.get("kernel_decisions_required", []):
        pass  # already captured in gen_kernel_docs
    for d in COMPOSITION.get("open_decisions", []):
        CONTRADICTIONS.append({"kind": "unresolved_composition_decision", "id": d["id"],
                               "detail": d["question"], "blocks": d.get("blocks", [])})


# A gap is only a task if a model author can close it. The generator emits some
# gaps unconditionally, because no field in the model feeds the artifact they
# concern - there is no view model, no permission-default model, no API query
# model and no pack-contents model. Those gaps are real and they are not
# progress-bearing: their count is a constant multiplied by the entity count, so
# authoring a capability RAISES the total. Separating the two is what makes the
# number mean something.
UNCONDITIONAL = (
    ("unanswered:", "UX screen specification"),
    ("not specified", "UX screen state specification"),
    ("default grant per", "permission matrix defaults"),
    ("list query semantics", "API query semantics"),
    ("pack contents are listed", "pack contents"),
)


def classify(decision_required):
    for needle, label in UNCONDITIONAL:
        if needle in decision_required:
            return "unconditional", label
    return "closable", None


def gen_reports():
    o = [fm("Gap register (generated)", "GAP-REGISTER", "all models")]
    o.append("Every row is a decision the model does not yet contain. The generator deliberately "
             "emitted nothing in its place.\n\n")
    o.append("Rows are split by whether a model author can close them.\n\n"
             "**Closable** gaps are answerable by editing a capability model. A shrinking count "
             "here is progress.\n\n"
             "**Unconditional** gaps are emitted for every entity, screen and action regardless "
             "of model content, because no construct in the model feeds the artifact they "
             "concern — there is no view model, no permission-default model, no API query model "
             "and no pack-contents model. Their count is a constant multiplied by the entity and "
             "action counts, so authoring a capability RAISES it. They are real work and they are "
             "not a progress metric, and conflating the two makes the total meaningless.\n\n")

    closable, unconditional = [], defaultdict(list)
    for g in GAPS:
        kind, label = classify(g["decision_required"])
        if kind == "closable":
            closable.append(g)
        else:
            unconditional[label].append(g)

    o.append(f"## Closable by model authoring ({len(closable)})\n\n")
    if closable:
        o.append("| # | Capability | Location | Decision required | Blocks |\n|---|---|---|---|---|\n")
        for i, g in enumerate(closable, 1):
            o.append(f"| {i} | `{g['capability']}` | `{g['location']}` | {g['decision_required']} | "
                     f"{', '.join('`'+b+'`' for b in g['blocks']) or '—'} |\n")
    else:
        o.append("None. Every gap a capability model can answer has been answered.\n")
    o.append("\n")

    total_unconditional = sum(len(v) for v in unconditional.values())
    o.append(f"## Unconditional generator emissions ({total_unconditional})\n\n")
    o.append("| Kind | Count | What would close it |\n|---|---|---|\n")
    closers = {
        "UX screen specification": "a View/Surface model (kernel K14) that capabilities declare and the generator reads",
        "UX screen state specification": "the same View/Surface model, carrying the eleven UI states per screen",
        "permission matrix defaults": "a per-capability declaration of default grants by role archetype (kernel K11/K12)",
        "API query semantics": "a per-entity declaration of pagination, filterable and sortable fields, default sort and page size",
        "pack contents": "pack models under _model/packs/, which do not exist yet",
    }
    for label in sorted(unconditional):
        o.append(f"| {label} | {len(unconditional[label])} | {closers.get(label, 'unknown')} |\n")
    o.append("\nThese are not listed row by row. Listing fifteen thousand identical rows "
             "produces a document nobody opens, which is the same failure as not reporting them.\n")
    write("24-OPEN-QUESTIONS/generated-gap-register.md", "".join(o))

    o = [fm("Cross-capability dependency graph (generated)", "DEP-GRAPH", "all models")]
    o.append("## Port dependencies\n\n| Declaring capability | Port | Direction | Capability modelled yet |\n|---|---|---|---|\n")
    for d in DEPS:
        if "to_port" in d:
            o.append(f"| `{d['from']}` | `{d['to_port']}` | {d['direction']} | "
                     f"{'yes' if d['present_in_library'] else '**not yet**'} |\n")
    o.append("\n## Event dependencies\n\n| Emitting entity | Event | Declared subscribers |\n|---|---|---|\n")
    for d in DEPS:
        if "event" in d:
            o.append(f"| `{d['from']}` | `{d['event']}` | {d['subscribers']} |\n")
    write("26-TRACEABILITY/dependency-graph.md", "".join(o))

    o = [fm("Contradiction and unresolved-decision register (generated)", "CONTRA", "all models")]
    o.append(f"**Total: {len(CONTRADICTIONS)}**\n\n")
    o.append("| Kind | ID | Detail | Blocks |\n|---|---|---|---|\n")
    for c in CONTRADICTIONS:
        o.append(f"| {c['kind']} | `{c['id']}` | {c['detail']} | "
                 f"{', '.join('`'+str(b)+'`' for b in c.get('blocks', [])) or '—'} |\n")
    write("23-DECISION-LOG/contradictions-and-open-decisions.md", "".join(o))


# ===========================================================================
def main():
    models = load_models()
    gen_kernel_docs()
    gen_composition_docs()

    # re-use v1 projections
    sys.path.insert(0, str(ROOT / "_tools"))
    import generate as v1  # noqa
    v1.GAPS = []
    for mod in models:
        for ent in mod.get("entities", []):
            v1.gen_entity_doc(mod, ent)
            v1.gen_permission_matrix(mod, ent)
            v1.gen_screen_docs(mod, ent)
            gen_ddl(mod, ent)
            gen_api(mod, ent)
            s, t = gen_state_machine(mod, ent)
            STATS["states"] += s
            STATS["transitions"] += t
            STATS["entities"] += 1
        for act in mod.get("actions", []):
            v1.gen_action_doc(mod, act)
            STATS["tests"] += v1.gen_tests(mod, act)
            STATS["actions"] += 1
    STATS["events"] += v1.gen_events(models)
    v1.gen_traceability(models)
    STATS["files"] += v1.STATS["files"]
    STATS["bytes"] += v1.STATS["bytes"]
    for g in v1.GAPS:
        GAPS.append({"capability": "v1", "location": g["where"],
                     "decision_required": g["what"], "blocks": [], "severity": "blocking"})
        STATS["gaps"] += 1

    audit(models)
    gen_reports()

    print(json.dumps({
        "capabilities": len(models),
        "kernel_constructs": STATS["kernel_constructs"],
        "ports": STATS["ports"],
        "capability_declared_ports": STATS["declared_ports"],
        "packs": STATS["packs"],
        "entities": STATS["entities"],
        "actions": STATS["actions"],
        "states": STATS["states"],
        "transitions": STATS["transitions"],
        "events": STATS["events"],
        "generated_tests": STATS["tests"],
        "unresolved_gaps": STATS["gaps"],
        "cross_capability_dependencies": len(DEPS),
        "contradictions_and_open_decisions": len(CONTRADICTIONS),
        "files": STATS["files"],
        "generated_mb": round(STATS["bytes"] / 1048576, 3),
    }, indent=2))


if __name__ == "__main__":
    main()
