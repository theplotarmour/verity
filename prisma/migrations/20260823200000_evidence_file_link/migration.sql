-- AlterTable
ALTER TABLE "evidence" ADD COLUMN     "file_id" UUID;

-- AddForeignKey
ALTER TABLE "evidence" ADD CONSTRAINT "evidence_file_id_fkey" FOREIGN KEY ("file_id") REFERENCES "stored_file"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- Evidence may now reference a platform-managed artefact whose checksum is
-- frozen, rather than only an opaque external string. Both remain available:
-- some artefacts genuinely live elsewhere, and pretending otherwise would push
-- capabilities into storing a URL in a field meant for a file id.
--
-- A photo or document must carry one of the two. Evidence of a photograph with
-- no photograph attached is not evidence.
ALTER TABLE "evidence" ADD CONSTRAINT "evidence_artefact_present"
  CHECK ("kind" NOT IN ('Photo', 'Document') OR "file_id" IS NOT NULL OR "uri" IS NOT NULL);
