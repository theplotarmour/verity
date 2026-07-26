# Event System

## Purpose

Verity should coordinate engines through business events, not through a generic task table pretending to represent every operational action.

## Canonical Event Philosophy

A business event captures that something meaningful happened in the factory operating system. Engines subscribe to those events and create the side effects they own.

## Example Event Chain

- Sales order created
- Material reservation requested
- Production plan generated
- Work order released
- Department job started
- QC submitted
- Rework requested
- Dispatch marked ready

## Event Requirements

- clear event names
- emitting actor and factory context
- timestamps
- affected aggregate identifiers
- idempotent downstream handling
- audit visibility
- notification hooks

## Current Gap

The current codebase has timeline and audit-related models, but it does not yet formalize the event system as the operating spine. This document establishes that direction as canonical.
