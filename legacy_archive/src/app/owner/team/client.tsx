"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Users, UserPlus, Shield, Crown, Wrench, ShieldAlert,
  Search, Plus, X, Smartphone, Check, Copy, Share2, ChevronRight
} from "lucide-react";
import { SystemRole, User } from "@prisma/client";
import { PageHeader } from "@/components/design/PageHeader";
import { Surface } from "@/components/design/Surface";
import { Badge, Button, Input, Select } from "@/components/ui/primitives";
import { inviteMember } from "@/server/actions/team";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface MemberWithStats extends User {
  workerOrders?: Array<{ id: string; itemName: string }>;
  inspectorOrders?: Array<{ id: string; itemName: string }>;
  _count?: {
    workerOrders: number;
    inspectorOrders: number;
  };
}

export function TeamClient({
  initialMembers,
  currentUserId,
  departments = [],
}: {
  initialMembers: MemberWithStats[];
  currentUserId: string;
  departments?: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"ALL" | "LEADERSHIP" | "SUPERVISOR" | "WORKER">("ALL");
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteStep, setInviteStep] = useState<1 | 2 | 3>(1);
  const [inviteRole, setInviteRole] = useState<SystemRole>("WORKER");
  const [inviteName, setInviteName] = useState("");
  const [invitePhone, setInvitePhone] = useState("");
  const [inviteDepartmentId, setInviteDepartmentId] = useState("");
  const [inviteResult, setInviteResult] = useState<{ member: User; pin: string } | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const activeCount = useMemo(() => initialMembers.filter(m => m.isActive).length, [initialMembers]);

  const leadershipCount = useMemo(() => initialMembers.filter(m => m.role === "OWNER" || m.role === "CO_OWNER" || m.role === "MANAGER").length, [initialMembers]);
  const inspectorCount = useMemo(() => initialMembers.filter(m => m.role === "SUPERVISOR").length, [initialMembers]);
  const workerCount = useMemo(() => initialMembers.filter(m => m.role === "WORKER").length, [initialMembers]);

  const filteredMembers = useMemo(() => {
    return initialMembers.filter(m => {
      const matchesSearch = m.name.toLowerCase().includes(search.toLowerCase()) || (m.phone && m.phone.includes(search));
      if (!matchesSearch) return false;
      if (roleFilter === "ALL") return true;
      if (roleFilter === "LEADERSHIP") return m.role === "OWNER" || m.role === "CO_OWNER" || m.role === "MANAGER";
      if (roleFilter === "SUPERVISOR") return m.role === "SUPERVISOR";
      if (roleFilter === "WORKER") return m.role === "WORKER";
      return true;
    });
  }, [initialMembers, search, roleFilter]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const isFloorRole = inviteRole === "WORKER" || inviteRole === "SUPERVISOR";
    const res = await inviteMember({
      name: inviteName,
      role: inviteRole,
      phone: invitePhone,
      departmentId: isFloorRole ? (inviteDepartmentId || undefined) : undefined,
    });
    setLoading(false);
    if (res.error) {
      setError(res.error);
    } else if (res.success && res.member && res.pin) {
      setInviteResult({ member: res.member, pin: res.pin });
      setInviteStep(3);
    }
  };

  const handleCopyDetails = () => {
    if (!inviteResult) return;
    const text = `Verity Factory Access\nName: ${inviteResult.member.name}\nRole: ${inviteResult.member.role}\nPhone: ${inviteResult.member.phone}\nPIN: ${inviteResult.pin}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShareWhatsApp = () => {
    if (!inviteResult) return;
    const text = encodeURIComponent(`*Verity Factory Access*\nName: ${inviteResult.member.name}\nRole: ${inviteResult.member.role}\nPhone: ${inviteResult.member.phone}\nPIN: ${inviteResult.pin}`);
    window.open(`https://api.whatsapp.com/send?phone=${inviteResult.member.phone}&text=${text}`, "_blank");
  };

  const handleShareSMS = () => {
    if (!inviteResult) return;
    const text = encodeURIComponent(`Verity Factory Access\nName: ${inviteResult.member.name}\nRole: ${inviteResult.member.role}\nPIN: ${inviteResult.pin}`);
    window.open(`sms:${inviteResult.member.phone}?body=${text}`, "_blank");
  };

  const closeInvite = () => {
    setIsInviteOpen(false);
    setInviteStep(1);
    setInviteName("");
    setInvitePhone("");
    setInviteDepartmentId("");
    setInviteResult(null);
    setError("");
  };

  const getRoleIcon = (role: SystemRole) => {
    switch (role) {
      case "OWNER":
      case "CO_OWNER":
        return <Crown className="h-3.5 w-3.5 text-warning" />;
      case "MANAGER":
        return <Shield className="h-3.5 w-3.5 text-brand" />;
      case "SUPERVISOR":
        return <ShieldAlert className="h-3.5 w-3.5 text-success" />;
      case "STORE_MANAGER":
        return <Shield className="h-3.5 w-3.5 text-brand" />;
      case "WORKER":
        return <Wrench className="h-3.5 w-3.5 text-text-secondary" />;
    }
  };

  const roleLabel = (role: SystemRole) => {
    return role.replace("_", " ");
  };

  // Helper to fetch live activity context
  const getMemberActivityText = (member: MemberWithStats) => {
    if (member.role === "OWNER" || member.role === "CO_OWNER") {
      return "Supervising workspace Floor";
    }
    if (member.role === "MANAGER") {
      return "Supervising floor & assignments";
    }
    if (member.role === "SUPERVISOR") {
      if (member.inspectorOrders && member.inspectorOrders.length > 0) {
        const order = member.inspectorOrders[0];
        return `Reviewing ${order.itemName || ""}`;
      }
      return "Ready for Quality Check";
    }
    if (member.role === "WORKER") {
      if (member.workerOrders && member.workerOrders.length > 0) {
        const order = member.workerOrders[0];
        return `Working: ${order.itemName || ""}`;
      }
      return "Awaiting shift order";
    }
    return "On duty";
  };

  return (
    <>
      <div className="flex flex-col min-h-[calc(100dvh-112px)] md:h-[calc(100vh-112px)] md:overflow-hidden space-y-4">
        <PageHeader
          eyebrow="Workforce Directory"
          title="Team Members"
          description="Manage access, roles, and credentials for your factory workforce."
          actions={
            <Button
              variant="secondary"
              onClick={() => setIsInviteOpen(true)}
              className="gap-2 cursor-pointer"
            >
              <UserPlus className="h-4 w-4" />
              Invite Member
            </Button>
          }
        />

        {/* Animated Workforce Summary Metric Cards Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 shrink-0">
          <div className="bg-surface/50 border border-border/40 p-4 rounded-2xl shadow-sm flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider block">Total Workforce</span>
              <span className="text-2xl font-black text-text-primary mt-1 block">{initialMembers.length}</span>
            </div>
            <Users className="h-8 w-8 text-[var(--brand)] opacity-20" />
          </div>
          <div className="bg-surface/50 border border-border/40 p-4 rounded-2xl shadow-sm flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider block">Active On Shift</span>
              <span className="text-2xl font-black text-success mt-1 block">{activeCount}</span>
            </div>
            <div className="h-2 w-2 rounded-full bg-success animate-ping shrink-0" />
          </div>
          <div className="bg-surface/50 border border-border/40 p-4 rounded-2xl shadow-sm flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider block">Quality Division</span>
              <span className="text-2xl font-black text-success mt-1 block">{inspectorCount}</span>
            </div>
            <ShieldAlert className="h-8 w-8 text-success opacity-20" />
          </div>
          <div className="bg-surface/50 border border-border/40 p-4 rounded-2xl shadow-sm flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider block">Production Floor</span>
              <span className="text-2xl font-black text-brand mt-1 block">{workerCount}</span>
            </div>
            <Wrench className="h-8 w-8 text-brand opacity-20" />
          </div>
        </div>

        {initialMembers.length === 0 ? (
          /* Empty state */
          <Surface className="flex-1 flex flex-col items-center justify-center text-center p-12 rounded-[28px]">
            <div className="h-12 w-12 rounded-2xl bg-brand-soft text-brand flex items-center justify-center mb-4">
              <Users className="h-6 w-6" />
            </div>
            <h3 className="text-base font-bold text-text-primary">Build your factory team</h3>
            <p className="text-sm text-text-secondary mt-1.5 max-w-xs">Add your first worker, supervisor or manager to begin digital QC.</p>
            <Button variant="secondary" onClick={() => setIsInviteOpen(true)} className="mt-6 gap-2">
              <Plus className="h-4 w-4" /> Add Member
            </Button>
          </Surface>
        ) : (
          <div className="flex flex-col md:flex-row gap-5 min-h-0 flex-1 overflow-visible md:overflow-hidden">

            {/* LEFT: Search Filter Dock */}
            <div className="w-full md:w-[240px] shrink-0 flex flex-col gap-4">
              <div className="flex flex-col h-full rounded-[24px] bg-surface/50 backdrop-blur-md border border-border/40 shadow-sm overflow-hidden">

                {/* Filters */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-bold text-text-tertiary uppercase tracking-widest">Search Roster</label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-tertiary" />
                      <Input
                        type="text"
                        placeholder="Name or phone..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-9 h-8.5 text-xs rounded-xl w-full"
                      />
                    </div>
                  </div>

                  {/* Tab list */}
                  <div className="space-y-1.5">
                    <p className="text-[9px] font-bold text-text-tertiary uppercase tracking-widest">Workspace Groups</p>
                    <div className="space-y-1">
                      {([
                        { key: "ALL", label: "All Members", count: initialMembers.length, icon: <Users className="h-3.5 w-3.5" /> },
                        { key: "LEADERSHIP", label: "Management", count: leadershipCount, icon: <Crown className="h-3.5 w-3.5 text-warning" /> },
                        { key: "SUPERVISOR", label: "Supervisors", count: inspectorCount, icon: <ShieldAlert className="h-3.5 w-3.5 text-success" /> },
                        { key: "WORKER", label: "Workers", count: workerCount, icon: <Wrench className="h-3.5 w-3.5 text-text-secondary" /> },
                      ] as const).map(({ key, label, count, icon }) => {
                        const isCurrent = roleFilter === key;
                        return (
                          <button
                            key={key}
                            onClick={() => setRoleFilter(key)}
                            className={cn(
                              "w-full flex items-center justify-between text-xs py-2 px-3 rounded-xl transition cursor-pointer text-left",
                              isCurrent 
                                ? "bg-[var(--brand)] text-white" 
                                : "hover:bg-surface-secondary/40 text-text-secondary"
                            )}
                          >
                            <div className="flex items-center gap-2">
                              {icon}
                              <span className="font-semibold">{label}</span>
                            </div>
                            <span className={cn(
                              "text-[9px] font-bold px-1.5 py-0.5 rounded-full border",
                              isCurrent ? "bg-white/20 border-white/10 text-white" : "bg-surface border-border/40 text-text-tertiary"
                            )}>{count}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT: Roster Command Board Roster Grid */}
            <div className="flex-1 flex flex-col h-full min-h-[420px] overflow-hidden bg-surface/50 backdrop-blur-md border border-border/40 rounded-[28px] shadow-sm">
              <div className="px-4 md:px-5 py-4 border-b border-border/30 bg-[var(--brand-soft)]/[0.01] shrink-0 flex items-center justify-between">
                <span className="text-xs font-bold text-text-primary uppercase tracking-wider">Workforce Command Hub</span>
                <span className="text-[10px] font-bold text-text-tertiary bg-surface-2/60 px-2 py-0.5 rounded-full border border-border/50">{filteredMembers.length} active passports</span>
              </div>

              <div className="flex-1 overflow-y-auto min-h-0 p-4 md:p-5">
                {filteredMembers.length === 0 ? (
                  <p className="text-xs text-text-tertiary text-center py-12">No active roster matches your filter.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                    {filteredMembers.map((m) => {
                      const isOwner = m.role === "OWNER" || m.role === "CO_OWNER";
                      const isInspector = m.role === "SUPERVISOR";
                      
                      // Soft themed accents
                      const themeClass = isOwner 
                        ? "from-amber-500/[0.03] to-transparent border-warning/10 shadow-[0_0_15px_rgba(245,158,11,0.02)]" 
                        : isInspector 
                        ? "from-emerald-500/[0.03] to-transparent border-success/10 shadow-[0_0_15px_rgba(16,185,129,0.02)]" 
                        : "from-indigo-500/[0.03] to-transparent border-brand/10 shadow-[0_0_15px_rgba(99,102,241,0.02)]";

                      const glowColor = isOwner ? "bg-warning" : isInspector ? "bg-success" : "bg-brand";

                      return (
                        <motion.button
                          key={m.id}
                          whileHover={{ scale: 1.02, y: -2 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => router.push(`/owner/team/${m.id}`)}
                          className={cn(
                            "flex flex-col text-left p-4 rounded-2xl border bg-gradient-to-b transition-all duration-300 cursor-pointer shadow-sm relative overflow-hidden group hover:border-[var(--brand)]/20",
                            themeClass
                          )}
                        >
                          {/* Mini ambient top corner glow on card hover */}
                          <div className={cn("absolute -top-12 -right-12 h-24 w-24 rounded-full blur-2xl opacity-0 group-hover:opacity-40 transition-opacity duration-300", glowColor)} />

                          {/* Header row */}
                          <div className="flex items-start justify-between gap-3 shrink-0">
                            <div className="flex items-center gap-3">
                              <div className="h-9 w-9 rounded-xl bg-[var(--brand-soft)] text-[var(--brand)] text-xs font-bold flex items-center justify-center shrink-0 uppercase border border-[var(--brand)]/10 shadow-inner">
                                {m.name.charAt(0)}
                              </div>
                              <div>
                                <p className="text-xs font-bold text-text-primary tracking-tight truncate flex items-center gap-1.5">
                                  {m.name}
                                  {m.id === currentUserId && (
                                    <Badge className="bg-brand-soft text-brand text-[7px] px-1 py-0 border border-brand/10 leading-none">You</Badge>
                                  )}
                                </p>
                                <span className="text-[9px] font-bold text-text-tertiary uppercase tracking-wider">
                                  {roleLabel(m.role)}{(m as any).department?.name ? ` · ${(m as any).department.name}` : ""}
                                </span>
                              </div>
                            </div>
                            <span className={cn(
                              "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[8px] font-bold uppercase tracking-wider border leading-none shrink-0",
                              m.isActive 
                                ? "bg-success-soft text-success border-success/15" 
                                : "bg-danger-soft text-danger border-danger/15"
                            )}>
                              <span className={cn("h-1 w-1 rounded-full animate-pulse", m.isActive ? "bg-success shadow-[0_0_6px_rgba(52,199,89,0.5)]" : "bg-danger shadow-[0_0_6px_rgba(255,59,48,0.5)]")} />
                              {m.isActive ? "Active Shift" : "Off Duty"}
                            </span>
                          </div>

                          {/* Task details block */}
                          <div className="mt-4 flex-1 space-y-2 border-t border-border/20 pt-3">
                            <div>
                              <span className="text-[8px] font-bold text-text-tertiary uppercase tracking-wider block">Current Activity</span>
                              <p className="text-[11px] font-semibold text-text-secondary truncate mt-0.5">{getMemberActivityText(m)}</p>
                            </div>

                            <div className="flex justify-between items-center text-[9px] pt-1">
                              <span className="text-text-tertiary">Performance acceptance</span>
                              <span className="font-bold text-text-primary">{isOwner ? "N/A" : isInspector ? "99.2% rate" : "98.4% pass"}</span>
                            </div>
                          </div>
                        </motion.button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

          </div>
        )}
      </div>

      {/* Mobile FAB */}
      {initialMembers.length > 0 && (
        <button
          onClick={() => setIsInviteOpen(true)}
          className="md:hidden fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] right-4 h-12 w-12 rounded-full bg-[var(--brand)] text-white shadow-lg flex items-center justify-center transition active:scale-95 z-40"
        >
          <Plus className="h-6 w-6" />
        </button>
      )}

      {/* Invite Modal */}
      {isInviteOpen && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
          <div onClick={closeInvite} className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div className="relative w-full max-w-md bg-surface rounded-[28px] border border-border p-5 md:p-6 shadow-2xl flex flex-col max-h-[90vh] z-10">

            <div className="flex justify-between items-center mb-5 md:mb-6 pb-4 border-b border-border shrink-0">
              <div>
                <span className="text-[9px] font-bold text-text-tertiary uppercase tracking-widest">Add Team Member</span>
                <h3 className="text-lg font-bold text-text-primary mt-0.5">Invite Person</h3>
              </div>
              <button onClick={closeInvite} className="p-1.5 rounded-full hover:bg-surface-2 text-text-secondary hover:text-text-primary transition cursor-pointer">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Step 1: Pick role */}
            {inviteStep === 1 && (
              <div className="flex-1 overflow-y-auto space-y-3 pr-0.5">
                <p className="text-xs text-text-secondary font-medium mb-1">Who are you adding?</p>
                {([
                  { role: "CO_OWNER" as SystemRole, label: "Co Owner", sub: "Factory leadership and operations partner.", icon: <Crown className="h-5 w-5" />, color: "text-warning bg-warning/10" },
                  { role: "MANAGER" as SystemRole, label: "Manager", sub: "Runs daily production line operations.", icon: <Shield className="h-5 w-5" />, color: "text-brand bg-brand/10" },
                  { role: "SUPERVISOR" as SystemRole, label: "Supervisor", sub: "Department head; runs QC when supervising the QC department.", icon: <ShieldAlert className="h-5 w-5" />, color: "text-success bg-success/10" },
                  { role: "STORE_MANAGER" as SystemRole, label: "Store Manager", sub: "Books customer productions only; sent to Pending for a manager to release.", icon: <Shield className="h-5 w-5" />, color: "text-brand bg-brand/10" },
                  { role: "WORKER" as SystemRole, label: "Worker", sub: "Production floor manufacturer.", icon: <Wrench className="h-5 w-5" />, color: "text-text-tertiary bg-surface-2/10" },
                ]).map(({ role, label, sub, icon, color }) => (
                  <button
                    key={role}
                    onClick={() => { setInviteRole(role); setInviteStep(2); }}
                    className="flex items-center gap-4 w-full p-4 rounded-2xl border border-border hover:border-[var(--brand)] text-left transition bg-surface-2/30 cursor-pointer"
                  >
                    <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center shrink-0", color)}>{icon}</div>
                    <div>
                      <h4 className="text-sm font-bold text-text-primary">{label}</h4>
                      <p className="text-[11px] text-text-secondary mt-0.5">{sub}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Step 2: Fill details */}
            {inviteStep === 2 && (
              <form onSubmit={handleInvite} className="flex-1 flex flex-col justify-between overflow-hidden">
                <div className="space-y-4 overflow-y-auto pr-0.5 pb-4">
                  <div className="flex items-center gap-2 mb-1">
                    {getRoleIcon(inviteRole)}
                    <span className="text-xs font-bold text-text-secondary capitalize">Adding {roleLabel(inviteRole)}</span>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-text-secondary">Full Name</label>
                    <Input type="text" required placeholder="e.g. Amit Sharma" value={inviteName} onChange={(e) => setInviteName(e.target.value)} className="rounded-xl" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-text-secondary">Phone Number</label>
                    <Input type="tel" required placeholder="e.g. 9876543210" value={invitePhone} onChange={(e) => setInvitePhone(e.target.value)} className="rounded-xl" />
                  </div>
                  {(inviteRole === "WORKER" || inviteRole === "SUPERVISOR") && (
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-text-secondary">Department</label>
                      <Select value={inviteDepartmentId} onChange={(e) => setInviteDepartmentId(e.target.value)} className="rounded-xl">
                        <option value="">No department (assign later)</option>
                        {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                      </Select>
                      <p className="text-[11px] text-text-tertiary">
                        {inviteRole === "SUPERVISOR" ? "Supervisors approve their own department's work." : "Workers see only their own department's assignments."}
                      </p>
                    </div>
                  )}
                  {error && <p className="text-xs font-bold text-danger bg-danger-soft p-3 rounded-xl border border-danger/10">{error}</p>}
                </div>
                <div className="flex gap-3 border-t border-border pt-4 shrink-0">
                  <Button type="button" variant="secondary" onClick={() => setInviteStep(1)} className="flex-1">Back</Button>
                  <Button type="submit" disabled={loading} className="flex-1">{loading ? "Creating..." : "Generate Access"}</Button>
                </div>
              </form>
            )}

            {/* Step 3: Result */}
            {inviteStep === 3 && inviteResult && (
              <div className="flex-1 flex flex-col justify-between overflow-hidden">
                <div className="space-y-5 overflow-y-auto pr-0.5 pb-4">
                  <div className="bg-success-soft/20 border border-success/15 p-4 rounded-2xl flex flex-col items-center text-center">
                    <div className="h-9 w-9 rounded-full bg-success text-white flex items-center justify-center mb-2">
                      <Check className="h-5 w-5 stroke-[3px]" />
                    </div>
                    <h4 className="text-sm font-bold text-success">Access Created</h4>
                    <p className="text-[10px] text-text-tertiary mt-0.5">Share this PIN with the new member to let them log in.</p>
                  </div>
                  <div className="bg-surface-2/60 p-4 rounded-2xl border border-border/60 space-y-3 font-mono text-xs text-text-primary">
                    <div className="flex justify-between"><span className="text-text-tertiary font-sans">Name:</span><span className="font-bold">{inviteResult.member.name}</span></div>
                    <div className="flex justify-between"><span className="text-text-tertiary font-sans">Role:</span><span className="font-bold capitalize">{roleLabel(inviteResult.member.role)}</span></div>
                    <div className="flex justify-between"><span className="text-text-tertiary font-sans">Phone:</span><span className="font-bold">{inviteResult.member.phone}</span></div>
                    <div className="flex justify-between border-t border-border/60 pt-2.5 text-sm">
                      <span className="text-text-tertiary font-sans font-semibold text-xs">PIN Code:</span>
                      <span className="font-black text-brand tracking-wider text-lg">{inviteResult.pin}</span>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col gap-2 border-t border-border pt-4 shrink-0">
                  <div className="grid grid-cols-2 gap-2">
                    <Button variant="secondary" onClick={handleShareWhatsApp} className="gap-1.5 text-success border-success/30">
                      <Share2 className="h-3.5 w-3.5" /> WhatsApp
                    </Button>
                    <Button variant="secondary" onClick={handleShareSMS} className="gap-1.5">
                      <Smartphone className="h-3.5 w-3.5" /> Send SMS
                    </Button>
                  </div>
                  <Button variant="secondary" onClick={handleCopyDetails} className="gap-1.5">
                    {copied ? <><Check className="h-4 w-4 text-success" /> Copied</> : <><Copy className="h-4 w-4" /> Copy Details</>}
                  </Button>
                  <Button onClick={() => { closeInvite(); router.refresh(); }}>Done</Button>
                </div>
              </div>
            )}

          </div>
        </div>
      )}
    </>
  );
}
