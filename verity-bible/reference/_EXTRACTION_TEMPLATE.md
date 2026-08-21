# EXTRACTION TEMPLATE
# Every reference produces exactly these four files + this manifest.
# No file is considered complete unless it contains repository-derived evidence
# with source citations. Writing from memory is a disqualifying defect.

## MANIFEST.md (required in every reference folder)

```
Reference: <name>
Repository: <url>
Commit/Tag: <hash or tag — must be pinned, not "latest">
Clone path: <local path if cloned>
Tier: A / B / C
Date inspected: <ISO date>
Files inspected: <list>
Docs inspected: <list>
Tests inspected: <list>
Confidence: HIGH / MEDIUM / LOW
Extraction complete: YES / NO
```

---

## 1. concept-inventory.md

Template per concept:

```
### <ConceptName>

Source evidence: <file:line or doc section>
Definition: <what it is, in repository's own terms>
Purpose: <what problem it solves>
Key fields/attributes: <list with types if visible>
Relationships: <links to other concepts>
Lifecycle states: <if applicable>
Notes for Verity: <brief — full analysis goes in verity-implications.md>
```

---

## 2. behavior-inventory.md

Template per workflow/action/rule:

```
### <WorkflowName>

Source evidence: <file:line>
Trigger: <what starts this>
Preconditions: <what must be true>
Steps: <ordered list>
State changes: <before → after>
Side effects: <events, emails, records>
Failure handling: <what happens on error>
Notes for Verity:
```

---

## 3. architectural-patterns.md

Template per pattern:

```
### <PatternName>

Source evidence: <file or doc>
Pattern: <what it is>
Problem solved: <why it exists>
Implementation sketch: <how the repo does it>
Trade-offs: <what it costs>
Applicability to Verity: HIGH / MEDIUM / LOW / NONE
```

---

## 4. verity-implications.md

For each concept or pattern from the reference:

```
### <Item>

Confidence: <based on source evidence quality>
Recommendation: ADOPT / ADAPT / REJECT / INVESTIGATE
Rationale: <why>
If ADOPT: <what exactly>
If ADAPT: <what changes>
If REJECT: <why not>
If INVESTIGATE: <open question>
Affects Bible sections: <volume + section>
```

---

## RULES FOR AGENTS

1. Every claim must cite a source file, line range, or doc section.
2. Do not paraphrase README overviews as concept definitions.
3. Do not invent behavior not present in the source.
4. If a concept is absent from the repo, state: "NOT FOUND IN SOURCE — inferred from docs."
5. Confidence = HIGH only if backed by source code. MEDIUM if docs only. LOW if inferred.
6. The manifest commit hash must match the actual cloned state.
7. Mark the extraction COMPLETE only when all four files have repository-derived content.
