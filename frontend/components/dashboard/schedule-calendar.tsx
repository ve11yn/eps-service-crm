"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { StatusBadge } from "@/frontend/components/dashboard/status-badge";
import { AppointmentDialog, type AppointmentEvent } from "@/frontend/components/dashboard/appointment-dialog";
import {
  APP_LOCALE,
  APP_TIME_ZONE,
  buildMonthGrid,
  createCalendarMonthDate,
  getCalendarDate,
  formatLongDate,
  formatMonthLabel,
  formatMonthTitle,
  getCalendarDayKey,
  isSameMonth,
  parseStoredDateTime,
  slugifyStatus,
} from "@/frontend/lib/format";

type ScheduleEvent = AppointmentEvent;

type ScheduleCalendarProps = {
  baseDate: string;
  events: ScheduleEvent[];
  projects: Array<{ id: string; title: string | null }>;
  leads: Array<{ id: string; title: string | null }>;
  workers: Array<{ id: string; display_name: string; availability_status: string }>;
  appointmentTypes: Array<{ code: string; label: string }>;
};

function moveMonth(date: Date, amount: number) {
  return createCalendarMonthDate(date.getFullYear(), date.getMonth() + amount, 1);
}

const eventTimeFormatter = new Intl.DateTimeFormat(APP_LOCALE, {
  timeZone: APP_TIME_ZONE,
  hour: "numeric",
  minute: "2-digit",
});

function formatEventStartTime(startAt?: string | null) {
  const start = parseStoredDateTime(startAt);
  if (!start) return "Time not set";

  return eventTimeFormatter.format(start);
}

function formatEventTimeRange(startAt?: string | null, endAt?: string | null) {
  const start = parseStoredDateTime(startAt);
  if (!start) return "Time not set";

  if (!endAt) {
    return `Starts ${eventTimeFormatter.format(start)}`;
  }

  const end = parseStoredDateTime(endAt);
  if (!end) {
    return `Starts ${eventTimeFormatter.format(start)}`;
  }

  return `${eventTimeFormatter.format(start)} - ${eventTimeFormatter.format(end)}`;
}

export function ScheduleCalendar({
  baseDate,
  events,
  projects,
  leads,
  workers,
  appointmentTypes,
}: ScheduleCalendarProps) {
  const initialMonth = useMemo(() => {
    const parsed = getCalendarDate(baseDate);
    const today = getCalendarDate(new Date());
    return parsed ?? today ?? createCalendarMonthDate(new Date().getFullYear(), new Date().getMonth(), 1);
  }, [baseDate]);

  const [visibleMonth, setVisibleMonth] = useState(initialMonth);
  const [isMonthPickerOpen, setIsMonthPickerOpen] = useState(false);
  const [pickerYear, setPickerYear] = useState(initialMonth.getFullYear());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [editingEvent, setEditingEvent] = useState<ScheduleEvent | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setSelectedDate(null);
      }
    }

    if (!selectedDate) return;

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [selectedDate]);

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (!pickerRef.current?.contains(event.target as Node)) {
        setIsMonthPickerOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsMonthPickerOpen(false);
      }
    }

    if (!isMonthPickerOpen) return;

    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleEscape);
    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleEscape);
    };
  }, [isMonthPickerOpen]);

  const monthGrid = buildMonthGrid(visibleMonth);
  const today = createCalendarMonthDate(
    new Date().getFullYear(),
    new Date().getMonth(),
    new Date().getDate(),
  );

  const eventsByDay = useMemo(() => {
    const map = new Map<string, ScheduleEvent[]>();

    for (const event of events) {
      if (!event.scheduledStartAt) continue;

      const key = getCalendarDayKey(event.scheduledStartAt);
      if (!key) continue;

      const existing = map.get(key) ?? [];
      existing.push(event);
      existing.sort((left, right) => {
        const leftTime = parseStoredDateTime(left.scheduledStartAt)?.getTime() ?? 0;
        const rightTime = parseStoredDateTime(right.scheduledStartAt)?.getTime() ?? 0;
        return leftTime - rightTime;
      });
      map.set(key, existing);
    }

    return map;
  }, [events]);

  function getEventsForDate(date: Date) {
    return eventsByDay.get(getCalendarDayKey(date)) ?? [];
  }

  const selectedDateEvents = selectedDate ? getEventsForDate(selectedDate) : [];
  const pickerMonths = Array.from({ length: 12 }, (_, monthIndex) =>
    createCalendarMonthDate(pickerYear, monthIndex, 1),
  );
  const pickerYears = Array.from(
    { length: 7 },
    (_, index) => pickerYear - 3 + index,
  );

  return (
    <>
      <div className="panel-header calendar-toolbar">
        <div className="calendar-title-wrap" ref={pickerRef}>
          <button
            type="button"
            className="calendar-title-button"
            onClick={() => {
              setPickerYear(visibleMonth.getFullYear());
              setIsMonthPickerOpen((current) => !current);
            }}
          >
            <h2>{formatMonthTitle(visibleMonth)}</h2>
          </button>

          {isMonthPickerOpen ? (
            <div className="calendar-month-picker" role="dialog" aria-label="Choose month and year">
              <div className="calendar-month-picker-header">
                <button
                  type="button"
                  className="button button-secondary calendar-arrow-button"
                  aria-label="Previous year"
                  onClick={() => setPickerYear((current) => current - 1)}
                >
                  ‹
                </button>

                <span className="calendar-year-select-wrap">
                  <select
                    className="calendar-year-select"
                    value={pickerYear}
                    aria-label="Year"
                    onChange={(event) => setPickerYear(Number(event.target.value))}
                  >
                    {pickerYears.map((year) => (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    ))}
                  </select>
                </span>

                <button
                  type="button"
                  className="button button-secondary calendar-arrow-button"
                  aria-label="Next year"
                  onClick={() => setPickerYear((current) => current + 1)}
                >
                  ›
                </button>
              </div>

              <div className="calendar-month-picker-grid">
                {pickerMonths.map((monthDate) => (
                  <button
                    key={monthDate.toISOString()}
                    type="button"
                    className={`calendar-month-option ${isSameMonth(monthDate, visibleMonth) ? "is-active" : ""}`}
                    onClick={() => {
                      setVisibleMonth(monthDate);
                      setIsMonthPickerOpen(false);
                    }}
                  >
                    {formatMonthLabel(monthDate)}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        <div className="calendar-toolbar-actions">
          <button
            type="button"
            className="button button-primary"
            onClick={() => {
              setSelectedDate(new Date());
              setEditingEvent(null);
              setIsCreating(true);
            }}
          >
            + Appointment
          </button>
          <button
            type="button"
            className="button button-secondary calendar-arrow-button"
            aria-label="Previous month"
            onClick={() => {
              setIsMonthPickerOpen(false);
              setVisibleMonth((current) => moveMonth(current, -1));
            }}
          >
            ‹
          </button>
          <button
            type="button"
            className="button button-secondary calendar-current-button"
            onClick={() => {
              setIsMonthPickerOpen(false);
              setVisibleMonth(initialMonth);
              setPickerYear(initialMonth.getFullYear());
            }}
          >
            Current
          </button>
          <button
            type="button"
            className="button button-secondary calendar-arrow-button"
            aria-label="Next month"
            onClick={() => {
              setIsMonthPickerOpen(false);
              setVisibleMonth((current) => moveMonth(current, 1));
            }}
          >
            ›
          </button>
        </div>
      </div>

      <div className="calendar-grid">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((label) => (
          <div key={label} className="calendar-heading">
            {label}
          </div>
        ))}

          {monthGrid.map((date) => {
            const dayEvents = getEventsForDate(date);
            const isOutsideMonth = !isSameMonth(date, visibleMonth);
            const isToday = getCalendarDayKey(date) === getCalendarDayKey(today);

            return (
              <div
              key={date.toISOString()}
              className={`calendar-cell ${isOutsideMonth ? "is-outside-month" : ""} ${isToday ? "is-today" : ""} ${dayEvents.length > 0 ? "has-events" : ""}`}
            >
              <button
                type="button"
                className="calendar-cell-button"
                onClick={() => setSelectedDate(date)}
              >
                <div className="calendar-cell-head">
                  <span className="calendar-date">{date.getDate()}</span>
                  {dayEvents.length > 0 ? (
                    <span className="calendar-count-badge">{dayEvents.length}</span>
                  ) : null}
                </div>

                <div className="calendar-events">
                  {dayEvents.slice(0, 3).map((event) => (
                    <div
                      key={event.id}
                      className={`calendar-event status-${slugifyStatus(event.status)}`}
                    >
                      <span className="calendar-event-time">
                        {formatEventStartTime(event.scheduledStartAt)}
                      </span>
                      <span className="calendar-event-title">{event.title}</span>
                    </div>
                  ))}
                  {dayEvents.length > 3 ? (
                    <div className="calendar-event-more">
                      +{dayEvents.length - 3} more
                    </div>
                  ) : null}
                </div>
              </button>
            </div>
          );
        })}
      </div>

      {selectedDate ? (
        <div
          className="calendar-modal-backdrop"
          onClick={() => setSelectedDate(null)}
          role="presentation"
        >
          <div
            className="calendar-modal panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="schedule-day-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="panel-header">
              <div>
                <h2 id="schedule-day-title">{formatLongDate(selectedDate)}</h2>
              </div>
              <button
                type="button"
                className="button button-secondary"
                onClick={() => setSelectedDate(null)}
              >
                x
              </button>
            </div>

            {selectedDateEvents.length === 0 ? (
              <div className="empty-state">
                <p className="empty-state-title">No scheduled work</p>
                <p className="empty-state-description">
                  Nothing has been assigned to this day yet.
                </p>
              </div>
            ) : (
              <div className="calendar-modal-list">
                {selectedDateEvents.map((event) => (
                  <article key={event.id} className="calendar-modal-item">
                    <div className="calendar-modal-item-main">
                      <p className="calendar-modal-item-time">
                        {formatEventTimeRange(
                          event.scheduledStartAt,
                          event.scheduledEndAt,
                        )}
                      </p>
                      <h3>{event.title}</h3>
                    </div>
                    <div className="calendar-modal-item-side">
                      <StatusBadge status={event.status} />
                      <button type="button" className="button button-secondary" onClick={() => { setEditingEvent(event); setIsCreating(false); }}>Edit</button>
                      {event.projectId ? <Link href={`/projects/${event.projectId}`} className="button button-secondary">Open Project</Link> : event.leadId ? <Link href={`/leads/${event.leadId}`} className="button button-secondary">Open Lead</Link> : null}
                    </div>
                  </article>
                ))}
              </div>
            )}
            <div className="inline-actions">
              <button type="button" className="button button-primary" onClick={() => { setEditingEvent(null); setIsCreating(true); }}>+ Appointment</button>
            </div>
          </div>
        </div>
      ) : null}

      {selectedDate && (editingEvent || isCreating) ? (
        <AppointmentDialog
          event={editingEvent}
          selectedDate={selectedDate}
          projects={projects}
          leads={leads}
          workers={workers}
          appointmentTypes={appointmentTypes}
          onClose={() => {
            setEditingEvent(null);
            setIsCreating(false);
          }}
        />
      ) : null}
    </>
  );
}
