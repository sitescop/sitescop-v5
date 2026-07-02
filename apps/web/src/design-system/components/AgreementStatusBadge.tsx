import { AGREEMENT_STATUS_LABELS, AgreementStatus } from '@sitescop/shared-types';
import { Badge } from './Badge';

const variants: Record<AgreementStatus, 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'accent'> = {
  [AgreementStatus.DRAFT]: 'default',
  [AgreementStatus.SENT]: 'accent',
  [AgreementStatus.VIEWED]: 'primary',
  [AgreementStatus.SIGNED]: 'success',
  [AgreementStatus.DECLINED]: 'danger',
  [AgreementStatus.EXPIRED]: 'warning',
  [AgreementStatus.CANCELLED]: 'default',
};

export function AgreementStatusBadge({ status }: { status: AgreementStatus }) {
  return <Badge variant={variants[status]}>{AGREEMENT_STATUS_LABELS[status]}</Badge>;
}
