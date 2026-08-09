import { getPassportData } from '@/server/actions/verify'
import { notFound } from 'next/navigation'
import { PassportCard } from './PassportCard'
import { VerifiedMoment } from './VerifiedMoment'
import { VerificationPanel } from './VerificationPanel'
import { BRAND_ACCENT } from "@/lib/brand";

export default async function QualityPassportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data: any = await getPassportData(id)
  
  if (!data) notFound()

  const siteUrl = 'https://verity.theverityai.xyz'
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(`${siteUrl}/verify/${id}`)}`

  const submissions = data.inspection.submissions || []
  const themeColor = data.factory.settings?.themeColor || BRAND_ACCENT;

  // Gather all photos for the evidence gallery: the QC inspection's evidence
  // plus everything captured on the floor during production (before/after shots
  // and per-checkpoint photos from each stage).
  const qcEvidences = submissions.flatMap((sub: any) =>
    (sub.evidences || []).map((ev: any) => ({
      ...ev,
      checkpointName: sub.checkpoint.name
    }))
  )
  const allEvidences = [...(data.stagePhotos ?? []), ...qcEvidences]

  return (
    <div className="min-h-screen bg-[#F5F5F7] dark:bg-black py-8 px-4 md:py-16 font-sans relative w-full max-w-full min-w-0">
      {/* Scroll & Print overrides */}
      <style dangerouslySetInnerHTML={{ __html: `
        html, body {
          height: auto !important;
          overflow: auto !important;
          overflow-x: hidden !important;
        }
        @media print {
          html, body {
            background: white !important;
            color: black !important;
            height: auto !important;
            overflow: visible !important;
          }
          .print\\:hidden {
            display: none !important;
          }
        }
      ` }} />

      {/* Theme Accent override */}
      {themeColor && (
        <style dangerouslySetInnerHTML={{ __html: `
          :root {
            --accent: ${themeColor};
            --accent-soft: ${themeColor}1f;
          }
        ` }} />
      )}

      {/* Decorative spotlights */}
      <div className="absolute top-[10%] left-[50%] -translate-x-1/2 w-[600px] h-[600px] bg-[var(--accent)]/5 dark:bg-[var(--accent)]/10 blur-[140px] rounded-full pointer-events-none z-0" />
      
      <div className="max-w-[1200px] mx-auto relative z-10 min-w-0 space-y-8">
        
        {/* Verified Moment (Apple Pay style success moment) */}
        <VerifiedMoment count={submissions.length} />

        {/* ==================================================
            DESKTOP VIEW (md and up)
            ================================================== */}
        <div className="hidden md:grid gap-8 grid-cols-[1fr_360px] items-stretch min-w-0">
          
          {/* Left Column: Wallet Card */}
          <div className="min-w-0">
            {/* Apple Wallet Card Wrapper */}
            <PassportCard data={data} />
          </div>

          {/* Right Column: Sticky Verification Info & Actions */}
          <div className="sticky top-6 shrink-0 h-[calc(100%-1.5rem)]">
            <VerificationPanel 
              data={data}
              qrCodeUrl={qrCodeUrl}
              url={`${siteUrl}/verify/${id}`}
              submissions={submissions}
              allEvidences={allEvidences}
            />
          </div>
        </div>

        {/* ==================================================
            MOBILE VIEW (under md)
            ================================================== */}
        <div className="block md:hidden space-y-6 min-w-0">
          {/* Interactive Passport Card */}
          <PassportCard data={data} />

          {/* Verification Details & QR Panel */}
          <VerificationPanel 
            data={data}
            qrCodeUrl={qrCodeUrl}
            url={`${siteUrl}/verify/${id}`}
            submissions={submissions}
            allEvidences={allEvidences}
          />
        </div>

      </div>
    </div>
  )
}
