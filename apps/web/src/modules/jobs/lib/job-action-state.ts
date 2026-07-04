import { JobStatus, JobContractSource } from '@sitescop/shared-types';
import type { InspectionDetail, JobBillingStatus, JobDetail } from '@sitescop/shared-types';

export interface JobActionState {
  isManualPaper: boolean;
  canAccept: boolean;
  canDecline: boolean;
  canAssign: boolean;
  canStartInspection: boolean;
  canContinueInspection: boolean;
  canOpenInspectionReport: boolean;
  completedWithoutInspection: boolean;
  statusHint: string;
}

export function getJobActionState(
  job: JobDetail,
  billing: JobBillingStatus | undefined,
  inspection: InspectionDetail | null | undefined,
  options: {
    isAssignedInspector: boolean;
    canManageInspection: boolean;
    canAssign: boolean;
  },
): JobActionState {
  const isManualPaper = job.contractSource === JobContractSource.MANUAL_PAPER;
  const inspectionReady = isManualPaper || Boolean(billing?.readyForInspection);
  const hasInspection = Boolean(inspection);
  const inspectionCompleted = inspection?.status === 'COMPLETED';
  const completedWithoutInspection = job.status === JobStatus.COMPLETED && !inspection;
  const jobAllowsInspection =
    job.status === JobStatus.ACCEPTED ||
    job.status === JobStatus.IN_PROGRESS ||
    job.status === JobStatus.COMPLETED ||
    job.status === JobStatus.ARCHIVED ||
    Boolean(job.archivedAt) ||
    completedWithoutInspection;

  const canStartInspection =
    inspectionReady &&
    options.canManageInspection &&
    !hasInspection &&
    jobAllowsInspection;

  const canOpenInspectionReport =
    options.canManageInspection &&
    hasInspection &&
    (inspectionReady ||
      isManualPaper ||
      job.status === JobStatus.COMPLETED ||
      job.status === JobStatus.ARCHIVED ||
      Boolean(job.archivedAt));

  const canContinueInspection =
    canOpenInspectionReport && hasInspection && !inspectionCompleted && jobAllowsInspection;

  let statusHint = 'Review job details and take the next step below.';
  if (isManualPaper) {
    statusHint =
      job.status === JobStatus.COMPLETED && inspectionCompleted
        ? 'Paper contract job complete — you can still edit the inspection report anytime.'
        : 'Paper contract signed offline — draft the inspection report below.';
  } else switch (job.status) {
    case JobStatus.DRAFT:
      statusHint = 'Send the client agreement to begin.';
      break;
    case JobStatus.PENDING_ASSIGNMENT:
      statusHint = 'Assign an inspector when payment is received.';
      break;
    case JobStatus.ASSIGNED:
      statusHint = options.isAssignedInspector
        ? 'Accept this job to begin the inspection.'
        : 'Waiting for the assigned inspector to accept.';
      break;
    case JobStatus.ACCEPTED:
      statusHint = 'Start the on-site inspection report.';
      break;
    case JobStatus.IN_PROGRESS:
      statusHint = inspection
        ? 'Continue and complete the inspection report.'
        : 'Start the on-site inspection report.';
      break;
    case JobStatus.COMPLETED:
      statusHint = completedWithoutInspection
        ? 'Start the inspection report — the job was closed before the report began.'
        : inspectionCompleted
          ? 'Inspection complete — open the report below to review or edit anytime.'
          : 'Job marked complete.';
      break;
    case JobStatus.CANCELLED:
      statusHint = 'This job was cancelled.';
      break;
    case JobStatus.ARCHIVED:
      statusHint = inspectionCompleted
        ? 'Archived job — you can still open and edit the inspection report.'
        : 'This job is archived.';
      break;
    default:
      break;
  }

  return {
    isManualPaper,
    canAccept: options.isAssignedInspector && job.status === JobStatus.ASSIGNED,
    canDecline: options.isAssignedInspector && job.status === JobStatus.ASSIGNED,
    canAssign:
      options.canAssign && inspectionReady && !job.assignedInspector && !isManualPaper,
    canStartInspection,
    canContinueInspection,
    canOpenInspectionReport,
    completedWithoutInspection,
    statusHint,
  };
}
