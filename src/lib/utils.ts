import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { AssignmentStatus, Role } from "@/lib/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(value?: string | Date) {
  if (!value) {
    return "Not available";
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function formatShortDate(value?: string | Date) {
  if (!value) {
    return "Not available";
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
  }).format(new Date(value));
}

export function getRoleHome(role: Role) {
  if (role === "owner") {
    return "/owner/dashboard";
  }

  if (role === "worker") {
    return "/worker";
  }

  return "/inspector";
}

export function getStatusClasses(status: AssignmentStatus) {
  if (status === "approved") {
    return "bg-emerald-100 text-emerald-700";
  }

  if (status === "submitted") {
    return "bg-amber-100 text-amber-700";
  }

  if (status === "rework") {
    return "bg-rose-100 text-rose-700";
  }

  if (status === "in_progress") {
    return "bg-sky-100 text-sky-700";
  }

  return "bg-slate-100 text-slate-700";
}

export function titleCaseStatus(status: string) {
  return status.replaceAll("_", " ");
}

export function createId(prefix: string) {
  return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
}

export type QCState =
  | "PENDING_INSPECTION"
  | "PASSED_BY_WORKER"
  | "FLAGGED_BY_WORKER"
  | "APPROVED_BY_INSPECTOR"
  | "REWORK_REQUIRED"
  | "CERTIFIED";

export function getQCState(inspection: any): QCState {
  if (!inspection) return "PENDING_INSPECTION";
  
  const status = inspection.status;
  const submissions = inspection.submissions || [];
  const hasFailures = submissions.some((sub: any) => sub.passFail === "FAIL");

  if (status === "APPROVED") {
    return inspection.report ? "CERTIFIED" : "APPROVED_BY_INSPECTOR";
  }
  if (status === "REWORK_REQUIRED" || status === "REJECTED") {
    return "REWORK_REQUIRED";
  }
  if (status === "WAITING_QC") {
    return hasFailures ? "FLAGGED_BY_WORKER" : "PASSED_BY_WORKER";
  }
  if (status === "IN_PROGRESS") {
    return hasFailures ? "FLAGGED_BY_WORKER" : "PENDING_INSPECTION";
  }
  return "PENDING_INSPECTION";
}
