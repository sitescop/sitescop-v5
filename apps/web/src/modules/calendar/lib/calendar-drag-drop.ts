export const CALENDAR_DRAG_MIME = 'application/x-sitescop-calendar-job';

export interface CalendarDragPayload {
  jobId: string;
  sourceDate?: string;
  scheduledTime?: string | null;
}

export function setCalendarDragData(dataTransfer: DataTransfer, payload: CalendarDragPayload) {
  dataTransfer.setData(CALENDAR_DRAG_MIME, JSON.stringify(payload));
  dataTransfer.effectAllowed = 'move';
}

export function readCalendarDragData(dataTransfer: DataTransfer): CalendarDragPayload | null {
  const raw = dataTransfer.getData(CALENDAR_DRAG_MIME);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as CalendarDragPayload;
    if (!parsed?.jobId) return null;
    return parsed;
  } catch {
    return null;
  }
}
