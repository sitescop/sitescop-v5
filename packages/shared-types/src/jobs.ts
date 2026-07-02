export enum JobStatus {
  DRAFT = 'DRAFT',
  PENDING_ASSIGNMENT = 'PENDING_ASSIGNMENT',
  ASSIGNED = 'ASSIGNED',
  ACCEPTED = 'ACCEPTED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  ARCHIVED = 'ARCHIVED',
}

export enum JobType {
  BUILDING = 'BUILDING',
  PEST = 'PEST',
  COMBINED = 'COMBINED',
  PRE_PURCHASE = 'PRE_PURCHASE',
  PRE_SALE = 'PRE_SALE',
  OTHER = 'OTHER',
}

export enum AssignmentStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  DECLINED = 'DECLINED',
}

export const JOB_STATUS_LABELS: Record<JobStatus, string> = {
  [JobStatus.DRAFT]: 'Draft',
  [JobStatus.PENDING_ASSIGNMENT]: 'Pending Assignment',
  [JobStatus.ASSIGNED]: 'Assigned',
  [JobStatus.ACCEPTED]: 'Accepted',
  [JobStatus.IN_PROGRESS]: 'In Progress',
  [JobStatus.COMPLETED]: 'Completed',
  [JobStatus.CANCELLED]: 'Cancelled',
  [JobStatus.ARCHIVED]: 'Archived',
};

export const JOB_TYPE_LABELS: Record<JobType, string> = {
  [JobType.BUILDING]: 'Building',
  [JobType.PEST]: 'Pest',
  [JobType.COMBINED]: 'Combined',
  [JobType.PRE_PURCHASE]: 'Pre-Purchase',
  [JobType.PRE_SALE]: 'Pre-Sale',
  [JobType.OTHER]: 'Other',
};

export interface PropertySummary {
  id: string;
  addressLine1: string;
  addressLine2: string | null;
  suburb: string;
  state: string;
  postcode: string;
  formattedAddress: string;
}

export interface ContactSummary {
  id: string;
  type: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  displayName: string;
}

export interface UserSummary {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  displayName: string;
}

export interface JobAssignmentSummary {
  id: string;
  inspectorId: string;
  inspector: UserSummary;
  status: AssignmentStatus;
  declineReason: string | null;
  respondedAt: string | null;
  createdAt: string;
}

export interface JobSummary {
  id: string;
  jobNumber: string;
  title: string;
  type: JobType;
  status: JobStatus;
  scheduledDate: string | null;
  scheduledTime: string | null;
  priceCents: number | null;
  property: PropertySummary | null;
  clientContact: ContactSummary | null;
  agentContact: ContactSummary | null;
  assignedInspector: UserSummary | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  archivedAt: string | null;
}

export interface JobDetail extends JobSummary {
  description: string | null;
  notes: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  createdBy: UserSummary;
  assignments: JobAssignmentSummary[];
}

export interface JobsListResponse {
  jobs: JobSummary[];
  total: number;
  page: number;
  pageSize: number;
}

export interface CreateJobRequest {
  title: string;
  description?: string;
  type: JobType;
  clientContactId?: string;
  agentContactId?: string;
  property?: {
    addressLine1: string;
    addressLine2?: string;
    suburb: string;
    state: string;
    postcode: string;
  };
  scheduledDate?: string;
  scheduledTime?: string;
  priceCents?: number;
  notes?: string;
}

export interface UpdateJobRequest extends Partial<CreateJobRequest> {}

export interface AssignJobRequest {
  inspectorId: string;
}

export interface DeclineJobRequest {
  reason?: string;
}
