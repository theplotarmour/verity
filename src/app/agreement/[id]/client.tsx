"use client";

import { useState } from "react";
import { 
  Card, Badge, Button, Input, SectionHeading 
} from "@/components/ui/primitives";
import { 
  CheckCircle, FileText, Calendar, Landmark, ShieldCheck, HeartHandshake, LogIn
} from "lucide-react";
import { acceptAgreement } from "@/server/actions/hq";

type AgreementType = {
  id: string;
  factoryName: string;
  ownerName: string;
  phone: string;
  modules: any; // Json array
  setupFee: number;
  monthlyFee: number;
  status: string;
  acceptedAt: Date | null;
  signature: string | null;
  factoryId: string | null;
};

export default function AgreementPortalClient({ agreement }: { agreement: AgreementType }) {
  const [signature, setSignature] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(agreement.status);
  const [factoryId, setFactoryId] = useState(agreement.factoryId);
  const [error, setError] = useState<string | null>(null);

  const modulesList = typeof agreement.modules === "string" 
    ? JSON.parse(agreement.modules) 
    : (agreement.modules || []);

  const handleSignContract = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreed || !signature) return;

    setLoading(true);
    setError(null);
    try {
      const res = await acceptAgreement(agreement.id, signature);
      if (res.success && res.factoryId) {
        setStatus("ACCEPTED");
        setFactoryId(res.factoryId);
      } else {
        setError(res.error || "Failed to sign contract");
      }
    } catch (err: any) {
      setError(err.message || "Failed to sign contract");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-text-primary py-12 px-4 md:px-8 flex justify-center items-center">
      <div className="max-w-3xl w-full space-y-8">
        
        {/* Partnership contract card */}
        {status !== "ACCEPTED" ? (
          <Card className="p-6 md:p-10 border border-border bg-surface/50 backdrop-blur-md shadow-xl rounded-[28px] space-y-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-border pb-6 gap-4">
              <div>
                <Badge variant="default" className="mb-2">Awaiting Acceptance</Badge>
                <h1 className="text-2xl font-bold tracking-tight">Verity Partnership Agreement</h1>
                <p className="text-xs text-text-secondary mt-1">Factory Digital Transformation Agreement</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-text-secondary">Prepared For</p>
                <p className="text-sm font-bold text-text-primary">{agreement.factoryName}</p>
                <p className="text-xs font-semibold text-text-secondary mt-0.5">{agreement.ownerName}</p>
              </div>
            </div>

            {/* Error alerts */}
            {error && (
              <div className="p-4 bg-danger-soft/40 border border-danger/10 rounded-2xl text-xs text-danger font-semibold">
                {error}
              </div>
            )}

            {/* Section 1: Summary */}
            <div className="space-y-3">
              <SectionHeading title="1. Project Summary" />
              <p className="text-xs text-text-secondary leading-relaxed">
                Verity will digitize the end-to-end manufacturing and quality verification operations of {agreement.factoryName}. This implementation connects raw materials to dynamic products, tracking workflows from design to customer dispatch.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                {[
                  "Dynamic order attributes database",
                  "Sequential department workflows",
                  "Quality check checkpoint validations",
                  "PWA offline worker checklists",
                  "Public QR-verified passports"
                ].map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-xs text-text-secondary">
                    <CheckCircle className="h-4 w-4 text-brand shrink-0" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Section 2: Modules Enabled */}
            <div className="space-y-3">
              <SectionHeading title="2. Implementation Scope" />
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {modulesList.map((mod: string, idx: number) => (
                  <div key={idx} className="p-3 border border-border bg-surface-2 rounded-xl text-center space-y-1">
                    <FileText className="h-5 w-5 text-brand mx-auto" />
                    <p className="text-[10px] font-bold uppercase tracking-wider text-text-primary mt-1">{mod}</p>
                    <span className="text-[8px] font-semibold text-success block">✓ Enabled</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Section 3: Timeline */}
            <div className="space-y-3">
              <SectionHeading title="3. Project Timeline" />
              <div className="relative border-l border-border pl-6 space-y-4 text-xs ml-2">
                <div className="relative">
                  <div className="absolute -left-[30px] top-0.5 h-4 w-4 rounded-full bg-brand border-4 border-surface" />
                  <p className="font-bold text-text-primary">Day 1: Blueprint Configuration</p>
                  <p className="text-text-secondary text-[11px] mt-0.5">Collect existing Excel and Drive data. Define custom products catalog and field schemas.</p>
                </div>
                <div className="relative">
                  <div className="absolute -left-[30px] top-0.5 h-4 w-4 rounded-full bg-brand border-4 border-surface" />
                  <p className="font-bold text-text-primary">Day 2-3: Pipeline Setup</p>
                  <p className="text-text-secondary text-[11px] mt-0.5">Map custom departments sequence (Office → Production → QC → Packaging) and stage gates.</p>
                </div>
                <div className="relative">
                  <div className="absolute -left-[30px] top-0.5 h-4 w-4 rounded-full bg-brand border-4 border-surface" />
                  <p className="font-bold text-text-primary">Day 4-5: Onboard Team & Testing</p>
                  <p className="text-text-secondary text-[11px] mt-0.5">Generate worker PIN credentials and run test checklists on mobile client.</p>
                </div>
                <div className="relative">
                  <div className="absolute -left-[30px] top-0.5 h-4 w-4 rounded-full bg-success border-4 border-surface" />
                  <p className="font-bold text-text-primary">Day 7: Live Digitized Operations</p>
                  <p className="text-text-secondary text-[11px] mt-0.5">Deploy platform to production. Enable customer verification passports.</p>
                </div>
              </div>
            </div>

            {/* Section 4: Pricing */}
            <div className="space-y-3">
              <SectionHeading title="4. Commercial Pricing Terms" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 border border-border bg-surface-2 rounded-2xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Landmark className="h-5 w-5 text-brand" />
                    <div>
                      <p className="text-xs font-semibold text-text-secondary">Implementation Setup Fee</p>
                      <h4 className="text-lg font-bold mt-0.5">₹{agreement.setupFee.toLocaleString("en-IN")}</h4>
                    </div>
                  </div>
                  <Badge variant="neutral">One-Time</Badge>
                </div>

                <div className="p-4 border border-border bg-surface-2 rounded-2xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Calendar className="h-5 w-5 text-brand" />
                    <div>
                      <p className="text-xs font-semibold text-text-secondary">Monthly SaaS Subscription</p>
                      <h4 className="text-lg font-bold mt-0.5">₹{agreement.monthlyFee.toLocaleString("en-IN")}</h4>
                    </div>
                  </div>
                  <Badge variant="neutral">Billed Monthly</Badge>
                </div>
              </div>
            </div>

            {/* Section 5: Data Ownership & Security */}
            <div className="space-y-3">
              <SectionHeading title="5. Data Ownership & Responsibilities" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-text-secondary leading-relaxed">
                <div className="p-4 border border-border/40 rounded-2xl space-y-2">
                  <p className="font-bold text-text-primary flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-success" /> Factory Data Ownership
                  </p>
                  <p className="text-[11px]">
                    The factory owns 100% of their operational database records, customer contact details, uploaded camera images, and quality results reports.
                  </p>
                </div>
                <div className="p-4 border border-border/40 rounded-2xl space-y-2">
                  <p className="font-bold text-text-primary flex items-center gap-2">
                    <HeartHandshake className="h-4 w-4 text-brand" /> Verity Platform Scope
                  </p>
                  <p className="text-[11px]">
                    Verity owns the software codebase, infrastructure hosting, maintenance, and delivers future feature upgrades as part of the monthly subscription.
                  </p>
                </div>
              </div>
            </div>

            {/* Signature Acceptance Box */}
            <form onSubmit={handleSignContract} className="border-t border-border pt-6 space-y-4">
              <label className="flex items-start gap-3 cursor-pointer text-xs text-text-secondary">
                <input 
                  type="checkbox" 
                  checked={agreed}
                  onChange={e => setAgreed(e.target.checked)}
                  required
                  className="h-4 w-4 rounded accent-brand border-border mt-0.5 cursor-pointer"
                />
                <span>
                  I accept the Verity partnership scope, pricing terms, and confirm that I have the authority to activate digital operations for {agreement.factoryName}.
                </span>
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-text-secondary uppercase tracking-wider">Owner Signature (Type Name)</label>
                  <Input 
                    placeholder="Rahul Sharma" 
                    value={signature} 
                    onChange={e => setSignature(e.target.value)} 
                    required 
                  />
                </div>
                <Button 
                  type="submit" 
                  disabled={loading || !agreed || !signature}
                  className="bg-brand text-white font-bold h-12 rounded-2xl w-full"
                >
                  {loading ? "Activating Workspace..." : "Accept & Launch Factory OS"}
                </Button>
              </div>
            </form>
          </Card>
        ) : (
          <Card className="p-8 border border-border bg-surface/50 backdrop-blur-md shadow-2xl rounded-[32px] text-center space-y-6">
            <div className="inline-flex p-4 bg-success-soft text-success rounded-full">
              <CheckCircle className="h-12 w-12" />
            </div>
            
            <div className="space-y-2">
              <h2 className="text-2xl font-bold tracking-tight">Factory Activated Successfully!</h2>
              <p className="text-xs text-text-secondary">
                Agreement signed on {new Date().toLocaleDateString("en-IN", {day: "numeric", month: "short", year: "numeric"})}.
              </p>
            </div>

            <div className="bg-surface border border-border/40 p-5 rounded-2xl text-left space-y-3 max-w-md mx-auto">
              <h4 className="text-xs font-bold uppercase tracking-wider text-text-secondary">Your Credentials</h4>
              <div className="text-xs space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-text-secondary">Workspace ID:</span> 
                  <span className="font-bold text-text-primary">{factoryId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary">Admin Login PIN:</span> 
                  <span className="font-bold text-brand">1234</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary">Registered Phone:</span> 
                  <span className="font-bold text-text-primary">{agreement.phone}</span>
                </div>
              </div>
            </div>

            <p className="text-xs text-text-secondary max-w-sm mx-auto">
              Use the credentials above to login to the main Verity client console. Make sure to update your default PIN code inside Settings first.
            </p>

            <Button 
              onClick={() => window.location.href = "/"}
              className="bg-brand text-white font-bold h-12 px-8 rounded-2xl inline-flex items-center gap-2"
            >
              <LogIn className="h-4 w-4" /> Go to Login Screen
            </Button>
          </Card>
        )}
      </div>
    </div>
  );
}
