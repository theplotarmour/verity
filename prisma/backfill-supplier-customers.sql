-- ---------------------------------------------------------------------------
-- Every supplier gets its customer side
--
-- "Remove the option for 'also a customer'. All suppliers are 100% a customer."
--
-- Stated as a fact about this trade: the mills and dealers this business buys
-- from all buy back. So the link is created with the supplier rather than
-- offered as a button somebody has to remember to press, and the suppliers that
-- already exist are given theirs here.
--
-- Still a LINK, not a merge. Buying and selling keep separate documents,
-- separate credit limits and separate ledgers, because they are separate
-- obligations; netting one against the other silently would misstate both.
--
-- An existing customer sharing a GSTIN is LINKED rather than duplicated — the
-- same firm appearing twice on the selling side is exactly the confusion this
-- removes. The credit limit starts at zero: cash only until somebody decides
-- otherwise, because a limit is a judgement about a specific firm and inventing
-- one here would extend credit nobody granted.
-- ---------------------------------------------------------------------------

-- 1. Link to a customer that already matches on GSTIN.
UPDATE "plywood_supplier" s
   SET "linked_customer_id" = c."id"
  FROM "plywood_customer" c
 WHERE s."linked_customer_id" IS NULL
   AND c."tenant_id" = s."tenant_id"
   AND s."gstin" IS NOT NULL
   AND c."gstin" = s."gstin"
   AND NOT EXISTS (
     SELECT 1 FROM "plywood_supplier" other
      WHERE other."linked_customer_id" = c."id"
   );

-- 2. Create the customer side for the rest.
WITH created AS (
  INSERT INTO "plywood_customer" (
    "id", "tenant_id", "display_name", "gstin", "phone", "email",
    "state_code", "credit_limit_paise", "active",
    "created_at", "updated_at", "version", "custom_fields"
  )
  SELECT gen_random_uuid(), s."tenant_id", s."display_name", s."gstin",
         s."phone", s."email", s."state_code", 0, true,
         now(), now(), 1, '{}'::jsonb
    FROM "plywood_supplier" s
   WHERE s."linked_customer_id" IS NULL
     AND s."active"
  RETURNING "id", "tenant_id", "display_name"
)
UPDATE "plywood_supplier" s
   SET "linked_customer_id" = created."id"
  FROM created
 WHERE s."tenant_id" = created."tenant_id"
   AND s."display_name" = created."display_name"
   AND s."linked_customer_id" IS NULL;
