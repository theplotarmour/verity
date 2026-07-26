export type Role = "owner" | "worker" | "inspector";

export type AssignmentStatus =
  | "assigned"
  | "in_progress"
  | "submitted"
  | "approved"
  | "rework";

export type PassFailStatus = "pass" | "fail";
export type VerificationStatus = "approved" | "rejected";

export interface FactorySettings {
  id: string;
  name: string;
  slogan: string;
  logoMark: string;
  primaryColor: string;
  accentColor: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: Role;
  title: string;
  status: "active";
}

export interface Customer {
  id: string;
  name: string;
  contactName: string;
  contactEmail: string;
  createdAt?: string;
}

export interface Product {
  id: string;
  name: string;
  category: string;
  sku: string;
  photoDataUrl: string;
  createdAt?: string;
}

export interface Checkpoint {
  id: string;
  name: string;
  instructions: string;
  requireImage: boolean;
  requireRemarks: boolean;
}

export interface TemplateSection {
  id: string;
  title: string;
  checkpoints: Checkpoint[];
}

export interface InspectionTemplate {
  id: string;
  name: string;
  productCategory: string;
  version: string;
  status: "active" | "draft";
  createdAt: string;
  sections: TemplateSection[];
}

export interface WorkAssignment {
  id: string;
  templateId: string;
  customerId: string;
  productId: string;
  workerId: string;
  inspectorId: string;
  workOrderNumber: string;
  batchNumber: string;
  dueDate: string;
  status: AssignmentStatus;
  createdAt: string;
}

export interface CheckpointResponse {
  checkpointId: string;
  passFail?: PassFailStatus;
  remarks: string;
  imageDataUrl?: string;
  completedAt?: string;
  verificationStatus?: VerificationStatus;
  inspectorComment: string;
  verifiedAt?: string;
}

export interface Inspection {
  id: string;
  assignmentId: string;
  templateId: string;
  workerId: string;
  inspectorId: string;
  status: AssignmentStatus;
  currentCheckpointIndex: number;
  startedAt?: string;
  submittedAt?: string;
  approvedAt?: string;
  lockedAt?: string;
  responses: CheckpointResponse[];
}

export interface QualityReport {
  id: string;
  inspectionId: string;
  verificationCode: string;
  publicId: string;
  generatedAt: string;
  inspectorName: string;
}

export interface AuditLog {
  id: string;
  actorId: string;
  entityType: string;
  entityId: string;
  action: string;
  message: string;
  createdAt: string;
}

export interface AppData {
  factory: FactorySettings;
  users: User[];
  customers: Customer[];
  products: Product[];
  templates: InspectionTemplate[];
  assignments: WorkAssignment[];
  inspections: Inspection[];
  reports: QualityReport[];
  auditLogs: AuditLog[];
}

export interface BootstrapPayload {
  currentUser?: User;
  data: AppData;
}

export interface PublicReportBundle {
  report: QualityReport | null;
  inspection: Inspection | null;
  assignment: WorkAssignment | null;
  template: InspectionTemplate | null;
  product: Product | null;
  customer: Customer | null;
  inspector: User | null;
}

export interface TemplateDraft {
  name: string;
  productCategory: string;
  version: string;
  sections: Array<{
    title: string;
    checkpoints: Array<{
      name: string;
      instructions: string;
      requireImage: boolean;
      requireRemarks: boolean;
    }>;
  }>;
}

export interface AssignmentDraft {
  templateId: string;
  customerId: string;
  productId: string;
  workerId: string;
  inspectorId: string;
  workOrderNumber: string;
  batchNumber: string;
  dueDate: string;
}

export interface CustomerDraft {
  name: string;
  contactName: string;
  contactEmail: string;
}

export interface ProductDraft {
  name: string;
  category: string;
  sku: string;
  photoDataUrl: string;
}

export interface EmployeeDraft {
  name: string;
  email: string;
  phone: string;
  role: Exclude<Role, "owner">;
  title: string;
}
