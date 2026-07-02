import { JOB_STATUS_LABELS, JobStatus } from '@sitescop/shared-types';
import { Badge } from './Badge';

const statusVariants: Record<JobStatus, 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'accent'> = {
  [JobStatus.DRAFT]: 'default',
  [JobStatus.PENDING_ASSIGNMENT]: 'warning',
  [JobStatus.ASSIGNED]: 'accent',
  [JobStatus.ACCEPTED]: 'primary',
  [JobStatus.IN_PROGRESS]: 'primary',
  [JobStatus.COMPLETED]: 'success',
  [JobStatus.CANCELLED]: 'danger',
  [JobStatus.ARCHIVED]: 'default',
};

interface JobStatusBadgeProps {
  status: JobStatus;
}

export function JobStatusBadge({ status }: JobStatusBadgeProps) {
  return <Badge variant={statusVariants[status]}>{JOB_STATUS_LABELS[status]}</Badge>;
}
