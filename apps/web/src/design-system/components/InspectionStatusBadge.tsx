import { INSPECTION_STATUS_LABELS, InspectionStatus } from '@sitescop/shared-types';
import { Badge } from './Badge';

const statusVariants: Record<InspectionStatus, 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'accent'> = {
  [InspectionStatus.DRAFT]: 'default',
  [InspectionStatus.IN_PROGRESS]: 'primary',
  [InspectionStatus.COMPLETED]: 'success',
};

interface InspectionStatusBadgeProps {
  status: InspectionStatus;
}

export function InspectionStatusBadge({ status }: InspectionStatusBadgeProps) {
  return <Badge variant={statusVariants[status]}>{INSPECTION_STATUS_LABELS[status]}</Badge>;
}
