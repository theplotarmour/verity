-- ---------------------------------------------------------------------------
-- Task 106 Phase A: OutreachDomainGroup / OutreachDomain — the domain
-- taxonomy the outreach master prompt requires (§6: "DOMAIN GROUP -> DOMAIN
-- ... must be database-driven ... do not hardcode these values into random
-- UI components"). Adds a nullable domain_id on outreach_lead alongside the
-- pre-existing free-text `industry` column (kept, not dropped, for leads
-- created before this migration).
-- ---------------------------------------------------------------------------

CREATE TABLE "outreach_domain_group" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "outreach_domain_group_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "outreach_domain_group_tenant_id_name_key" ON "outreach_domain_group"("tenant_id", "name");

ALTER TABLE "outreach_domain_group" ADD CONSTRAINT "outreach_domain_group_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "outreach_domain" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "group_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "outreach_domain_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "outreach_domain_tenant_id_group_id_name_key" ON "outreach_domain"("tenant_id", "group_id", "name");

ALTER TABLE "outreach_domain" ADD CONSTRAINT "outreach_domain_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "outreach_domain" ADD CONSTRAINT "outreach_domain_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "outreach_domain_group"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "outreach_lead" ADD COLUMN "domain_id" UUID;
CREATE INDEX "outreach_lead_tenant_id_domain_id_idx" ON "outreach_lead"("tenant_id", "domain_id");
ALTER TABLE "outreach_lead" ADD CONSTRAINT "outreach_lead_domain_id_fkey" FOREIGN KEY ("domain_id") REFERENCES "outreach_domain"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- ROW LEVEL SECURITY (INV-001) — mutable, tenant-isolated, same shape as
-- outreach_team. Not append-only: a taxonomy entry can be renamed/reordered.
-- ---------------------------------------------------------------------------

ALTER TABLE "outreach_domain_group" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "outreach_domain_group" FORCE ROW LEVEL SECURITY;
CREATE POLICY "outreach_domain_group_isolation" ON "outreach_domain_group"
  USING ("tenant_id" = verity.current_tenant_id()) WITH CHECK ("tenant_id" = verity.current_tenant_id());

ALTER TABLE "outreach_domain" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "outreach_domain" FORCE ROW LEVEL SECURITY;
CREATE POLICY "outreach_domain_isolation" ON "outreach_domain"
  USING ("tenant_id" = verity.current_tenant_id()) WITH CHECK ("tenant_id" = verity.current_tenant_id());

-- ---------------------------------------------------------------------------
-- CAPABILITY REGISTRATION
-- ---------------------------------------------------------------------------

INSERT INTO "entity_definition" (key, capability, class, table_name, tenant_scoped) VALUES
  ('verity.outreach.domain_group', 'verity.capability.outreach', 'Persistent', 'outreach_domain_group', true),
  ('verity.outreach.domain', 'verity.capability.outreach', 'Persistent', 'outreach_domain', true)
ON CONFLICT (key) DO NOTHING;

UPDATE "capability_definition"
SET entity_types = array_cat(
  entity_types,
  ARRAY['verity.outreach.domain_group', 'verity.outreach.domain']::text[]
)
WHERE id = 'verity.capability.outreach'
  AND NOT ('verity.outreach.domain_group' = ANY(entity_types));

-- ---------------------------------------------------------------------------
-- PERMISSIONS — Read for every outreach role; Create/Edit reserved to
-- Founders' Office ("allow future Core-level taxonomy management" — master
-- prompt §6). Idempotent per (role, verb, entity, scope), same pattern as
-- 20260915170000's AI-insight grants.
-- ---------------------------------------------------------------------------

DO $$ DECLARE t uuid; BEGIN
  FOR t IN SELECT DISTINCT tenant_id FROM public.role WHERE name IN ('Founders'' Office', 'Senior Outreach Officer', 'Junior Outreach Officer') LOOP
    PERFORM set_config('verity.tenant_id', t::text, true);

    INSERT INTO public.permission (id, tenant_id, role_id, verb, entity, scope)
    SELECT gen_random_uuid(), r.tenant_id, r.id, v.verb::"PermissionVerb", e.entity, 'Tenant'::"PermissionScope"
      FROM public.role r
      CROSS JOIN (VALUES ('verity.outreach.domain_group'), ('verity.outreach.domain')) e(entity)
      CROSS JOIN (VALUES ('Read')) v(verb)
      WHERE r.tenant_id = t AND r.name IN ('Founders'' Office', 'Senior Outreach Officer', 'Junior Outreach Officer')
    ON CONFLICT (role_id, verb, entity, scope) DO NOTHING;

    INSERT INTO public.permission (id, tenant_id, role_id, verb, entity, scope)
    SELECT gen_random_uuid(), r.tenant_id, r.id, v.verb::"PermissionVerb", e.entity, 'Tenant'::"PermissionScope"
      FROM public.role r
      CROSS JOIN (VALUES ('verity.outreach.domain_group'), ('verity.outreach.domain')) e(entity)
      CROSS JOIN (VALUES ('Create'), ('Edit')) v(verb)
      WHERE r.tenant_id = t AND r.name = 'Founders'' Office'
    ON CONFLICT (role_id, verb, entity, scope) DO NOTHING;
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- SEED: the master prompt's 9 domain groups (§6), for every tenant that
-- already has the outreach capability installed. Idempotent — re-running
-- this migration's INSERTs (or a future re-seed) is a no-op past the first
-- application because of the (tenant_id, name) / (tenant_id, group_id, name)
-- unique constraints.
-- ---------------------------------------------------------------------------

DO $$
DECLARE
  t uuid;
  g_id uuid;
  g_rec RECORD;
  d_rec RECORD;
  groups_and_domains jsonb := '[
    {"group": "Retail & Commerce", "domains": ["Retail Stores","Supermarkets","Grocery Stores","Convenience Stores","Department Stores","Fashion Stores","Clothing Boutiques","Shoe Stores","Jewellery Stores","Electronics Stores","Furniture Stores","Home Decor Stores","Beauty Stores","Cosmetics Stores","Sports Stores","Bookstores","Gift Shops","Pet Stores","Hardware Stores","Auto Parts Stores"]},
    {"group": "Food & Hospitality", "domains": ["Restaurants","Cafés","Bakeries","Cloud Kitchens","Fast Food Businesses","Catering Businesses","Bars & Lounges","Hotels","Resorts","Hostels","Guest Houses","Travel Agencies","Tour Operators","Event Venues"]},
    {"group": "Professional Services", "domains": ["Law Firms","Accounting Firms","CA Firms","Consulting Firms","Marketing Agencies","Advertising Agencies","PR Agencies","Design Agencies","Architecture Firms","Interior Designers","Real Estate Agencies","Recruitment Agencies","Insurance Agencies","Financial Advisors","IT Services Companies"]},
    {"group": "Healthcare", "domains": ["Hospitals","Clinics","Dental Clinics","Dermatology Clinics","Physiotherapy Clinics","Diagnostic Labs","Pharmacies","Optical Stores","Veterinary Clinics","Mental Wellness Practices","Medical Distributors"]},
    {"group": "Education", "domains": ["Schools","Colleges","Universities","Coaching Institutes","Tuition Centres","Test Preparation Centres","EdTech Companies","Language Institutes","Skill Training Institutes","Music Schools","Dance Academies","Vocational Training Centres"]},
    {"group": "Real Estate & Construction", "domains": ["Real Estate Developers","Property Dealers","Property Management","Construction Companies","Contractors","Architects","Interior Design Firms","Home Builders","Facility Management","Building Material Suppliers"]},
    {"group": "Manufacturing & B2B", "domains": ["Manufacturers","Textile Manufacturers","Garment Manufacturers","Furniture Manufacturers","Chemical Manufacturers","Pharmaceutical Manufacturers","Food Manufacturers","Packaging Companies","Importers","Exporters","Wholesalers","Distributors","Industrial Suppliers"]},
    {"group": "Personal & Local Services", "domains": ["Salons","Spas","Gyms","Fitness Studios","Yoga Studios","Wedding Planners","Photographers","Car Rentals","Car Washes","Auto Repair Shops","Cleaning Services","Laundry Services","Repair Services","Printing Businesses","Tailors"]},
    {"group": "Digital & Technology", "domains": ["SaaS Companies","Software Agencies","Startups","E-commerce Businesses","Online Marketplaces","App Developers","Web Development Agencies","Cybersecurity Companies","Data Companies","AI Companies","Gaming Studios","Content Agencies","Creator Businesses"]}
  ]'::jsonb;
  g_order int;
  d_order int;
BEGIN
  FOR t IN SELECT DISTINCT tenant_id FROM public.role WHERE name = 'Founders'' Office' LOOP
    PERFORM set_config('verity.tenant_id', t::text, true);
    g_order := 0;
    FOR g_rec IN SELECT * FROM jsonb_array_elements(groups_and_domains) LOOP
      g_order := g_order + 1;

      SELECT id INTO g_id FROM public.outreach_domain_group WHERE tenant_id = t AND name = g_rec.value->>'group';
      IF g_id IS NULL THEN
        g_id := gen_random_uuid();
        INSERT INTO public.outreach_domain_group (id, tenant_id, name, "order")
        VALUES (g_id, t, g_rec.value->>'group', g_order);
      END IF;

      d_order := 0;
      FOR d_rec IN SELECT * FROM jsonb_array_elements_text(g_rec.value->'domains') AS d(value) LOOP
        d_order := d_order + 1;
        INSERT INTO public.outreach_domain (id, tenant_id, group_id, name, "order")
        VALUES (gen_random_uuid(), t, g_id, d_rec.value, d_order)
        ON CONFLICT (tenant_id, group_id, name) DO NOTHING;
      END LOOP;
    END LOOP;
  END LOOP;
END $$;
