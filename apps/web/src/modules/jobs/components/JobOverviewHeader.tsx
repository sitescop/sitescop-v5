import { Link } from 'react-router-dom';
import { Mail, MapPin, Phone, User } from 'lucide-react';
import {
  JOB_CONTRACT_SOURCE_LABELS,
  JOB_TYPE_LABELS,
  JobContractSource,
  type InspectionDetail,
  type JobBillingStatus,
  type JobDetail,
} from '@sitescop/shared-types';
import { Button, Badge } from '@/design-system/components';
import { getJobActionState } from '../lib/job-action-state';
import { getJobWorkflowStatus } from '../lib/job-display-status';
import { JobWorkflowStatusBadge } from './JobWorkflowStatusBadge';

interface JobOverviewHeaderProps {
  job: JobDetail;
  billing: JobBillingStatus | undefined;
  inspection: InspectionDetail | null | undefined;
  isAssignedInspector: boolean;
  canManageInspection: boolean;
  canAssign: boolean;
  onAcceptJob: () => void;
  onDeclineJob: () => void;
  onAssignClick: () => void;
  onStartInspection: () => void;
  isAccepting: boolean;
  isStartingInspection: boolean;
}

function formatPhoneLink(phone: string): string {
  return phone.replace(/\s+/g, '');
}

export function JobOverviewHeader({
  job,
  billing,
  inspection,
  isAssignedInspector,
  canManageInspection,
  canAssign,
  onAcceptJob,
  onDeclineJob,
  onAssignClick,
  onStartInspection,
  isAccepting,
  isStartingInspection,
}: JobOverviewHeaderProps) {
  const client = job.clientContact;
  const phone = client?.phone?.trim() ?? '';
  const email = client?.email?.trim() ?? '';
  const property = job.property?.formattedAddress ?? 'Address not specified';

  const actions = getJobActionState(job, billing, inspection, {
    isAssignedInspector,
    canManageInspection,
    canAssign,
  });

  const workflowStatus = getJobWorkflowStatus(job.status, job.inspectionStatus ?? inspection?.status);

  const showActionBar =
    actions.canAccept ||
    actions.canDecline ||
    actions.canAssign ||
    actions.canStartInspection ||
    actions.canContinueInspection ||
    actions.canOpenInspectionReport;

  return (
    <div className="mb-6 overflow-hidden rounded-sm border border-border bg-surface shadow-sm">
      <div className="border-b border-border bg-background px-5 py-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-lg font-bold uppercase tracking-wide text-danger">
                {JOB_TYPE_LABELS[job.type]} Inspection
              </span>
              <JobWorkflowStatusBadge
                jobStatus={job.status}
                inspectionStatus={job.inspectionStatus ?? inspection?.status}
              />
              {job.contractSource === JobContractSource.MANUAL_PAPER && (
                <Badge variant="default">
                  {JOB_CONTRACT_SOURCE_LABELS[JobContractSource.MANUAL_PAPER]}
                </Badge>
              )}
            </div>
            <p className="text-sm font-medium text-text">{job.jobNumber}</p>
            <p className="text-sm text-text-light">{actions.statusHint}</p>
          </div>
          <div className="text-right text-sm">
            <p className="text-lg font-semibold text-text">{workflowStatus.label}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 px-5 py-4 md:grid-cols-2">
        <div className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-text-light">Client</h3>
          <div className="flex items-start gap-2 text-text">
            <User className="mt-0.5 h-4 w-4 shrink-0 text-text-muted" />
            <div>
              <p className="font-semibold">{client?.displayName ?? 'No client linked'}</p>
              {phone ? (
                <a
                  href={`tel:${formatPhoneLink(phone)}`}
                  className="mt-1 flex items-center gap-1.5 text-base font-medium text-primary hover:underline"
                >
                  <Phone className="h-4 w-4" />
                  {phone}
                </a>
              ) : (
                <p className="mt-1 text-sm text-warning">No mobile number — add in CRM</p>
              )}
              {email ? (
                <a
                  href={`mailto:${email}`}
                  className="mt-1 flex items-center gap-1.5 text-sm text-text-light hover:text-primary hover:underline"
                >
                  <Mail className="h-3.5 w-3.5" />
                  {email}
                </a>
              ) : null}
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-text-light">Property</h3>
          <div className="flex items-start gap-2 text-text">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-text-muted" />
            <p className="font-medium">{property}</p>
          </div>
          {job.assignedInspector && (
            <p className="text-sm text-text-light">
              Inspector: <span className="font-medium text-text">{job.assignedInspector.displayName}</span>
            </p>
          )}
        </div>
      </div>

      {showActionBar && (
        <div className="flex flex-wrap gap-2 border-t border-border bg-primary/5 px-5 py-4">
          {actions.canAccept && (
            <Button onClick={onAcceptJob} isLoading={isAccepting}>
              Accept Job
            </Button>
          )}
          {actions.canDecline && (
            <Button variant="secondary" onClick={onDeclineJob}>
              Decline
            </Button>
          )}
          {actions.canAssign && (
            <Button onClick={onAssignClick}>Assign Inspector</Button>
          )}
          {actions.canStartInspection && (
            <Button variant="accent" onClick={onStartInspection} isLoading={isStartingInspection}>
              Start Inspection
            </Button>
          )}
          {actions.canContinueInspection && inspection && (
            <Button variant="accent" asChild>
              <Link to={`/inspections/${inspection.id}`}>Continue Inspection</Link>
            </Button>
          )}
          {actions.canOpenInspectionReport && inspection && !actions.canContinueInspection && (
            <Button variant="accent" asChild>
              <Link to={`/inspections/${inspection.id}`}>
                {inspection.status === 'COMPLETED' ? 'Edit Inspection Report' : 'Open Inspection'}
              </Link>
            </Button>
          )}
          {phone && (
            <Button variant="secondary" asChild>
              <a href={`tel:${formatPhoneLink(phone)}`}>
                <Phone className="h-4 w-4" />
                Call Client
              </a>
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
