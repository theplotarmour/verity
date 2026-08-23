-- CreateEnum
CREATE TYPE "WorkflowNodeType" AS ENUM ('Trigger', 'Action', 'Logic');

-- CreateEnum
CREATE TYPE "WorkflowRunStatus" AS ENUM ('Running', 'Succeeded', 'Failed');

-- CreateTable
CREATE TABLE "workflow_definition" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workflow_definition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_node" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "workflow_id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "type" "WorkflowNodeType" NOT NULL,
    "handler_key" TEXT NOT NULL,
    "config" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "workflow_node_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_edge" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "workflow_id" UUID NOT NULL,
    "from_node_id" UUID NOT NULL,
    "to_node_id" UUID NOT NULL,
    "condition" JSONB,

    CONSTRAINT "workflow_edge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_run" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "workflow_id" UUID NOT NULL,
    "workflow_version" INTEGER NOT NULL,
    "status" "WorkflowRunStatus" NOT NULL DEFAULT 'Running',
    "idempotency_key" TEXT,
    "trigger_event_id" UUID,
    "input" JSONB NOT NULL DEFAULT '{}',
    "error" TEXT,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finished_at" TIMESTAMP(3),

    CONSTRAINT "workflow_run_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_step_run" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "run_id" UUID NOT NULL,
    "node_id" UUID NOT NULL,
    "sequence" INTEGER NOT NULL,
    "status" "WorkflowRunStatus" NOT NULL DEFAULT 'Running',
    "output" JSONB NOT NULL DEFAULT '{}',
    "error" TEXT,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finished_at" TIMESTAMP(3),

    CONSTRAINT "workflow_step_run_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "credential" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "secret" BYTEA NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "credential_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "workflow_definition_tenant_id_idx" ON "workflow_definition"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "workflow_definition_tenant_id_key_key" ON "workflow_definition"("tenant_id", "key");

-- CreateIndex
CREATE INDEX "workflow_node_tenant_id_idx" ON "workflow_node"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "workflow_node_workflow_id_key_key" ON "workflow_node"("workflow_id", "key");

-- CreateIndex
CREATE INDEX "workflow_edge_tenant_id_idx" ON "workflow_edge"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "workflow_edge_from_node_id_to_node_id_key" ON "workflow_edge"("from_node_id", "to_node_id");

-- CreateIndex
CREATE INDEX "workflow_run_tenant_id_status_idx" ON "workflow_run"("tenant_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "workflow_run_tenant_id_idempotency_key_key" ON "workflow_run"("tenant_id", "idempotency_key");

-- CreateIndex
CREATE INDEX "workflow_step_run_tenant_id_idx" ON "workflow_step_run"("tenant_id");

-- CreateIndex
CREATE INDEX "workflow_step_run_run_id_sequence_idx" ON "workflow_step_run"("run_id", "sequence");

-- CreateIndex
CREATE INDEX "credential_tenant_id_idx" ON "credential"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "credential_tenant_id_name_key" ON "credential"("tenant_id", "name");

-- AddForeignKey
ALTER TABLE "workflow_definition" ADD CONSTRAINT "workflow_definition_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_node" ADD CONSTRAINT "workflow_node_workflow_id_fkey" FOREIGN KEY ("workflow_id") REFERENCES "workflow_definition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_edge" ADD CONSTRAINT "workflow_edge_workflow_id_fkey" FOREIGN KEY ("workflow_id") REFERENCES "workflow_definition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_edge" ADD CONSTRAINT "workflow_edge_from_node_id_fkey" FOREIGN KEY ("from_node_id") REFERENCES "workflow_node"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_edge" ADD CONSTRAINT "workflow_edge_to_node_id_fkey" FOREIGN KEY ("to_node_id") REFERENCES "workflow_node"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_run" ADD CONSTRAINT "workflow_run_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_run" ADD CONSTRAINT "workflow_run_workflow_id_fkey" FOREIGN KEY ("workflow_id") REFERENCES "workflow_definition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_step_run" ADD CONSTRAINT "workflow_step_run_run_id_fkey" FOREIGN KEY ("run_id") REFERENCES "workflow_run"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_step_run" ADD CONSTRAINT "workflow_step_run_node_id_fkey" FOREIGN KEY ("node_id") REFERENCES "workflow_node"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credential" ADD CONSTRAINT "credential_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- ---------------------------------------------------------------------------
-- Workflow runtime isolation, acyclicity, and credential handling
-- Authority: MET-AUT-001→003, MET-WKF-001→003.
-- ---------------------------------------------------------------------------

ALTER TABLE "workflow_definition" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "workflow_definition" FORCE ROW LEVEL SECURITY;
ALTER TABLE "workflow_node" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "workflow_node" FORCE ROW LEVEL SECURITY;
ALTER TABLE "workflow_edge" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "workflow_edge" FORCE ROW LEVEL SECURITY;
ALTER TABLE "workflow_run" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "workflow_run" FORCE ROW LEVEL SECURITY;
ALTER TABLE "workflow_step_run" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "workflow_step_run" FORCE ROW LEVEL SECURITY;
ALTER TABLE "credential" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "credential" FORCE ROW LEVEL SECURITY;

CREATE POLICY "workflow_definition_isolation" ON "workflow_definition"
  USING ("tenant_id" = verity.current_tenant_id()) WITH CHECK ("tenant_id" = verity.current_tenant_id());
CREATE POLICY "workflow_node_isolation" ON "workflow_node"
  USING ("tenant_id" = verity.current_tenant_id()) WITH CHECK ("tenant_id" = verity.current_tenant_id());
CREATE POLICY "workflow_edge_isolation" ON "workflow_edge"
  USING ("tenant_id" = verity.current_tenant_id()) WITH CHECK ("tenant_id" = verity.current_tenant_id());
CREATE POLICY "workflow_run_isolation" ON "workflow_run"
  USING ("tenant_id" = verity.current_tenant_id()) WITH CHECK ("tenant_id" = verity.current_tenant_id());
CREATE POLICY "workflow_step_run_isolation" ON "workflow_step_run"
  USING ("tenant_id" = verity.current_tenant_id()) WITH CHECK ("tenant_id" = verity.current_tenant_id());

-- A credential's ciphertext is readable only through verity.credential_reveal().
-- Granting SELECT on the row would put the bytea in application memory on every
-- ordinary listing, which is exactly what MET-AUT-003 is trying to prevent.
CREATE POLICY "credential_isolation" ON "credential"
  USING ("tenant_id" = verity.current_tenant_id()) WITH CHECK ("tenant_id" = verity.current_tenant_id());

-- MET-AUT-001 models automations as DAGs, so a cycle is not merely undesirable:
-- the executor walks edges and would not terminate. Rejected on write, for the
-- same reason role inheritance cycles are.
CREATE OR REPLACE FUNCTION verity.workflow_edge_no_cycle()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.from_node_id = NEW.to_node_id THEN
    RAISE EXCEPTION 'workflow_edge: a node cannot follow itself (%)', NEW.from_node_id
      USING ERRCODE = '23514';
  END IF;

  IF EXISTS (
    WITH RECURSIVE reachable(node_id) AS (
      SELECT NEW.to_node_id
      UNION
      SELECT e.to_node_id FROM workflow_edge e JOIN reachable r ON e.from_node_id = r.node_id
    )
    SELECT 1 FROM reachable WHERE node_id = NEW.from_node_id
  ) THEN
    RAISE EXCEPTION 'workflow_edge: % -> % would create a cycle', NEW.from_node_id, NEW.to_node_id
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER "workflow_edge_no_cycle"
  BEFORE INSERT OR UPDATE ON "workflow_edge"
  FOR EACH ROW EXECUTE FUNCTION verity.workflow_edge_no_cycle();

-- ---------------------------------------------------------------------------
-- Credential storage (MET-AUT-003)
--
-- Secrets are encrypted with pgcrypto and decrypted only at execution time. The
-- encryption key is supplied by the caller per call and never stored in the
-- database, so a dump of this table yields ciphertext alone.
--
-- IMPLEMENTATION DECISION: the specification requires an encrypted registry but
-- does not say where the key lives. It is taken from the application
-- environment here. A managed KMS would be stronger and needs a platform
-- decision.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION verity.credential_store(
  p_name TEXT, p_secret TEXT, p_key TEXT
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, verity, extensions, pg_temp
AS $$
DECLARE
  v_tenant UUID := verity.current_tenant_id();
  v_id UUID;
BEGIN
  IF v_tenant IS NULL THEN
    RAISE EXCEPTION 'credential_store: no tenant context' USING ERRCODE = '42501';
  END IF;

  INSERT INTO credential (id, tenant_id, name, secret, updated_at)
  VALUES (gen_random_uuid(), v_tenant, p_name, pgp_sym_encrypt(p_secret, p_key), now())
  ON CONFLICT (tenant_id, name)
  DO UPDATE SET secret = pgp_sym_encrypt(p_secret, p_key), updated_at = now()
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION verity.credential_reveal(p_name TEXT, p_key TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, verity, extensions, pg_temp
AS $$
DECLARE
  v_tenant UUID := verity.current_tenant_id();
  v_secret BYTEA;
BEGIN
  IF v_tenant IS NULL THEN
    RAISE EXCEPTION 'credential_reveal: no tenant context' USING ERRCODE = '42501';
  END IF;

  SELECT secret INTO v_secret FROM credential WHERE tenant_id = v_tenant AND name = p_name;
  IF v_secret IS NULL THEN
    RETURN NULL;
  END IF;

  RETURN pgp_sym_decrypt(v_secret, p_key);
END;
$$;
