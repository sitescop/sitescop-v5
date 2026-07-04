import { Link } from 'react-router-dom';
import { Mail, MapPin, Phone, User } from 'lucide-react';
import { INSPECTION_STATUS_LABELS, JOB_TYPE_LABELS, type InspectionDetail } from '@sitescop/shared-types';
import { Button, InspectionStatusBadge } from '@/design-system/components';

interface InspectionOverviewHeaderProps {
  inspection: InspectionDetail;
  saveState?: 'idle' | 'saving' | 'saved' | 'error';
}

function formatPhoneLink(phone: string): string {
  return phone.replace(/\s+/g, '');
}

export function InspectionOverviewHeader({ inspection, saveState = 'idle' }: InspectionOverviewHeaderProps) {
  const phone =
    inspection.clientPhone?.trim() ||
    inspection.formData.shared.jobInformation.clientMobile?.trim() ||
    '';
  const email =
    inspection.clientEmail?.trim() ||
    inspection.formData.shared.jobInformation.clientEmail?.trim() ||
    '';
  const property = inspection.propertyAddress ?? inspection.jobTitle ?? 'Address not specified';

  return (
    <div className="mb-6 overflow-hidden rounded-sm border border-border bg-surface shadow-sm">
      <div className="border-b border-border bg-background px-5 py-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-lg font-bold uppercase tracking-wide text-danger">
                {JOB_TYPE_LABELS[inspection.jobType]} Inspection
              </span>
              <InspectionStatusBadge status={inspection.status} />
            </div>
            <p className="text-sm font-medium text-text">{inspection.inspectionNumber}</p>
            <p className="text-sm text-text-light">
              Job {inspection.jobNumber} · {INSPECTION_STATUS_LABELS[inspection.status]}
            </p>
          </div>
          <div className="min-w-[8rem] text-right">
            <p className="text-2xl font-bold text-primary">{inspection.progressPercent}%</p>
            <p className="text-xs font-semibold uppercase tracking-wide text-text-light">Complete</p>
            {saveState === 'saving' && <p className="mt-1 text-sm text-primary">Saving...</p>}
            {saveState === 'saved' && <p className="mt-1 text-sm text-success">Saved</p>}
            {saveState === 'error' && (
              <p className="mt-1 text-sm text-danger">Save failed — edit again to retry</p>
            )}
          </div>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-border">
          <div
            className="h-full bg-primary transition-all"
            style={{ width: `${inspection.progressPercent}%` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 px-5 py-4 md:grid-cols-2">
        <div className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-text-light">Client</h3>
          <div className="flex items-start gap-2 text-text">
            <User className="mt-0.5 h-4 w-4 shrink-0 text-text-muted" />
            <div>
              <p className="font-semibold">{inspection.clientName ?? 'No client linked'}</p>
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
          {inspection.inspectorName && (
            <p className="text-sm text-text-light">
              Inspector: <span className="font-medium text-text">{inspection.inspectorName}</span>
            </p>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-2 border-t border-border bg-primary/5 px-5 py-4">
        <Button variant="secondary" asChild>
          <Link to={`/jobs/${inspection.jobId}`}>View Job</Link>
        </Button>
        {phone && (
          <Button variant="secondary" asChild>
            <a href={`tel:${formatPhoneLink(phone)}`}>
              <Phone className="h-4 w-4" />
              Call Client
            </a>
          </Button>
        )}
      </div>
    </div>
  );
}
