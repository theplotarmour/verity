---
doc_id: DEP-GRAPH
title: Cross-capability dependency graph (generated)
generated: true
source_model: all models
regenerate_with: python3 _tools/generate.py
---

# Cross-capability dependency graph (generated)

*Generated. Edit `all models`, not this file.*

## Port dependencies

| Declaring capability | Port | Direction | Capability modelled yet |
|---|---|---|---|
| `work_order` | `billable_outcome_sink` | requires | yes |
| `attendance_verification` | `billable_outcome_sink` | requires | yes |
| `booking` | `billable_outcome_sink` | requires | yes |
| `service_completion` | `billable_outcome_sink` | requires | **not yet** |
| `work_order` | `party_directory` | requires | yes |
| `booking` | `party_directory` | requires | yes |
| `helpdesk` | `party_directory` | requires | yes |
| `billing` | `party_directory` | requires | yes |
| `attendance_verification` | `party_directory` | requires | yes |
| `people` | `schedulable_resource` | provides | yes |
| `assets` | `schedulable_resource` | provides | yes |
| `spaces` | `schedulable_resource` | provides | **not yet** |
| `booking` | `schedulable_demand` | provides | yes |
| `work_order` | `schedulable_demand` | provides | yes |
| `shift_requirement` | `schedulable_demand` | provides | **not yet** |
| `production_order` | `schedulable_demand` | provides | **not yet** |
| `attendance_verification` | `evidence_capture` | requires | yes |
| `work_order` | `evidence_capture` | requires | yes |
| `quality_inspection` | `evidence_capture` | requires | **not yet** |
| `delivery` | `evidence_capture` | requires | **not yet** |
| `helpdesk` | `sla_clock` | requires | yes |
| `work_order` | `sla_clock` | requires | yes |
| `booking` | `sla_clock` | requires | yes |
| `procurement` | `approval_chain` | requires | yes |
| `finance` | `approval_chain` | requires | **not yet** |
| `people` | `approval_chain` | requires | yes |
| `work_order` | `approval_chain` | requires | yes |
| `work_order` | `stock_movement_sink` | requires | yes |
| `manufacturing` | `stock_movement_sink` | requires | **not yet** |
| `delivery` | `stock_movement_sink` | requires | **not yet** |
| `client_portal` | `customer_surface` | provides | **not yet** |
| `consumer_web` | `customer_surface` | provides | **not yet** |
| `whatsapp_conversational` | `customer_surface` | provides | **not yet** |
| `billing` | `financial_document_sink` | requires | yes |

## Event dependencies

| Emitting entity | Event | Declared subscribers |
|---|---|---|
| `absence` | `absence.recorded` | undeclared |
| `asset` | `asset.custody_transferred` | undeclared |
| `asset` | `asset.reading_implausible` | undeclared |
| `asset` | `asset.reading_recorded` | undeclared |
| `asset` | `asset.registered` | undeclared |
| `assignment` | `assignment.created` | undeclared |
| `assignment` | `assignment.published per assignment` | undeclared |
| `assignment` | `assignment.released` | undeclared |
| `attendance` | `attendance.claimed` | undeclared |
| `attendance` | `attendance.dispute_resolved` | undeclared |
| `attendance` | `attendance.evidence_recorded` | undeclared |
| `attendance` | `attendance.settled` | undeclared |
| `audit` | `audit.exported` | undeclared |
| `audit` | `audit.verification_completed` | undeclared |
| `audit` | `audit.verification_failed` | undeclared |
| `backfill` | `backfill.accepted` | undeclared |
| `backfill` | `backfill.candidates_ranked` | undeclared |
| `backfill` | `backfill.filled` | undeclared |
| `backfill` | `backfill.requested` | undeclared |
| `billing` | `billing.credit_note_issued` | undeclared |
| `billing` | `billing.invoice_issued` | undeclared |
| `billing` | `billing.outcome_rated` | undeclared |
| `billing` | `billing.outcome_unratable` | undeclared |
| `billing` | `billing.payment_allocated` | undeclared |
| `binding` | `binding.granted` | undeclared |
| `binding` | `binding.revoked` | undeclared |
| `booking` | `booking.cancelled` | undeclared |
| `booking` | `booking.confirmed` | undeclared |
| `booking` | `booking.held` | undeclared |
| `booking` | `booking.slot_released` | undeclared |
| `catalog_item` | `catalog_item.cost_changed` | undeclared |
| `catalog_item` | `catalog_item.published` | undeclared |
| `change_set` | `change_set.applied` | undeclared |
| `change_set` | `change_set.staged` | undeclared |
| `composition` | `composition.published` | undeclared |
| `config` | `config.changed` | undeclared |
| `config` | `config.changed per member` | undeclared |
| `delegation` | `delegation.created` | undeclared |
| `demand` | `demand.coverage_changed` | undeclared |
| `device` | `device.archived` | undeclared |
| `device` | `device.blocked` | undeclared |
| `device` | `device.trusted` | undeclared |
| `device` | `device.unblocked` | undeclared |
| `device` | `device.untrusted` | undeclared |
| `evidence` | `evidence.captured` | undeclared |
| `evidence` | `evidence.redacted` | undeclared |
| `evidence` | `evidence.uploaded` | undeclared |
| `goods_receipt` | `goods_receipt.recorded` | undeclared |
| `impersonation` | `impersonation.started` | undeclared |
| `integration` | `integration.credential_rotated` | undeclared |
| `integration` | `integration.dead_lettered` | undeclared |
| `integration` | `integration.delivered` | undeclared |
| `integration` | `integration.inbound_accepted` | undeclared |
| `integration` | `integration.inbound_rejected` | undeclared |
| `lease` | `lease.agreed` | undeclared |
| `lease` | `lease.escalation_applied` | undeclared |
| `lease` | `lease.recoverables_reconciled` | undeclared |
| `legal_hold` | `legal_hold.applied` | undeclared |
| `location` | `location.created` | undeclared |
| `location` | `location.moved` | undeclared |
| `member` | `member.became_unavailable` | undeclared |
| `membership` | `membership.accepted` | undeclared |
| `membership` | `membership.invited` | undeclared |
| `membership` | `membership.revoked` | undeclared |
| `mfa` | `mfa.verified` | undeclared |
| `notification` | `notification.audience_empty` | undeclared |
| `notification` | `notification.failed` | undeclared |
| `notification` | `notification.preference_changed` | undeclared |
| `notification` | `notification.requested` | undeclared |
| `notification` | `notification.sent` | undeclared |
| `order` | `order.split` | undeclared |
| `order_line` | `order_line.captured` | undeclared |
| `order_line` | `order_line.modified` | undeclared |
| `order_line` | `order_line.voided` | undeclared |
| `org_structure` | `org_structure.changed` | undeclared |
| `party` | `party.channels_consolidated` | undeclared |
| `party` | `party.consent_recorded` | undeclared |
| `party` | `party.created` | undeclared |
| `party` | `party.merge_proposed` | undeclared |
| `party` | `party.merged` | undeclared |
| `party_relationship` | `party_relationship.created` | undeclared |
| `party_relationship` | `party_relationship.updated` | undeclared |
| `permission` | `permission.granted` | undeclared |
| `platform` | `platform.manifest_deployed` | undeclared |
| `platform` | `platform.support_session_started` | undeclared |
| `platform` | `platform.tenant_provisioned` | undeclared |
| `preparation` | `preparation.recalled` | undeclared |
| `preparation` | `preparation.routed` | undeclared |
| `preparation` | `preparation.step_completed` | undeclared |
| `preparation` | `preparation.ticket_ready` | undeclared |
| `preparation` | `preparation.unrouted` | undeclared |
| `principal` | `principal.activated` | undeclared |
| `principal` | `principal.all_sessions_revoked` | undeclared |
| `principal` | `principal.authenticated` | undeclared |
| `principal` | `principal.deactivated` | undeclared |
| `principal` | `principal.reinstated` | undeclared |
| `principal` | `principal.suspended` | undeclared |
| `principal` | `principal.unlocked` | undeclared |
| `procurement` | `procurement.matched` | undeclared |
| `procurement` | `procurement.variance_detected` | undeclared |
| `purchase_request` | `purchase_request.submitted` | undeclared |
| `qualification` | `qualification.verified` | undeclared |
| `reporting` | `reporting.exported` | undeclared |
| `reporting` | `reporting.metric_agreed` | undeclared |
| `reporting` | `reporting.run_completed` | undeclared |
| `reporting` | `reporting.run_failed` | undeclared |
| `role` | `role.created` | undeclared |
| `schedule` | `schedule.published` | undeclared |
| `search` | `search.projection_published` | undeclared |
| `search` | `search.saved` | undeclared |
| `session` | `session.created` | undeclared |
| `session` | `session.elevated` | undeclared |
| `session` | `session.revoked` | undeclared |
| `session` | `session.revoked (one per session)` | undeclared |
| `sla` | `sla.clock_paused` | undeclared |
| `sla` | `sla.clock_started` | undeclared |
| `sla` | `sla.measurement_excluded` | undeclared |
| `stock` | `stock.balance_changed` | undeclared |
| `stock` | `stock.count_applied` | undeclared |
| `stock` | `stock.moved` | undeclared |
| `stock` | `stock.received` | undeclared |
| `stock` | `stock.reserved` | undeclared |
| `stock` | `stock.variance_recorded` | undeclared |
| `stock` | `stock.went_negative` | undeclared |
| `sync` | `sync.conflict_resolved` | undeclared |
| `sync` | `sync.pulled` | undeclared |
| `sync` | `sync.pushed` | undeclared |
| `ticket` | `ticket.converted_to_work` | undeclared |
| `ticket` | `ticket.first_response_recorded` | undeclared |
| `ticket` | `ticket.message_posted` | undeclared |
| `ticket` | `ticket.raised` | undeclared |
| `work_order` | `work_order.completed` | undeclared |
| `work_order` | `work_order.outcome_recorded` | undeclared |
| `work_order` | `work_order.reopened` | undeclared |
| `work_order` | `work_order.submitted` | undeclared |
| `workforce_member` | `workforce_member.engaged` | undeclared |
