# Taskplans status index

Classification of every file in `taskplans/`, generated 2026-09-02 against
current `git log`, `src/`, `prisma/schema.prisma`, and each file's own
closing/status section. No existing file was moved, renamed, or edited —
this is a pointer, not a reorganization. Numbers 61–63 do not exist (gap in
the original sequence).

Re-derive this index (don't trust it blindly) if it's more than a few weeks
stale — re-run against current `git log` and `src/`.

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

## Pending

All twelve are new (added 2026-09-02) — ERPClaw-derived future capability
candidates, deliberately not started. See each file's own "Status" section
for its specific trigger condition.

| File | Reason pending |
|---|---|
| 72_erpclaw_capability_accounting.md | future capability — trigger: second client needing real books beyond plywood's ledger |
| 73_erpclaw_capability_inventory.md | future capability — trigger: second stock-heavy client after plywood |
| 74_erpclaw_capability_selling.md | future capability — trigger: second client needing generic customer-to-cash |
| 75_erpclaw_capability_buying.md | future capability — trigger: second client needing generic procure-to-pay |
| 76_erpclaw_capability_payments.md | future capability — requirements usable now as a plywood finance.ts review checklist |
| 77_erpclaw_capability_billing.md | future capability — trigger: a metered/subscription client |
| 78_erpclaw_capability_hr.md | future capability — trigger: a client needing employee lifecycle beyond Resource |
| 79_erpclaw_capability_payroll.md | future capability — trigger: a concrete Indian payroll client; needs statutory rewrite first |
| 80_erpclaw_capability_advanced_accounting.md | future capability — trigger: enterprise consolidation/lease-accounting demand |
| 81_erpclaw_ai_operating_rules.md | cross-cutting rules — trigger: an assistant/command layer gets built. Amended 2026-09-03 (rules 8–14, folded in from the full ERPClaw corpus and the user's own synthesis) |
| 82_erpclaw_client_capability_builder_skill.md | tooling — trigger: the next real client-capability build, per its own Phase 2 rollout. Amended 2026-09-03 (sharper anti-patterns, business-invariant/idempotency/config-ownership/lifecycle-first rules) |
| 83_erpclaw_vertical_module_registry.md | reference table — not a build plan for any row |
| 84_verity_ai_agent_system.md | ADR-017 accepted 2026-09-03 (`CLAUDE.md`) — six areas now buildable per Task 96 Phase 3, not yet started |
| 85_foundation_conformance_acceptance_script.md | genuinely new gap — added 2026-09-03; trigger: next capability or plywood retrofit |
| 86_dashboard_and_panel_state_model.md | genuinely new gap — added 2026-09-03; trigger: next Overview page work, or Task 90 |
| 87_import_export_migration_framework.md | genuinely new gap — added 2026-09-03; trigger: first real external-data client onboarding |
| 88_reconciliation_as_a_platform_pattern.md | genuinely new gap — added 2026-09-03; trigger: second reconciliation instance (likely bank statements, Task 87) |
| 89_period_locking_as_a_platform_pattern.md | genuinely new gap — added 2026-09-03; trigger: payroll (Task 79) or a second finance-heavy client |
| 90_attention_platform_concept.md | **requires ADR** if generalized — added 2026-09-03; trigger: two capabilities independently wanting it |
| 91_bulk_operations_and_partial_failure.md | genuinely new gap — added 2026-09-03; trigger: Task 84 or Task 87, whichever starts first |
| 92_business_timeline_view.md | check Task 38's actual output first — added 2026-09-03; may be presentation-layer only |
| 93_progressive_setup_capability_readiness.md | genuinely new gap — added 2026-09-03; trigger: next real tenant onboarding, build one concrete instance before generalizing |
| 94_incomplete_information_states.md | genuinely new gap — added 2026-09-03 (2nd round); trigger: a capability field that genuinely needs Unknown/Missing/Pending distinct from empty |
| 95_verity_ai_long_term_vision.md | aspirational, not a build plan — added 2026-09-03 (2nd round); subordinate to Task 84's ADR gate; phase 6 needs its own future ADR |
| 96_pending_roadmap_phases.md | sequencing doc for Tasks 72–95 — added 2026-09-03; does not itself authorize starting any phase |
| 97_deep_codebase_cleanup.md | investigation-backed cleanup plan — added 2026-09-03; src/ is clean, findings are root-level docs/config only, nothing executed |
