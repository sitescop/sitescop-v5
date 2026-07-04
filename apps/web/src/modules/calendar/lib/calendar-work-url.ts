import type { CalendarEvent } from '@sitescop/shared-types';

/** Best route for an inspector to open and work on this job. */
export function calendarEventWorkUrl(event: CalendarEvent): string {
  if (event.inspectionId) {
    return `/inspections/${event.inspectionId}`;
  }
  return `/jobs/${event.jobId}`;
}

export function calendarEventWorkLabel(event: CalendarEvent): string {
  if (event.inspectionId) {
    return event.inspectionStatus === 'COMPLETED' ? 'Edit Report' : 'Continue Inspection';
  }
  return 'Open Job';
}
