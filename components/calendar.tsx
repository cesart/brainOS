"use client";

const MONTHS_FULL = ["January","February","March","April","May","June","July","August","September","October","November","December"];

interface CalendarProps {
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

type Cell = string | { overflow: true; day: number };

function generateCells(year: number, month: number, showWeekends: boolean): Cell[] {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();
  const cells: Cell[] = [];

  if (showWeekends) {
    // 7-col grid, Sun=col0 ... Sat=col6
    const firstDow = new Date(year, month, 1).getDay();
    // Overflow from prev month
    for (let i = firstDow - 1; i >= 0; i--) {
      cells.push({ overflow: true, day: daysInPrevMonth - i });
    }
    // Current month
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push(`${year}-${pad(month + 1)}-${pad(d)}`);
    }
    // Overflow from next month to fill last row
    const remainder = cells.length % 7;
    if (remainder !== 0) {
      for (let d = 1; d <= 7 - remainder; d++) {
        cells.push({ overflow: true, day: d });
      }
    }
  } else {
    // 5-col grid Mon-Fri, skip Sun(0) and Sat(6)
    const firstDow = new Date(year, month, 1).getDay();
    const offset = firstDow >= 1 && firstDow <= 5 ? firstDow - 1 : 0;
    // Overflow from prev month (weekdays before the 1st)
    for (let i = offset - 1; i >= 0; i--) {
      cells.push({ overflow: true, day: daysInPrevMonth - i });
    }
    // Current month (weekdays only)
    for (let d = 1; d <= daysInMonth; d++) {
      const dow = new Date(year, month, d).getDay();
      if (dow === 0 || dow === 6) continue;
      cells.push(`${year}-${pad(month + 1)}-${pad(d)}`);
    }
    // Overflow from next month to fill last row (weekdays only)
    const remainder = cells.length % 5;
    if (remainder !== 0) {
      let d = 1;
      let added = 0;
      const needed = 5 - remainder;
      while (added < needed) {
        const dow = new Date(year, month + 1, d).getDay();
        if (dow !== 0 && dow !== 6) {
          cells.push({ overflow: true, day: d });
          added++;
        }
        d++;
      }
    }
  }

  return cells;
}

export default function Calendar({
  year, month, activeDate, todayISO, showWeekends, onSelectDate,
}: CalendarProps) {
  const cells = generateCells(year, month, showWeekends);
  const dayHeaders = showWeekends
    ? ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
    : ["Mon", "Tue", "Wed", "Thu", "Fri"];

  const todayDate = new Date(todayISO + "T00:00:00");
  const isCurrentMonth = year === todayDate.getFullYear() && month === todayDate.getMonth();

  return (
    <div className="px-1 py-1">
      {/* Animated month/year label — only visible when navigated away */}
      <div
        style={{
          maxHeight: isCurrentMonth ? "0" : "2rem",
          overflow: "hidden",
          transition: "max-height 200ms ease",
        }}
      >
        <p className="text-center text-[11px] font-medium text-foreground py-1">
          {MONTHS_FULL[month]} {year}
        </p>
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
        {cells.map((cell, i) => {
          if (typeof cell === "object" && cell.overflow) {
            return (
              <div
                key={`overflow-${i}`}
                className="flex items-center justify-center text-[11px] font-mono h-6 text-foreground opacity-20"
              >
                {cell.day}
              </div>
            );
          }
          const date = cell as string;
          const isActive = date === activeDate;
          const isToday = date === todayISO;
          const day = parseInt(date.split("-")[2], 10);
          return (
            <button
              key={date}
              onClick={() => onSelectDate(date)}
              className={`
                flex items-center justify-center text-[11px] font-mono h-6 w-full rounded transition-colors
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
