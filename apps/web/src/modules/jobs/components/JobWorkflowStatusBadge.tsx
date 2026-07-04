import { InspectionStatus, JobStatus } from '@sitescop/shared-types';
import { Badge } from '@/design-system/components';
import { getJobWorkflowStatus } from '../lib/job-display-status';

interface JobWorkflowStatusBadgeProps {
  jobStatus: JobStatus;
  inspectionStatus?: InspectionStatus | null;
}

export function JobWorkflowStatusBadge({ jobStatus, inspectionStatus }: JobWorkflowStatusBadgeProps) {
  const { label, variant } = getJobWorkflowStatus(jobStatus, inspectionStatus);
  return <Badge variant={variant}>{label}</Badge>;
}
