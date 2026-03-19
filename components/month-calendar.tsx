"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

interface MonthCalendarProps {
  year: number;
  month: number; // 0-indexed
  activeDate: string;
  todayISO: string;
  showWeekends: boolean;
  onSelectDate: (date: string) => void;
  onMonthChange: (year: number, month: number) => void;
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function generateCells(year: number, month: number, showWeekends: boolean): (string | null)[] {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (string | null)[] = [];

  if (showWeekends) {
    // 7-col grid, Mon=0..Sun=6
    const firstDow = (new Date(year, month, 1).getDay() + 6) % 7;
    for (let i = 0; i < firstDow; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push(`${year}-${pad(month + 1)}-${pad(d)}`);
    }
  } else {
    // 5-col grid Mon-Fri, skip weekends
    const firstDow = (new Date(year, month, 1).getDay() + 6) % 7; // Mon=0..Sun=6
    const offset = firstDow <= 4 ? firstDow : 0;
    for (let i = 0; i < offset; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) {
      const dow = new Date(year, month, d).getDay();
      if (dow === 0 || dow === 6) continue;
      cells.push(`${year}-${pad(month + 1)}-${pad(d)}`);
    }
  }

  return cells;
}

export default function MonthCalendar({
  year, month, activeDate, todayISO, showWeekends,
  onSelectDate, onMonthChange,
}: MonthCalendarProps) {
  const cells = generateCells(year, month, showWeekends);
  const dayHeaders = showWeekends
    ? ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"]
    : ["Mo", "Tu", "We", "Th", "Fr"];

  function prevMonth() {
    if (month === 0) onMonthChange(year - 1, 11);
    else onMonthChange(year, month - 1);
  }

  function nextMonth() {
    if (month === 11) onMonthChange(year + 1, 0);
    else onMonthChange(year, month + 1);
  }

  return (
    <div className="px-1 py-2">
      {/* Month navigation */}
      <div className="flex items-center justify-between px-1 mb-2">
        <button
          onClick={prevMonth}
          className="p-1 rounded hover:bg-sidebar-accent transition-colors text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>
        <span className="text-xs font-medium text-foreground">
          {MONTHS[month]} {year}
        </span>
        <button
          onClick={nextMonth}
          className="p-1 rounded hover:bg-sidebar-accent transition-colors text-muted-foreground hover:text-foreground"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Day-of-week headers */}
      <div className={`grid ${showWeekends ? "grid-cols-7" : "grid-cols-5"} mb-1`}>
        {dayHeaders.map((h) => (
          <div key={h} className="text-center text-[9px] text-muted-foreground font-medium py-0.5">
            {h}
          </div>
        ))}
      </div>

      {/* Date cells */}
      <div className={`grid ${showWeekends ? "grid-cols-7" : "grid-cols-5"} gap-y-0.5`}>
        {cells.map((date, i) => {
          if (!date) return <div key={`null-${i}`} />;
          const isActive = date === activeDate;
          const isToday = date === todayISO;
          const day = parseInt(date.split("-")[2], 10);
          return (
            <button
              key={date}
              onClick={() => onSelectDate(date)}
              className={`
                flex items-center justify-center text-[11px] h-6 w-full rounded transition-colors
                ${isActive
                  ? "bg-foreground text-background font-semibold"
                  : isToday
                  ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                  : "text-foreground hover:bg-sidebar-accent/60"
                }
              `}
            >
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );
}
