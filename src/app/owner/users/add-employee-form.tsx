"use client";

import { useState } from "react";
import { Plus, Loader2, X, ShieldAlert, CheckCircle2, MessageCircle, MessageSquare } from "lucide-react";
import { Button, Card, Select } from "@/components/ui/primitives";
import { createEmployee } from "@/server/actions/employee";
import { SystemRole } from "@prisma/client";

export function AddEmployeeForm() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successData, setSuccessData] = useState<{phone: string, pin: string, name: string} | null>(null);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<SystemRole>("WORKER");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await createEmployee({ name, phone, role });
    setLoading(false);

    if (res.error) {
      setError(res.error);
    } else if (res.success && res.phone && res.pin) {
      setSuccessData({
        phone: res.phone,
        pin: res.pin,
        name: name,
      });
      setName("");
      setPhone("");
      setRole("WORKER");
    }
  };

  const closeForm = () => {
    setOpen(false);
    setSuccessData(null);
    setName("");
    setPhone("");
    setRole("WORKER");
    setError("");
  };

  const getShareText = () => {
    if (!successData) return "";
    const loginUrl = window.location.origin;
    return `Welcome to Verity!\n\nHi ${successData.name},\nYour Factory OS Login:\nPhone: ${successData.phone}\nPIN: ${successData.pin}\n\nStart your work here:\n${loginUrl}`;
  };

  const handleWhatsApp = () => {
    if (!successData) return;
    const text = encodeURIComponent(getShareText());
    window.open(`https://wa.me/${successData.phone}?text=${text}`, '_blank');
  };

  const handleSMS = () => {
    if (!successData) return;
    const text = encodeURIComponent(getShareText());
    window.open(`sms:${successData.phone}?body=${text}`, '_blank');
  };

  return (
    <>
      <Button variant="primary" onClick={() => setOpen(true)} className="px-6 rounded-2xl shadow-neu">
        <Plus className="mr-2 h-5 w-5" /> Add Team Member
      </Button>

      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-md animate-in zoom-in-95 duration-300">
            <Card className="p-0 overflow-hidden border-2 border-white/60">
              <div className="flex items-center justify-between p-6 border-b border-white/40 bg-white/30">
                <h2 className="text-xl font-bold text-text-primary tracking-tight">
                  {successData ? `${successData.name} Added ✓` : "Add Team Member"}
                </h2>
                <button 
                  onClick={closeForm} 
                  className="text-text-tertiary hover:text-text-primary bg-white/50 hover:bg-white p-2 rounded-full transition-all"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              
              {successData ? (
                <div className="p-6 space-y-6 text-center">
                  <div className="flex justify-center mb-2">
                    <div className="bg-success-soft p-3 rounded-full text-success">
                      <CheckCircle2 className="h-10 w-10" />
                    </div>
                  </div>
                  <p className="text-text-secondary">Please share these login details with them.</p>
                  
                  <div className="bg-surface-2 border border-border rounded-xl p-4 text-left space-y-4">
                    <div>
                      <p className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-1">Phone Number</p>
                      <p className="text-2xl font-mono font-bold text-brand">{successData.phone}</p>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-1">4-Digit PIN</p>
                      <p className="text-3xl tracking-widest font-mono font-bold text-text-primary">{successData.pin}</p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button onClick={handleWhatsApp} className="flex-1 flex items-center justify-center gap-2 bg-[#25D366] text-white hover:bg-[#20bd5a] py-3 rounded-xl font-semibold transition-colors">
                      <MessageCircle className="w-5 h-5" /> WhatsApp
                    </button>
                    <button onClick={handleSMS} className="flex-1 flex items-center justify-center gap-2 bg-slate-800 text-white hover:bg-slate-900 py-3 rounded-xl font-semibold transition-colors">
                      <MessageSquare className="w-5 h-5" /> SMS
                    </button>
                  </div>

                  <Button type="button" variant="secondary" onClick={closeForm} className="w-full">
                    Done
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                  {error && (
                    <div className="bg-danger-soft/50 text-danger-dark px-4 py-3 rounded-xl text-sm font-semibold border border-danger/20 flex items-start gap-2">
                      <ShieldAlert className="w-5 h-5 shrink-0" />
                      <span>{error}</span>
                    </div>
                  )}

                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider">Full Name *</label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-4 py-3 bg-white/60 border border-white/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand/50 font-medium text-text-primary shadow-sm transition-all"
                      placeholder="e.g. Amit Kumar"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider">Phone Number *</label>
                    <input
                      type="tel"
                      required
                      value={phone}
                      maxLength={10}
                      onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                      className="w-full px-4 py-3 bg-white/60 border border-white/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand/50 font-medium text-text-primary shadow-sm transition-all"
                      placeholder="e.g. 9876543210"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider">Role</label>
                    <Select
                      value={role}
                      onChange={(e) => setRole(e.target.value as SystemRole)}
                      className="w-full px-4 py-3 bg-white/60 border border-white/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand/50 font-medium text-text-primary shadow-sm transition-all"
                    >
                      <option value="WORKER">Worker (Doer)</option>
                      <option value="SUPERVISOR">Supervisor (Department head / QC reviewer)</option>
                    </Select>
                  </div>

                  <div className="pt-2 flex gap-3">
                    <Button type="button" variant="secondary" onClick={closeForm} className="flex-1">
                      Cancel
                    </Button>
                    <Button type="submit" variant="primary" disabled={loading} className="flex-1">
                      {loading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
                      {loading ? 'Creating...' : 'Create Login'}
                    </Button>
                  </div>
                </form>
              )}
            </Card>
          </div>
        </div>
      )}
    </>
  );
}
