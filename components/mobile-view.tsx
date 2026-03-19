"use client";

import { useState, useRef, useEffect } from "react";
import {
  Brain, PanelBottom, Calendar, CalendarCheck,
  Layers, NotebookPen,
  Glasses, Square, SquareCheck,
  ChevronLeft, ChevronRight,
  Sun, Moon, Monitor,
} from "lucide-react";
import { AirtableDay, AirtableItem, AirtableCollection } from "@/lib/airtable";
import Editor from "@/components/editor";
import { Clock } from "@/components/clock";
import MonthCalendar from "@/components/month-calendar";

const MODE_COLORS: Record<number, string> = {
  0: "#6366f1", 1: "#10b981", 2: "#f59e0b",
  3: "#a855f7", 4: "#ef4444", 5: "#06b6d4",
};

const SHEET_PEEK = 56;
const SHEET_UP   = 360;

function pad2(n: number): string { return String(n).padStart(2, "0"); }
function addDays(dateISO: string, n: number): string {
  const d = new Date(dateISO + "T00:00:00");
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function getDayLabel(date: string, todayISO: string): string {
  if (date === todayISO) return "Today";
  return new Date(date + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "short", month: "short", day: "numeric",
  });
}

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
  currentDay, todayISO, weekDates: _weekDates, activeDate, onSelectDate,
  collections, activeModeId, onSelectMode, items,
  dayEvents, allTasks, onToggleTask,
}: MobileViewProps) {
  const [navOpen, setNavOpen] = useState(false);
  const [sheetUp, setSheetUp] = useState(false);
  const [agendaView, setAgendaView] = useState<"month" | "week">("month");
  const [weekViewStart, setWeekViewStart] = useState(todayISO);
  const [calMonth, setCalMonth] = useState(() => {
    const d = new Date(activeDate + "T00:00:00");
    return { year: d.getFullYear(), month: d.getMonth() };
  });
  const [displayMode, setDisplayMode] = useState<"auto" | "light" | "dark">("dark");

  useEffect(() => {
    const saved = localStorage.getItem("displayMode") as "auto" | "light" | "dark" | null;
    if (saved) setDisplayMode(saved);
  }, []);
  useEffect(() => {
    localStorage.setItem("displayMode", displayMode);
    const html = document.documentElement;
    if (displayMode === "light") html.classList.remove("dark");
    else if (displayMode === "dark") html.classList.add("dark");
    else html.classList.toggle("dark", window.matchMedia("(prefers-color-scheme: dark)").matches);
  }, [displayMode]);

  useEffect(() => {
    const d = new Date(activeDate + "T00:00:00");
    setCalMonth({ year: d.getFullYear(), month: d.getMonth() });
  }, [activeDate]);

  const isWeekAtToday = weekViewStart === todayISO;
  const rollingDates = [0, 1, 2, 3, 4].map((i) => addDays(weekViewStart, i));

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

  return (
    <div className="relative h-dvh overflow-hidden bg-background flex flex-col">

      {/* Main content — blurs when nav is open */}
      <div
        className="flex flex-col flex-1 min-h-0 overflow-hidden transition-[filter] duration-300"
        style={{ filter: navOpen ? "blur(5px)" : "none" }}
      >
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

      {/* Bottom sheet — in-flow spacer */}
      <div
        className="flex-shrink-0 mx-4 mb-2 bg-background border border-sidebar-border overflow-hidden transition-all duration-300"
        style={{
          height: sheetHeight,
          borderRadius: sheetUp ? "16px" : "9999px",
          filter: navOpen ? "blur(5px)" : "none",
          transition: "height 300ms, border-radius 300ms, filter 300ms",
        }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Handle + Overview header */}
        <button
          className="w-full flex-shrink-0"
          style={{ height: SHEET_PEEK }}
          onClick={() => setSheetUp(!sheetUp)}
        >
          {sheetUp && (
            <div className="flex justify-center pt-2 pb-2">
              <div className="w-20 h-1.5 rounded-full bg-sidebar-border" />
            </div>
          )}
          <div
            className={`flex items-center gap-2 px-4 ${sheetUp ? "py-2.5 border-b border-sidebar-border" : "h-full"}`}
          >
            <Glasses className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium text-foreground">Overview</span>
          </div>
        </button>

        {/* Scrollable content */}
        {sheetUp && (
          <div
            className="overflow-y-auto flex flex-col gap-4 p-2"
            style={{ maxHeight: SHEET_UP - SHEET_PEEK }}
          >
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
                  <span className="w-1.5 h-1.5 rounded-full bg-primary" />
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

      {/* Nav backdrop — tap to close */}
      {navOpen && (
        <div
          className="absolute inset-0 z-20"
          onClick={() => setNavOpen(false)}
        />
      )}

      {/* Nav panel — slides up from bottom-right */}
      <div
        className="absolute right-3 bg-background/95 backdrop-blur-xl border border-sidebar-border rounded-2xl overflow-hidden z-40 flex flex-col transition-all duration-200 w-64 p-2"
        style={{
          bottom: "8px",
          opacity: navOpen ? 1 : 0,
          pointerEvents: navOpen ? "auto" : "none",
          transform: navOpen ? "translateY(0)" : "translateY(6px)",
        }}
      >
        {/* Agenda section */}
        <div className="flex-shrink-0">
          <div className="px-2 py-2 border-b border-sidebar-border">
            {/* Label + navigation */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <NotebookPen className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-sm font-medium text-sidebar-foreground">Agenda</span>
              </div>
              <div className="flex items-center gap-0.5">
                {agendaView === "month" ? (
                  <>
                    {activeDate !== todayISO && (
                      <button
                        onClick={() => { onSelectDate(todayISO); setCalMonth({ year: new Date(todayISO + "T00:00:00").getFullYear(), month: new Date(todayISO + "T00:00:00").getMonth() }); }}
                        className="text-[10px] text-muted-foreground hover:text-foreground hover:bg-sidebar-accent transition-colors px-1.5 py-1 leading-none rounded"
                      >Today</button>
                    )}
                    <button onClick={() => setCalMonth((c) => c.month === 0 ? { year: c.year - 1, month: 11 } : { ...c, month: c.month - 1 })} className="p-1 text-muted-foreground hover:text-foreground transition-colors">
                      <ChevronLeft className="w-3 h-3" />
                    </button>
                    <button onClick={() => setCalMonth((c) => c.month === 11 ? { year: c.year + 1, month: 0 } : { ...c, month: c.month + 1 })} className="p-1 text-muted-foreground hover:text-foreground transition-colors">
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  </>
                ) : (
                  <>
                    {(activeDate !== todayISO || !isWeekAtToday) && (
                      <button
                        onClick={() => { onSelectDate(todayISO); setWeekViewStart(todayISO); }}
                        className="text-[10px] text-muted-foreground hover:text-foreground hover:bg-sidebar-accent transition-colors px-1.5 py-1 leading-none rounded"
                      >Today</button>
                    )}
                    <button onClick={() => setWeekViewStart((s) => addDays(s, -5))} className="p-1 text-muted-foreground hover:text-foreground transition-colors">
                      <ChevronLeft className="w-3 h-3" />
                    </button>
                    <button onClick={() => setWeekViewStart((s) => addDays(s, 5))} className="p-1 text-muted-foreground hover:text-foreground transition-colors">
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  </>
                )}
              </div>
            </div>
            {/* Month / Week toggle */}
            <div className="flex gap-1">
              {(["month", "week"] as const).map((id) => (
                <button
                  key={id}
                  onClick={() => setAgendaView(id)}
                  className={`flex-1 py-1 rounded-md text-[11px] font-medium transition-colors capitalize ${
                    agendaView === id
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent"
                  }`}
                >
                  {id}
                </button>
              ))}
            </div>
          </div>
          {agendaView === "month" ? (
            <MonthCalendar
              year={calMonth.year}
              month={calMonth.month}
              activeDate={activeDate}
              todayISO={todayISO}
              showWeekends={true}
              onSelectDate={(d) => { onSelectDate(d); setNavOpen(false); }}
            />
          ) : (
            <div className="flex flex-col gap-0.5 px-1 py-1">
              {rollingDates.map((date) => {
                const isActive = date === activeDate;
                const isToday  = date === todayISO;
                const label    = getDayLabel(date, todayISO);
                return (
                  <button
                    key={date}
                    onClick={() => { onSelectDate(date); setNavOpen(false); }}
                    className={`flex items-center gap-2 px-2 py-1.5 rounded-md text-xs text-left w-full transition-colors ${
                      isActive
                        ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                        : "text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
                    }`}
                  >
                    {isToday
                      ? <CalendarCheck className="w-4 h-4 flex-shrink-0" />
                      : <Calendar className="w-4 h-4 flex-shrink-0" />
                    }
                    {label}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Modes section */}
        <div className="flex-shrink-0 mt-2">
          <div className="flex items-center px-2 py-2 border-b border-sidebar-border">
            <div className="flex items-center gap-2">
              <Layers className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-sm font-medium text-sidebar-foreground">Modes</span>
            </div>
          </div>
          <div className="flex flex-col gap-0.5 px-1 py-1">
            <button
              onClick={() => { onSelectMode(null); setNavOpen(false); }}
              className={`flex items-center gap-2 px-2 py-1.5 rounded-md text-xs w-full transition-colors ${
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
                onClick={() => { onSelectMode(col.id); setNavOpen(false); }}
                className={`flex items-center gap-2 px-2 py-1.5 rounded-md text-xs w-full transition-colors ${
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
        </div>

        {/* Display mode */}
        <div className="border-t border-sidebar-border px-2 py-2 mt-2">
          <p className="text-[9px] uppercase tracking-widest text-muted-foreground mb-1.5">Display</p>
          <div className="flex gap-1">
            {([
              { id: "auto",  Icon: Monitor, label: "Auto"  },
              { id: "light", Icon: Sun,     label: "Light" },
              { id: "dark",  Icon: Moon,    label: "Dark"  },
            ] as const).map(({ id, Icon, label }) => (
              <button
                key={id}
                onClick={() => setDisplayMode(id)}
                className={`flex-1 flex flex-col items-center gap-0.5 py-1.5 rounded-md text-[10px] transition-colors ${
                  displayMode === id
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom brand bar — always on top, nav trigger on right */}
      <div className="relative z-30 flex-shrink-0 flex items-center px-3 py-3 bg-sidebar border-t border-sidebar-border">
        <div className="flex items-center gap-2.5 flex-1">
          <div className="w-8 h-8 rounded-[10px] bg-sidebar-accent flex items-center justify-center flex-shrink-0">
            <Brain className="w-4 h-4 text-sidebar-accent-foreground" />
          </div>
          <span className="text-base font-semibold font-mono text-sidebar-foreground">brainOS</span>
        </div>
        <button
          onClick={() => setNavOpen(!navOpen)}
          className="p-1.5 rounded-md text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
        >
          <PanelBottom className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
