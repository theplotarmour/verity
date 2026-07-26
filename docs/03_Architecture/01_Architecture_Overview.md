# Architecture Overview

## Current Technical Base

- Next.js 16.2.10 with App Router
- React 19.2.4
- TypeScript
- Prisma with PostgreSQL
- Supabase packages for auth and backend access
- Serwist-based PWA support
- S3-compatible storage support

## Architectural Shape

Verity should be organized as a configurable operating platform where business engines own state transitions and operational decisions, while route surfaces, server actions, storage utilities, and worker UIs expose those capabilities to specific roles.

## Architectural Layers

- Experience layer: owner, worker, inspector, onboarding, verification, agreement, offline
- Workflow layer: multi-step operational lifecycles spanning engines
- Engine layer: CRM, Blueprint, Production, Inventory, Purchase, Quality, Dispatch, People, Analytics, Knowledge
- Platform layer: auth, permissions, notifications, audit, storage, PWA, sync, offline
- Data layer: Prisma schema, relational integrity, event emission, materialized operational state

## Current Code Surface

The current repository already exposes:

- owner routes for dashboard, floor, inventory, orders, production, purchase, QC floor, reports, review, search, settings, system, team, users
- worker routes for home, inspection, history, profile
- inspector routes for inbox, review, rejected, verified, profile
- agreement and verification routes
- server actions for auth, orders, production, purchase, inventory, QC, employees, departments, workers, inspectors, team, users, storage, setup, and HQ flows

## Required Direction

The implementation should converge on:

- explicit business events
- reusable blueprints and templates
- owner-controlled configuration via Factory Builder
- offline-safe execution surfaces
- durable migration strategy and production deployment posture
