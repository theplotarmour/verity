---
doc_id: CONTRA
title: Contradiction and unresolved-decision register (generated)
generated: true
source_model: all models
regenerate_with: python3 _tools/generate.py
---

# Contradiction and unresolved-decision register (generated)

*Generated. Edit `all models`, not this file.*

**Total: 7**

| Kind | ID | Detail | Blocks |
|---|---|---|---|
| unresolved_kernel_decision | `DEC-K-001` | Is the Entity set per tenant fixed at composition time, or may a tenant add entities at runtime (true Studio-style no-code)? | `K01`, `K02`, `K03`, `generator design`, `DDL strategy` |
| unresolved_kernel_decision | `DEC-K-002` | Does a Port bind at pack install time (static) or may it rebind at runtime as modules are enabled and disabled? | `K13`, `K09` |
| unresolved_kernel_decision | `DEC-K-011` | Given Frappe explicitly does not support reverse schema migrations, what is Verity's rollback story for a failed tenant upgrade? | `K15`, `deployment model`, `custom module lifecycle` |
| unresolved_composition_decision | `DEC-C-001` | Does a tenant track its System Template after instantiation, or is the template a one-time snapshot? | — |
| unresolved_composition_decision | `DEC-C-002` | When two installed packs bind the same port to different providers, is the resolution operator-chosen at install, or is co-existence supported (multiple providers, routed by rule)? | `pack publication rules`, `K13` |
| unresolved_composition_decision | `DEC-C-003` | Can a tenant hold two versions of the same capability simultaneously (e.g. per site during rollout)? | — |
| unresolved_composition_decision | `DEC-C-004` | Is the terminology map per tenant, per pack, or per role? A guard, a client contact and an owner may legitimately call the same record different things. | — |
