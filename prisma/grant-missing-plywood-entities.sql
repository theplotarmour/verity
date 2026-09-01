-- ---------------------------------------------------------------------------
-- Grant the plywood entities that were added after the Owner role was built
--
-- The tenant Owner held grants on nineteen plywood entities and NONE on three
-- the capability defines: business_profile, gst_registration and
-- accounting_period. So the proprietor could not record their own business
-- name, could not register for GST, could not set a tax rate, and could not
-- close a period — every one of which is refused with E_FORBIDDEN.
--
-- That is the root of two reported symptoms. "Tax and compliance shows 0 for
-- all the fields" was true because the business had no registration and no way
-- to create one. And with no registration and no state code, every automatic
-- invoice and supplier bill was refused, so deliveries and receipts produced no
-- documents at all — which is why nothing appeared on Who owes what.
--
-- It also holds two grants for entities that no longer exist — shipment and
-- transporter, from the logistics module that was cut. A grant on an entity
-- nothing defines can never be exercised, but it is misleading in a role
-- editor, so it goes.
--
-- THE UNDERLYING GAP, recorded rather than fixed here: a capability that gains
-- an entity does not update the roles of tenants already using it. Roles are
-- tenant data and a capability cannot rewrite them silently, so this is a
-- migration-of-configuration problem the platform does not yet have an answer
-- for. Task 71 is not the place to invent one.
-- ---------------------------------------------------------------------------

INSERT INTO permission (id, tenant_id, role_id, verb, entity, scope, created_at)
SELECT gen_random_uuid(), r.tenant_id, r.id, v.verb::"PermissionVerb", e.entity,
       'Tenant'::"PermissionScope", now()
  FROM role r
 CROSS JOIN (VALUES
   ('verity.plywood.business_profile'),
   ('verity.plywood.gst_registration'),
   ('verity.plywood.accounting_period')
 ) AS e(entity)
 CROSS JOIN (VALUES ('Read'), ('Create'), ('Edit'), ('ActionExecute')) AS v(verb)
 WHERE
   -- Only roles that already administer this capability's money side. A
   -- warehouse role holding stock grants must not acquire the power to
   -- re-register the business for GST.
   EXISTS (
     SELECT 1 FROM permission p
      WHERE p.role_id = r.id
        AND p.entity = 'verity.plywood.invoice'
        AND p.verb = 'Create'::"PermissionVerb"
   )
   AND NOT EXISTS (
     SELECT 1 FROM permission p
      WHERE p.role_id = r.id
        AND p.entity = e.entity
        AND p.verb = v.verb::"PermissionVerb"
   );

DELETE FROM permission
 WHERE entity IN ('verity.plywood.shipment', 'verity.plywood.transporter');
