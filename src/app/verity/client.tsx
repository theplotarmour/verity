"use client";

import { useState } from "react";
import { 
  Card, Badge, Button, Input, Select, SectionHeading 
} from "@/components/ui/primitives";
import { 
  Plus, Settings, User, Phone, CheckCircle, BarChart3, Database, Shield, Link, Copy, Check
} from "lucide-react";
import { createAgreement, updateOnboardingStatus } from "@/server/actions/hq";

type ClientType = {
  id: string;
  name: string;
  slug: string;
  industry: string | null;
  onboardingStatus: string;
  userCount: number;
  orderCount: number;
  setupFee: number;
  monthlyFee: number;
};

export default function VerityHQClient({ initialClients }: { initialClients: ClientType[] }) {
  const [clients, setClients] = useState<ClientType[]>(initialClients);
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Wizard state
  const [factoryName, setFactoryName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [phone, setPhone] = useState("");
  const [setupFee, setSetupFee] = useState(49999);
  const [monthlyFee, setMonthlyFee] = useState(9999);
  const [modules, setModules] = useState<string[]>([
    "Production OS",
    "Quality Verification",
    "Inventory",
    "Attendance"
  ]);

  const [loading, setLoading] = useState(false);
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);

  // Calculate statistics
  const totalMRR = clients.reduce((acc, c) => acc + c.monthlyFee, 0);
  const totalSetup = clients.reduce((acc, c) => acc + c.setupFee, 0);
  const activeCount = clients.length;
  const inSetup = clients.filter(c => c.onboardingStatus === "SETUP" || c.onboardingStatus === "CONFIGURATION").length;

  const handleCreateAgreement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!factoryName || !ownerName || !phone) return;

    setLoading(true);
    try {
      const res = await createAgreement({
        factoryName,
        ownerName,
        phone,
        modules,
        setupFee,
        monthlyFee,
        createdBy: "Verity_ADMIN",
      });

      if (res.success && res.agreementId) {
        const link = `${window.location.origin}/agreement/${res.agreementId}`;
        setGeneratedLink(link);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (link: string, id: string) => {
    navigator.clipboard.writeText(link);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCloseWizard = () => {
    setIsWizardOpen(false);
    setGeneratedLink(null);
    setFactoryName("");
    setOwnerName("");
    setPhone("");
  };

  const handleOnboardingAdvance = async (clientId: string, currentStatus: string) => {
    const sequence = ["LEAD", "SETUP", "CONFIGURATION", "TRAINING", "LIVE", "SUPPORT"];
    const currentIndex = sequence.indexOf(currentStatus);
    if (currentIndex === -1 || currentIndex === sequence.length - 1) return;

    const nextStatus = sequence[currentIndex + 1];
    const res = await updateOnboardingStatus(clientId, nextStatus);
    if (res.success) {
      setClients(prev => prev.map(c => c.id === clientId ? { ...c, onboardingStatus: nextStatus } : c));
    }
  };

  return (
    <div className="min-h-screen bg-background text-text-primary p-6 md:p-10 space-y-8">
      {/* Upper Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/40 pb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary flex items-center gap-2">
            <Shield className="h-6 w-6 text-brand" /> Verity HQ Internal Control Panel
          </h1>
          <p className="text-xs text-text-secondary mt-1">
            Provision workspaces, configure factory pipelines, and manage customer agreements.
          </p>
        </div>
        <Button onClick={() => setIsWizardOpen(true)} className="bg-brand text-white flex items-center gap-2">
          <Plus className="h-4 w-4" /> Deploy New Client
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="flex items-center gap-4 bg-surface/40 border border-border/40 hover:scale-[1.01] transition-transform duration-200">
          <div className="p-3 bg-brand/10 text-brand rounded-xl">
            <BarChart3 className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Total MRR</p>
            <h3 className="text-xl font-bold mt-0.5">₹{totalMRR.toLocaleString("en-IN")}</h3>
          </div>
        </Card>

        <Card className="flex items-center gap-4 bg-surface/40 border border-border/40 hover:scale-[1.01] transition-transform duration-200">
          <div className="p-3 bg-success-soft text-success rounded-xl">
            <CheckCircle className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Active Clients</p>
            <h3 className="text-xl font-bold mt-0.5">{activeCount} Factories</h3>
          </div>
        </Card>

        <Card className="flex items-center gap-4 bg-surface/40 border border-border/40 hover:scale-[1.01] transition-transform duration-200">
          <div className="p-3 bg-warning-soft text-warning rounded-xl">
            <Settings className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider">In Implementation</p>
            <h3 className="text-xl font-bold mt-0.5">{inSetup} Workspaces</h3>
          </div>
        </Card>

        <Card className="flex items-center gap-4 bg-surface/40 border border-border/40 hover:scale-[1.01] transition-transform duration-200">
          <div className="p-3 bg-brand/10 text-brand rounded-xl">
            <Database className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Total Setup Value</p>
            <h3 className="text-xl font-bold mt-0.5">₹{totalSetup.toLocaleString("en-IN")}</h3>
          </div>
        </Card>
      </div>

      {/* Main Board Layout */}
      <div className="grid grid-cols-1 gap-8">
        {/* Kanban Board of Client Deployments */}
        <div className="space-y-4">
          <SectionHeading 
            title="Implementation Pipeline" 
            description="Track setup progress, training adoption, and go-live operations." 
          />

          <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-6 gap-4">
            {["LEAD", "SETUP", "CONFIGURATION", "TRAINING", "LIVE", "SUPPORT"].map((status) => {
              const statusClients = clients.filter(c => c.onboardingStatus === status);

              return (
                <div key={status} className="bg-surface-2/40 border border-border/30 rounded-2xl p-4 flex flex-col min-h-[300px]">
                  <div className="flex items-center justify-between border-b border-border/30 pb-3 mb-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-text-secondary">{status}</h4>
                    <span className="text-[10px] font-bold px-2 py-0.5 bg-surface rounded-full text-text-secondary border border-border/20">
                      {statusClients.length}
                    </span>
                  </div>

                  <div className="space-y-3 flex-1 overflow-y-auto">
                    {statusClients.map((c) => (
                      <Card key={c.id} className="p-4 bg-surface border border-border/30 hover:shadow-md transition-shadow relative group">
                        <div className="space-y-2">
                          <div className="flex justify-between items-start">
                            <h5 className="font-bold text-sm tracking-tight">{c.name}</h5>
                            <Badge variant={status === "LIVE" ? "success" : "default"} className="text-[9px]">
                              {c.industry || "General"}
                            </Badge>
                          </div>
                          
                          <div className="text-[10px] space-y-1 text-text-secondary">
                            <div className="flex justify-between">
                              <span>Users:</span> <span className="font-semibold text-text-primary">{c.userCount}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Monthly Subscription:</span> <span className="font-semibold text-text-primary">₹{c.monthlyFee}</span>
                            </div>
                          </div>

                          {status !== "SUPPORT" && (
                            <Button 
                              onClick={() => handleOnboardingAdvance(c.id, c.onboardingStatus)}
                              className="w-full h-8 text-[11px] rounded-lg mt-2 font-bold"
                            >
                              Advance Stage
                            </Button>
                          )}
                        </div>
                      </Card>
                    ))}

                    {statusClients.length === 0 && (
                      <div className="h-full flex items-center justify-center text-center p-4 border border-dashed border-border/20 rounded-xl min-h-[120px]">
                        <p className="text-[10px] text-text-tertiary">No clients in this stage</p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Deployment Wizard Modal */}
      {isWizardOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface border border-border/40 rounded-3xl p-6 md:p-8 max-w-xl w-full shadow-2xl space-y-6 relative overflow-hidden">
            <div className="flex items-center justify-between border-b border-border/30 pb-4">
              <div>
                <h3 className="text-lg font-bold tracking-tight">Deploy New Client</h3>
                <p className="text-xs text-text-secondary">Setup the digital agreement and modules roadmap.</p>
              </div>
              <button onClick={handleCloseWizard} className="text-text-secondary hover:text-text-primary text-xl font-bold">×</button>
            </div>

            {!generatedLink ? (
              <form onSubmit={handleCreateAgreement} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-text-secondary uppercase tracking-wider">Factory/Company Name</label>
                  <Input 
                    placeholder="ABC Manufacturing" 
                    value={factoryName} 
                    onChange={e => setFactoryName(e.target.value)} 
                    required 
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-text-secondary uppercase tracking-wider">Owner Name</label>
                    <Input 
                      placeholder="Rahul Sharma" 
                      value={ownerName} 
                      onChange={e => setOwnerName(e.target.value)} 
                      required 
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-text-secondary uppercase tracking-wider">Owner Phone</label>
                    <Input 
                      placeholder="+91 99999 88888" 
                      value={phone} 
                      onChange={e => setPhone(e.target.value)} 
                      required 
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-text-secondary uppercase tracking-wider">Implementation Setup Fee</label>
                    <Input 
                      type="number"
                      placeholder="₹49,999" 
                      value={setupFee} 
                      onChange={e => setSetupFee(Number(e.target.value))} 
                      required 
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-text-secondary uppercase tracking-wider">Monthly SaaS Fee</label>
                    <Input 
                      type="number"
                      placeholder="₹9,999" 
                      value={monthlyFee} 
                      onChange={e => setMonthlyFee(Number(e.target.value))} 
                      required 
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-text-secondary uppercase tracking-wider block">Modules Enabled</label>
                  <div className="grid grid-cols-2 gap-3">
                    {["Production OS", "Quality Verification", "Inventory", "Attendance"].map((mod) => (
                      <label key={mod} className="flex items-center gap-2 text-xs cursor-pointer border border-border/40 p-2.5 rounded-xl hover:bg-surface-2 transition">
                        <input 
                          type="checkbox" 
                          checked={modules.includes(mod)}
                          onChange={() => {
                            if (modules.includes(mod)) {
                              setModules(prev => prev.filter(m => m !== mod));
                            } else {
                              setModules(prev => [...prev, mod]);
                            }
                          }}
                          className="h-4 w-4 accent-brand rounded border-border"
                        />
                        {mod}
                      </label>
                    ))}
                  </div>
                </div>

                <Button type="submit" disabled={loading} className="w-full bg-brand text-white font-bold h-12 rounded-2xl">
                  {loading ? "Generating Agreement..." : "Generate Partnership Agreement Link"}
                </Button>
              </form>
            ) : (
              <div className="space-y-6 py-4 text-center">
                <div className="inline-flex p-4 bg-success-soft text-success rounded-full">
                  <CheckCircle className="h-10 w-10" />
                </div>
                <div>
                  <h4 className="font-bold text-base text-text-primary">Agreement Generated Successfully!</h4>
                  <p className="text-xs text-text-secondary mt-1">Share this professional digital transformation contract link with the factory owner.</p>
                </div>

                <div className="bg-surface-2 border border-border/40 p-3 rounded-2xl flex items-center justify-between gap-3 text-left">
                  <span className="text-xs font-semibold text-text-secondary truncate flex-1">{generatedLink}</span>
                  <Button 
                    onClick={() => handleCopy(generatedLink, "link")}
                    className="h-9 px-3 rounded-xl border-border bg-surface shrink-0"
                  >
                    {copiedId === "link" ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4 text-text-secondary" />}
                  </Button>
                </div>

                <Button onClick={handleCloseWizard} className="w-full bg-surface-2 border border-border/60 hover:bg-surface-2/80 font-bold h-12 rounded-2xl">
                  Back to Board
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
