"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createEmployee } from "@/server/actions/employee";
import { PageHeader } from "@/components/design/PageHeader";
import { Surface } from "@/components/design/Surface";
import { Button, Input, Badge } from "@/components/ui/primitives";
import { Loader2, ArrowLeft, CheckCircle2, MessageSquare, MessageCircle } from "lucide-react";
import Link from "next/link";
import type { Role } from "@prisma/client";

export default function NewUserPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [successData, setSuccessData] = useState<{ phone: string; pin: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    role: "WORKER" as Role,
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await createEmployee(formData);
    
    setLoading(false);
    
    if (res.error) {
      setError(res.error);
    } else if (res.success && res.phone && res.pin) {
      setSuccessData({ phone: res.phone, pin: res.pin });
    }
  }

  return (
    <div className="flex h-full flex-col space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/owner/users" className="p-2 hover:bg-surface-2 rounded-lg transition">
          <ArrowLeft className="h-5 w-5 text-text-secondary" />
        </Link>
        <PageHeader
          eyebrow="Team Management"
          title="Add New Member"
          description="Create a new worker or inspector account."
        />
      </div>

      <div className="flex-1 max-w-2xl">
        {successData ? (
          <Surface className="p-8 text-center space-y-4 border-success/20 bg-success-soft/10">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-success-soft">
              <CheckCircle2 className="h-8 w-8 text-success" />
            </div>
            <h2 className="text-xl font-semibold text-text-primary">Member Added Successfully</h2>
            <p className="text-text-secondary">Please share these login credentials securely.</p>
            
            <div className="bg-surface-2 p-6 rounded-2xl mt-6 inline-block text-left border border-border">
              <p className="text-sm text-text-secondary mb-1">Login Phone Number</p>
              <p className="font-mono text-xl text-text-primary font-bold tracking-wide">{successData.phone}</p>
              
              <div className="my-4 border-t border-border" />
              
              <p className="text-sm text-text-secondary mb-1">Temporary PIN</p>
              <p className="font-mono text-3xl text-brand font-bold tracking-widest">{successData.pin}</p>
            </div>

            <div className="flex justify-center gap-4 mt-6">
              <a href={`sms:?body=Login to Verity factory app.%0APhone: ${successData.phone}%0APIN: ${successData.pin}`} className="flex items-center gap-2 px-4 py-2 bg-surface-2 border border-border rounded-lg text-sm font-medium hover:bg-surface transition">
                <MessageSquare className="w-4 h-4" /> SMS
              </a>
              <a href={`https://wa.me/?text=Login to Verity factory app.%0APhone: ${successData.phone}%0APIN: ${successData.pin}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-4 py-2 bg-[#25D366]/10 text-[#128C7E] border border-[#25D366]/20 rounded-lg text-sm font-medium hover:bg-[#25D366]/20 transition dark:text-[#25D366]">
                <MessageCircle className="w-4 h-4" /> WhatsApp
              </a>
            </div>
            
            <div className="mt-8 pt-6">
              <Link href="/owner/users">
                <Button className="w-full sm:w-auto">Return to Team</Button>
              </Link>
            </div>
          </Surface>
        ) : (
          <Surface className="p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="p-4 rounded-xl bg-danger-soft text-danger text-sm font-medium">
                  {error}
                </div>
              )}
              
              <div className="space-y-2">
                <label className="block text-sm font-medium text-text-primary">Full Name</label>
                <Input 
                  required
                  placeholder="e.g. Rahul Kumar"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              
              <div className="space-y-2">
                <label className="block text-sm font-medium text-text-primary">Phone Number</label>
                <Input 
                  required
                  placeholder="10-digit mobile number"
                  type="tel"
                  maxLength={10}
                  value={formData.phone}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '');
                    setFormData({ ...formData, phone: val });
                  }}
                />
              </div>

              <div className="space-y-3">
                <label className="block text-sm font-medium text-text-primary">Role</label>
                <div className="grid grid-cols-2 gap-4">
                  <label className={`
                    relative flex cursor-pointer rounded-xl border p-4 transition-all
                    ${formData.role === "WORKER" ? "border-brand bg-brand-soft/20 shadow-sm" : "border-border bg-surface-2 hover:border-text-tertiary"}
                  `}>
                    <input 
                      type="radio" 
                      name="role" 
                      value="WORKER" 
                      className="sr-only"
                      checked={formData.role === "WORKER"}
                      onChange={() => setFormData({ ...formData, role: "WORKER" })}
                    />
                    <div>
                      <p className={`font-semibold text-sm ${formData.role === "WORKER" ? "text-brand-strong" : "text-text-primary"}`}>Worker</p>
                      <p className="text-xs text-text-secondary mt-1">Completes production tasks and assignments.</p>
                    </div>
                  </label>
                  
                  <label className={`
                    relative flex cursor-pointer rounded-xl border p-4 transition-all
                    ${formData.role === "SUPERVISOR" ? "border-success bg-success-soft/20 shadow-sm" : "border-border bg-surface-2 hover:border-text-tertiary"}
                  `}>
                    <input
                      type="radio"
                      name="role"
                      value="SUPERVISOR"
                      className="sr-only"
                      checked={formData.role === "SUPERVISOR"}
                      onChange={() => setFormData({ ...formData, role: "SUPERVISOR" })}
                    />
                    <div>
                      <p className={`font-semibold text-sm ${formData.role === "SUPERVISOR" ? "text-success" : "text-text-primary"}`}>Supervisor</p>
                      <p className="text-xs text-text-secondary mt-1">Runs a department; performs QC when supervising the QC department.</p>
                    </div>
                  </label>
                </div>
              </div>

              <div className="pt-4 border-t border-border flex justify-end gap-3">
                <Link href="/owner/users">
                  <Button type="button" variant="secondary">Cancel</Button>
                </Link>
                <Button type="submit" disabled={loading}>
                  {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  Create Member
                </Button>
              </div>
            </form>
          </Surface>
        )}
      </div>
    </div>
  );
}
