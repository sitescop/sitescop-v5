import { InspectionStatus, JOB_STATUS_LABELS, JobStatus } from '@sitescop/shared-types';

export type WorkflowStatusVariant = 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'accent';

export interface JobWorkflowStatus {
  label: string;
  variant: WorkflowStatusVariant;
}

/**
 * User-facing job status for inspectors and office staff.
 * Shows Start Inspection → In Progress → Complete based on job + report state.
 */
export function getJobWorkflowStatus(
  jobStatus: JobStatus,
  inspectionStatus?: InspectionStatus | null,
): JobWorkflowStatus {
  if (jobStatus === JobStatus.COMPLETED) {
    if (!inspectionStatus) {
      return { label: 'Start Inspection', variant: 'warning' };
    }
    if (inspectionStatus === InspectionStatus.COMPLETED) {
      return { label: 'Complete', variant: 'success' };
    }
    return { label: 'In Progress', variant: 'primary' };
  }

  if (jobStatus === JobStatus.IN_PROGRESS) {
    if (inspectionStatus === InspectionStatus.COMPLETED) {
      return { label: 'Complete', variant: 'success' };
    }
    return { label: 'In Progress', variant: 'primary' };
  }

  if (jobStatus === JobStatus.ACCEPTED) {
    return { label: 'Start Inspection', variant: 'accent' };
  }

  if (jobStatus === JobStatus.ASSIGNED) {
    return { label: 'Awaiting Accept', variant: 'accent' };
  }

  if (jobStatus === JobStatus.PENDING_ASSIGNMENT) {
    return { label: 'Assign Inspector', variant: 'warning' };
  }

  if (jobStatus === JobStatus.DRAFT) {
    return { label: 'Send Agreement', variant: 'default' };
  }

  if (jobStatus === JobStatus.CANCELLED) {
    return { label: 'Cancelled', variant: 'danger' };
  }

  if (jobStatus === JobStatus.ARCHIVED) {
    return { label: 'Archived', variant: 'default' };
  }

  return { label: JOB_STATUS_LABELS[jobStatus], variant: 'default' };
}
