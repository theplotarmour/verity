---
doc_id: GAP-REGISTER
title: Gap register (generated)
generated: true
source_model: all models
regenerate_with: python3 _tools/generate.py
---

# Gap register (generated)

*Generated. Edit `all models`, not this file.*

Every row is a decision the model does not yet contain. The generator deliberately emitted nothing in its place.

Rows are split by whether a model author can close them.

**Closable** gaps are answerable by editing a capability model. A shrinking count here is progress.

**Unconditional** gaps are emitted for every entity, screen and action regardless of model content, because no construct in the model feeds the artifact they concern — there is no view model, no permission-default model, no API query model and no pack-contents model. Their count is a constant multiplied by the entity and action counts, so authoring a capability RAISES it. They are real work and they are not a progress metric, and conflating the two makes the total meaningless.

## Closable by model authoring (26)

| # | Capability | Location | Decision required | Blocks |
|---|---|---|---|---|
| 1 | `address_resolution` | `port.address_resolution.provider` | no capability in the library declares that it provides this port; it is either satisfied by a system outside Verity, or its provider has not been modelled. See _composition.yaml external_provider_ports and ports_awaiting_a_capability. | `capability:party`, `capability:sites` |
| 2 | `approval_chain` | `port.approval_chain.provider` | no capability in the library declares that it provides this port; it is either satisfied by a system outside Verity, or its provider has not been modelled. See _composition.yaml external_provider_ports and ports_awaiting_a_capability. | `capability:attendance_verification`, `capability:backfill_dispatch`, `capability:core_authorization`, `capability:core_configuration`, `capability:people`, `capability:procurement`, `capability:scheduling_dispatch`, `capability:sla_contract`, `capability:work_order` |
| 3 | `change_feed` | `port.change_feed.provider` | no capability in the library declares that it provides this port; it is either satisfied by a system outside Verity, or its provider has not been modelled. See _composition.yaml external_provider_ports and ports_awaiting_a_capability. | `capability:integrations`, `capability:reporting`, `capability:search` |
| 4 | `customer_surface` | `port.customer_surface.provider` | no capability in the library declares that it provides this port; it is either satisfied by a system outside Verity, or its provider has not been modelled. See _composition.yaml external_provider_ports and ports_awaiting_a_capability. | `capability:attendance_verification`, `capability:billing`, `capability:booking`, `capability:helpdesk`, `capability:lease_management`, `capability:order`, `capability:sla_contract`, `capability:work_order` |
| 5 | `financial_document_sink` | `port.financial_document_sink.provider` | no capability in the library declares that it provides this port; it is either satisfied by a system outside Verity, or its provider has not been modelled. See _composition.yaml external_provider_ports and ports_awaiting_a_capability. | `capability:assets`, `capability:billing`, `capability:inventory`, `capability:party`, `capability:procurement`, `capability:sla_contract` |
| 6 | `fulfilment_target` | `port.fulfilment_target.provider` | no capability in the library declares that it provides this port; it is either satisfied by a system outside Verity, or its provider has not been modelled. See _composition.yaml external_provider_ports and ports_awaiting_a_capability. | `capability:order` |
| 7 | `index_source` | `port.index_source.provider` | no capability in the library declares that it provides this port; it is either satisfied by a system outside Verity, or its provider has not been modelled. See _composition.yaml external_provider_ports and ports_awaiting_a_capability. | `capability:lease_management` |
| 8 | `message_transport` | `port.message_transport.provider` | no capability in the library declares that it provides this port; it is either satisfied by a system outside Verity, or its provider has not been modelled. See _composition.yaml external_provider_ports and ports_awaiting_a_capability. | `capability:notification` |
| 9 | `occupiable_space` | `port.occupiable_space.provider` | no capability in the library declares that it provides this port; it is either satisfied by a system outside Verity, or its provider has not been modelled. See _composition.yaml external_provider_ports and ports_awaiting_a_capability. | `capability:lease_management` |
| 10 | `payment_authorisation` | `port.payment_authorisation.provider` | no capability in the library declares that it provides this port; it is either satisfied by a system outside Verity, or its provider has not been modelled. See _composition.yaml external_provider_ports and ports_awaiting_a_capability. | `capability:billing`, `capability:booking`, `capability:order`, `capability:procurement` |
| 11 | `payroll_input_sink` | `port.payroll_input_sink.provider` | no capability in the library declares that it provides this port; it is either satisfied by a system outside Verity, or its provider has not been modelled. See _composition.yaml external_provider_ports and ports_awaiting_a_capability. | `capability:attendance_verification` |
| 12 | `reporting_source` | `port.reporting_source.provider` | no capability in the library declares that it provides this port; it is either satisfied by a system outside Verity, or its provider has not been modelled. See _composition.yaml external_provider_ports and ports_awaiting_a_capability. | `capability:reporting` |
| 13 | `secret_store` | `port.secret_store.provider` | no capability in the library declares that it provides this port; it is either satisfied by a system outside Verity, or its provider has not been modelled. See _composition.yaml external_provider_ports and ports_awaiting_a_capability. | `capability:integrations` |
| 14 | `tax_treatment` | `port.tax_treatment.provider` | no capability in the library declares that it provides this port; it is either satisfied by a system outside Verity, or its provider has not been modelled. See _composition.yaml external_provider_ports and ports_awaiting_a_capability. | `capability:billing`, `capability:catalog` |
| 15 | `service_completion` | `port.billable_outcome_sink.declared_by` | port `billable_outcome_sink` names capability `service_completion` as a declarer, but no capability model `service_completion` exists in the library yet | `port:billable_outcome_sink` |
| 16 | `spaces` | `port.schedulable_resource.declared_by` | port `schedulable_resource` names capability `spaces` as a declarer, but no capability model `spaces` exists in the library yet | `port:schedulable_resource` |
| 17 | `shift_requirement` | `port.schedulable_demand.declared_by` | port `schedulable_demand` names capability `shift_requirement` as a declarer, but no capability model `shift_requirement` exists in the library yet | `port:schedulable_demand` |
| 18 | `production_order` | `port.schedulable_demand.declared_by` | port `schedulable_demand` names capability `production_order` as a declarer, but no capability model `production_order` exists in the library yet | `port:schedulable_demand` |
| 19 | `quality_inspection` | `port.evidence_capture.declared_by` | port `evidence_capture` names capability `quality_inspection` as a declarer, but no capability model `quality_inspection` exists in the library yet | `port:evidence_capture` |
| 20 | `delivery` | `port.evidence_capture.declared_by` | port `evidence_capture` names capability `delivery` as a declarer, but no capability model `delivery` exists in the library yet | `port:evidence_capture` |
| 21 | `finance` | `port.approval_chain.declared_by` | port `approval_chain` names capability `finance` as a declarer, but no capability model `finance` exists in the library yet | `port:approval_chain` |
| 22 | `manufacturing` | `port.stock_movement_sink.declared_by` | port `stock_movement_sink` names capability `manufacturing` as a declarer, but no capability model `manufacturing` exists in the library yet | `port:stock_movement_sink` |
| 23 | `delivery` | `port.stock_movement_sink.declared_by` | port `stock_movement_sink` names capability `delivery` as a declarer, but no capability model `delivery` exists in the library yet | `port:stock_movement_sink` |
| 24 | `client_portal` | `port.customer_surface.declared_by` | port `customer_surface` names capability `client_portal` as a declarer, but no capability model `client_portal` exists in the library yet | `port:customer_surface` |
| 25 | `consumer_web` | `port.customer_surface.declared_by` | port `customer_surface` names capability `consumer_web` as a declarer, but no capability model `consumer_web` exists in the library yet | `port:customer_surface` |
| 26 | `whatsapp_conversational` | `port.customer_surface.declared_by` | port `customer_surface` names capability `whatsapp_conversational` as a declarer, but no capability model `whatsapp_conversational` exists in the library yet | `port:customer_surface` |

## Unconditional generator emissions (15335)

| Kind | Count | What would close it |
|---|---|---|
| UX screen specification | 8190 | a View/Surface model (kernel K14) that capabilities declare and the generator reads |
| UX screen state specification | 7035 | the same View/Surface model, carrying the eleven UI states per screen |
| pack contents | 5 | pack models under _model/packs/, which do not exist yet |
| permission matrix defaults | 105 | a per-capability declaration of default grants by role archetype (kernel K11/K12) |

These are not listed row by row. Listing fifteen thousand identical rows produces a document nobody opens, which is the same failure as not reporting them.
