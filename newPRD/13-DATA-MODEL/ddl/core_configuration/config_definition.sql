-- Generated from _model/capabilities/core_configuration.yaml · entity config_definition
-- Tenancy mode: platform_scoped

CREATE TABLE core_configuration__config_definition (
  id uuid NOT NULL,
  config_key text NOT NULL,
  declaring_capability_key text NOT NULL,
  value_type text NOT NULL,
  enum_values jsonb,
  default_value text NOT NULL,
  lowest_settable_scope text NOT NULL,
  validation_expression text,
  range_min text,
  range_max text,
  change_impact text NOT NULL,
  nullable_meaning text,
  label text NOT NULL,
  help_text text NOT NULL,
  decision_question text NOT NULL,
  sensitive boolean NOT NULL,
  financial boolean NOT NULL,
  deprecated_at timestamptz,
  replaced_by_config_key text
);

ALTER TABLE core_configuration__config_definition ENABLE ROW LEVEL SECURITY;
ALTER TABLE core_configuration__config_definition FORCE ROW LEVEL SECURITY;

-- Immutability triggers
-- id: immutable after create; enforced by trigger, not by application code
-- config_key: immutable after create; enforced by trigger, not by application code
-- declaring_capability_key: immutable after create; enforced by trigger, not by application code
-- value_type: immutable after create; enforced by trigger, not by application code
