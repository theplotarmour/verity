#!/usr/bin/env bash
# Grants operator authority to a known identity (Task 42; logic from Task 31).
#
# Idempotent: a second run reports "already_operator" and changes nothing. It
# never creates an identity — provisioning is ADR-007's job and requires a
# verified contact, so an operator email must already exist.
#
#   VERITY_OPERATOR_EMAIL=ops@example.com ./deploy/scripts/bootstrap.sh

source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/_common.sh"
require_docker
require_env_file

EMAIL="${VERITY_OPERATOR_EMAIL:-$(env_value VERITY_OPERATOR_EMAIL)}"
if [ -z "${EMAIL}" ]; then
  log "no VERITY_OPERATOR_EMAIL set — skipping operator bootstrap"
  log "run it later:  VERITY_OPERATOR_EMAIL=you@example.com ./deploy/scripts/bootstrap.sh"
  exit 0
fi

log "granting operator authority to ${EMAIL}"
compose --profile tools run --rm --entrypoint "" -e VERITY_OPERATOR_EMAIL="${EMAIL}" tools \
  npx tsx prisma/bootstrap-operator.ts "${EMAIL}"
