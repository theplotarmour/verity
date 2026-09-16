CREATE TABLE "oidc_login_transaction" (
  "state_hash" TEXT PRIMARY KEY,
  "expires_at" TIMESTAMPTZ NOT NULL,
  "consumed_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX "oidc_login_transaction_expires_at_idx"
  ON "oidc_login_transaction"("expires_at");

REVOKE ALL ON TABLE "oidc_login_transaction" FROM PUBLIC;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "oidc_login_transaction" TO verity_app;

