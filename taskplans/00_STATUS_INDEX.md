# Taskplans status index

Classification of every file in `taskplans/`, regenerated 2026-09-04
(originally 2026-09-02) against current `git log`, `src/`,
`prisma/schema.prisma`, and each file's own closing/status section. No
existing file was moved, renamed, or edited — this is a pointer, not a
reorganization. Numbers 61–63 do not exist (gap in the original sequence).

Re-derive this index (don't trust it blindly) if it's more than a few weeks
stale — re-run against current `git log` and `src/`. `taskplans/101_
remaining_work_master_plan.md` sequences everything still open as of this
regeneration — read that instead of re-deriving triage from scratch.

## Done

| File | Evidence |
|---|---|
| 00_CLAUDE_CODE_HANDOFF.md | handoff doc for Phase 7; all listed research artifacts exist, its one flagged gap (Task 26) later shipped |
| 00_research_program_ledger.md | ledger's own checklist through Task 35, all files present |
| 01_rd_and_spec_upgrade_plan.md | plan executed — all 7 R&D audits (02–13) exist |
| 01_rd_clone_and_freeze.md | freeze manifest, static record, all 12 repos audited per ledger |
| 02_digit_works_audit.md | "Current Status: Complete" |
| 02_enterprise_rd_research_manifest.md | superseded by 01_rd_clone_and_freeze's 12-repo scope, itself fulfilled |
| 03_payload_audit.md | "Current Status: Complete" |
| 04_twenty_audit.md | "Current Status: Complete" |
| 05_erpnext_audit.md | "Current Status: Complete" |
| 06_plane_audit.md | "Current Status: Complete" |
| 07_keycloak_audit.md | "Current Status: Complete" |
| 08_temporal_audit.md | "Current Status: Complete" |
| 09_tooljet_audit.md | "Current Status: Complete" |
| 10_opensearch_audit.md | "Current Status: Complete" |
| 11_formbricks_audit.md | "Current Status: Complete" |
| 12_cal_diy_audit.md | "Current Status: Complete" |
| 13_seaweedfs_audit.md | "Current Status: Complete" |
| 14_capability_matrix.md | synthesis of the 12 completed audits, living reference cited elsewhere |
| 15_architecture_pattern_catalogue.md | synthesis doc, living reference |
| 16_cross_repo_comparison.md | synthesis doc, living reference |
| 17_verity_gap_analysis.md | ledger marks Completed; superseded content, kept as historical record |
| 17A_verity_architecture_decisions.md | ADR register, actively cited as Authority throughout CLAUDE.md |
| 17B_verity_architecture_scorecard.md | scorecard produced per ledger |
| 18_combined_verity_prd.md | cited as Active Canonical Document in CLAUDE.md Authority order |
| 19_verity_bible_v2.md | "STATUS: CANONICAL", primary cited authority repo-wide |
| 20_verity_spec_v2.md | "STATUS: CANONICAL", primary cited authority repo-wide |
| 21_implementation_roadmap_v2.md | roadmap produced per ledger (extended by 65_verity_roadmap_v3) |
| 22_spec_consistency_audit.md | cited in CLAUDE.md as "Active verification gates" |
| 23_portable_runtime_v2.md | ledger: Completed |
| 24_current_runtime_baseline.md | ledger: Completed |
| 25_postgres_portability.md | ledger: Completed |
| 26_runtime_configuration.md | commit `0bab3a0` "Task 26 — runtime configuration boundary" |
| 26A_v1_to_v2_authority_transition.md | ledger: Completed |
| 27_storage_abstraction.md | commit `3a5d0d2` "Task 27 — storage abstraction" |
| 28_auth_provider_abstraction.md | commit `c6d6258` "Task 28 — auth provider abstraction" |
| 29_background_job_abstraction.md | commit `6c98017` "Task 29 — background job abstraction" |
| 30_containerized_runtime.md | commit `b5e7c18` "Task 30 — containerized runtime" |
| 31_migration_and_bootstrap.md | commit `6b79428` "Task 31 — migration and bootstrap" |
| 32_health_readiness.md | commit `63976f1` "Task 32 — health and readiness checks" |
| 33_backup_restore_verification.md | commit `8fc3412` "Task 33 — backup and restore runbook, proven live" |
| 34_portable_runtime_acceptance.md | commit `e48e7b9`; caveat: 5/8 acceptance criteria live-passed, 2 blocked on Docker daemon |
| 35_phase7_closeout.md | "Status: COMPLETE" |
| 35A_phase8_execution_program.md | "Status: COMPLETE (2026-08-31)" |
| 36_enterprise_identity_oidc.md | "Status: COMPLETE — BUILT and PROVEN"; commit `fc7e5a4` (verified) |
| 37_enterprise_rbac_policy.md | "Status: COMPLETE — BUILT and PROVEN"; commit `4a9b57f` |
| 38_audit_business_history.md | "Status: COMPLETE — BUILT and PROVEN"; commit `8398ba9` |
| 39_integration_framework.md | "Status: COMPLETE — BUILT and PROVEN"; commit `18ec5c5` |
| 40_enterprise_observability.md | "Status: COMPLETE — BUILT and PROVEN"; commit `a45b317` |
| 41_s3_storage_implementation.md | "Status: COMPLETE — BUILT and PROVEN, including live"; commit `d6f16ac` |
| 42_deployment_hardening.md | "Status: COMPLETE — BUILT"; commit `84af572` (verified) |
| 43_docker_acceptance_rerun.md | "Status: COMPLETE — EXECUTED"; commit `9e71e42` |
| 44_enterprise_readiness_certification.md | "Status: COMPLETE — CERTIFIED WITH STATED LIMITATIONS"; commit `3911a21` |
| 45_plywood_workflow_program.md | program plan; every named next-step landed in Tasks 46–71 |
| 46_enterprise_codebase_audit.md | audit doc producing deploy-readiness verdicts, referenced by 46A–C |
| 46_plywood_integrity_foundation.md | commit `5d7a6ee` "Task 46 — integrity foundation (slice 1)" |
| 46A_api_inventory.md | commit `b10bdc7` "complete Task 46A and 46B" |
| 46B_sensitive_data_flow.md | commit `b10bdc7` (same) |
| 46C_findings_ledger.md | findings ledger opened and populated per `b10bdc7` |
| 47_nextjs_security_upgrade.md | typecheck/lint/test/build "clean" per file; caveat: Docker acceptance not re-run against 16.3.3 |
| 47_plywood_business_identity.md | commit `058711e` "Task 47 — business identity, navigation, Logistics removal" |
| 48_plywood_purchase_chain.md | commit `df6a0b0` "Task 48 — Goods Receipt document and three-way match" (verified) |
| 49_plywood_sales_chain.md | commit `d75d929` "Task 49 — Goods Issue document and invoice eligibility" |
| 50_plywood_returns_and_notes.md | commit `043ffb3` "Task 50 — returns and credit/debit notes" |
| 51_plywood_tax.md | commit `9095a09` "Task 51 — effective-dated tax rules and returns working" (verified) |
| 52_plywood_close_reports.md | commit `116df06` "Task 52 — period close and real reports" |
| 53_plywood_connected_experience.md | commit `f0e9459`, program plan executed by Tasks 54–60 |
| 54_plywood_party_workspaces.md | commit `9cc3022` "Task 54 — supplier and customer workspaces" |
| 55_plywood_inventory_drilldown.md | commit `c6eccf5` "Task 55 — product, godown and movement-ledger drill-down" (verified) |
| 56_plywood_order_lifecycle.md | commit `0558962` "Task 56 — purchase and sales order lifecycle screens" |
| 57_plywood_tax_centre.md | commit `89f4ed4` "Task 57 — the accountant's tax centre" |
| 58_plywood_people_and_roles.md | commit `0d0b265` "Task 58 — people and roles in business language" |
| 59_plywood_onboarding_notifications_audit.md | commit `c22c491` "Task 59 — onboarding, actionable notifications, readable audit" |
| 60_plywood_owner_overview.md | commit `0163b21` "Task 60 — the owner's overview" |
| 64_plywood_itc_reconciliation.md | commit `88ae5d7` "Task 64 — input credit reconciliation" |
| 65_verity_roadmap_v3.md | living roadmap reference, cited by Task 67 |
| 66_phase10a_security_remediation.md | remediation applied; only P3 items (CSP nonce, `/api/metrics`) left deliberately open |
| 67_enterprise_baseline_v1.md | baseline certification doc, references plywood as "worked precedent" |
| 68_plywood_usability_audit.md | audit doc with concrete findings (e.g. AUDIT-SO-1), consumed by Task 69 |
| 69_plywood_usability_remediation_plan.md | remediation executed; findings closed per Task 70's audit |
| 70_plywood_second_audit.md | second audit confirms fixes landed (Cancel works, Processing order visible, etc.) |
| 71_plywood_transaction_and_finance_overhaul.md | explicit "Delivered" table, all 11 numbered complaints resolved with file citations; commits `0445330` + `08e90be` (verified) |
| 72_erpclaw_capability_accounting.md | **BUILT 2026-09-04, MVP scope**, ahead of demand under explicit product-owner override; migrated and live (`3311175`); acceptance script written but not yet walked (`85`) |
| 73_erpclaw_capability_inventory.md | **BUILT 2026-09-04, MVP scope**, same override; migrated and live (`3311175`) |
| 77_erpclaw_capability_billing.md | **BUILT 2026-09-04, MVP scope**, same override; migrated and live (`3311175`) |
| 78_erpclaw_capability_hr.md | **BUILT 2026-09-04, MVP scope**, same override; migrated and live (`3311175`) |
| 82_erpclaw_client_capability_builder_skill.md | **BUILT 2026-09-04** — `.claude/skills/verity-client-capability-builder/SKILL.md` |
| 84_verity_ai_agent_system.md | **COMPLETE 2026-09-04** — all six areas built and unit-tested; areas 1/2/3/5 also live-verified 2026-09-03. Known MVP gaps recorded in the file itself (no streaming, grounding is entity-agnostic, no confirm UI so destructive commands always `needs_approval`) |
| 85_foundation_conformance_acceptance_script.md | **BUILT 2026-09-04** — template + two scripts (`implementation/13-conformance/`): plywood (walked, PASS), accounting (written, not yet walked) |
| 91_bulk_operations_and_partial_failure.md | **BUILT 2026-09-04** — `src/server/platform/batch.ts`, consumed by Task 84's agent loop; trigger (Task 84 landing first) fired same day it was written |
| 92_business_timeline_view.md | **PARTIALLY BUILT, confirmed 2026-09-04** — infrastructure (Task 38's `reconstructHistory`, `ActivityLog`) already existed; a real bug found and fixed (fact entries showed a raw event name). Coverage beyond purchase/sales orders still open |
| 94_incomplete_information_states.md | **MECHANISM DECIDED 2026-09-04** — `Select`-type companion status field, no new primitive; taught in Task 82's skill; no plywood retrofit performed (its own non-goal) |

## Pending

See `taskplans/101_remaining_work_master_plan.md` (2026-09-04) for the
current, sorted triage of everything below — buildable now vs. needs an
ADR vs. needs a real trigger vs. needs an explicit product-owner decision.
This table is the flat list; that file is the sequencing.

| File | Reason pending |
|---|---|
| 74_erpclaw_capability_selling.md | needs Tasks 72/73 *settled* (real use, not just built), per its own text — not merely "second client" anymore |
| 75_erpclaw_capability_buying.md | same — needs 72/73 settled, plus plywood's purchase-chain "stabilized enough to generalize from" |
| 76_erpclaw_capability_payments.md | needs Task 72 "fixed" per its own text; requirements usable now as a plywood finance.ts review checklist |
| 79_erpclaw_capability_payroll.md | no Indian statutory spec (PF/ESI/TDS/Form 16) exists to build against — real research needed first, not code |
| 80_erpclaw_capability_advanced_accounting.md | needs Task 72 settled + an enterprise consolidation/lease-accounting client; neither present |
| 81_erpclaw_ai_operating_rules.md | **trigger fired 2026-09-04** (Task 84's chat surface is the assistant/command layer this was written for) — 16 rules not yet audited against what actually shipped |
| 83_erpclaw_vertical_module_registry.md | reference table — not a build plan for any row |
| 86_dashboard_and_panel_state_model.md | zero-dependency, buildable now; blocks Task 90 |
| 87_import_export_migration_framework.md | trigger: first real external-data client onboarding — unfired |
| 88_reconciliation_as_a_platform_pattern.md | trigger: second reconciliation instance — unfired, most likely via Task 87 |
| 89_period_locking_as_a_platform_pattern.md | trigger: payroll (79) or a second finance-heavy client — unfired |
| 90_attention_platform_concept.md | **requires ADR** if generalized — check whether inventory's reorder-level check (built 2026-09-04) now counts as the second independent capability wanting this |
| 93_progressive_setup_capability_readiness.md | **requires ADR** if generalized — build plywood's own concrete instance first if picked up |
| 95_verity_ai_long_term_vision.md | aspirational, not a build plan; subordinate to Task 84 (now complete for near-term scope, but "proven" means real usage); phase 6 needs its own future ADR |
| 96_pending_roadmap_phases.md | sequencing doc for Tasks 72–95 — Phases 1/3/4 complete 2026-09-04, Phase 2 explicitly skipped, Phase 5 aspirational |
| 97_deep_codebase_cleanup.md | Finding 3 (stale ADR proposal doc) fixed 2026-09-04; Findings 1/6 (dead `.eslintrc.json`, local scratch files) still blocked on a permission the product owner has to grant directly, not this session |
| 98_liquid_glass_react_extraction.md | narrow candidate (glass-shell/overlay static dispersion) applied 2026-09-04; the sign-in-mark candidate explicitly rejected (ADR-012 monochrome-mark conflict) |
| 99_verity_custom_skills_plan.md | 8 candidates, none built; Skills 2/3 flagged buildable-now in Task 101 |
| 100_dashboard_intelligence_direction.md | two explicit decisions needed (metrics-history capability, shadcn adoption) before its full scope proceeds; the non-conflicting parts are buildable now |
| 101_remaining_work_master_plan.md | **NEW 2026-09-04** — sequencing doc for everything in this table; not itself a build |
