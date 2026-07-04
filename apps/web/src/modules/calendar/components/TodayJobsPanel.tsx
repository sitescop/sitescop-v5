import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { Clock, MapPin } from 'lucide-react';
import { JOB_TYPE_LABELS, type CalendarEvent } from '@sitescop/shared-types';
import { calendarApi } from '@/lib/api/calendar';
import { Button, Card } from '@/design-system/components';
import { JobWorkflowStatusBadge } from '@/modules/jobs/components/JobWorkflowStatusBadge';
import { formatLocalDateLabel, localDateKey } from '../lib/calendar-date-utils';
import { calendarEventWorkLabel, calendarEventWorkUrl } from '../lib/calendar-work-url';
import { calendarClientFirstName } from '../lib/calendar-client-display';

interface TodayJobsPanelProps {
  date?: string;
  title?: string;
  compact?: boolean;
  onWorkClick?: (event: CalendarEvent) => void;
}

export function TodayJobsPanel({
  date = localDateKey(),
  title,
  compact = false,
  onWorkClick,
}: TodayJobsPanelProps) {
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ['calendar-today', date],
    queryFn: () => calendarApi.listToday({ date }),
  });

  const events = data?.events ?? [];
  const heading = title ?? `Today — ${formatLocalDateLabel(date)}`;

  function handleWork(event: CalendarEvent) {
    if (onWorkClick) {
      onWorkClick(event);
      return;
    }
    navigate(calendarEventWorkUrl(event));
  }

  if (isLoading) {
    return (
      <Card className={compact ? 'p-4' : 'p-5'}>
        <p className="text-sm text-text-muted">Loading today&apos;s jobs...</p>
      </Card>
    );
  }

  return (
    <Card className={compact ? 'p-4' : 'p-5'}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-lg font-semibold text-text">{heading}</h3>
          <p className="text-sm text-text-light">
            {events.length === 0
              ? 'No inspections scheduled for this day.'
              : `${events.length} job${events.length === 1 ? '' : 's'} scheduled — tap below to open and continue.`}
          </p>
        </div>
        {!compact && events.length > 0 && (
          <Button variant="secondary" size="sm" asChild>
            <Link to="/calendar?view=today">Today only view</Link>
          </Button>
        )}
        {compact && events.length > 0 && (
          <Button variant="secondary" size="sm" asChild>
            <Link to="/calendar?view=today">View all today</Link>
          </Button>
        )}
      </div>

      {events.length === 0 ? (
        <p className="text-sm text-text-muted">
          Check the month view or{' '}
          <Link to="/jobs" className="text-primary hover:underline">
            Jobs
          </Link>{' '}
          for unscheduled work.
        </p>
      ) : (
        <ul className="space-y-3">
          {events.map((event) => (
            <li
              key={event.id}
              className="flex flex-col gap-3 rounded-sm border border-border bg-background p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-bold uppercase text-danger">{JOB_TYPE_LABELS[event.type]}</span>
                  <JobWorkflowStatusBadge
                    jobStatus={event.status}
                    inspectionStatus={event.inspectionStatus ?? undefined}
                  />
                </div>
                <p className="font-medium text-text">
                  {event.scheduledTime && (
                    <span className="mr-2 inline-flex items-center gap-1 text-primary">
                      <Clock className="h-4 w-4" />
                      {event.scheduledTime}
                    </span>
                  )}
                  {calendarClientFirstName(event.clientFirstName, event.clientName) ?? event.jobNumber}
                  {calendarClientFirstName(event.clientFirstName, event.clientName) ? (
                    <span className="text-text-light"> · {event.jobNumber}</span>
                  ) : (
                    <> — {event.title}</>
                  )}
                </p>
                {event.propertyAddress && (
                  <p className="flex items-start gap-1.5 text-sm text-text-light">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
                    {event.propertyAddress}
                  </p>
                )}
              </div>
              <div className="flex shrink-0 flex-wrap gap-2">
                <Button variant="accent" onClick={() => handleWork(event)}>
                  {calendarEventWorkLabel(event)}
                </Button>
                <Button variant="secondary" asChild>
                  <Link to={`/jobs/${event.jobId}`}>Job details</Link>
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
