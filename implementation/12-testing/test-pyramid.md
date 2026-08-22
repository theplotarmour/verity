# Purpose
This document defines the overarching testing strategy (Test Pyramid) for the Verity platform, detailing the ratio and roles of unit, integration, and E2E tests.

# Scope
Covers all testing methodologies for the Verity backend and frontend codebases. Excludes manual QA processes.

# Authority
- Authority: EXISTING INFRASTRUCTURE (Vitest 4.1.10, Playwright 1.62.1, node environment, `src/**/*.test.ts` pattern, server-only path alias stubs)
- Authority: Bible V1 (System of Record)
- Authority: Spec REQ-TEST-SCENARIO-G (Adversarial Testing)

# Prerequisites
- CI/CD pipeline configured to run Vitest and Playwright.
- Test databases provisioning scripts ready.

# Specification Requirements
- WHAT MUST EXIST: A testing strategy that validates core business logic, API contracts, and E2E workflows without extreme flakiness.

# Approved Architecture
- **Unit/Integration Testing:** Vitest 4.1.10.
- **E2E Testing:** Playwright 1.62.1.
- **File Location:** Tests colocated with source code (`src/**/*.test.ts`).
- **Environment:** `node` with server-only stub configured.

# Implementation Contract
- Write many unit tests for stateless logic (guards, validations, calculations).
- Write fewer, but critical, integration tests for DB interactions and command pipelines.
- Write minimal E2E tests focused on critical user journeys (Playwright).
- Use test factories for data generation, never raw SQL strings.
- Utilize transaction rollback for fast, isolated integration tests.

# Constraints & Invariants
- INV-001: Strict Tenancy Isolation must be validated in integration tests.
- Tests must not rely on external non-mocked services unless explicitly marked as E2E.

# Dependencies
- Depends on: Prisma client, Vitest, Playwright.

# Failure Modes
- Flaky tests due to state leakage: Handled by strict transaction rollbacks and isolated DB schemas.
- Slow CI: Handled by adhering to the test pyramid (limiting E2E).

# Testing Requirements
- Unit tests must run in < 5 minutes. E2E tests in < 15 minutes.

# Conformance Checks
- CI validates that all PRs contain tests matching the `src/**/*.test.ts` pattern.

# Traceability
- REQ-TEST-SCENARIO-G

# Open Decisions
- IMPLEMENTATION DECISION REQUIRED: Code coverage thresholds (e.g., 80% vs 90%).
