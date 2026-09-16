# Client Configuration Matrix

## Verdict

**PARTIAL.** Verity has a real hierarchical ConfigParameter substrate, tenant/HQ editing surfaces, roles, organizations, custom fields, state/workflow metadata, notifications, appearance, and capability activation. It does not yet supply the complete “Client Configuration” plane described by the specifications.

| Configuration concern | Storage/model | Administration surface | Runtime consumption | Current status |
|---|---|---|---|---|
| Capability entitlement | `TenantActivation` | HQ client modules page | command/query and contribution filtering | BUILT; route gap |
| Capability dependency | definition dependencies + DB enforcement | activation operation | activation refusal | BUILT |
| Capability version pin | `pinnedVersion` | displayed with activation | no upgrade/compatibility behavior | DATA ONLY |
| Global/tenant/org/user config | `ConfigParameter` scope/value | tenant configuration + HQ settings | narrowest scope wins | BUILT core |
| Typed per-key validation | JSON value/free key space | string-oriented editor | capability-specific reads | PARTIAL; no central key schema/version |
| Organization hierarchy | Organization tree | HQ/client and tenant surfaces | membership/scope filters | BUILT |
| Roles and grants | Role, permission, composition | HQ/client and tenant role screens | policy engine | BUILT |
| Custom fields | schemas + entity extensions JSON | demonstrated on location detail | dynamic form/validation | PARTIAL; not universal across all entities |
| State definitions/transitions | metadata tables | mostly migration/seed-driven | state guards/SLAs | BUILT substrate; limited tenant authoring |
| Workflow definitions | workflow/edge/action tables | no complete general tenant builder | runtime exists | PARTIAL |
| Notification templates | template/suppression models | limited operational surfaces | in-app notifications | PARTIAL; external transport absent |
| Document templates | no `DocumentTemplate` model | none | none | NOT BUILT |
| Checklist templates | domain-specific checklists only | no generic template plane | no generic runtime | NOT BUILT |
| Dashboard layout/widgets | domain page code | no tenant dashboard editor | no generic contribution | NOT BUILT |
| Industry Pack defaults | no pack manifest | none | none | NOT BUILT |
| Client extension config | spec-only extension model | none | none | NOT BUILT |
| Branding/accent/theme | cookie/accent configuration | appearance controls | shell/sign-in rendering | BUILT; not full white-label asset/domain system |
| Provider bindings | environment configuration | operations page reports limited binding state | auth/storage/AI/integration adapters | PARTIAL; environment-driven, not client-config-driven |

## Key boundary observations

- Tenant configuration writes use the registered `verity.platform.set_configuration` command and write Tenant scope; the page does not expose Global editing.
- `setConfig` itself accepts a scope parameter, but the registered tenant command hard-codes Tenant. No direct client path to Global scope was found.
- The configuration page correctly requires Edit on Tenant before showing raw keys.
- Current configuration is mostly a free JSON key/value space. This is flexible but is not a versioned contract that can prove compatibility during capability upgrades.
- Appearance preferences are cookies, explicitly separate from ConfigParameter. That is internally consistent.

## Client onboarding consequence

A knowledgeable developer/operator can provision a controlled client using existing capabilities and SQL/migration-seeded metadata. A tenant admin cannot assemble an arbitrary Client System from pack manifests, versioned extensions, document/checklist templates, and dashboard layouts without code changes. That is why the correct product posture is “controlled client delivery,” not “complete no-code modular platform.”

