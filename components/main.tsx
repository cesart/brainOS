"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AirtableDay, AirtableItem, AirtableCollection } from "@/lib/airtable";
import LeftBar from "@/components/leftbar";
import Editor from "@/components/editor";
import RightBar from "@/components/rightbar";
import MonthCalendar from "@/components/calendar";
import { Clock } from "@/components/clock";
import { motion, LayoutGroup } from "framer-motion";
import {
  Brain, PanelLeft, PanelBottom, ClipboardList,
  Layers, NotebookPen, Calendar, CalendarCheck,
  Square, SquareCheck, SquareChevronRight,
  UnfoldHorizontal, Sun, Moon, Monitor,
  ChevronLeft, ChevronRight, ChevronUp, ChevronDown,
} from "lucide-react";

const COLLAPSE_WIDTH = 1280; // sidebar(256) + pl(16) + gap(16) + editor(960) + buffer = 1248, round up
const MODE_COLORS: Record<number, string> = {
  0: "#6366f1", 1: "#10b981", 2: "#f59e0b",
  3: "#a855f7", 4: "#ef4444", 5: "#06b6d4",
};

function pad2(n: number) { return String(n).padStart(2, "0"); }
function addDays(iso: string, n: number) {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}
function getDayLabel(date: string) {
  return new Date(date + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "short", month: "short", day: "numeric",
  });
}
function daysDiff(dueDate: string, todayISO: string) {
  return Math.round(
    (new Date(dueDate + "T00:00:00").getTime() - new Date(todayISO + "T00:00:00").getTime()) / 86400000
  );
}

interface DailyViewProps {
  initialDay: AirtableDay;
  todayISO: string;
  weekDates: string[];
  weekDays: (AirtableDay | null)[];
  allItems: AirtableItem[];
  collections: AirtableCollection[];
}

export default function DailyView({
  initialDay, todayISO, weekDates, weekDays, allItems, collections,
}: DailyViewProps) {

  // ── Shared ──────────────────────────────────────────────────────────
  const [activeDate, setActiveDate] = useState(todayISO);
  const [activeModeId, setActiveModeId] = useState<string | null>(null);
  const [currentDay, setCurrentDay] = useState<AirtableDay>(initialDay);
  const [items, setItems] = useState<AirtableItem[]>(allItems);
  const [dayCache, setDayCache] = useState<Record<string, AirtableDay>>(() => {
    const cache: Record<string, AirtableDay> = {};
    weekDays.forEach((d) => { if (d?.date) cache[d.date] = d; });
    return cache;
  });

  // ── Desktop ─────────────────────────────────────────────────────────
  const [leftBarOpen, setLeftBarOpen] = useState(true);
  const [wideMode, setWideMode] = useState(false);
  const [topMenuOpen, setTopMenuOpen] = useState(false);
  const topMenuRef = useRef<HTMLDivElement>(null);

  // ── Mobile ──────────────────────────────────────────────────────────
  const [navOpen, setNavOpen] = useState(false);
  const [overviewOpen, setOverviewOpen] = useState(false);
  const [editorFocused, setEditorFocused] = useState(false);
  const [agendaView, setAgendaView] = useState<"month" | "week">("month");
  const [weekViewStart, setWeekViewStart] = useState(todayISO);
  const [calMonth, setCalMonth] = useState(() => {
    const d = new Date(activeDate + "T00:00:00");
    return { year: d.getFullYear(), month: d.getMonth() };
  });

  // ── Theme ────────────────────────────────────────────────────────────
  const [theme, setThemeState] = useState<"auto" | "light" | "dark">("dark");

  useEffect(() => {
    const saved = (localStorage.getItem("theme") ?? "dark") as "auto" | "light" | "dark";
    setThemeState(saved);
    applyTheme(saved);
  }, []);

  function applyTheme(t: "auto" | "light" | "dark") {
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    document.documentElement.classList.toggle("dark", t === "dark" || (t === "auto" && prefersDark));
  }
  function setTheme(t: "auto" | "light" | "dark") {
    setThemeState(t);
    localStorage.setItem("theme", t);
    applyTheme(t);
  }

  // ── Effects ──────────────────────────────────────────────────────────
  useEffect(() => {
    const d = new Date(activeDate + "T00:00:00");
    setCalMonth({ year: d.getFullYear(), month: d.getMonth() });
  }, [activeDate]);

  useEffect(() => {
    if (!topMenuOpen) return;
    function onClick(e: MouseEvent) {
      if (topMenuRef.current && !topMenuRef.current.contains(e.target as Node)) setTopMenuOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [topMenuOpen]);

  useEffect(() => {
    function check() { setLeftBarOpen(window.innerWidth >= COLLAPSE_WIDTH); }
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // ── Data ─────────────────────────────────────────────────────────────
  async function switchDay(date: string) {
    setActiveDate(date);
    if (dayCache[date]) { setCurrentDay(dayCache[date]); return; }
    const res = await fetch("/api/days", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date }),
    });
    if (res.ok) {
      const day: AirtableDay = await res.json();
      setDayCache((p) => ({ ...p, [date]: day }));
      setCurrentDay(day);
    }
  }

  async function toggleTask(id: string, completed: boolean) {
    setItems((p) => p.map((i) =>
      i.id === id ? { ...i, completed, completedDate: completed ? todayISO : undefined } : i
    ));
    await fetch(`/api/items/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completed }),
    });
  }

  const filtered = useCallback(
    (list: AirtableItem[]) =>
      activeModeId ? list.filter((i) => i.collectionIds?.includes(activeModeId)) : list,
    [activeModeId]
  );

  const dayItems   = items.filter((i) => i.dayIds?.includes(currentDay.id));
  const dayEvents  = filtered(dayItems).filter((i) => i.type === "event");
  const allTasks   = filtered(items).filter((i) => i.type === "task");

  // Mobile task groupings
  const pastDue        = allTasks.filter((t) => !t.completed && t.dueDate && daysDiff(t.dueDate, todayISO) < 0);
  const dueToday       = allTasks.filter((t) => !t.completed && t.dueDate && daysDiff(t.dueDate, todayISO) === 0);
  const upcoming       = allTasks.filter((t) => !t.completed && t.dueDate && daysDiff(t.dueDate, todayISO) > 0);
  const noDate         = allTasks.filter((t) => !t.completed && !t.dueDate);
  const completedToday = allTasks.filter((t) => t.completed && t.completedDate === activeDate);

  const isToday   = activeDate === todayISO;
  const dateLabel = new Date(activeDate + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "short", month: "short", day: "numeric",
  });
  const isWeekAtToday = weekViewStart === todayISO;
  const rollingDates  = [0, 1, 2, 3, 4].map((i) => addDays(weekViewStart, i));

  // Shared theme picker — used in desktop dropdown + mobile nav
  const themeButtons = (
    <div className="flex gap-1">
      {([
        { id: "auto",  Icon: Monitor, label: "Auto"  },
        { id: "light", Icon: Sun,     label: "Light" },
        { id: "dark",  Icon: Moon,    label: "Dark"  },
      ] as const).map(({ id, Icon, label }) => (
        <button
          key={id}
          onClick={() => setTheme(id)}
          className={`flex-1 flex flex-col items-center gap-0.5 py-1.5 rounded-md text-[10px] leading-normal transition-colors ${
            theme === id
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent"
          }`}
        >
          <Icon className="w-3.5 h-3.5" />
          {label}
        </button>
      ))}
    </div>
  );

  return (
    <div className="relative h-dvh overflow-hidden bg-background flex flex-col">

      {/* ── MOBILE: Brand bar ──────────────────────────────────────────── */}
      <div
        className="sm:hidden grid z-30 flex-shrink-0"
        style={{
          gridTemplateRows: editorFocused ? "0fr" : "1fr",
          opacity: editorFocused ? 0 : 1,
          pointerEvents: editorFocused ? "none" : "auto",
          transition: "grid-template-rows 0.3s ease, opacity 0.3s ease",
        }}
      >
        <div className="overflow-hidden">
          <div className="flex items-center px-4 py-4 bg-sidebar border-b border-sidebar-border">
            <div className="flex items-center gap-2.5 flex-1">
              <div className="w-8 h-8 rounded-[10px] bg-sidebar-accent flex items-center justify-center flex-shrink-0">
                <Brain className="w-4 h-4 text-sidebar-accent-foreground" />
              </div>
              <span className="text-base font-semibold font-mono text-sidebar-foreground">brainOS</span>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => { setNavOpen((o) => !o); setOverviewOpen(false); }}
                className="p-1.5 rounded-md text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
              >
                <PanelBottom className="w-4 h-4" />
              </button>
              <button
                onClick={() => { setOverviewOpen((o) => !o); setNavOpen(false); }}
                className="p-1.5 rounded-md text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
              >
                <ClipboardList className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Sidebar + content ──────────────────────────────────────────── */}
      {/*   SidebarProvider kept for LeftBar's <Sidebar> context           */}
      <SidebarProvider
        className="flex-1 min-h-0 flex flex-col overflow-hidden sm:flex-row sm:py-4 sm:pl-4 sm:gap-4"
        style={{ minHeight: 0 } as React.CSSProperties}
      >
        {/* Desktop sidebar */}
        <div
          className="hidden sm:block flex-shrink-0 transition-all duration-300"
          style={{
            width: "256px",
            marginLeft: leftBarOpen ? "0px" : "-256px",
            opacity: leftBarOpen ? 1 : 0,
            pointerEvents: leftBarOpen ? "auto" : "none",
          }}
        >
          <LeftBar
            todayISO={todayISO}
            weekDates={weekDates}
            activeDate={activeDate}
            onSelectDate={switchDay}
            collections={collections}
            activeModeId={activeModeId}
            onSelectMode={setActiveModeId}
            items={items}
            onHide={() => setLeftBarOpen(false)}
            wideMode={wideMode}
            onToggleWide={() => setWideMode((w) => !w)}
          />
        </div>

        {/* Content column — blurred on mobile when nav open */}
        <div
          className="flex-1 flex flex-col overflow-hidden min-w-0 transition-[filter] duration-300"
          style={{ filter: (navOpen || overviewOpen) ? "blur(5px)" : "none" }}
        >
          {/* MOBILE: Date/time bar */}
          <div
            className="sm:hidden grid flex-shrink-0"
            style={{
              gridTemplateRows: editorFocused ? "0fr" : "1fr",
              opacity: editorFocused ? 0 : 1,
              transition: "grid-template-rows 0.3s ease, opacity 0.3s ease",
            }}
          >
            <div className="overflow-hidden">
              <div className="flex items-center justify-between px-4 py-4 border-b border-border">
                <div>
                  <p className={`text-[10px] font-mono tracking-[0.15em] uppercase text-muted-foreground ${isToday ? "opacity-100" : "opacity-35"}`}>
                    {isToday ? "Today" : activeDate < todayISO ? "Past" : "Future"}
                  </p>
                  <h1 className="text-2xl font-bold leading-tight">{dateLabel}</h1>
                </div>
                <span className="text-[12px] text-muted-foreground tabular-nums font-mono"><Clock /></span>
              </div>
            </div>
          </div>

          {/* DESKTOP: Top bar */}
          <div className="hidden sm:flex flex-shrink-0 justify-center">
            <div className={`flex items-center justify-between pl-2 pr-6 py-4 border-b border-border w-full transition-all duration-300 ${wideMode ? "" : "max-w-[960px]"}`}>
              <div>
                <p className={`text-[10px] font-mono tracking-[0.15em] uppercase text-muted-foreground ${isToday ? "opacity-100" : "opacity-35"}`}>
                  {isToday ? "Today" : activeDate < todayISO ? "Past" : "Future"}
                </p>
                <h1 className="text-2xl font-bold leading-tight">{dateLabel}</h1>
              </div>
              <span className="text-[12px] text-muted-foreground tabular-nums font-mono"><Clock /></span>
            </div>
          </div>

          {/* Editor + desktop right bar */}
          <div
            className="flex flex-col flex-1 min-h-0 overflow-hidden sm:flex-row sm:justify-center"
            onFocus={() => setEditorFocused(true)}
            onBlur={() => setEditorFocused(false)}
          >
            <div className={`flex overflow-hidden flex-1 lg:flex-none transition-all duration-300 ${wideMode ? "lg:flex-1" : "lg:w-[960px]"}`}>
              <Editor
                dayId={currentDay.id}
                initialBody={currentDay.body ?? ""}
                events={dayEvents}
              />
              {/* lg+: rightbar always in flow */}
              <div className="hidden lg:flex flex-shrink-0">
                <RightBar
                  events={dayEvents}
                  tasks={allTasks}
                  todayISO={todayISO}
                  activeDate={activeDate}
                  onToggleTask={toggleTask}
                />
              </div>
            </div>
          </div>
        </div>
      </SidebarProvider>

      {/* ── TABLET (md→lg): Hover-triggered right panel ───────────────── */}
      <div className="group/rightbar hidden sm:block lg:hidden fixed right-0 top-0 bottom-0 w-4 z-40">
        <div className="absolute right-4 top-4 bottom-4 w-72 translate-x-[calc(100%+1rem)] group-hover/rightbar:translate-x-0 transition-transform duration-300 ease-out bg-background/95 backdrop-blur-xl border border-sidebar-border rounded-2xl overflow-hidden">
          <RightBar
            events={dayEvents}
            tasks={allTasks}
            todayISO={todayISO}
            activeDate={activeDate}
            onToggleTask={toggleTask}
          />
        </div>
      </div>

      {/* ── MOBILE: Backdrop ───────────────────────────────────────────── */}
      {(navOpen || overviewOpen) && (
        <div
          className="sm:hidden absolute inset-0 z-20"
          onClick={() => { setNavOpen(false); setOverviewOpen(false); }}
        />
      )}

      {/* ── MOBILE: Overview dropdown ──────────────────────────────────── */}
      <div
        className="sm:hidden absolute bg-background/95 backdrop-blur-xl border border-sidebar-border rounded-2xl overflow-hidden z-40 w-72 transition-all duration-200"
        style={{
          top: "68px", right: "12px",
          opacity: overviewOpen ? 1 : 0,
          pointerEvents: overviewOpen ? "auto" : "none",
          transform: overviewOpen ? "translateY(0)" : "translateY(-6px)",
          maxHeight: "60dvh",
        }}
      >
        <div className="flex items-center gap-2 px-3 py-3 border-b border-sidebar-border flex-shrink-0">
          <ClipboardList className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">Overview</span>
        </div>
        <div className="overflow-y-auto flex flex-col gap-4 p-2">
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
                        {new Date(event.dueDate + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}
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
              <LayoutGroup>
                <div className="flex flex-col gap-0.5">
                  {[...pastDue, ...dueToday, ...upcoming, ...noDate, ...completedToday].map((t) => (
                    <motion.div
                      key={t.id} layout layoutId={t.id}
                      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
                      className="flex items-start gap-2.5 px-1.5 py-2 rounded-md cursor-pointer"
                      style={t.completed ? { opacity: 0.75 } : {}}
                      onClick={() => toggleTask(t.id, !t.completed)}
                    >
                      {t.completed
                        ? <SquareCheck className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                        : <Square className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                      }
                      <span className={`text-sm leading-snug ${t.completed ? "text-muted-foreground" : "text-foreground"}`}>
                        {t.name}
                      </span>
                    </motion.div>
                  ))}
                </div>
              </LayoutGroup>
            </section>
          )}
          {dayEvents.length === 0 && allTasks.length === 0 && (
            <p className="text-sm text-muted-foreground/50 text-center py-8">Nothing here yet.</p>
          )}
        </div>
      </div>

      {/* ── MOBILE: Nav dropdown ───────────────────────────────────────── */}
      <div
        className="sm:hidden absolute bg-background/95 backdrop-blur-xl border border-sidebar-border rounded-2xl overflow-hidden z-40 flex flex-col transition-all duration-200 w-64 p-2"
        style={{
          top: "68px", right: "52px",
          opacity: navOpen ? 1 : 0,
          pointerEvents: navOpen ? "auto" : "none",
          transform: navOpen ? "translateY(0)" : "translateY(-6px)",
        }}
      >
        {/* Agenda */}
        <div className="flex-shrink-0">
          <div className="px-2 py-2 border-b border-sidebar-border">
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
                        onClick={() => {
                          switchDay(todayISO);
                          setCalMonth({ year: new Date(todayISO + "T00:00:00").getFullYear(), month: new Date(todayISO + "T00:00:00").getMonth() });
                        }}
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
                        onClick={() => { switchDay(todayISO); setWeekViewStart(todayISO); }}
                        className="text-[10px] text-muted-foreground hover:text-foreground hover:bg-sidebar-accent transition-colors px-1.5 py-1 leading-none rounded"
                      >Today</button>
                    )}
                    <button onClick={() => setWeekViewStart((s) => addDays(s, -5))} className="p-1 text-muted-foreground hover:text-foreground transition-colors">
                      <ChevronUp className="w-3 h-3" />
                    </button>
                    <button onClick={() => setWeekViewStart((s) => addDays(s, 5))} className="p-1 text-muted-foreground hover:text-foreground transition-colors">
                      <ChevronDown className="w-3 h-3" />
                    </button>
                  </>
                )}
              </div>
            </div>
            <div className="flex gap-0.5 bg-sidebar-border/50 rounded-lg p-0.5">
              {(["month", "week"] as const).map((id) => (
                <button
                  key={id} onClick={() => setAgendaView(id)}
                  className={`flex-1 py-1 rounded-md text-[11px] font-medium transition-colors capitalize ${
                    agendaView === id
                      ? "bg-sidebar text-sidebar-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >{id}</button>
              ))}
            </div>
          </div>
          {agendaView === "month" ? (
            <MonthCalendar
              year={calMonth.year} month={calMonth.month}
              activeDate={activeDate} todayISO={todayISO} showWeekends={true}
              onSelectDate={(d) => { switchDay(d); setNavOpen(false); }}
            />
          ) : (
            <div className="flex flex-col gap-0.5 px-1 py-1">
              {rollingDates.map((date) => {
                const isActive = date === activeDate;
                const isTod = date === todayISO;
                return (
                  <button
                    key={date} onClick={() => { switchDay(date); setNavOpen(false); }}
                    className={`flex items-center gap-2 px-2 py-1.5 rounded-md text-xs text-left w-full transition-colors ${
                      isActive
                        ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                        : "text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
                    }`}
                  >
                    {isTod ? <CalendarCheck className="w-4 h-4 flex-shrink-0" /> : <Calendar className="w-4 h-4 flex-shrink-0" />}
                    {getDayLabel(date)}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Modes */}
        <div className="flex-shrink-0 mt-2">
          <div className="flex items-center gap-2 px-2 py-2 border-b border-sidebar-border">
            <Layers className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-sm font-medium text-sidebar-foreground">Modes</span>
          </div>
          <div className="flex flex-col gap-0.5 px-1 py-1">
            <button
              onClick={() => { setActiveModeId(null); setNavOpen(false); }}
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
                key={col.id} onClick={() => { setActiveModeId(col.id); setNavOpen(false); }}
                className={`flex items-center gap-2 px-2 py-1.5 rounded-md text-xs w-full transition-colors ${
                  activeModeId === col.id
                    ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                    : "text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
                }`}
              >
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: MODE_COLORS[i] ?? "#6366f1" }} />
                <span className="flex-1 text-left">{col.name}</span>
                <span className="tabular-nums">{items.filter((it) => it.collectionIds?.includes(col.id)).length}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Display */}
        <div className="border-t border-sidebar-border px-2 py-2 mt-2">
          <p className="text-[9px] uppercase tracking-widest text-muted-foreground mb-1.5">Display</p>
          {themeButtons}
        </div>
      </div>

      {/* ── DESKTOP: Collapsed sidebar button ─────────────────────────── */}
      <div
        className="hidden sm:block fixed top-[30px] left-4 z-50 transition-opacity duration-200"
        style={{
          opacity: leftBarOpen ? 0 : 1,
          pointerEvents: leftBarOpen ? "none" : "auto",
          transitionDelay: leftBarOpen ? "0ms" : "150ms",
        }}
        ref={topMenuRef}
      >
        <div className={`group rounded-xl w-9 h-9 flex items-center justify-center transition-colors ${topMenuOpen ? "bg-sidebar-accent" : "bg-transparent hover:bg-sidebar-accent"}`}>
          <button
            onClick={() => setTopMenuOpen((o) => !o)}
            className="text-muted-foreground/40 group-hover:text-sidebar-foreground transition-colors p-1 rounded"
          >
            <PanelLeft className="w-4 h-4" />
          </button>
        </div>
        {topMenuOpen && (
          <div className="absolute left-0 top-full mt-1 w-48 bg-background/95 backdrop-blur-xl border border-sidebar-border rounded-2xl z-50 py-1 overflow-hidden">
            <button
              onClick={() => { setLeftBarOpen(true); setTopMenuOpen(false); }}
              className="flex items-center gap-2.5 w-full px-3 py-2 text-xs text-foreground hover:bg-sidebar-accent transition-colors"
            >
              <SquareChevronRight className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
              Show sidebar
            </button>
            <button
              onClick={() => { setWideMode((w) => !w); setTopMenuOpen(false); }}
              className="flex items-center gap-2.5 w-full px-3 py-2 text-xs text-foreground hover:bg-sidebar-accent transition-colors"
            >
              <UnfoldHorizontal className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
              <span className="flex-1 text-left">Full width</span>
              <div className={`relative w-7 h-4 rounded-full transition-colors flex-shrink-0 ${wideMode ? "bg-primary" : "bg-sidebar-border"}`}>
                <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${wideMode ? "left-[14px]" : "left-0.5"}`} />
              </div>
            </button>
            <div className="h-px bg-sidebar-border mx-2 mt-1" />
            <div className="px-3 py-2">
              <p className="text-[9px] uppercase tracking-widest text-muted-foreground mb-1.5">Display</p>
              {themeButtons}
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
