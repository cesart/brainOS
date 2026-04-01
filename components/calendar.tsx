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

type Cell = { date: string; overflow: boolean };

function generateCells(year: number, month: number, showWeekends: boolean): Cell[] {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: Cell[] = [];

  const prevYear  = month === 0 ? year - 1 : year;
  const prevMonth = month === 0 ? 11 : month - 1;
  const daysInPrevMonth = new Date(prevYear, prevMonth + 1, 0).getDate();
  const nextYear  = month === 11 ? year + 1 : year;
  const nextMonth = month === 11 ? 0 : month + 1;

  if (showWeekends) {
    const firstDow = new Date(year, month, 1).getDay();
    for (let i = firstDow - 1; i >= 0; i--) {
      const d = daysInPrevMonth - i;
      cells.push({ date: `${prevYear}-${pad(prevMonth + 1)}-${pad(d)}`, overflow: true });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push({ date: `${year}-${pad(month + 1)}-${pad(d)}`, overflow: false });
    }
    const remainder = cells.length % 7;
    if (remainder !== 0) {
      for (let d = 1; d <= 7 - remainder; d++) {
        cells.push({ date: `${nextYear}-${pad(nextMonth + 1)}-${pad(d)}`, overflow: true });
      }
    }
  } else {
    const firstDow = new Date(year, month, 1).getDay();
    const offset = firstDow >= 1 && firstDow <= 5 ? firstDow - 1 : 0;
    for (let i = offset - 1; i >= 0; i--) {
      const d = daysInPrevMonth - i;
      cells.push({ date: `${prevYear}-${pad(prevMonth + 1)}-${pad(d)}`, overflow: true });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const dow = new Date(year, month, d).getDay();
      if (dow === 0 || dow === 6) continue;
      cells.push({ date: `${year}-${pad(month + 1)}-${pad(d)}`, overflow: false });
    }
    const remainder = cells.length % 5;
    if (remainder !== 0) {
      let d = 1; let added = 0;
      const needed = 5 - remainder;
      while (added < needed) {
        const dow = new Date(nextYear, nextMonth, d).getDay();
        if (dow !== 0 && dow !== 6) {
          cells.push({ date: `${nextYear}-${pad(nextMonth + 1)}-${pad(d)}`, overflow: true });
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

      <div className={`grid ${showWeekends ? "grid-cols-7" : "grid-cols-5"} mb-1`}>
        {dayHeaders.map((h) => (
          <div key={h} className="text-center text-[9px] text-muted-foreground font-medium py-0.5">
            {h}
          </div>
        ))}
      </div>

      <div className={`grid ${showWeekends ? "grid-cols-7" : "grid-cols-5"} gap-y-0.5`}>
        {cells.map(({ date, overflow }, i) => {
          const isActive = date === activeDate;
          const isToday  = date === todayISO;
          const day = parseInt(date.split("-")[2], 10);
          return (
            <button
              key={`${date}-${i}`}
              onClick={() => onSelectDate(date)}
              className={`
                flex items-center justify-center text-[11px] font-mono h-6 w-full rounded transition-colors
                ${overflow
                  ? isActive
                    ? "bg-foreground text-background font-semibold opacity-50"
                    : "text-foreground opacity-20 hover:opacity-50 hover:bg-sidebar-accent/60"
                  : isActive
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
