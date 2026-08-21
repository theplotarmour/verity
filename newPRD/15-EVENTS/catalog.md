---
doc_id: EVT-CATALOG
title: Event catalogue
generated: true
source_model: all models
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Event catalogue

*This document is generated. Edit `all models`, not this file.*

## Envelope

| Field | Type | Note |
|---|---|---|
| `event_id` | uuid | idempotency key for consumers |
| `event_type` | string |  |
| `event_version` | int | 'incremented on breaking payload change, old version emitted in parallel for one minor release |
| `tenant_id` | uuid |  |
| `subject_type` | string |  |
| `subject_id` | uuid |  |
| `actor_type` | enum |  |
| `actor_id` | uuid |  |
| `occurred_at` | timestamptz | business time |
| `recorded_at` | timestamptz | system time, differs from occurred_at on offline replay |
| `correlation_id` | uuid | survives across module boundaries in one workflow |
| `causation_id` | uuid | the event_id that caused this event |
| `source` | enum |  |
| `payload` | json |  |
| `payload_before` | json | present for state-change and financial events only |

Delivery: `at_least_once`. Consumers **must** be idempotent on `event_id`. Ordering guarantee: per subject_id only, never global.

## Emitted events

| Event | Emitted by capability | Emitting action | Subject entity |
|---|---|---|---|
| `absence.recorded` | `people` | `record_unplanned_absence` | `absence` |
| `asset.custody_transferred` | `assets` | `transfer_custody` | `asset` |
| `asset.reading_implausible` | `assets` | `record_reading` | `meter_reading` |
| `asset.reading_recorded` | `assets` | `record_reading` | `meter_reading` |
| `asset.registered` | `assets` | `register_asset` | `asset` |
| `assignment.created` | `scheduling_dispatch` | `assign_resource` | `assignment` |
| `assignment.published per assignment` | `scheduling_dispatch` | `publish_schedule` | `schedule_version` |
| `assignment.released` | `scheduling_dispatch` | `release_assignment` | `assignment` |
| `attendance.claimed` | `attendance_verification` | `record_attendance` | `attendance_record` |
| `attendance.dispute_resolved` | `attendance_verification` | `resolve_attendance_dispute` | `attendance_dispute` |
| `attendance.evidence_recorded` | `attendance_verification` | `record_attendance` | `attendance_record` |
| `attendance.settled` | `attendance_verification` | `settle_attendance` | `attendance_record` |
| `audit.exported` | `core_audit` | `export_audit` | `audit_record` |
| `audit.verification_completed` | `core_audit` | `verify_digest` | `audit_digest` |
| `audit.verification_failed` | `core_audit` | `verify_digest` | `audit_digest` |
| `backfill.accepted` | `backfill_dispatch` | `accept_backfill` | `backfill_offer` |
| `backfill.candidates_ranked` | `backfill_dispatch` | `rank_candidates` | `backfill_offer` |
| `backfill.filled` | `backfill_dispatch` | `accept_backfill` | `backfill_offer` |
| `backfill.requested` | `backfill_dispatch` | `raise_backfill_request` | `backfill_request` |
| `billing.credit_note_issued` | `billing` | `issue_credit_note` | `invoice` |
| `billing.invoice_issued` | `billing` | `issue_invoice` | `invoice` |
| `billing.outcome_rated` | `billing` | `rate_outcome` | `billable_outcome` |
| `billing.outcome_unratable` | `billing` | `rate_outcome` | `billable_outcome` |
| `billing.payment_allocated` | `billing` | `allocate_payment` | `payment_receipt` |
| `binding.granted` | `core_authorization` | `grant_role` | `role_binding` |
| `binding.revoked` | `core_authorization` | `revoke_binding` | `role_binding` |
| `booking.cancelled` | `booking` | `cancel_booking` | `booking` |
| `booking.confirmed` | `booking` | `confirm_booking` | `booking` |
| `booking.held` | `booking` | `hold_slot` | `booking` |
| `booking.slot_released` | `booking` | `cancel_booking` | `booking` |
| `catalog_item.cost_changed` | `catalog` | `publish_composition` | `composition` |
| `catalog_item.published` | `catalog` | `publish_item` | `catalog_item` |
| `change_set.applied` | `core_configuration` | `apply_change_set` | `config_change_set` |
| `change_set.staged` | `core_configuration` | `stage_change_set` | `config_change_set` |
| `composition.published` | `catalog` | `publish_composition` | `composition` |
| `config.changed` | `core_configuration` | `set_config_value` | `config_value` |
| `config.changed per member` | `core_configuration` | `apply_change_set` | `config_change_set` |
| `delegation.created` | `core_authorization` | `create_delegation` | `delegation` |
| `demand.coverage_changed` | `scheduling_dispatch` | `assign_resource` | `assignment` |
| `demand.coverage_changed` | `scheduling_dispatch` | `release_assignment` | `assignment` |
| `device.archived` | `core_identity_session` | `archive_device` | `device` |
| `device.blocked` | `core_identity_session` | `block_device` | `device` |
| `device.trusted` | `core_identity_session` | `trust_device` | `device` |
| `device.unblocked` | `core_identity_session` | `unblock_device` | `device` |
| `device.untrusted` | `core_identity_session` | `untrust_device` | `device` |
| `evidence.captured` | `evidence_capture` | `capture_evidence` | `evidence_item` |
| `evidence.redacted` | `evidence_capture` | `redact_evidence` | `evidence_item` |
| `evidence.uploaded` | `evidence_capture` | `upload_evidence` | `evidence_item` |
| `goods_receipt.recorded` | `procurement` | `record_receipt` | `goods_receipt` |
| `impersonation.started` | `core_authorization` | `start_impersonation` | `role_binding` |
| `integration.credential_rotated` | `integrations` | `rotate_credential` | `connection` |
| `integration.dead_lettered` | `integrations` | `deliver_message` | `outbound_message` |
| `integration.delivered` | `integrations` | `deliver_message` | `outbound_message` |
| `integration.inbound_accepted` | `integrations` | `process_inbound` | `inbound_request` |
| `integration.inbound_rejected` | `integrations` | `process_inbound` | `inbound_request` |
| `lease.agreed` | `lease_management` | `agree_lease` | `lease` |
| `lease.escalation_applied` | `lease_management` | `apply_escalation` | `escalation_rule` |
| `lease.recoverables_reconciled` | `lease_management` | `reconcile_recoverable_charges` | `charge_schedule` |
| `legal_hold.applied` | `core_audit` | `apply_legal_hold` | `legal_hold` |
| `location.created` | `sites` | `create_location` | `location` |
| `location.moved` | `sites` | `move_location` | `location` |
| `member.became_unavailable` | `people` | `record_unplanned_absence` | `absence` |
| `membership.accepted` | `core_identity_session` | `accept_invitation` | `principal` |
| `membership.invited` | `core_identity_session` | `invite_principal` | `tenant_membership` |
| `membership.revoked` | `core_identity_session` | `deactivate_principal` | `principal` |
| `membership.revoked` | `core_identity_session` | `revoke_membership` | `tenant_membership` |
| `mfa.verified` | `core_identity_session` | `verify_mfa` | `session` |
| `notification.audience_empty` | `notification` | `request_notification` | `notification_message` |
| `notification.failed` | `notification` | `send_message` | `notification_message` |
| `notification.preference_changed` | `notification` | `set_preference` | `notification_preference` |
| `notification.requested` | `notification` | `request_notification` | `notification_message` |
| `notification.sent` | `notification` | `send_message` | `notification_message` |
| `order.split` | `order` | `split_order` | `order` |
| `order_line.captured` | `order` | `capture_line` | `order_line` |
| `order_line.modified` | `order` | `modify_line` | `order_line` |
| `order_line.voided` | `order` | `void_line` | `order_line` |
| `org_structure.changed` | `sites` | `move_location` | `location` |
| `party.channels_consolidated` | `party` | `execute_merge` | `merge_proposal` |
| `party.consent_recorded` | `party` | `record_consent` | `party_channel` |
| `party.created` | `party` | `create_party` | `party` |
| `party.merge_proposed` | `party` | `propose_merge` | `merge_proposal` |
| `party.merged` | `party` | `execute_merge` | `merge_proposal` |
| `party_relationship.created` | `party` | `create_party` | `party` |
| `party_relationship.updated` | `party` | `execute_merge` | `merge_proposal` |
| `permission.granted` | `core_authorization` | `add_grant` | `permission_grant` |
| `platform.manifest_deployed` | `hq_console` | `deploy_manifest` | `tenant_manifest` |
| `platform.support_session_started` | `hq_console` | `start_support_session` | `tenant` |
| `platform.tenant_provisioned` | `hq_console` | `provision_tenant` | `tenant` |
| `preparation.recalled` | `kitchen_flow` | `recall_ticket` | `preparation_ticket` |
| `preparation.routed` | `kitchen_flow` | `route_ticket` | `preparation_ticket` |
| `preparation.step_completed` | `kitchen_flow` | `complete_step` | `preparation_step` |
| `preparation.ticket_ready` | `kitchen_flow` | `complete_step` | `preparation_step` |
| `preparation.unrouted` | `kitchen_flow` | `route_ticket` | `preparation_ticket` |
| `principal.activated` | `core_identity_session` | `accept_invitation` | `principal` |
| `principal.all_sessions_revoked` | `core_identity_session` | `logout_all` | `session` |
| `principal.authenticated` | `core_identity_session` | `authenticate_password` | `session` |
| `principal.authenticated` | `core_identity_session` | `authenticate_phone_otp` | `session` |
| `principal.deactivated` | `core_identity_session` | `deactivate_principal` | `principal` |
| `principal.reinstated` | `core_identity_session` | `reinstate_principal` | `principal` |
| `principal.suspended` | `core_identity_session` | `suspend_principal` | `principal` |
| `principal.unlocked` | `core_identity_session` | `unlock_principal_manual` | `principal` |
| `procurement.matched` | `procurement` | `match_documents` | `supplier_invoice` |
| `procurement.variance_detected` | `procurement` | `match_documents` | `supplier_invoice` |
| `purchase_request.submitted` | `procurement` | `submit_request` | `purchase_request` |
| `qualification.verified` | `people` | `verify_qualification` | `qualification` |
| `reporting.exported` | `reporting` | `export_report` | `report_export` |
| `reporting.metric_agreed` | `reporting` | `agree_metric` | `metric_definition` |
| `reporting.run_completed` | `reporting` | `run_report` | `report_run` |
| `reporting.run_failed` | `reporting` | `run_report` | `report_run` |
| `role.created` | `core_authorization` | `create_role` | `role` |
| `schedule.published` | `scheduling_dispatch` | `publish_schedule` | `schedule_version` |
| `search.projection_published` | `search` | `publish_projection` | `search_projection` |
| `search.saved` | `search` | `save_search` | `saved_search` |
| `session.created` | `core_identity_session` | `accept_invitation` | `principal` |
| `session.created` | `core_identity_session` | `authenticate_password` | `session` |
| `session.created` | `core_identity_session` | `authenticate_phone_otp` | `session` |
| `session.created` | `core_identity_session` | `switch_tenant` | `session` |
| `session.created` | `core_identity_session` | `verify_mfa` | `session` |
| `session.elevated` | `core_identity_session` | `elevate_session` | `session` |
| `session.revoked` | `core_identity_session` | `archive_device` | `device` |
| `session.revoked` | `core_identity_session` | `block_device` | `device` |
| `session.revoked` | `core_identity_session` | `deactivate_principal` | `principal` |
| `session.revoked` | `core_identity_session` | `logout` | `session` |
| `session.revoked` | `core_identity_session` | `reap_session` | `session` |
| `session.revoked` | `core_identity_session` | `revoke_membership` | `tenant_membership` |
| `session.revoked` | `core_identity_session` | `suspend_principal` | `principal` |
| `session.revoked` | `core_identity_session` | `switch_tenant` | `session` |
| `session.revoked (one per session)` | `core_identity_session` | `logout_all` | `session` |
| `sla.clock_paused` | `sla_contract` | `pause_clock` | `sla_measurement` |
| `sla.clock_started` | `sla_contract` | `start_clock` | `sla_measurement` |
| `sla.measurement_excluded` | `sla_contract` | `exclude_measurement` | `sla_measurement` |
| `stock.balance_changed` | `inventory` | `record_movement` | `stock_movement` |
| `stock.count_applied` | `inventory` | `apply_count` | `stock_count` |
| `stock.moved` | `inventory` | `record_movement` | `stock_movement` |
| `stock.received` | `procurement` | `record_receipt` | `goods_receipt` |
| `stock.reserved` | `inventory` | `reserve_stock` | `stock_reservation` |
| `stock.variance_recorded` | `inventory` | `apply_count` | `stock_count` |
| `stock.went_negative` | `inventory` | `record_movement` | `stock_movement` |
| `sync.conflict_resolved` | `offline_sync` | `resolve_conflict` | `sync_conflict` |
| `sync.pulled` | `offline_sync` | `pull_dataset` | `device_store` |
| `sync.pushed` | `offline_sync` | `push_mutations` | `queued_mutation` |
| `ticket.converted_to_work` | `helpdesk` | `convert_to_work` | `ticket` |
| `ticket.first_response_recorded` | `helpdesk` | `post_message` | `ticket_message` |
| `ticket.message_posted` | `helpdesk` | `post_message` | `ticket_message` |
| `ticket.raised` | `helpdesk` | `raise_ticket` | `ticket` |
| `work_order.completed` | `work_order` | `complete_work` | `work_order` |
| `work_order.outcome_recorded` | `work_order` | `complete_work` | `work_order` |
| `work_order.reopened` | `work_order` | `reopen_work_order` | `work_order` |
| `work_order.submitted` | `work_order` | `reopen_work_order` | `work_order` |
| `work_order.submitted` | `work_order` | `submit_work_order` | `work_order` |
| `workforce_member.engaged` | `people` | `engage_member` | `workforce_member` |
