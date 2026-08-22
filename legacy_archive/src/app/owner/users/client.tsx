"use client";

import { useState } from "react";
import Link from "next/link";
import { Badge, Input } from "@/components/ui/primitives";
import { Surface } from "@/components/design/Surface";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/design/Table";
import { Search, Smartphone, Activity, CheckCircle2, Shield, HardHat, CircleUserRound, ChevronRight } from "lucide-react";
import { ResetPinButton } from "./reset-pin-button";
import { RemoveEmployeeButton } from "./remove-employee-button";

type UserWithStats = {
  id: string;
  name: string;
  phone: string | null;
  role: string;
  isActive: boolean;
  workerOrders: { id: string }[];
  inspectorOrders: { id: string }[];
};

export function TeamClient({
  users,
}: {
  users: UserWithStats[];
}) {
  const [search, setSearch] = useState("");

  const filteredUsers = users.filter(
    (user) =>
      user.name.toLowerCase().includes(search.toLowerCase()) ||
      (user.phone && user.phone.includes(search)) ||
      user.role.toLowerCase().replaceAll("_", " ").includes(search.toLowerCase())
  );

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      <div className="mb-4 shrink-0 flex items-center justify-between">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary pointer-events-none" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
            placeholder="Search by name, phone, or role..."
          />
        </div>
      </div>

      <Surface className="flex flex-col min-h-0 flex-1 overflow-hidden" allowFullscreen={true}>
        {/* Desktop Table View */}
        <div className="hidden md:block flex-1 overflow-y-auto overflow-x-auto p-4">
          <Table className="min-w-[800px]">
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Activity (Today)</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-text-tertiary">
                    No members found.
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <Link href={`/owner/users/${user.id}`} className="flex items-center gap-3 group">
                        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-soft text-sm font-semibold text-brand-strong border border-[var(--brand)]/20 group-hover:bg-[var(--brand)]/20 transition-colors">
                          {user.name.slice(0, 1).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-text-primary group-hover:text-[var(--brand)] transition-colors">{user.name}</p>
                        </div>
                      </Link>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-sm text-text-secondary">
                        <Smartphone className="h-4 w-4 text-[var(--brand)]" />
                        <span className="font-mono">{user.phone || "Not set"}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-sm text-text-primary">
                        {user.role === "OWNER" && <Shield className="h-4 w-4 text-text-tertiary" />}
                        {user.role === "WORKER" && <HardHat className="h-4 w-4 text-text-tertiary" />}
                        {user.role === "SUPERVISOR" && <CircleUserRound className="h-4 w-4 text-text-tertiary" />}
                        <span className="capitalize">{user.role.toLowerCase().replaceAll("_", " ")}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {user.role !== "OWNER" ? (
                        <div className="flex items-center gap-4 text-sm">
                          <span className="flex items-center gap-1">
                            <Activity className="h-4 w-4 text-[var(--brand)]" />
                            <span className="font-semibold">{user.role === "WORKER" ? user.workerOrders.length : user.inspectorOrders.length}</span>
                          </span>
                          <span className="flex items-center gap-1 text-success">
                            <CheckCircle2 className="h-4 w-4" />
                            <span className="font-semibold">98%</span>
                          </span>
                        </div>
                      ) : (
                        <span className="text-text-tertiary text-xs">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="neutral" className={user.isActive ? "bg-success-soft text-success border-success/15" : "bg-danger-soft text-danger border-danger/15"}>
                        {user.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <ResetPinButton userId={user.id} phone={user.phone || ""} name={user.name} />
                        <RemoveEmployeeButton userId={user.id} name={user.name} role={user.role} />
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden flex-1 overflow-y-auto p-4 space-y-3">
          {filteredUsers.length === 0 ? (
            <div className="text-center py-8 text-text-tertiary text-sm">No members found.</div>
          ) : (
            filteredUsers.map((user) => (
              <div key={user.id} className="rounded-[18px] border border-border bg-surface-2 p-4">
                <div className="flex items-start justify-between gap-3">
                  <Link href={`/owner/users/${user.id}`} className="flex items-center gap-3 min-w-0 flex-1 group">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[var(--brand)]/10 font-bold text-[var(--brand)] border border-[var(--brand)]/20">
                      {user.name.slice(0, 1).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-text-primary truncate">{user.name}</p>
                      <p className="text-xs text-text-secondary capitalize">{user.role.toLowerCase().replaceAll("_", " ")}</p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-text-tertiary" />
                  </Link>
                  <Badge variant="neutral" className={user.isActive ? "bg-success-soft text-success border-success/15" : "bg-danger-soft text-danger border-danger/15"}>
                    {user.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>
                <div className="mt-4 space-y-2">
                  <div className="flex items-center gap-2 rounded-xl border border-border bg-background/40 px-3 py-2 text-sm text-text-secondary">
                    <Smartphone className="h-4 w-4 shrink-0 text-[var(--brand)]" />
                    <span className="font-mono truncate text-text-primary">{user.phone || "Not set"}</span>
                  </div>
                  {user.role !== "OWNER" && (
                    <div className="grid grid-cols-2 gap-2">
                      <div className="rounded-xl border border-border bg-background/40 px-3 py-2 text-center">
                        <span className="block text-[10px] font-semibold uppercase tracking-[0.2em] text-text-tertiary">Today</span>
                        <span className="mt-1 flex items-center justify-center gap-1 text-sm font-semibold text-text-primary">
                          <Activity className="h-3.5 w-3.5 text-[var(--brand)]" />
                          {user.role === "WORKER" ? user.workerOrders.length : user.inspectorOrders.length}
                        </span>
                      </div>
                      <div className="rounded-xl border border-border bg-background/40 px-3 py-2 text-center">
                        <span className="block text-[10px] font-semibold uppercase tracking-[0.2em] text-text-tertiary">Accuracy</span>
                        <span className="mt-1 flex items-center justify-center gap-1 text-sm font-semibold text-success">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          98%
                        </span>
                      </div>
                    </div>
                  )}
                </div>
                <div className="mt-4 flex gap-2">
                  <ResetPinButton userId={user.id} phone={user.phone || ""} name={user.name} />
                  <RemoveEmployeeButton userId={user.id} name={user.name} role={user.role} />
                </div>
              </div>
            ))
          )}
        </div>
      </Surface>
    </div>
  );
}
