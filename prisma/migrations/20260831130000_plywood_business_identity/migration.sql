-- ---------------------------------------------------------------------------
-- Plywood business identity (slice 2)
--
-- Authority: taskplans/45_plywood_workflow_program.md §D-03, §4.4;
-- PLYWOOD_TARGET_WORKFLOW_GAP_AUDIT.md P0-09.
--
-- Legally required document identity previously lived nowhere. The invoice page
-- read the live tenant name and a raw configuration key holding a state code.
-- Two things that must never be true of a tax document were true: the business
-- had no recorded legal identity, and an invoice raised last year would change
-- if the business renamed itself this year.
--
-- Registration-keyed from the first migration even though exactly one is
-- supported today, so a second state is later data rather than a redesign.
-- ---------------------------------------------------------------------------

CREATE TABLE "plywood_business_profile" (
  "id"                          UUID NOT NULL,
  "tenant_id"                   UUID NOT NULL,
  "legal_name"                  TEXT NOT NULL,
  "trade_name"                  TEXT,
  "pan"                         VARCHAR(10),
  "registered_address"          TEXT,
  "financial_year_start_month"  INTEGER NOT NULL DEFAULT 4,
  "currency_code"               TEXT NOT NULL DEFAULT 'INR',
  "created_at"                  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"                  TIMESTAMP(3) NOT NULL,
  "version"                     INTEGER NOT NULL DEFAULT 1,

  CONSTRAINT "plywood_business_profile_pkey" PRIMARY KEY ("id"),
  -- A financial year starts on the first of some month. 4 is April.
  CONSTRAINT "plywood_business_profile_fy_month"
    CHECK ("financial_year_start_month" BETWEEN 1 AND 12),
  -- PAN is 5 letters, 4 digits, 1 letter. Shape only: the income tax
  -- department owns validity, this owns "somebody typed a phone number here".
  CONSTRAINT "plywood_business_profile_pan_shape"
    CHECK ("pan" IS NULL OR "pan" ~ '^[A-Z]{5}[0-9]{4}[A-Z]$')
);

CREATE UNIQUE INDEX "plywood_business_profile_tenant_id_key"
  ON "plywood_business_profile"("tenant_id");
CREATE UNIQUE INDEX "plywood_business_profile_tenant_scoped_id"
  ON "plywood_business_profile"("tenant_id", "id");

ALTER TABLE "plywood_business_profile"
  ADD CONSTRAINT "plywood_business_profile_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "plywood_gst_registration" (
  "id"                    UUID NOT NULL,
  "tenant_id"             UUID NOT NULL,
  "gstin"                 VARCHAR(15) NOT NULL,
  "state_code"            VARCHAR(2) NOT NULL,
  "registration_type"     TEXT NOT NULL DEFAULT 'regular',
  "invoice_series_prefix" TEXT NOT NULL,
  "effective_from"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "effective_to"          TIMESTAMP(3),
  "active"                BOOLEAN NOT NULL DEFAULT true,
  "created_at"            TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"            TIMESTAMP(3) NOT NULL,
  "version"               INTEGER NOT NULL DEFAULT 1,

  CONSTRAINT "plywood_gst_registration_pkey" PRIMARY KEY ("id"),
  -- 2 state digits, 10 PAN characters, 1 entity digit/letter, 'Z', 1 checksum.
  -- Shape, not validity: a GSTIN's checksum is the portal's business, and
  -- refusing a legitimate new format because this regex predates it would be
  -- worse than accepting a typo the portal will reject anyway.
  CONSTRAINT "plywood_gst_registration_gstin_shape"
    CHECK ("gstin" ~ '^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][0-9A-Z]Z[0-9A-Z]$'),
  CONSTRAINT "plywood_gst_registration_state_shape"
    CHECK ("state_code" ~ '^[0-9]{2}$'),
  -- The state code is the first two characters of the GSTIN. A mismatch is
  -- always a typo, and it decides CGST+SGST against IGST on every invoice.
  CONSTRAINT "plywood_gst_registration_state_matches_gstin"
    CHECK (left("gstin", 2) = "state_code"),
  CONSTRAINT "plywood_gst_registration_type"
    CHECK ("registration_type" IN ('regular', 'composition')),
  CONSTRAINT "plywood_gst_registration_series_prefix_present"
    CHECK (length(btrim("invoice_series_prefix")) > 0)
);

CREATE UNIQUE INDEX "plywood_gst_registration_tenant_id_gstin_key"
  ON "plywood_gst_registration"("tenant_id", "gstin");
CREATE UNIQUE INDEX "plywood_gst_registration_tenant_scoped_id"
  ON "plywood_gst_registration"("tenant_id", "id");
CREATE INDEX "plywood_gst_registration_tenant_id_active_idx"
  ON "plywood_gst_registration"("tenant_id", "active");

-- Exactly one active registration per tenant. §D-03 supports one today; this
-- index is what makes "one" a fact rather than an intention, and it is the
-- single line that changes when multi-state is decided.
CREATE UNIQUE INDEX "plywood_gst_registration_one_active_per_tenant"
  ON "plywood_gst_registration"("tenant_id")
  WHERE "active";

ALTER TABLE "plywood_gst_registration"
  ADD CONSTRAINT "plywood_gst_registration_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- Seller identity snapshot on the invoice (P0-09)
--
-- Nullable: invoices raised before this migration genuinely have no recorded
-- seller identity, and inventing one by backfilling from today's tenant name
-- would be a fabricated fact on a tax document. An honest null says "this
-- predates the profile", which is true.
-- ---------------------------------------------------------------------------

ALTER TABLE "plywood_invoice"
  ADD COLUMN "seller_legal_name_snapshot" TEXT,
  ADD COLUMN "seller_gstin_snapshot" TEXT;

-- ---------------------------------------------------------------------------
-- Row-level security, matching every other plywood table.
-- ---------------------------------------------------------------------------

ALTER TABLE "plywood_business_profile" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "plywood_business_profile" FORCE ROW LEVEL SECURITY;
CREATE POLICY plywood_business_profile_tenant_isolation ON "plywood_business_profile"
  USING ("tenant_id" = verity.current_tenant_id())
  WITH CHECK ("tenant_id" = verity.current_tenant_id());

ALTER TABLE "plywood_gst_registration" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "plywood_gst_registration" FORCE ROW LEVEL SECURITY;
CREATE POLICY plywood_gst_registration_tenant_isolation ON "plywood_gst_registration"
  USING ("tenant_id" = verity.current_tenant_id())
  WITH CHECK ("tenant_id" = verity.current_tenant_id());
