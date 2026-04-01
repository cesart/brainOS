"use client";

import { useState, useCallback, useEffect, useLayoutEffect, useRef } from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { AirtableDay, AirtableItem, AirtableCollection } from "@/lib/airtable";
import LeftBar from "@/components/leftbar";
import Editor, { EditorHandle } from "@/components/editor";
import RightBar from "@/components/rightbar";
import MonthCalendar from "@/components/calendar";
import { Clock } from "@/components/clock";
import {
  Brain, PanelBottom, ClipboardList,
  Layers, NotebookPen, Calendar, CalendarCheck,
  Square, SquareCheck,
  ChevronLeft, ChevronRight, ChevronUp, ChevronDown,
  CheckSquare, Heading, Bold, Italic, Strikethrough,
  CodeXml, Link, Quote, List, ListOrdered, Minus,
} from "lucide-react";
import { Display } from "@/components/display";

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

interface MainProps {
  initialDay: AirtableDay;
  todayISO: string;
  weekDates: string[];
  weekDays: (AirtableDay | null)[];
  allItems: AirtableItem[];
  collections: AirtableCollection[];
}

export default function Main({
  initialDay, todayISO, weekDates, weekDays, allItems, collections,
}: MainProps) {

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
  const [rightBarOpen, setRightBarOpen] = useState(true);
  const [wideMode, setWideMode] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [peekabooHovered, setPeekabooHovered] = useState(false);
  const [peekabooMenuOpen, setPeekabooMenuOpen] = useState(false);
  const editorRef = useRef<EditorHandle>(null);

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
    function check() { setLeftBarOpen(window.innerWidth >= COLLAPSE_WIDTH); }
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    function checkFullscreen() {
      const apiFS = !!document.fullscreenElement;
      // Native OS fullscreen hides the browser chrome, so innerHeight ≈ outerHeight
      const nativeFS = window.outerHeight > 0 && (window.outerHeight - window.innerHeight) < 10;
      setIsFullscreen(apiFS || nativeFS);
    }
    document.addEventListener("fullscreenchange", checkFullscreen);
    window.addEventListener("resize", checkFullscreen);
    return () => {
      document.removeEventListener("fullscreenchange", checkFullscreen);
      window.removeEventListener("resize", checkFullscreen);
    };
  }, []);

  const effectiveLeftOpen = leftBarOpen && !isFullscreen;
  const effectiveRightOpen = rightBarOpen && !isFullscreen;

  // Reset hover state synchronously before paint when sidebar hides,
  // so CSS hover can't re-show it in the same frame.
  useLayoutEffect(() => {
    if (!effectiveLeftOpen) {
      setPeekabooHovered(false);
      setPeekabooMenuOpen(false);
    }
  }, [effectiveLeftOpen]);

  const peekabooVisible = !effectiveLeftOpen && (peekabooHovered || peekabooMenuOpen);

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

  const themeButtons = <Display theme={theme} onSetTheme={setTheme} />;

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
        {/* Desktop sidebar spacer — offsets content; actual LeftBar rendered fixed below */}
        <div
          className="hidden sm:block flex-shrink-0 transition-all duration-300"
          style={{
            width: "256px",
            marginLeft: effectiveLeftOpen ? "0px" : "-256px",
          }}
        />

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
                  <p className={`text-[11px] font-mono tracking-[0.15em] uppercase text-muted-foreground ${isToday ? "opacity-100" : "opacity-35"}`}>
                    {isToday ? "Today" : activeDate < todayISO ? "Past" : "Future"}
                  </p>
                  <h1 className="text-[24px] font-medium leading-tight">{dateLabel}</h1>
                </div>
                <span className="text-[11px] text-muted-foreground tabular-nums font-mono tracking-[0.15em]"><Clock /></span>
              </div>
            </div>
          </div>

          {/* Editor + desktop right bar (toolbar + content share the same justify-center row) */}
          <div
            className="flex flex-col flex-1 min-h-0 overflow-hidden sm:flex-row sm:justify-center"
            onFocus={() => setEditorFocused(true)}
            onBlur={() => setEditorFocused(false)}
          >
            <div className={`relative flex flex-col overflow-hidden transition-all duration-300 ${
              isFullscreen
                ? "flex-none w-full max-w-[680px]"
                : `flex-1 ${wideMode ? "lg:flex-1" : "lg:flex-none lg:w-[960px]"}`
            }`}>
              {/* DESKTOP: Top bar — inside the content column so it aligns with the editor */}
              <div className="hidden sm:flex flex-shrink-0">
                <div className="flex items-center justify-between pl-2 pr-6 py-4 border-b border-border w-full">
                  <div>
                    <p className={`text-[11px] font-mono tracking-[0.15em] uppercase text-muted-foreground ${isToday ? "opacity-100" : "opacity-35"}`}>
                      {isToday ? "Today" : activeDate < todayISO ? "Past" : "Future"}
                    </p>
                    <h1 className="text-[24px] font-medium leading-tight">{dateLabel}</h1>
                  </div>
                  <span className="text-[11px] text-muted-foreground tabular-nums font-mono tracking-[0.15em]"><Clock /></span>
                </div>
              </div>

              <div className="relative flex overflow-hidden flex-1 min-w-0">
                {/* Desktop toolbar — floats inside editor, top, horizontal */}
                <div className="flex absolute top-0 left-0 right-0 z-10 flex-row gap-1 pl-4 pr-3 py-2.5 pointer-events-none">
                  <div className="flex flex-row gap-1 pointer-events-auto">
                    {([
                      { label: "Task",    icon: <CheckSquare className="w-4 h-4" strokeWidth={2.5} />, action: () => editorRef.current?.insertLinePrefix("[] ") },
                      { label: "Event",   icon: <Calendar className="w-4 h-4" strokeWidth={2.5} />,    action: () => editorRef.current?.insertLinePrefix("+ ") },
                      { label: "Section", icon: <Heading className="w-4 h-4" strokeWidth={2.5} />,     action: () => editorRef.current?.insertLinePrefix("## ") },
                      { label: "Bold",    icon: <Bold className="w-4 h-4" strokeWidth={2.5} />,        action: () => editorRef.current?.wrapSelection("*", "*") },
                      { label: "Italic",  icon: <Italic className="w-4 h-4" strokeWidth={2.5} />,      action: () => editorRef.current?.wrapSelection("_", "_") },
                      { label: "Strike",  icon: <Strikethrough className="w-4 h-4" strokeWidth={2.5} />, action: () => editorRef.current?.wrapSelection("~~", "~~") },
                      { label: "Code",    icon: <CodeXml className="w-4 h-4" strokeWidth={2.5} />,     action: () => editorRef.current?.wrapSelection("`", "`") },
                      { label: "Link",    icon: <Link className="w-4 h-4" strokeWidth={2.5} />,        action: () => editorRef.current?.wrapSelection("[", "](url)") },
                      { label: "Quote",   icon: <Quote className="w-4 h-4" strokeWidth={2.5} />,       action: () => editorRef.current?.insertLinePrefix("> ") },
                      { label: "List",    icon: <List className="w-4 h-4" strokeWidth={2.5} />,        action: () => editorRef.current?.insertLinePrefix("- ") },
                      { label: "Ordered", icon: <ListOrdered className="w-4 h-4" strokeWidth={2.5} />, action: () => editorRef.current?.insertLinePrefix("1. ") },
                      { label: "Rule",    icon: <Minus className="w-4 h-4" strokeWidth={2.5} />,       action: () => editorRef.current?.insertLine("---") },
                    ] as const).map((tool) => (
                      <Tooltip key={tool.label}>
                        <TooltipTrigger
                          onClick={tool.action}
                          className="flex items-center justify-center py-1.5 px-2.5 rounded-md text-muted-foreground bg-background/60 backdrop-blur-md border border-border/40 hover:text-foreground hover:bg-accent/80 transition-colors"
                        >
                          {tool.icon}
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className="text-xs">{tool.label}</TooltipContent>
                      </Tooltip>
                    ))}
                  </div>
                </div>
              <Editor
                ref={editorRef}
                dayId={currentDay.id}
                initialBody={currentDay.body ?? ""}
                events={dayEvents}
                cursorColor={activeModeId ? (MODE_COLORS[collections.findIndex((c) => c.id === activeModeId)] ?? undefined) : undefined}
              />
              {/* lg+: rightbar in flow when open */}
              <div className={`flex-shrink-0 ${effectiveRightOpen ? "hidden lg:flex" : "hidden"}`}>
                <RightBar
                  events={dayEvents}
                  tasks={allTasks}
                  todayISO={todayISO}
                  activeDate={activeDate}
                  onToggleTask={toggleTask}
                  activeModeColor={activeModeId ? (MODE_COLORS[collections.findIndex((c) => c.id === activeModeId)] ?? undefined) : undefined}
                  activeModeName={activeModeId ? (collections.find((c) => c.id === activeModeId)?.name) : undefined}
                  onHide={() => setRightBarOpen(false)}
                />
              </div>
            </div>
          </div>
          </div>
        </div>
      </SidebarProvider>

      {/* ── TABLET (sm→lg) + FULLSCREEN: Hover-triggered right panel ─── */}
      <div className={`group/rightbar hidden sm:block ${effectiveRightOpen ? "lg:hidden" : ""} fixed right-0 top-0 bottom-0 w-4 z-40`}>
        <div className="absolute right-4 top-4 bottom-4 w-80 translate-x-[calc(100%+1rem)] group-hover/rightbar:translate-x-0 transition-transform duration-300 ease-out bg-background/95 backdrop-blur-xl border border-sidebar-border rounded-2xl overflow-hidden">
          <RightBar
            events={dayEvents}
            tasks={allTasks}
            todayISO={todayISO}
            activeDate={activeDate}
            onToggleTask={toggleTask}
            activeModeColor={activeModeId ? (MODE_COLORS[collections.findIndex((c) => c.id === activeModeId)] ?? undefined) : undefined}
            activeModeName={activeModeId ? (collections.find((c) => c.id === activeModeId)?.name) : undefined}
            peekaboo
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
              <div className="flex flex-col gap-0.5">
                {[...pastDue, ...dueToday, ...upcoming, ...noDate, ...completedToday].map((t) => (
                  <div
                    key={t.id}
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
                  </div>
                ))}
              </div>
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
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button onClick={() => setCalMonth((c) => c.month === 11 ? { year: c.year + 1, month: 0 } : { ...c, month: c.month + 1 })} className="p-1 text-muted-foreground hover:text-foreground transition-colors">
                      <ChevronRight className="w-4 h-4" />
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
                      <ChevronUp className="w-4 h-4" />
                    </button>
                    <button onClick={() => setWeekViewStart((s) => addDays(s, 5))} className="p-1 text-muted-foreground hover:text-foreground transition-colors">
                      <ChevronDown className="w-4 h-4" />
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
              <span className="w-2 h-2 rounded-full bg-muted-foreground flex-shrink-0" />
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

      {/* ── DESKTOP: Single LeftBar — docked when open, peekaboo when hidden ── */}
      <div
        className="hidden sm:block fixed left-0 top-0 bottom-0 z-50"
        style={{ width: effectiveLeftOpen ? "272px" : "12px" }}
        onMouseEnter={() => { if (!effectiveLeftOpen) setPeekabooHovered(true); }}
        onMouseLeave={() => setPeekabooHovered(false)}
      >
        <div className={`absolute top-4 bottom-4 w-64 transition-transform duration-300 ease-out ${
          effectiveLeftOpen
            ? "left-4 translate-x-0"
            : `left-3 ${peekabooVisible ? "translate-x-0" : "-translate-x-[calc(100%+0.75rem)]"} bg-background/95 backdrop-blur-xl border border-sidebar-border rounded-2xl`
        }`}>
          <SidebarProvider className="h-full" style={{ minHeight: 0 } as React.CSSProperties}>
            <LeftBar
              todayISO={todayISO}
              weekDates={weekDates}
              activeDate={activeDate}
              onSelectDate={switchDay}
              collections={collections}
              activeModeId={activeModeId}
              onSelectMode={setActiveModeId}
              items={items}
              onHide={() => setLeftBarOpen(!effectiveLeftOpen)}
              wideMode={wideMode}
              onToggleWide={() => setWideMode((w) => !w)}
              theme={theme}
              onSetTheme={setTheme}
              peekaboo={!effectiveLeftOpen}
              onMenuOpenChange={setPeekabooMenuOpen}
              activeModeColor={activeModeId ? (MODE_COLORS[collections.findIndex((c) => c.id === activeModeId)] ?? undefined) : undefined}
            />
          </SidebarProvider>
        </div>
      </div>

    </div>
  );
}
