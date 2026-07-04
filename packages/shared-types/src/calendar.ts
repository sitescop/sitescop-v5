import type { InspectionStatus } from './inspections.js';
import type { JobStatus, JobType } from './jobs.js';

export interface CalendarEvent {
  id: string;
  jobId: string;
  jobNumber: string;
  title: string;
  type: JobType;
  status: JobStatus;
  inspectionStatus: InspectionStatus | null;
  inspectionId: string | null;
  scheduledDate: string;
  scheduledTime: string | null;
  propertyAddress: string | null;
  clientName: string | null;
  clientFirstName: string | null;
  inspectorId: string | null;
  inspectorName: string | null;
}

export interface CalendarEventsResponse {
  events: CalendarEvent[];
  unscheduledCount: number;
}

export interface TodayJobsResponse {
  date: string;
  events: CalendarEvent[];
  total: number;
}

export interface UnscheduledJobSummary {
  id: string;
  jobNumber: string;
  title: string;
  type: JobType;
  status: JobStatus;
  clientName: string | null;
  propertyAddress: string | null;
  inspectorName: string | null;
}

export interface UnscheduledJobsResponse {
  jobs: UnscheduledJobSummary[];
  total: number;
}

export interface RescheduleCalendarEventRequest {
  scheduledDate: string;
  scheduledTime?: string;
  inspectorId?: string;
}
