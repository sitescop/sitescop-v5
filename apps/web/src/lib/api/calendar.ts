import type {
  CalendarEventsResponse,
  RescheduleCalendarEventRequest,
  TodayJobsResponse,
  UnscheduledJobsResponse,
} from '@sitescop/shared-types';
import { apiRequest } from '../api-client';

export const calendarApi = {
  listEvents: (params: { start: string; end: string; inspectorId?: string }) => {
    const query = new URLSearchParams(params);
    return apiRequest<CalendarEventsResponse>(`/api/v1/calendar/events?${query}`);
  },
  listToday: (params: { date: string; inspectorId?: string }) => {
    const query = new URLSearchParams(params);
    return apiRequest<TodayJobsResponse>(`/api/v1/calendar/today?${query}`);
  },
  listUnscheduled: (params?: { limit?: string }) => {
    const query = params ? `?${new URLSearchParams(params)}` : '';
    return apiRequest<UnscheduledJobsResponse>(`/api/v1/calendar/unscheduled${query}`);
  },
  reschedule: (jobId: string, body: RescheduleCalendarEventRequest) =>
    apiRequest<{ event: import('@sitescop/shared-types').CalendarEvent }>(
      `/api/v1/calendar/events/${jobId}`,
      { method: 'PATCH', body },
    ),
};
