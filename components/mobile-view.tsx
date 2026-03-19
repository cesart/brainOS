"use client";

import { useState, useRef, useEffect } from "react";
import {
  Brain, Calendar, CalendarCheck,
  Layers, Glasses, Square, SquareCheck,
  ChevronLeft, ChevronRight,
} from "lucide-react";
import { AirtableDay, AirtableItem, AirtableCollection } from "@/lib/airtable";
import Editor from "@/components/editor";
import { Clock } from "@/components/clock";
import MonthCalendar from "@/components/month-calendar";

const MONTHS_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

const MODE_COLORS: Record<number, string> = {
  0: "#6366f1", 1: "#10b981", 2: "#f59e0b",
  3: "#a855f7", 4: "#ef4444", 5: "#06b6d4",
};

const SHEET_PEEK = 56;
const SHEET_UP   = 420;

function daysDiff(dueDate: string, todayISO: string): number {
  const due   = new Date(dueDate + "T00:00:00");
  const today = new Date(todayISO + "T00:00:00");
  return Math.round((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

interface MobileViewProps {
  currentDay: AirtableDay;
  todayISO: string;
  weekDates: string[];
  activeDate: string;
  onSelectDate: (date: string) => void;
  collections: AirtableCollection[];
  activeModeId: string | null;
  onSelectMode: (id: string | null) => void;
  items: AirtableItem[];
  dayEvents: AirtableItem[];
  allTasks: AirtableItem[];
  onToggleTask: (id: string, completed: boolean) => void;
}

export default function MobileView({
  currentDay, todayISO, weekDates, activeDate, onSelectDate,
  collections, activeModeId, onSelectMode, items,
  dayEvents, allTasks, onToggleTask,
}: MobileViewProps) {
  const [sheetUp, setSheetUp] = useState(false);
  const [bottomTab, setBottomTab] = useState<"calendar" | "modes" | "overview">("overview");
  const [showWeekends, setShowWeekends] = useState(true);
  const [calMonth, setCalMonth] = useState(() => {
    const d = new Date(activeDate + "T00:00:00");
    return { year: d.getFullYear(), month: d.getMonth() };
  });

  // Sync calendar month when active date changes
  useEffect(() => {
    const d = new Date(activeDate + "T00:00:00");
    setCalMonth({ year: d.getFullYear(), month: d.getMonth() });
  }, [activeDate]);

  function prevCalMonth() {
    setCalMonth((c) => c.month === 0 ? { year: c.year - 1, month: 11 } : { ...c, month: c.month - 1 });
  }

  function nextCalMonth() {
    setCalMonth((c) => c.month === 11 ? { year: c.year + 1, month: 0 } : { ...c, month: c.month + 1 });
  }

  function goToToday() {
    const d = new Date(todayISO + "T00:00:00");
    setCalMonth({ year: d.getFullYear(), month: d.getMonth() });
  }

  const todayDate = new Date(todayISO + "T00:00:00");
  const isCurrentCalMonth = calMonth.year === todayDate.getFullYear() && calMonth.month === todayDate.getMonth();
  const calNavLabel = isCurrentCalMonth
    ? "·"
    : `${MONTHS_SHORT[calMonth.month]} '${String(calMonth.year).slice(2)}`;

  const pastDue   = allTasks.filter((t) => !t.completed && t.dueDate && daysDiff(t.dueDate, todayISO) < 0);
  const dueToday  = allTasks.filter((t) => !t.completed && t.dueDate && daysDiff(t.dueDate, todayISO) === 0);
  const upcoming  = allTasks.filter((t) => !t.completed && t.dueDate && daysDiff(t.dueDate, todayISO) > 0);
  const noDate    = allTasks.filter((t) => !t.completed && !t.dueDate);
  const completed = allTasks.filter((t) => t.completed);

  const sheetHeight = sheetUp ? SHEET_UP : SHEET_PEEK;

  const touchStartY = useRef(0);

  function handleTouchStart(e: React.TouchEvent) {
    touchStartY.current = e.touches[0].clientY;
  }

  function handleTouchEnd(e: React.TouchEvent) {
    const delta = e.changedTouches[0].clientY - touchStartY.current;
    if (delta > 40) setSheetUp(false);
    else if (delta < -40) setSheetUp(true);
  }

  function handleTabTap(tab: "calendar" | "modes" | "overview") {
    if (bottomTab === tab && sheetUp) {
      setSheetUp(false);
    } else {
      setBottomTab(tab);
      setSheetUp(true);
    }
  }

  const tabs = [
    { id: "calendar" as const, icon: <Calendar className="w-4 h-4" />, label: "Calendar" },
    { id: "modes" as const,    icon: <Layers className="w-4 h-4" />,   label: "Modes" },
    { id: "overview" as const, icon: <Glasses className="w-4 h-4" />,  label: "Overview" },
  ];

  return (
    <div className="relative h-dvh overflow-hidden bg-background flex flex-col">

      {/* Main content */}
      <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
        {/* Brand bar */}
        <div className="flex items-center justify-between px-2 py-4 flex-shrink-0 bg-sidebar">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-[10px] bg-sidebar-accent flex items-center justify-center flex-shrink-0">
              <Brain className="w-4 h-4 text-sidebar-accent-foreground" />
            </div>
            <span className="text-base font-semibold font-mono text-sidebar-foreground">brainOS</span>
          </div>
        </div>

        {/* Date / time bar */}
        <div className="flex items-center justify-between pl-2 pr-4 py-4 border-b border-border flex-shrink-0">
          <div>
            <p className="text-[10px] font-normal tracking-[0.15em] text-muted-foreground uppercase">
              {activeDate === todayISO
                ? "Today"
                : new Date(activeDate + "T00:00:00").toLocaleDateString("en-US", { weekday: "long" })}
            </p>
            <h1 className="text-2xl font-bold leading-tight">
              {new Date(activeDate + "T00:00:00").toLocaleDateString("en-US", {
                weekday: "short", month: "short", day: "numeric",
              })}
            </h1>
          </div>
          <span className="text-[13px] font-semibold text-muted-foreground tabular-nums font-mono">
            <Clock />
          </span>
        </div>

        {/* Editor */}
        <Editor
          dayId={currentDay.id}
          initialBody={currentDay.body ?? ""}
          events={dayEvents}
          className="border-r-0"
        />
      </div>

      {/* Bottom sheet */}
      <div
        className="flex-shrink-0 mx-4 mb-2 bg-background border border-sidebar-border overflow-hidden"
        style={{
          height: sheetHeight,
          borderRadius: sheetUp ? "16px" : "20px",
          transition: "height 300ms, border-radius 300ms",
        }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Tab bar (always visible in peek area) */}
        <div
          className="flex items-center justify-around flex-shrink-0 border-b border-sidebar-border"
          style={{ height: SHEET_PEEK }}
        >
          {tabs.map((tab) => {
            const isActive = bottomTab === tab.id && sheetUp;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabTap(tab.id)}
                className={`flex flex-col items-center gap-0.5 py-1 px-4 transition-colors ${
                  isActive ? "text-foreground" : "text-muted-foreground"
                }`}
              >
                {tab.icon}
                <span className="text-[9px] font-medium">{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Sheet content — visible when expanded */}
        {sheetUp && (
          <div
            className="overflow-y-auto"
            style={{ height: SHEET_UP - SHEET_PEEK }}
          >
            {/* Calendar tab */}
            {bottomTab === "calendar" && (
              <div className="px-2 py-1">
                {/* Nav row */}
                <div className="flex items-center justify-between px-1 py-1">
                  <button onClick={prevCalMonth} className="p-1 text-muted-foreground hover:text-foreground transition-colors">
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={goToToday}
                    className="text-[11px] font-mono text-muted-foreground hover:text-foreground transition-colors min-w-[3rem] text-center"
                  >
                    {calNavLabel}
                  </button>
                  <button onClick={nextCalMonth} className="p-1 text-muted-foreground hover:text-foreground transition-colors">
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
                <MonthCalendar
                  year={calMonth.year}
                  month={calMonth.month}
                  activeDate={activeDate}
                  todayISO={todayISO}
                  showWeekends={showWeekends}
                  onSelectDate={(date) => { onSelectDate(date); setSheetUp(false); }}
                />
                {/* Weekends toggle */}
                <div className="flex items-center justify-between px-2 py-2 mt-1 border-t border-sidebar-border">
                  <span className="text-xs text-muted-foreground">Weekends</span>
                  <button
                    onClick={() => setShowWeekends((w) => !w)}
                    className={`relative w-8 h-4 rounded-full transition-colors ${showWeekends ? "bg-foreground" : "bg-sidebar-border"}`}
                  >
                    <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-background transition-all ${showWeekends ? "left-[18px]" : "left-0.5"}`} />
                  </button>
                </div>
              </div>
            )}

            {/* Modes tab */}
            {bottomTab === "modes" && (
              <div className="flex flex-col gap-0.5 px-1 py-2">
                <button
                  onClick={() => { onSelectMode(null); setSheetUp(false); }}
                  className={`flex items-center gap-2 px-2 py-2 rounded-md text-xs w-full transition-colors ${
                    activeModeId === null
                      ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                      : "text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-accent-foreground flex-shrink-0" />
                  <span className="flex-1 text-left">All</span>
                  <span className="tabular-nums">{items.length}</span>
                </button>
                {collections.map((col, i) => (
                  <button
                    key={col.id}
                    onClick={() => { onSelectMode(col.id); setSheetUp(false); }}
                    className={`flex items-center gap-2 px-2 py-2 rounded-md text-xs w-full transition-colors ${
                      activeModeId === col.id
                        ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                        : "text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
                    }`}
                  >
                    <span
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ background: MODE_COLORS[i] ?? "#6366f1" }}
                    />
                    <span className="flex-1 text-left">{col.name}</span>
                    <span className="tabular-nums">
                      {items.filter((it) => it.collectionIds?.includes(col.id)).length}
                    </span>
                  </button>
                ))}
              </div>
            )}

            {/* Overview tab */}
            {bottomTab === "overview" && (
              <div className="flex flex-col gap-4 p-2">
                {dayEvents.length > 0 && (
                  <section>
                    <div className="flex items-center gap-1.5 px-1.5 pb-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-accent-foreground" />
                      <p className="text-[10px] font-normal tracking-[1.5px] text-muted-foreground uppercase">Events</p>
                    </div>
                    <div className="flex flex-col gap-0.5">
                      {dayEvents.map((event) => (
                        <div key={event.id} className="flex items-center gap-2.5 px-1.5 py-2 rounded-md">
                          <Calendar className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                          <span className="text-sm text-foreground flex-1 min-w-0 truncate">{event.name}</span>
                          {event.dueDate && (
                            <span className="text-sm text-muted-foreground tabular-nums flex-shrink-0">
                              {new Date(event.dueDate + "T00:00:00").toLocaleDateString("en-US", {
                                month: "short", day: "numeric",
                              })}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {allTasks.length > 0 && (
                  <section>
                    <div className="flex items-center gap-1.5 px-1.5 pb-2">
                      <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#6366f1" }} />
                      <p className="text-[10px] font-normal tracking-[1.5px] text-muted-foreground uppercase">Tasks</p>
                    </div>
                    <div className="flex flex-col gap-0.5">
                      {[...pastDue, ...dueToday, ...upcoming, ...noDate, ...completed].map((t) => (
                        <div
                          key={t.id}
                          className="flex items-start gap-2.5 px-1.5 py-2 rounded-md cursor-pointer"
                          style={t.completed ? { opacity: 0.75 } : {}}
                          onClick={() => onToggleTask(t.id, !t.completed)}
                        >
                          {t.completed
                            ? <SquareCheck className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                            : <Square className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                          }
                          <span className={`text-sm leading-snug ${t.completed ? "text-muted-foreground" : "text-foreground"}`}>
                            {t.name}
                          </span>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {dayEvents.length === 0 && allTasks.length === 0 && (
                  <p className="text-sm text-muted-foreground/50 text-center py-8">Nothing here yet.</p>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
