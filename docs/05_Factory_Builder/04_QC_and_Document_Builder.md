# 04 QC and Document Builder

## Purpose

This builder governs QC templates, checkpoints, evidence rules, and supporting files.

## Canonical Direction

- configuration should feel guided, not bureaucratic
- owners should complete ordinary setup without developer assistance
- every configuration surface must feed reusable downstream behavior
- templates should reduce setup effort and protect consistency

## Inputs

- factory context
- permissions
- product and blueprint context where relevant
- engine-specific configuration metadata

## Outputs

- updated configuration state
- new or revised blueprint-linked behavior
- auditable changes
- downstream engine readiness
