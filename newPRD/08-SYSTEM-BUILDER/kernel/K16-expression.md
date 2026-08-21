---
doc_id: KERNEL-K16
title: Kernel construct K16 — Expression
generated: true
source_model: _model/_kernel.yaml
regenerate_with: python3 _tools/generate.py
---

# Kernel construct K16 — Expression

*Generated. Edit `_model/_kernel.yaml`, not this file.*

**Definition.** The single, sandboxed, side-effect-free language in which guards, validations, derivations, policies and audience selectors are written.

## Why this construct exists

Platforms that allow arbitrary server-side scripting for configuration acquire an upgrade problem and a security problem simultaneously. A closed expression language is inspectable, statically analysable, and safe to run inside a tenant.


## Required attributes

- **name**: grammar
- **name**: available_context; **note**: subject, principal, tenant config, now, related entities reachable via declared relationships ONLY
- **name**: determinism; **note**: an expression must return the same result for the same inputs; no network, no randomness, no wall-clock beyond an injected now
- **name**: complexity_bound; **note**: static cost ceiling, rejected at save time rather than timing out at runtime
- **name**: null_semantics; **note**: MANDATORY and explicit. Three-valued logic. An expression that is neither true nor false must not silently be treated as false.

## Invariants

- Expressions may not perform writes. Anything that writes is an Action.
- Expressions may not traverse relationships that the evaluating principal cannot traverse, or configuration becomes a data-exfiltration channel.

