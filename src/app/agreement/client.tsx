"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  CheckCircle, FileText, Calendar, Landmark, ShieldCheck, HeartHandshake, LogIn, Factory, User, Phone, Signature, Sparkles, Building2, Smartphone
} from "lucide-react";
import { createAndSignAgreementDirect } from "@/server/actions/hq";

export default function AgreementPortalClientDirect() {
  const [factoryName, setFactoryName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [phone, setPhone] = useState("");
  const [signature, setSignature] = useState("");
  const [agreed, setAgreed] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [successData, setSuccessData] = useState<{ factoryId: string; slug: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const modulesList = ["Production Board", "Quality Gates", "Public Passports"];

  const handleSignContract = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreed || !signature || !factoryName || !ownerName || !phone) return;

    setLoading(true);
    setLoadingStep(0);
    setError(null);

    // Simulated step progressions for premium loading experience
    const timer1 = setTimeout(() => setLoadingStep(1), 800);
    const timer2 = setTimeout(() => setLoadingStep(2), 1600);
    const timer3 = setTimeout(() => setLoadingStep(3), 2400);

    try {
      const res = await createAndSignAgreementDirect({
        factoryName,
        ownerName,
        phone,
        signature
      });

      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);

      if (res.success && res.factoryId && res.slug) {
        setSuccessData({ factoryId: res.factoryId, slug: res.slug });
      } else {
        setError(res.error || "Failed to sign contract");
        setLoading(false);
      }
    } catch (err: any) {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      setError(err.message || "Failed to sign contract");
      setLoading(false);
    }
  };

  const currentYear = new Date().getFullYear();

  return (
    <div className="relative min-h-screen bg-slate-950 text-slate-100 py-12 px-4 md:px-8 flex justify-center items-center overflow-hidden font-sans">
      
      {/* Background Decorative Blurs */}
      <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-indigo-900/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] rounded-full bg-emerald-950/10 blur-[120px] pointer-events-none" />
      
      {/* Noise overlay */}
      <div 
        className="absolute inset-0 opacity-[0.015] pointer-events-none mix-blend-overlay"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`
        }}
      />

      <div className="relative z-10 max-w-6xl w-full">
        <AnimatePresence mode="wait">
          {!loading && !successData ? (
            <motion.div 
              key="agreement-form"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start"
            >
              
              {/* Left Column: The Interactive Agreement Document */}
              <div className="lg:col-span-7 space-y-6">
                <div className="bg-slate-900/60 backdrop-blur-xl border border-white/5 shadow-2xl rounded-3xl p-6 md:p-8 space-y-6">
                  
                  {/* Document Header */}
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-white/5 pb-6 gap-4">
                    <div>
                      <div className="inline-flex items-center gap-1 bg-brand/10 border border-brand/25 px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider text-brand mb-2">
                        <Sparkles className="h-3 w-3" /> Ready to Activate
                      </div>
                      <h1 className="text-xl font-bold tracking-tight text-white">Verity Digitization Proposal</h1>
                      <p className="text-[10px] text-text-tertiary mt-0.5">Factory Digital Operating System & Quality Passport</p>
                    </div>
                    <div className="text-left sm:text-right">
                      <p className="text-[9px] font-bold text-text-secondary uppercase tracking-widest leading-none">FACTORY ENTITY</p>
                      <p className="text-xs font-black text-indigo-300 mt-1 min-h-[16px]">
                        {factoryName || "— [Pending Input]"}
                      </p>
                      <p className="text-[10px] text-text-tertiary mt-0.5 min-h-[14px]">
                        Owner: {ownerName || "—"}
                      </p>
                    </div>
                  </div>

                  {/* Section 1: Dynamic Summary */}
                  <div className="space-y-2">
                    <h3 className="text-xs font-black uppercase tracking-wider text-brand">1. Digitization Objectives</h3>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      Verity will transition the production, dispatch, and quality inspection registers of <span className="text-slate-100 font-bold">{factoryName || "[Your Factory Name]"}</span> from manual sheets into a highly responsive, real-time operating system.
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
                      {[
                        "Standard vehicle brand & model registers",
                        "Real-time cutting & stitching workflows",
                        "Automated checkpoints verification",
                        "Mobile-optimized inspector checking tools",
                        "Quality passport lookup portals"
                      ].map((item, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-[11px] text-slate-300">
                          <CheckCircle className="h-3.5 w-3.5 text-brand shrink-0" />
                          <span>{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Section 2: Enabled Modules */}
                  <div className="space-y-2">
                    <h3 className="text-xs font-black uppercase tracking-wider text-brand">2. Platform Modules</h3>
                    <div className="grid grid-cols-3 gap-3 pt-1">
                      {modulesList.map((mod, idx) => (
                        <div key={idx} className="p-3 border border-white/5 bg-slate-950/40 rounded-xl text-center space-y-1">
                          <FileText className="h-4 w-4 text-brand mx-auto" />
                          <p className="text-[10px] font-bold text-slate-200 mt-1">{mod}</p>
                          <span className="text-[8px] font-bold text-success block">✓ Included</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Section 3: Commercials */}
                  <div className="space-y-2">
                    <h3 className="text-xs font-black uppercase tracking-wider text-brand">3. Commercial Terms</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      <div className="p-3.5 border border-white/5 bg-slate-950/40 rounded-xl flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <Landmark className="h-4 w-4 text-brand" />
                          <div>
                            <p className="text-[9px] text-text-tertiary font-bold">Implementation & Setup</p>
                            <h4 className="text-sm font-black text-white mt-0.5">₹1,50,000</h4>
                          </div>
                        </div>
                        <span className="text-[8px] font-bold text-text-tertiary bg-white/5 px-1.5 py-0.5 rounded">One-time</span>
                      </div>
                      <div className="p-3.5 border border-white/5 bg-slate-950/40 rounded-xl flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <Calendar className="h-4 w-4 text-brand" />
                          <div>
                            <p className="text-[9px] text-text-tertiary font-bold">Monthly SaaS Subscription</p>
                            <h4 className="text-sm font-black text-white mt-0.5">₹18,000 / mo</h4>
                          </div>
                        </div>
                        <span className="text-[8px] font-bold text-text-tertiary bg-white/5 px-1.5 py-0.5 rounded">Billed monthly</span>
                      </div>
                    </div>
                  </div>

                  {/* Section 4: Data ownership */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-[10px] text-text-tertiary pt-2 border-t border-white/5">
                    <div className="space-y-1">
                      <p className="font-bold text-slate-200 flex items-center gap-1.5">
                        <ShieldCheck className="h-3.5 w-3.5 text-success" /> Data Ownership
                      </p>
                      <p className="leading-relaxed">
                        The factory retains 100% ownership of operations logs, supervisor metrics, check photos, and customer reports.
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="font-bold text-slate-200 flex items-center gap-1.5">
                        <HeartHandshake className="h-3.5 w-3.5 text-brand" /> Service SLA
                      </p>
                      <p className="leading-relaxed">
                        Verity provides hosting infrastructure, automatic backups, supervisor access control, and 99.9% application uptime.
                      </p>
                    </div>
                  </div>

                </div>
              </div>

              {/* Right Column: The Sign-off Form */}
              <div className="lg:col-span-5 space-y-6">
                
                {/* Form card */}
                <div className="bg-slate-900/60 backdrop-blur-xl border border-white/5 shadow-2xl rounded-3xl p-6 md:p-8 space-y-6">
                  <div>
                    <h2 className="text-lg font-bold text-white tracking-tight">Onboard Workspace</h2>
                    <p className="text-[11px] text-text-tertiary mt-1">Complete your registration to deploy the Verity factory OS.</p>
                  </div>

                  {error && (
                    <div className="p-3 bg-red-950/50 border border-danger/20 rounded-xl text-xs text-danger font-medium">
                      {error}
                    </div>
                  )}

                  <form onSubmit={handleSignContract} className="space-y-4">
                    {/* Factory Name */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider block">Factory Name</label>
                      <div className="relative">
                        <Building2 className="absolute left-3 top-3.5 h-4 w-4 text-text-secondary" />
                        <input 
                          type="text" 
                          placeholder="e.g. Maruti Auto Seat Covers" 
                          value={factoryName} 
                          onChange={e => setFactoryName(e.target.value)}
                          required
                          className="w-full bg-slate-950/60 border border-white/5 rounded-xl py-3 pl-10 pr-4 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand transition-colors"
                        />
                      </div>
                    </div>

                    {/* Owner Name */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider block">Owner Name</label>
                      <div className="relative">
                        <User className="absolute left-3 top-3.5 h-4 w-4 text-text-secondary" />
                        <input 
                          type="text" 
                          placeholder="e.g. Rahul Sharma" 
                          value={ownerName} 
                          onChange={e => setOwnerName(e.target.value)}
                          required
                          className="w-full bg-slate-950/60 border border-white/5 rounded-xl py-3 pl-10 pr-4 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand transition-colors"
                        />
                      </div>
                    </div>

                    {/* Phone Number */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider block">Owner Phone Number</label>
                      <div className="relative">
                        <Smartphone className="absolute left-3 top-3.5 h-4 w-4 text-text-secondary" />
                        <input 
                          type="tel" 
                          placeholder="e.g. +91 98765 43210" 
                          value={phone} 
                          onChange={e => setPhone(e.target.value)}
                          required
                          className="w-full bg-slate-950/60 border border-white/5 rounded-xl py-3 pl-10 pr-4 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand transition-colors"
                        />
                      </div>
                    </div>

                    {/* Typed Signature */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider block">Typed Digital Signature</label>
                      <div className="relative">
                        <Signature className="absolute left-3 top-3.5 h-4 w-4 text-text-secondary" />
                        <input 
                          type="text" 
                          placeholder="Type your name to sign" 
                          value={signature} 
                          onChange={e => setSignature(e.target.value)}
                          required
                          className="w-full bg-slate-950/60 border border-white/5 rounded-xl py-3 pl-10 pr-4 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand transition-colors"
                        />
                      </div>
                    </div>

                    {/* Legal Checkbox */}
                    <label className="flex items-start gap-2.5 cursor-pointer text-[10px] text-text-tertiary py-1">
                      <input 
                        type="checkbox" 
                        checked={agreed}
                        onChange={e => setAgreed(e.target.checked)}
                        required
                        className="h-3.5 w-3.5 rounded bg-slate-950 border-white/5 accent-indigo-500 text-brand mt-0.5 cursor-pointer"
                      />
                      <span>
                        I accept the digitization roadmap terms and verify that I am the authorized owner/delegate of this factory.
                      </span>
                    </label>

                    {/* Submit Button */}
                    <button 
                      type="submit" 
                      disabled={!agreed || !signature || !factoryName || !ownerName || !phone}
                      className="w-full bg-indigo-600 hover:bg-brand disabled:bg-indigo-900/30 disabled:text-text-secondary text-white font-bold h-11 rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-indigo-600/15 transition-all"
                    >
                      <Sparkles className="h-4 w-4" /> Activate Factory OS
                    </button>
                  </form>
                </div>
              </div>

            </motion.div>
          ) : loading && !successData ? (
            <motion.div 
              key="loading-state"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-900/60 backdrop-blur-xl border border-white/5 shadow-2xl rounded-3xl p-8 max-w-md w-full mx-auto text-center space-y-6"
            >
              <div className="relative h-16 w-16 mx-auto">
                <div className="absolute inset-0 rounded-full border-4 border-brand/10" />
                <div className="absolute inset-0 rounded-full border-4 border-t-indigo-500 animate-spin" />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-bold text-white">Deploying Verity Workspace</h3>
                <AnimatePresence mode="wait">
                  {loadingStep === 0 && (
                    <motion.p 
                      key="step-0" 
                      initial={{ opacity: 0, y: 5 }} 
                      animate={{ opacity: 1, y: 0 }} 
                      exit={{ opacity: 0, y: -5 }} 
                      className="text-xs text-text-tertiary"
                    >
                      Provisioning database server nodes...
                    </motion.p>
                  )}
                  {loadingStep === 1 && (
                    <motion.p 
                      key="step-1" 
                      initial={{ opacity: 0, y: 5 }} 
                      animate={{ opacity: 1, y: 0 }} 
                      exit={{ opacity: 0, y: -5 }} 
                      className="text-xs text-text-tertiary"
                    >
                      Seeding materials, colors, and car models...
                    </motion.p>
                  )}
                  {loadingStep === 2 && (
                    <motion.p 
                      key="step-2" 
                      initial={{ opacity: 0, y: 5 }} 
                      animate={{ opacity: 1, y: 0 }} 
                      exit={{ opacity: 0, y: -5 }} 
                      className="text-xs text-text-tertiary"
                    >
                      Generating default supervisor QC templates...
                    </motion.p>
                  )}
                  {loadingStep >= 3 && (
                    <motion.p 
                      key="step-3" 
                      initial={{ opacity: 0, y: 5 }} 
                      animate={{ opacity: 1, y: 0 }} 
                      exit={{ opacity: 0, y: -5 }} 
                      className="text-xs text-text-tertiary"
                    >
                      Configuring secure authorization credentials...
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          ) : (
            <motion.div 
              key="success-state"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-slate-900/60 backdrop-blur-xl border border-white/5 shadow-2xl rounded-3xl p-8 max-w-lg w-full mx-auto text-center space-y-6"
            >
              <div className="inline-flex p-4 bg-success/10 border border-success/25 text-success rounded-full">
                <CheckCircle className="h-10 w-10 animate-bounce" />
              </div>
              
              <div className="space-y-2">
                <h2 className="text-xl font-bold text-white tracking-tight">Factory Workspace Activated!</h2>
                <p className="text-xs text-text-tertiary">
                  Onboarding terms verified and agreement signed successfully.
                </p>
              </div>

              {/* Display Credentials */}
              <div className="bg-slate-950/60 border border-white/5 p-5 rounded-2xl text-left space-y-3 max-w-sm mx-auto">
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-text-secondary">Workspace Details</h4>
                <div className="text-xs space-y-2 font-mono">
                  <div className="flex justify-between border-b border-white/5 pb-1.5">
                    <span className="text-text-tertiary">Factory Slug:</span> 
                    <span className="font-bold text-brand">{successData?.slug}</span>
                  </div>
                  <div className="flex justify-between border-b border-white/5 pb-1.5">
                    <span className="text-text-tertiary">Owner Access PIN:</span> 
                    <span className="font-bold text-success">1234</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-tertiary">Workspace URL:</span> 
                    <span className="font-bold text-slate-200">/{successData?.slug}</span>
                  </div>
                </div>
              </div>

              <div className="text-[11px] text-text-tertiary max-w-xs mx-auto">
                Use the default PIN <span className="font-bold text-slate-200">1234</span> at the dashboard login screen. You can change this code inside profile settings.
              </div>

              <button 
                onClick={() => window.location.href = `/${successData?.slug}`}
                className="bg-indigo-600 hover:bg-brand text-white font-bold h-11 px-8 rounded-xl text-xs inline-flex items-center gap-2 cursor-pointer shadow-lg shadow-indigo-600/15 transition-all"
              >
                <LogIn className="h-4 w-4" /> Enter Factory Console
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
