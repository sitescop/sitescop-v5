import { useMemo, useState, type DragEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight, GripVertical, MapPin } from 'lucide-react';
import {
  JOB_TYPE_LABELS,
  type CalendarEvent,
  type UnscheduledJobSummary,
} from '@sitescop/shared-types';
import { calendarApi } from '@/lib/api/calendar';
import { jobsApi } from '@/lib/api/jobs';
import { useAuthStore } from '@/modules/auth/store/auth-store';
import { JobWorkflowStatusBadge } from '@/modules/jobs/components/JobWorkflowStatusBadge';
import { TodayJobsPanel } from '../components/TodayJobsPanel';
import { localDateKey } from '../lib/calendar-date-utils';
import { readCalendarDragData, setCalendarDragData } from '../lib/calendar-drag-drop';
import { calendarEventWorkLabel, calendarEventWorkUrl } from '../lib/calendar-work-url';
import { calendarClientFirstName } from '../lib/calendar-client-display';
import {
  Button,
  Card,
  Input,
  LoadingOverlay,
  Modal,
  PageHeader,
  Select,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/design-system/components';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function startOfMonth(year: number, month: number): Date {
  return new Date(year, month, 1);
}

function endOfMonth(year: number, month: number): Date {
  return new Date(year, month + 1, 0);
}

function toDateKey(date: Date): string {
  return localDateKey(date);
}

function monthLabel(year: number, month: number): string {
  return new Date(year, month, 1).toLocaleDateString('en-AU', {
    month: 'long',
    year: 'numeric',
  });
}

function buildMonthGrid(year: number, month: number): Date[] {
  const first = new Date(year, month, 1);
  const startOffset = (first.getDay() + 6) % 7;
  const gridStart = new Date(year, month, 1 - startOffset);

  return Array.from({ length: 42 }, (_, index) => {
    const day = new Date(gridStart);
    day.setDate(gridStart.getDate() + index);
    return day;
  });
}

function eventDateKey(event: CalendarEvent): string {
  return localDateKey(new Date(event.scheduledDate));
}

type CalendarView = 'month' | 'today' | 'unscheduled';

function parseCalendarView(raw: string | null): CalendarView {
  if (raw === 'today' || raw === 'unscheduled') return raw;
  return 'month';
}

export function CalendarPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const view = parseCalendarView(searchParams.get('view'));
  const queryClient = useQueryClient();
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const canManage = hasPermission('calendar:manage');
  const canSchedule = canManage;
  const canAssign = hasPermission('jobs:assign');
  const canViewAll = hasPermission('jobs:view_all');

  const today = new Date();
  const todayKey = localDateKey(today);
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [inspectorFilter, setInspectorFilter] = useState('');
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [scheduleJob, setScheduleJob] = useState<UnscheduledJobSummary | null>(null);
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');
  const [scheduleInspectorId, setScheduleInspectorId] = useState('');
  const [dropTargetKey, setDropTargetKey] = useState<string | null>(null);

  const range = useMemo(() => {
    const start = startOfMonth(year, month);
    const end = endOfMonth(year, month);
    return {
      start: toDateKey(start),
      end: toDateKey(end),
    };
  }, [year, month]);

  const gridDays = useMemo(() => buildMonthGrid(year, month), [year, month]);

  const { data, isLoading } = useQuery({
    queryKey: ['calendar-events', range.start, range.end, inspectorFilter],
    queryFn: () =>
      calendarApi.listEvents({
        start: range.start,
        end: range.end,
        ...(inspectorFilter ? { inspectorId: inspectorFilter } : {}),
      }),
  });

  const { data: unscheduledData } = useQuery({
    queryKey: ['calendar-unscheduled'],
    queryFn: () => calendarApi.listUnscheduled({ limit: '15' }),
  });

  const { data: inspectorsData } = useQuery({
    queryKey: ['inspectors'],
    queryFn: () => jobsApi.listInspectors(),
    enabled: canAssign || canViewAll,
  });

  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const event of data?.events ?? []) {
      const key = eventDateKey(event);
      const list = map.get(key) ?? [];
      list.push(event);
      map.set(key, list);
    }
    return map;
  }, [data?.events]);

  const rescheduleMutation = useMutation({
    mutationFn: (payload: { jobId: string; scheduledDate: string; scheduledTime?: string; inspectorId?: string }) =>
      calendarApi.reschedule(payload.jobId, {
        scheduledDate: payload.scheduledDate,
        scheduledTime: payload.scheduledTime,
        inspectorId: payload.inspectorId,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
      void queryClient.invalidateQueries({ queryKey: ['calendar-unscheduled'] });
      void queryClient.invalidateQueries({ queryKey: ['jobs'] });
      setSelectedEvent(null);
      setScheduleJob(null);
    },
  });

  function shiftMonth(delta: number) {
    const next = new Date(year, month + delta, 1);
    setYear(next.getFullYear());
    setMonth(next.getMonth());
  }

  function setView(nextView: CalendarView) {
    const next = new URLSearchParams(searchParams);
    if (nextView === 'month') {
      next.delete('view');
    } else {
      next.set('view', nextView);
    }
    setSearchParams(next);
  }

  function goToTodayView() {
    setView('today');
  }

  function handleDragOverDay(event: DragEvent, dateKey: string) {
    if (!canManage) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    setDropTargetKey(dateKey);
  }

  function handleDropOnDay(event: DragEvent, dateKey: string) {
    if (!canManage) return;
    event.preventDefault();
    setDropTargetKey(null);
    const payload = readCalendarDragData(event.dataTransfer);
    if (!payload || payload.sourceDate === dateKey) return;

    rescheduleMutation.mutate({
      jobId: payload.jobId,
      scheduledDate: dateKey,
      scheduledTime: payload.scheduledTime ?? undefined,
    });
  }

  function startDragJob(
    event: DragEvent,
    payload: { jobId: string; sourceDate?: string; scheduledTime?: string | null },
  ) {
    if (!canManage) return;
    setCalendarDragData(event.dataTransfer, payload);
  }

  function openEvent(event: CalendarEvent) {
    const isTodayEvent = eventDateKey(event) === todayKey;

    if (canSchedule && !isTodayEvent) {
      setSelectedEvent(event);
      setScheduleDate(eventDateKey(event));
      setScheduleTime(event.scheduledTime ?? '');
      return;
    }

    if (isTodayEvent) {
      navigate(calendarEventWorkUrl(event));
      return;
    }

    setSelectedEvent(event);
  }

  function openScheduleModal(job: UnscheduledJobSummary, dateKey?: string) {
    setScheduleJob(job);
    setScheduleDate(dateKey ?? '');
    setScheduleTime('');
    setScheduleInspectorId('');
  }

  if (isLoading && view === 'month') {
    return <LoadingOverlay message="Loading calendar..." fullScreen={false} />;
  }

  const unscheduledCount = unscheduledData?.jobs.length ?? 0;

  return (
    <div>
      <PageHeader
        title="Calendar"
        description={
          !canSchedule
            ? 'View your schedule — contact the office to change dates'
            : view === 'today'
              ? 'Work only on inspections scheduled for today'
              : view === 'unscheduled'
                ? 'Drag jobs onto a day in Month view to schedule them'
                : 'Schedule inspections — drag jobs between days or from Needs scheduling'
        }
        breadcrumbs={[{ label: 'Calendar' }]}
        actions={
          view === 'month' ? (
            <div className="flex flex-wrap items-center gap-2">
              {canViewAll && (
                <Select
                  placeholder="All inspectors"
                  value={inspectorFilter}
                  onChange={(e) => setInspectorFilter(e.target.value)}
                  options={[
                    { value: '', label: 'All inspectors' },
                    ...(inspectorsData?.inspectors ?? []).map((i) => ({
                      value: i.id,
                      label: i.displayName,
                    })),
                  ]}
                />
              )}
              <Button variant="secondary" size="sm" onClick={() => shiftMonth(-1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="min-w-[10rem] text-center text-sm font-semibold text-text">
                {monthLabel(year, month)}
              </span>
              <Button variant="secondary" size="sm" onClick={() => shiftMonth(1)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setYear(today.getFullYear());
                  setMonth(today.getMonth());
                  goToTodayView();
                }}
              >
                Jump to today
              </Button>
            </div>
          ) : undefined
        }
      />

      {!canSchedule && (
        <div className="mb-4 rounded-sm border border-border bg-background px-4 py-3 text-sm text-text-light">
          Your calendar is <strong className="text-text">view only</strong>. Drag-and-drop and rescheduling are
          handled by the office — call them if you need a different inspection date.
        </div>
      )}

      <Tabs value={view} onValueChange={(value) => setView(parseCalendarView(value))} className="mb-6">
        <TabsList>
          <TabsTrigger value="month">Month</TabsTrigger>
          <TabsTrigger value="today">Today</TabsTrigger>
          {canManage && (
            <TabsTrigger value="unscheduled">
              Needs scheduling{unscheduledCount > 0 ? ` (${unscheduledCount})` : ''}
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="today">
          <TodayJobsPanel date={todayKey} title={`Today — ${todayKey}`} />
        </TabsContent>

        <TabsContent value="unscheduled">
          {(unscheduledData?.jobs.length ?? 0) === 0 ? (
            <Card className="p-5">
              <p className="text-sm text-text-muted">All active jobs have a scheduled date.</p>
            </Card>
          ) : (
            <Card className="p-5">
              <p className="mb-4 text-sm text-text-light">
                {canManage
                  ? 'Drag a job below onto any day in Month view, or use Schedule.'
                  : 'Jobs waiting for a scheduled date.'}
              </p>
              <ul className="divide-y divide-border">
                {unscheduledData?.jobs.map((job) => (
                  <li
                    key={job.id}
                    draggable={canManage}
                    onDragStart={(e) => startDragJob(e, { jobId: job.id })}
                    onDragEnd={() => setDropTargetKey(null)}
                    className={`flex flex-wrap items-center justify-between gap-3 py-3 ${
                      canManage ? 'cursor-grab active:cursor-grabbing' : ''
                    }`}
                  >
                    <div className="flex min-w-0 items-start gap-2">
                      {canManage && <GripVertical className="mt-1 h-4 w-4 shrink-0 text-text-muted" />}
                      <div>
                        <p className="font-medium text-text">
                          <Link to={`/jobs/${job.id}`} className="text-primary hover:underline">
                            {job.jobNumber}
                          </Link>{' '}
                          — {job.title}
                        </p>
                        <p className="text-sm text-text-light">
                          {JOB_TYPE_LABELS[job.type]}
                          {job.clientName ? ` · ${job.clientName}` : ''}
                          {job.propertyAddress ? ` · ${job.propertyAddress}` : ''}
                        </p>
                      </div>
                    </div>
                    {canManage && (
                      <Button size="sm" onClick={() => openScheduleModal(job)}>
                        Schedule
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="month">
          {(data?.unscheduledCount ?? 0) > 0 && canManage && (
            <div className="mb-4 rounded-sm border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-text">
              <strong>{data?.unscheduledCount}</strong> active job
              {(data?.unscheduledCount ?? 0) === 1 ? '' : 's'} need a date —{' '}
              <button
                type="button"
                className="font-medium text-primary hover:underline"
                onClick={() => setView('unscheduled')}
              >
                open Needs scheduling
              </button>{' '}
              and drag onto a day.
            </div>
          )}

          {canManage && unscheduledCount > 0 && (
            <Card className="mb-4 p-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-muted">
                Drag to schedule
              </p>
              <div className="flex flex-wrap gap-2">
                {unscheduledData?.jobs.slice(0, 6).map((job) => (
                  <div
                    key={job.id}
                    draggable
                    onDragStart={(e) => startDragJob(e, { jobId: job.id })}
                    onDragEnd={() => setDropTargetKey(null)}
                    className="flex cursor-grab items-center gap-1 rounded-sm border border-border bg-background px-2 py-1 text-xs font-medium text-text active:cursor-grabbing"
                    title={`${job.jobNumber} — drag onto a calendar day`}
                  >
                    <GripVertical className="h-3 w-3 text-text-muted" />
                    {job.jobNumber}
                  </div>
                ))}
                {unscheduledCount > 6 && (
                  <button
                    type="button"
                    className="text-xs text-primary hover:underline"
                    onClick={() => setView('unscheduled')}
                  >
                    +{unscheduledCount - 6} more
                  </button>
                )}
              </div>
            </Card>
          )}

          <div className="mb-6">
            <TodayJobsPanel date={todayKey} compact />
          </div>

          <Card className="overflow-hidden p-0">
            <div className="grid grid-cols-7 border-b border-border bg-background">
              {WEEKDAYS.map((day) => (
                <div key={day} className="px-2 py-2 text-center text-xs font-semibold uppercase text-text-light">
                  {day}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {gridDays.map((day) => {
                const key = toDateKey(day);
                const inMonth = day.getMonth() === month;
                const isToday = key === todayKey;
                const dayEvents = eventsByDay.get(key) ?? [];
                const isDropTarget = dropTargetKey === key;

                return (
                  <div
                    key={key}
                    onDragOver={(e) => handleDragOverDay(e, key)}
                    onDragLeave={() => setDropTargetKey((current) => (current === key ? null : current))}
                    onDrop={(e) => handleDropOnDay(e, key)}
                    className={`min-h-[7rem] border-b border-r border-border p-1 transition-colors ${
                      isDropTarget ? 'bg-primary/15 ring-2 ring-inset ring-primary' : inMonth ? 'bg-surface' : 'bg-background/60'
                    }`}
                  >
                    <div className="mb-1 flex items-center justify-between">
                      <span
                        className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium ${
                          isToday ? 'bg-primary text-white' : inMonth ? 'text-text' : 'text-text-muted'
                        }`}
                      >
                        {day.getDate()}
                      </span>
                      {isToday && dayEvents.length > 0 && (
                        <button
                          type="button"
                          className="text-xs font-medium text-primary hover:underline"
                          onClick={goToTodayView}
                        >
                          All today
                        </button>
                      )}
                      {canManage && inMonth && (
                        <button
                          type="button"
                          className="text-xs text-primary hover:underline"
                          onClick={() => {
                            if (unscheduledData?.jobs[0]) {
                              openScheduleModal(unscheduledData.jobs[0], key);
                            }
                          }}
                          title="Schedule a job on this day"
                        >
                          +
                        </button>
                      )}
                    </div>
                    <div className="space-y-1">
                      {dayEvents.map((event) => (
                        <button
                          key={event.id}
                          type="button"
                          draggable={canManage}
                          onDragStart={(e) => {
                            e.stopPropagation();
                            startDragJob(e, {
                              jobId: event.jobId,
                              sourceDate: eventDateKey(event),
                              scheduledTime: event.scheduledTime,
                            });
                          }}
                          onDragEnd={() => setDropTargetKey(null)}
                          onClick={() => openEvent(event)}
                          className={`flex w-full items-center gap-0.5 truncate rounded-sm bg-primary/10 px-1.5 py-0.5 text-left text-xs font-medium text-primary hover:bg-primary/20 ${
                            canManage ? 'cursor-grab active:cursor-grabbing' : ''
                          }`}
                          title={`${event.jobNumber} — ${event.title}${canManage ? ' (drag to move)' : ''}`}
                        >
                          {canManage && <GripVertical className="h-3 w-3 shrink-0 opacity-60" />}
                          <span className="truncate">
                            {event.scheduledTime ? `${event.scheduledTime} ` : ''}
                            {event.jobNumber}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      <Modal
        open={Boolean(selectedEvent)}
        onClose={() => setSelectedEvent(null)}
        title={selectedEvent?.jobNumber ?? 'Inspection'}
        footer={
          <>
            <Button variant="secondary" onClick={() => setSelectedEvent(null)}>
              Close
            </Button>
            {selectedEvent && (
              <>
                {eventDateKey(selectedEvent) === todayKey && (
                  <Button
                    variant="accent"
                    onClick={() => {
                      navigate(calendarEventWorkUrl(selectedEvent));
                      setSelectedEvent(null);
                    }}
                  >
                    {calendarEventWorkLabel(selectedEvent)}
                  </Button>
                )}
                <Button asChild>
                  <Link to={`/jobs/${selectedEvent.jobId}`}>Open Job</Link>
                </Button>
              </>
            )}
          </>
        }
      >
        {selectedEvent && (
          <div className="space-y-4 text-sm">
            {calendarClientFirstName(selectedEvent.clientFirstName, selectedEvent.clientName) && (
              <p className="text-lg font-semibold text-text">
                {calendarClientFirstName(selectedEvent.clientFirstName, selectedEvent.clientName)}
              </p>
            )}
            {selectedEvent.propertyAddress && (
              <p className="flex items-start gap-1.5 text-text-light">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
                {selectedEvent.propertyAddress}
              </p>
            )}
            <div className="flex flex-wrap items-center gap-2">
              <JobWorkflowStatusBadge
                jobStatus={selectedEvent.status}
                inspectionStatus={selectedEvent.inspectionStatus ?? undefined}
              />
              <span className="font-bold uppercase text-danger">{JOB_TYPE_LABELS[selectedEvent.type]}</span>
            </div>
            <p className="text-text-light">
              <strong className="text-text">Job:</strong> {selectedEvent.jobNumber}
            </p>
            <p>
              <strong>Inspector:</strong> {selectedEvent.inspectorName ?? 'Unassigned'}
            </p>
            <p>
              <strong>When:</strong>{' '}
              {new Date(selectedEvent.scheduledDate).toLocaleDateString('en-AU')}
              {selectedEvent.scheduledTime ? ` at ${selectedEvent.scheduledTime}` : ''}
            </p>
            {!canSchedule && eventDateKey(selectedEvent) !== todayKey && (
              <p className="rounded-sm border border-border bg-background px-3 py-2 text-text-light">
                This job is not scheduled for today. Contact the office if you need a different date.
              </p>
            )}
            {canSchedule && (
              <form
                className="space-y-3 border-t border-border pt-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  rescheduleMutation.mutate({
                    jobId: selectedEvent.jobId,
                    scheduledDate: scheduleDate || selectedEvent.scheduledDate.slice(0, 10),
                    scheduledTime: scheduleTime || selectedEvent.scheduledTime || undefined,
                    inspectorId: scheduleInspectorId || undefined,
                  });
                }}
              >
                <p className="font-medium text-text">Reschedule</p>
                <Input
                  label="Date"
                  type="date"
                  value={scheduleDate || selectedEvent.scheduledDate.slice(0, 10)}
                  onChange={(e) => setScheduleDate(e.target.value)}
                  required
                />
                <Input
                  label="Time"
                  placeholder="10:00"
                  value={scheduleTime || selectedEvent.scheduledTime || ''}
                  onChange={(e) => setScheduleTime(e.target.value)}
                />
                {canAssign && (
                  <Select
                    label="Inspector"
                    placeholder="Keep current"
                    value={scheduleInspectorId}
                    onChange={(e) => setScheduleInspectorId(e.target.value)}
                    options={[
                      { value: '', label: 'Keep current inspector' },
                      ...(inspectorsData?.inspectors ?? []).map((i) => ({
                        value: i.id,
                        label: i.displayName,
                      })),
                    ]}
                  />
                )}
                <Button type="submit" isLoading={rescheduleMutation.isPending}>
                  Save schedule
                </Button>
              </form>
            )}
          </div>
        )}
      </Modal>

      <Modal
        open={Boolean(scheduleJob)}
        onClose={() => setScheduleJob(null)}
        title="Schedule inspection"
        footer={
          <Button variant="secondary" onClick={() => setScheduleJob(null)}>
            Cancel
          </Button>
        }
      >
        {scheduleJob && (
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              rescheduleMutation.mutate({
                jobId: scheduleJob.id,
                scheduledDate: scheduleDate,
                scheduledTime: scheduleTime || undefined,
                inspectorId: scheduleInspectorId || undefined,
              });
            }}
          >
            <p className="text-sm text-text">
              <strong>{scheduleJob.jobNumber}</strong> — {scheduleJob.title}
            </p>
            <Input
              label="Date"
              type="date"
              value={scheduleDate}
              onChange={(e) => setScheduleDate(e.target.value)}
              required
            />
            <Input
              label="Time"
              placeholder="10:00"
              value={scheduleTime}
              onChange={(e) => setScheduleTime(e.target.value)}
            />
            {canAssign && (
              <Select
                label="Inspector"
                placeholder="Select inspector"
                value={scheduleInspectorId}
                onChange={(e) => setScheduleInspectorId(e.target.value)}
                options={(inspectorsData?.inspectors ?? []).map((i) => ({
                  value: i.id,
                  label: i.displayName,
                }))}
              />
            )}
            <Button type="submit" isLoading={rescheduleMutation.isPending} disabled={!scheduleDate}>
              Schedule job
            </Button>
          </form>
        )}
      </Modal>
    </div>
  );
}
