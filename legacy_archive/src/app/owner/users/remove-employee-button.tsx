"use client";

import { useState } from "react";
import { Loader2, Trash2, X, AlertTriangle } from "lucide-react";
import { Button, Card, Input } from "@/components/ui/primitives";
import { removeEmployee } from "@/server/actions/employee";
import { toast } from "@/components/ui/toast";

export function RemoveEmployeeButton({ userId, name, role }: { userId: string, name: string, role: string }) {
  const [open, setOpen] = useState(false);
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleRemove = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pin) {
      setError("Please enter your owner PIN");
      return;
    }

    setLoading(true);
    setError("");
    const res = await removeEmployee(userId, pin);
    setLoading(false);

    if (res?.success) {
      if (res.warning) {
        toast.info(res.warning);
      }
      setOpen(false);
    } else {
      setError(res?.error || "Failed to remove employee");
    }
  };

  if (role === "OWNER") return null;

  return (
    <>
      <button 
        onClick={() => setOpen(true)}
        className="w-full mt-2 rounded-xl bg-danger-soft hover:bg-danger/20 border border-danger/20 p-2.5 text-xs font-bold text-danger flex items-center justify-center gap-2 transition-colors"
      >
        <Trash2 className="w-4 h-4" />
        Remove
      </button>

      {open && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 p-4 backdrop-blur-md animate-in fade-in">
          <div className="w-full max-w-sm animate-in zoom-in-95 duration-300">
            <Card className="p-0 overflow-hidden border border-border">
              <div className="flex items-center justify-between p-4 border-b border-border bg-surface-2">
                <div className="flex items-center gap-2 text-danger">
                  <AlertTriangle className="w-5 h-5" />
                  <h3 className="font-bold text-text-primary">Remove Employee</h3>
                </div>
                <button onClick={() => setOpen(false)} className="text-text-tertiary hover:text-text-primary cursor-pointer"><X className="w-5 h-5"/></button>
              </div>
              <form onSubmit={handleRemove} className="p-6 space-y-4 bg-surface">
                <p className="text-sm font-medium text-text-secondary">
                  Are you sure you want to remove <strong>{name}</strong> from the factory?
                </p>
                
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-text-tertiary">Confirm Owner PIN</label>
                  <Input 
                    type="password" 
                    placeholder="Enter your PIN to confirm" 
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    autoFocus
                  />
                  {error && <p className="text-xs text-danger">{error}</p>}
                </div>
                
                <div className="flex gap-3 mt-6">
                  <Button variant="secondary" className="flex-1" onClick={() => setOpen(false)} type="button">Cancel</Button>
                  <Button type="submit" className="flex-1 bg-danger hover:bg-danger text-white border-transparent" disabled={loading}>
                    {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                    Remove
                  </Button>
                </div>
              </form>
            </Card>
          </div>
        </div>
      )}
    </>
  );
}
