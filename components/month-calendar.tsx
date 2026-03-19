"use client";

interface MonthCalendarProps {
  year: number;
  month: number; // 0-indexed
  activeDate: string;
  todayISO: string;
  showWeekends: boolean;
  onSelectDate: (date: string) => void;
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function generateCells(year: number, month: number, showWeekends: boolean): (string | null)[] {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (string | null)[] = [];

  if (showWeekends) {
    // 7-col grid, Sun=col0 … Sat=col6
    const firstDow = new Date(year, month, 1).getDay(); // 0=Sun..6=Sat
    for (let i = 0; i < firstDow; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push(`${year}-${pad(month + 1)}-${pad(d)}`);
    }
  } else {
    // 5-col grid Mon–Fri, skip Sun(0) and Sat(6)
    const firstDow = new Date(year, month, 1).getDay();
    const offset = firstDow >= 1 && firstDow <= 5 ? firstDow - 1 : 0;
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
  year, month, activeDate, todayISO, showWeekends, onSelectDate,
}: MonthCalendarProps) {
  const cells = generateCells(year, month, showWeekends);
  const dayHeaders = showWeekends
    ? ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
    : ["Mon", "Tue", "Wed", "Thu", "Fri"];

  return (
    <div className="px-1 py-1">
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
