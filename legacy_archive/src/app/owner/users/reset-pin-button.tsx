"use client";

import { useState } from "react";
import { Loader2, KeyRound, CheckCircle2, MessageCircle, X } from "lucide-react";
import { Button, Card } from "@/components/ui/primitives";
import { resetEmployeePin } from "@/server/actions/employee";
import { toast } from "@/components/ui/toast";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

export function ResetPinButton({ userId, phone, name }: { userId: string, phone: string, name: string }) {
  const [loading, setLoading] = useState(false);
  const [successData, setSuccessData] = useState<{pin: string} | null>(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  const handleReset = () => {
    setIsConfirmOpen(true);
  };

  const executeReset = async () => {
    setIsConfirmOpen(false);
    setLoading(true);
    const res = await resetEmployeePin(userId);
    setLoading(false);

    if (res?.success && res.pin) {
      setSuccessData({ pin: res.pin });
    } else {
      toast.error(res?.error || "Failed to reset PIN");
    }
  };

  const handleWhatsApp = () => {
    if (!successData) return;
    const loginUrl = window.location.origin;
    const text = encodeURIComponent(`Hi ${name},\nYour PIN has been reset.\n\nPhone: ${phone}\nNew PIN: ${successData.pin}\n\nLogin here:\n${loginUrl}`);
    window.open(`https://wa.me/${phone}?text=${text}`, '_blank');
  };

  return (
    <>
      <button 
        onClick={handleReset}
        disabled={loading}
        className="w-full mt-3 rounded-xl bg-surface-secondary hover:bg-border border border-border p-2.5 text-xs font-bold text-text-primary flex items-center justify-center gap-2 transition-colors disabled:opacity-50 cursor-pointer"
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
        Reset PIN
      </button>

      {successData && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-md animate-in fade-in">
          <div className="w-full max-w-sm animate-in zoom-in-95 duration-300">
            <Card className="p-0 overflow-hidden border-2 border-white/60">
              <div className="flex items-center justify-between p-4 border-b border-neutral-700/60 bg-neutral-800">
                <h3 className="font-bold text-white">PIN Reset Successful</h3>
                <button onClick={() => setSuccessData(null)} className="text-text-tertiary hover:text-white cursor-pointer"><X className="w-5 h-5"/></button>
              </div>
              <div className="p-6 text-center space-y-4 bg-neutral-900">
                <CheckCircle2 className="w-12 h-12 text-success mx-auto animate-bounce" />
                <p className="text-sm font-medium text-text-secondary">New PIN for {name}</p>
                <div className="bg-black border border-white/60 rounded-xl p-4">
                  <p className="text-4xl tracking-widest font-mono font-bold text-white">{successData.pin}</p>
                </div>
                <button 
                  onClick={handleWhatsApp} 
                  className="w-full h-[44px] inline-flex items-center justify-center gap-2 rounded-[12px] border border-[#25D366]/60 bg-transparent text-[#25D366] hover:bg-[#25D366]/8 hover:border-[#25D366] transition-all duration-200 font-semibold text-sm cursor-pointer"
                >
                  <MessageCircle className="w-5 h-5" /> Share on WhatsApp
                </button>
              </div>
            </Card>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={isConfirmOpen}
        title="Reset PIN?"
        description={`Are you sure you want to reset the PIN for ${name}?`}
        confirmLabel="Reset"
        onConfirm={executeReset}
        onCancel={() => setIsConfirmOpen(false)}
      />
    </>
  );
}
