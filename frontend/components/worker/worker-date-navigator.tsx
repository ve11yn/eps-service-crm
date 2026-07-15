"use client";

import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";

type WorkDate = {
  date: string;
  count: number;
};

function parseDateKey(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day, 12, 0, 0, 0);
}

function formatDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function moveDate(value: string, amount: number) {
  const date = parseDateKey(value);
  date.setDate(date.getDate() + amount);
  return formatDateKey(date);
}

const chipFormatter = new Intl.DateTimeFormat("en-SG", {
  weekday: "short",
  day: "numeric",
  month: "short",
});

export function WorkerDateNavigator({
  selectedDate,
  today,
  workDates,
}: {
  selectedDate: string;
  today: string;
  workDates: WorkDate[];
}) {
  const router = useRouter();

  function selectDate(date: string) {
    if (!date) return;
    router.push(date === today ? "/worker" : `/worker?date=${date}`);
  }

  return (
    <section className="panel worker-date-navigator" aria-label="Choose work date">
      <div className="worker-date-picker-row">
        <div className="worker-date-picker-title">
          <span className="worker-date-picker-icon"><CalendarDays size={19} aria-hidden="true" /></span>
          <span><small>View schedule for</small><strong>Choose a work date</strong></span>
        </div>

        <div className="worker-date-controls">
          <button type="button" className="button button-secondary worker-date-arrow" aria-label="Previous day" onClick={() => selectDate(moveDate(selectedDate, -1))}>
            <ChevronLeft size={18} aria-hidden="true" />
          </button>
          <input
            className="input worker-date-input"
            type="date"
            aria-label="Work date"
            value={selectedDate}
            onChange={(event) => selectDate(event.target.value)}
          />
          <button type="button" className="button button-secondary worker-date-arrow" aria-label="Next day" onClick={() => selectDate(moveDate(selectedDate, 1))}>
            <ChevronRight size={18} aria-hidden="true" />
          </button>
          <button type="button" className={`button worker-today-button ${selectedDate === today ? "is-active" : "button-secondary"}`} onClick={() => selectDate(today)}>
            Today
          </button>
        </div>
      </div>

      <div className="worker-work-date-strip" aria-label="Dates with scheduled work">
        <span className="worker-work-date-label">Work dates</span>
        {workDates.length > 0 ? workDates.map((workDate) => (
          <button
            type="button"
            key={workDate.date}
            className={`worker-work-date-chip ${workDate.date === selectedDate ? "is-active" : ""}`}
            onClick={() => selectDate(workDate.date)}
          >
            <span>{workDate.date === today ? "Today" : chipFormatter.format(parseDateKey(workDate.date))}</span>
            <strong>{workDate.count}</strong>
          </button>
        )) : <span className="worker-work-date-empty">No dated work assigned yet</span>}
      </div>
    </section>
  );
}
