"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import {
  Crown, Shield, Wrench, ShieldAlert, KeyRound, Trash2,
  UserX, UserCheck, ArrowLeft, FileCheck, History, Check, Copy, Share2, ChevronDown
} from "lucide-react";
import { SystemRole, User, AuditLog } from "@prisma/client";
import { Surface } from "@/components/design/Surface";
import { Badge, Button, Input } from "@/components/ui/primitives";
import { PageHeader } from "@/components/design/PageHeader";
import {
  resetMemberPin,
  setMemberPin,
  toggleMemberActivation,
  removeMember,
  updateMemberRole
} from "@/server/actions/team";
import { can, Permission } from "@/lib/permissions";
import { cn } from "@/lib/utils";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { BRAND_URL } from "@/lib/brand";

export function MemberDetailClient({
  member,
  currentUser,
  orderCount,
  auditLogs
}: {
  member: User;
  currentUser: User;
  orderCount: number;
  auditLogs: AuditLog[];
}) {
  const router = useRouter();
  const [role, setRole] = useState<SystemRole>(member.role);
  const [isActive, setIsActive] = useState<boolean>(member.isActive);
  const [newPin, setNewPin] = useState<string | null>(null);
  const [customPin, setCustomPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isResetPinOpen, setIsResetPinOpen] = useState(false);
  const [isRemoveOpen, setIsRemoveOpen] = useState(false);

  const getRoleIcon = (r: SystemRole) => {
    switch (r) {
      case "OWNER": return <Crown className="h-4 w-4 text-warning" />;
      case "CO_OWNER": return <Crown className="h-4 w-4 text-orange-400" />;
      case "MANAGER": return <Shield className="h-4 w-4 text-brand" />;
      case "SUPERVISOR": return <ShieldAlert className="h-4 w-4 text-success" />;
      default: return <Wrench className="h-4 w-4 text-text-tertiary" />;
    }
  };

  const roleLabel = (r: SystemRole) => r.replace("_", " ").replace(/\b\w/g, c => c.toUpperCase());

  const permissionsSummary = (r: SystemRole): { desc: string; enabled: boolean }[] => {
    const list = [
      { key: "ACCESS_SETTINGS", label: "Change branding and factory profile" },
      { key: "CREATE_ORDER", label: "Create production" },
      { key: "MANAGE_TEAM", label: "Manage workforce and team members" },
      { key: "ACCESS_BILLING", label: "Access subscription billing data" },
      { key: "INSPECT_CHECKPOINT", label: "Perform quality control audits" },
      { key: "WORKER_JOBS", label: "Execute manufacturing floor tasks" }
    ] as { key: Permission; label: string }[];
    return list.map(item => ({ desc: item.label, enabled: can(r, item.key) }));
  };

  const handleRoleChange = async (newRole: SystemRole) => {
    if (!can(currentUser, "ASSIGN_ROLES")) { setError("You do not have permission to assign roles."); return; }
    setLoading(true); setError("");
    const res = await updateMemberRole(member.id, newRole);
    setLoading(false);
    if (res.error) { setError(res.error); } else { setRole(newRole); router.refresh(); }
  };

  const handleToggleActive = async () => {
    setLoading(true); setError("");
    const nextStatus = !isActive;
    const res = await toggleMemberActivation(member.id, nextStatus);
    setLoading(false);
    if (res.error) { setError(res.error); } else { setIsActive(nextStatus); router.refresh(); }
  };

  const handleResetPin = () => {
    setIsResetPinOpen(true);
  };

  const executeResetPin = async () => {
    setIsResetPinOpen(false);
    setLoading(true); setError("");
    const res = await resetMemberPin(member.id);
    setLoading(false);
    if (res.error) { setError(res.error); } else if (res.success && res.pin) { setNewPin(res.pin); }
  };

  const executeCustomPin = async () => {
    // PINs are always exactly 4 digits — the server enforces it too.
    if (!/^\d{4}$/.test(customPin.trim())) {
      setError("PIN must be exactly 4 digits");
      return;
    }
    setLoading(true); setError("");
    const res = await setMemberPin(member.id, customPin.trim());
    setLoading(false);
    if (res.error) {
      setError(res.error);
    } else if (res.success && res.pin) {
      setNewPin(res.pin);
      setCustomPin("");
    }
  };

  const handleRemove = () => {
    setIsRemoveOpen(true);
  };

  const executeRemove = async () => {
    setIsRemoveOpen(false);
    setLoading(true); setError("");
    const res = await removeMember(member.id);
    setLoading(false);
    if (res.error) { setError(res.error); } else { router.push("/owner/team"); router.refresh(); }
  };

  const handleCopyPin = () => {
    if (!newPin) return;
    navigator.clipboard.writeText(newPin);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const [copiedCreds, setCopiedCreds] = useState(false);
  const handleShareCredentials = () => {
    const text = `Verity Factory Access Details\nName: ${member.name}\nRole: ${roleLabel(role)}\nPhone: ${member.phone || "—"}\nWorkspace URL: ${BRAND_URL}`;
    if (navigator.share) {
      navigator.share({
        title: `Access details for ${member.name}`,
        text: text,
        url: BRAND_URL
      }).catch(err => console.log("Error sharing", err));
    } else {
      navigator.clipboard.writeText(text);
      setCopiedCreds(true);
      setTimeout(() => setCopiedCreds(false), 2000);
    }
  };

  return (
    <div className="flex flex-col min-h-[calc(100dvh-112px)] md:h-[calc(100vh-112px)] md:overflow-hidden space-y-4">

      {/* Back + header row */}
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:gap-4 shrink-0">
        <Link
          href="/owner/team"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-text-secondary hover:text-text-primary transition shrink-0 md:mt-1"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back
        </Link>
        <PageHeader
          eyebrow={roleLabel(role)}
          title={member.name}
          description={member.phone ? `Phone: ${member.phone}` : "No phone registered"}
          className="flex-1"
        />
        <div className="shrink-0 md:ml-auto md:mt-1">
          <span className={cn(
            "inline-flex items-center rounded-xl border px-3 py-1.5 text-xs font-semibold",
            isActive ? "bg-success-soft text-success border-success/10" : "bg-danger-soft text-danger border-danger/10"
          )}>
            {isActive ? "Active" : "Deactivated"}
          </span>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="bg-danger-soft text-danger p-3 rounded-2xl border border-danger/10 text-xs font-semibold shrink-0">
          {error}
        </div>
      )}

      {/* New PIN banner */}
      {newPin && (
        <div className="bg-success-soft/20 border border-success/15 p-4 rounded-2xl flex flex-col md:flex-row md:items-center md:justify-between gap-4 shrink-0">
          <div>
            <h4 className="text-sm font-bold text-success">New PIN Generated</h4>
            <p className="text-[10px] text-text-tertiary mt-0.5">Share this with {member.name}.</p>
            <p className="text-2xl font-black font-mono text-brand mt-2 tracking-wider">{newPin}</p>
          </div>
          <div className="flex flex-wrap gap-2 shrink-0 items-center">
            <Button variant="secondary" onClick={handleCopyPin} className="gap-1.5 shrink-0">
              {copied ? <><Check className="h-4 w-4 text-success" /> Copied</> : <><Copy className="h-4 w-4" /> Copy</>}
            </Button>
            {member.phone && (
              <>
                <a
                  href={`https://api.whatsapp.com/send?phone=${member.phone.replace(/\D/g, "").length === 10 ? `91${member.phone.replace(/\D/g, "")}` : member.phone.replace(/\D/g, "")}&text=${encodeURIComponent(`Hi ${member.name}, your Verity Factory Access PIN has been reset.\n\nURL: ${BRAND_URL}\nPIN: ${newPin}`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border border-success/25 bg-success/10 hover:bg-success/20 text-success dark:text-success px-4 text-xs font-bold transition shadow-sm cursor-pointer"
                >
                  Share via WhatsApp
                </a>
                <a
                  href={`sms:${member.phone.replace(/\D/g, "")}?body=${encodeURIComponent(`Hi ${member.name}, your Verity Factory Access PIN has been reset.\n\nURL: ${BRAND_URL}\nPIN: ${newPin}`)}`}
                  className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border border-brand/25 bg-brand/10 hover:bg-brand/20 text-blue-600 dark:text-brand px-4 text-xs font-bold transition shadow-sm cursor-pointer"
                >
                  Share via SMS
                </a>
              </>
            )}
          </div>
        </div>
      )}

      {/* Main 2-column layout grid */}
      <motion.div 
        initial="hidden"
        animate="show"
        variants={{
          hidden: {},
          show: {
            transition: {
              staggerChildren: 0.05
            }
          }
        }}
        className="grid grid-cols-1 lg:grid-cols-5 gap-6 flex-1 min-h-0 overflow-visible md:overflow-hidden"
      >

        {/* LEFT COLUMN: The Passport Card (Col span 2) */}
        <motion.div
          variants={{
            hidden: { opacity: 0, y: 15 },
            show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100, damping: 15 } }
          }}
          className="lg:col-span-2 flex flex-col h-full overflow-hidden"
        >
          <div className="flex flex-col h-full overflow-hidden rounded-[28px] bg-surface/50 backdrop-blur-md border border-border/40 shadow-sm">
            {/* Passport identity header */}
            <div className="p-5 md:p-6 border-b border-border/30 bg-surface-2/45 flex flex-col items-center text-center shrink-0">
              <div className="relative mb-3">
                <div className="h-16 w-16 rounded-2xl bg-[var(--brand)]/10 text-[var(--brand)] text-xl font-bold flex items-center justify-center uppercase shadow-inner border border-[var(--brand)]/10">
                  {member.name.charAt(0)}
                </div>
                {/* Active Ring Indicator */}
                <span className={cn(
                  "absolute -bottom-1.5 -right-1.5 h-4 w-4 rounded-full border-2 border-white dark:border-neutral-900 shadow-md",
                  isActive ? "bg-success" : "bg-danger"
                )} />
              </div>
              <h3 className="text-base font-bold text-text-primary tracking-tight">{member.name}</h3>
              <p className="text-[10px] text-text-tertiary font-semibold uppercase tracking-wider mt-1">{roleLabel(role)}</p>
              {member.phone && <p className="text-[11px] text-text-secondary font-mono mt-1">{member.phone}</p>}
            </div>

            {/* Passport security actions list */}
            <div className="flex-1 overflow-y-auto p-5 md:p-6 space-y-5">
              
              {/* Credentials Section */}
              <div className="space-y-2">
                <p className="text-[10px] font-bold text-text-tertiary uppercase tracking-widest">Credentials</p>
                <div className="flex flex-col gap-2">
                  <Button
                    variant="secondary"
                    onClick={handleShareCredentials}
                    className="w-full gap-1.5 cursor-pointer text-xs"
                  >
                    <Share2 className="h-3.5 w-3.5" /> {copiedCreds ? "Copied Info" : "Share Credentials"}
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={handleResetPin}
                    disabled={loading || (member.role === "OWNER" && currentUser.id !== member.id)}
                    className="w-full gap-1.5 cursor-pointer text-xs"
                  >
                    <KeyRound className="h-3.5 w-3.5" /> Regenerate PIN
                  </Button>
                  <div className="flex gap-2">
                    <Input
                      type="tel"
                      inputMode="numeric"
                      placeholder="Set custom PIN"
                      value={customPin}
                      maxLength={4}
                      onChange={(e) => setCustomPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                      className="h-9 text-xs"
                    />
                    <Button variant="secondary" onClick={executeCustomPin} className="h-9 text-xs whitespace-nowrap">
                      Set PIN
                    </Button>
                  </div>
                </div>
              </div>

              {/* Status Section */}
              <div className="space-y-2">
                <p className="text-[10px] font-bold text-text-tertiary uppercase tracking-widest">Account Status</p>
                {member.role === "OWNER" ? (
                  <p className="text-[10px] text-text-tertiary italic p-3 bg-surface-secondary/40 rounded-2xl border border-border/20 text-center">
                    Primary creator account cannot be deactivated.
                  </p>
                ) : (
                  <button
                    onClick={handleToggleActive}
                    disabled={loading}
                    className={cn(
                      "w-full h-9 rounded-xl text-xs font-semibold transition flex items-center justify-center gap-1.5 cursor-pointer border",
                      isActive
                        ? "border-danger/35 hover:bg-danger-soft/10 text-danger"
                        : "border-success/35 hover:bg-success-soft/10 text-success"
                    )}
                  >
                    {isActive ? <UserX className="h-3.5 w-3.5" /> : <UserCheck className="h-3.5 w-3.5" />}
                    {isActive ? "Deactivate Account" : "Activate Account"}
                  </button>
                )}
              </div>

              {/* Danger Zone */}
              {member.role !== "OWNER" && (
                <div className="p-4 border border-danger/15 bg-danger-soft/5 rounded-2xl space-y-2.5">
                  <div>
                    <h4 className="text-xs font-bold text-danger">Remove from workspace</h4>
                    <p className="text-[10px] text-text-secondary mt-0.5">Permanently deletes this employee account. Logged audits are preserved.</p>
                  </div>
                  <button
                    onClick={handleRemove}
                    disabled={loading}
                    className="w-full h-9 rounded-xl bg-danger hover:bg-danger/90 text-white text-xs font-semibold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Remove Member
                  </button>
                </div>
              )}

            </div>
          </div>
        </motion.div>

        {/* RIGHT COLUMN: Settings, Permissions, Logs (Col span 3) */}
        <motion.div
          variants={{
            hidden: { opacity: 0, y: 15 },
            show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100, damping: 15 } }
          }}
          className="lg:col-span-3 flex flex-col h-full overflow-hidden"
        >
          <div className="flex flex-col h-full overflow-hidden rounded-[28px] bg-surface/50 backdrop-blur-md border border-border/40 shadow-sm p-5 md:p-6 space-y-6">
            
            {/* Work Intelligence & Statistics Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 shrink-0">
              <div className="bg-surface border border-border/40 p-3 rounded-2xl shadow-sm">
                <span className="text-[8px] font-bold text-text-tertiary uppercase tracking-wider block">Assigned Orders</span>
                <span className="text-lg font-black text-text-primary mt-1 block">{orderCount}</span>
              </div>
              <div className="bg-surface border border-border/40 p-3 rounded-2xl shadow-sm">
                <span className="text-[8px] font-bold text-text-tertiary uppercase tracking-wider block">Inspections Pass</span>
                <span className="text-lg font-black text-success mt-1 block">98%</span>
              </div>
              <div className="bg-surface border border-border/40 p-3 rounded-2xl shadow-sm">
                <span className="text-[8px] font-bold text-text-tertiary uppercase tracking-wider block">Last Active</span>
                <span className="text-xs font-bold text-text-secondary mt-1.5 block truncate">
                  {member.lastLoginAt
                    ? new Date(member.lastLoginAt).toLocaleDateString("en-IN", { month: "short", day: "numeric" })
                    : "Never"}
                </span>
              </div>
            </div>

            {/* SystemRole Config Section */}
            <div className="space-y-3 shrink-0">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-[10px] font-bold text-text-tertiary uppercase tracking-widest">Workspace Permissions</p>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-semibold text-text-secondary">Assigned:</span>
                  <Badge className="bg-brand-soft text-brand text-[9px] font-bold uppercase py-0.5">{roleLabel(role)}</Badge>
                </div>
              </div>

              {member.role === "OWNER" ? (
                <div className="bg-surface-secondary/40 p-4 rounded-2xl border border-border/50 text-xs">
                  <p className="text-text-secondary">Primary workspace owners possess unrestricted access to settings, databases, team profiles, and billing configurations.</p>
                </div>
              ) : (
                <div className="flex items-center gap-2 max-w-sm w-full relative">
                  {getRoleIcon(role)}
                  <div className="relative flex-1">
                    <button
                      type="button"
                      disabled={loading || !can(currentUser, "ASSIGN_ROLES")}
                      onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                      className="w-full h-9 border border-border rounded-xl px-3 text-xs font-semibold bg-surface hover:bg-surface-secondary/40 focus:outline-none flex items-center justify-between text-text-primary cursor-pointer transition-all"
                    >
                      <span className="flex items-center gap-2">
                        {roleLabel(role)}
                      </span>
                      <ChevronDown className="h-3.5 w-3.5 text-text-tertiary" />
                    </button>

                    <AnimatePresence>
                      {isDropdownOpen && (
                        <>
                          <div className="fixed inset-0 z-40" onClick={() => setIsDropdownOpen(false)} />
                          <motion.div
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 5 }}
                            className="absolute left-0 right-0 mt-1.5 z-50 bg-surface border border-border/80 rounded-2xl shadow-xl p-1.5 space-y-0.5 overflow-hidden"
                          >
                            {([
                              { val: "CO_OWNER", label: "Co Owner" },
                              { val: "MANAGER", label: "Manager" },
                              { val: "SUPERVISOR", label: "Supervisor" },
                              { val: "WORKER", label: "Worker" },
                            ] as const).map((opt) => (
                              <button
                                key={opt.val}
                                type="button"
                                onClick={() => {
                                  handleRoleChange(opt.val);
                                  setIsDropdownOpen(false);
                                }}
                                className={cn(
                                  "w-full text-left px-3 py-2 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-2",
                                  role === opt.val 
                                    ? "bg-[var(--brand)]/10 text-[var(--brand)]" 
                                    : "hover:bg-surface-secondary/60 text-text-secondary"
                                )}
                              >
                                {getRoleIcon(opt.val)}
                                {opt.label}
                              </button>
                            ))}
                          </motion.div>
                        </>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              )}

              {/* Capsules permission overview grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                {permissionsSummary(role).map((perm, idx) => (
                  <div 
                    key={idx} 
                    className={cn(
                      "flex items-center gap-2 px-3.5 py-2 rounded-xl border text-[11px] font-semibold",
                      perm.enabled 
                        ? "border-success/15 bg-success-soft/10 text-text-primary" 
                        : "border-border/40 bg-surface-secondary/20 text-text-tertiary line-through"
                    )}
                  >
                    <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", perm.enabled ? "bg-success" : "bg-text-tertiary")} />
                    <span className="truncate">{perm.desc}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Activity Logs Timeline (Verify-style Journey) */}
            <div className="flex-1 flex flex-col min-h-0 space-y-3">
              <p className="text-[10px] font-bold text-text-tertiary uppercase tracking-widest shrink-0">Recent Factory Feed</p>
              
              <div className="flex-1 overflow-y-auto pr-1 min-h-0 relative">
                {auditLogs.length === 0 ? (
                  <div className="text-center py-10 border border-dashed border-border rounded-2xl bg-surface-secondary/20">
                    <p className="text-xs text-text-tertiary italic">No workspace operations recorded for this member</p>
                  </div>
                ) : (
                  <div className="relative pl-6 border-l border-border/80 ml-3 space-y-6 py-2">
                    {auditLogs.map((log) => {
                      const isActionCheck = log.action.toUpperCase().includes("QC") || log.action.toUpperCase().includes("INSPECT") || log.action.toUpperCase().includes("APPROVED");
                      const isActionWarning = log.action.toUpperCase().includes("FAIL") || log.action.toUpperCase().includes("REJECT") || log.action.toUpperCase().includes("DEACTIVATE") || log.action.toUpperCase().includes("REMOVE");
                      
                      const friendlyText = log.action.toUpperCase().includes("LOGIN") 
                        ? "Logged into Verity Workspace" 
                        : log.action.toUpperCase().includes("RESET") 
                        ? "Regenerated account credentials key" 
                        : log.action.toUpperCase().includes("ROLE") 
                        ? "Updated team member permissions role" 
                        : log.action.toUpperCase().includes("ACTIVE") 
                        ? "Adjusted workspace access state" 
                        : log.action;

                      return (
                        <div key={log.id} className="relative text-xs">
                          {/* Bullet dot */}
                          <div className={cn(
                            "absolute -left-[30px] top-1.5 h-3.5 w-3.5 rounded-full border bg-surface flex items-center justify-center font-bold text-[9px]",
                            isActionCheck 
                              ? "border-success text-success bg-success/5" 
                              : isActionWarning 
                              ? "border-danger text-danger bg-danger/5" 
                              : "border-border text-text-secondary"
                          )}>
                            {isActionCheck ? "✓" : isActionWarning ? "⚠" : "•"}
                          </div>
                          <div className="bg-surface border border-border/40 hover:border-[var(--brand)]/15 rounded-2xl p-3.5 flex flex-col md:flex-row md:justify-between md:items-center gap-2 hover:bg-surface-secondary/15 transition-all shadow-sm">
                            <div>
                              <p className="font-semibold text-text-primary">{friendlyText}</p>
                              <p className="text-[9px] text-text-tertiary mt-0.5 font-mono">ID: {log.id}</p>
                            </div>
                            <span className="text-[9px] font-bold text-text-tertiary shrink-0">
                              {new Date(log.createdAt).toLocaleDateString("en-IN", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

          </div>
        </motion.div>

      </motion.div>

      <ConfirmDialog
        isOpen={isResetPinOpen}
        title="Reset member PIN?"
        description="A new random 4-digit code will be generated for this member."
        confirmLabel="Reset PIN"
        onConfirm={executeResetPin}
        onCancel={() => setIsResetPinOpen(false)}
      />

      <ConfirmDialog
        isOpen={isRemoveOpen}
        title="Remove member permanently?"
        description="Are you sure you want to remove this member? This action cannot be undone."
        confirmLabel="Remove"
        variant="danger"
        onConfirm={executeRemove}
        onCancel={() => setIsRemoveOpen(false)}
      />
    </div>
  );
}
