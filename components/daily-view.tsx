"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AirtableDay, AirtableItem, AirtableCollection } from "@/lib/airtable";
import LeftBar from "@/components/leftbar";
import Editor from "@/components/editor";
import RightBar from "@/components/rightbar";
import MobileView from "@/components/mobile-view";
import { Clock } from "@/components/clock";
import { useIsMobileResolved } from "@/hooks/use-mobile";
import { PanelLeft, SquareChevronRight, UnfoldHorizontal, Sun, Moon, Monitor } from "lucide-react";

// Auto-collapse sidebar below this desktop width
const COLLAPSE_WIDTH = 1100;

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
  const [activeDate, setActiveDate] = useState(todayISO);
  const [activeModeId, setActiveModeId] = useState<string | null>(null);
  const [currentDay, setCurrentDay] = useState<AirtableDay>(initialDay);
  const [leftBarOpen, setLeftBarOpen] = useState(true);
  const [wideMode, setWideMode] = useState(false);
  const [topMenuOpen, setTopMenuOpen] = useState(false);
  const [theme, setThemeState] = useState<"auto" | "light" | "dark">("dark");
  const topMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const saved = (localStorage.getItem("theme") ?? "dark") as "auto" | "light" | "dark";
    setThemeState(saved);
    applyTheme(saved);
  }, []);

  function applyTheme(t: "auto" | "light" | "dark") {
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const isDark = t === "dark" || (t === "auto" && prefersDark);
    document.documentElement.classList.toggle("dark", isDark);
  }

  function setTheme(t: "auto" | "light" | "dark") {
    setThemeState(t);
    localStorage.setItem("theme", t);
    applyTheme(t);
  }
  const [items, setItems] = useState<AirtableItem[]>(allItems);
  const [dayCache, setDayCache] = useState<Record<string, AirtableDay>>(() => {
    const cache: Record<string, AirtableDay> = {};
    weekDays.forEach((d) => { if (d?.date) cache[d.date] = d; });
    return cache;
  });

  // Close top menu on outside click
  useEffect(() => {
    if (!topMenuOpen) return;
    function handleClick(e: MouseEvent) {
      if (topMenuRef.current && !topMenuRef.current.contains(e.target as Node)) {
        setTopMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [topMenuOpen]);

  // Auto-collapse sidebar at narrow desktop widths
  useEffect(() => {
    function checkWidth() {
      setLeftBarOpen(window.innerWidth >= COLLAPSE_WIDTH);
    }
    checkWidth();
    window.addEventListener("resize", checkWidth);
    return () => window.removeEventListener("resize", checkWidth);
  }, []);

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
      setDayCache((prev) => ({ ...prev, [date]: day }));
      setCurrentDay(day);
    }
  }

  async function toggleTask(itemId: string, completed: boolean) {
    setItems((prev) => prev.map((i) => (i.id === itemId ? { ...i, completed } : i)));
    await fetch(`/api/items/${itemId}`, {
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

  const dayItems = items.filter((i) => i.dayIds?.includes(currentDay.id));
  const dayEvents = filtered(dayItems).filter((i) => i.type === "event");
  const allTasks = filtered(items).filter((i) => i.type === "task");

  const { isMobile, ready } = useIsMobileResolved();
  if (!ready) return null;

  const activeD = new Date(activeDate + "T00:00:00");
  const isToday = activeDate === todayISO;
  const topBarDate = activeD.toLocaleDateString("en-US", {
    weekday: "short", month: "short", day: "numeric",
  });

  if (isMobile) {
    return (
      <MobileView
        currentDay={currentDay}
        todayISO={todayISO}
        weekDates={weekDates}
        activeDate={activeDate}
        onSelectDate={switchDay}
        collections={collections}
        activeModeId={activeModeId}
        onSelectMode={setActiveModeId}
        items={items}
        dayEvents={dayEvents}
        allTasks={allTasks}
        onToggleTask={toggleTask}
      />
    );
  }

  return (
    <SidebarProvider className="h-screen overflow-hidden py-4 pl-4 gap-4">
      <div
        className="flex-shrink-0 transition-all duration-300"
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

      {/* Collapsed sidebar button — fixed top-left when sidebar is hidden */}
      {!leftBarOpen && (
        <div className="fixed top-4 left-4 z-50" ref={topMenuRef}>
          <div className="bg-sidebar-accent rounded-xl w-9 h-9 flex items-center justify-center">
            <button
              onClick={() => setTopMenuOpen((o) => !o)}
              className="text-muted-foreground hover:text-sidebar-foreground transition-colors p-1 rounded"
            >
              <PanelLeft className="w-4 h-4" />
            </button>
          </div>
          {topMenuOpen && (
            <div className="absolute left-0 top-full mt-1 w-48 bg-background/95 backdrop-blur-xl border border-sidebar-border rounded-2xl shadow-lg z-50 py-1 overflow-hidden">
              <button
                onClick={() => { setLeftBarOpen(true); setTopMenuOpen(false); }}
                className="flex items-center gap-2.5 w-full px-3 py-2 text-xs text-foreground hover:bg-sidebar-accent transition-colors"
              >
                <SquareChevronRight className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                Show sidebar
              </button>
              <button
                onClick={() => setWideMode((w) => !w)}
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
              </div>
            </div>
          )}
        </div>
      )}

      <SidebarInset className="flex flex-col overflow-hidden min-w-0">
        {/* Top bar */}
        <div className="flex-shrink-0 flex justify-center">
          <div className={`flex items-center justify-between pl-2 pr-6 py-4 border-b border-border w-full transition-all duration-300 ${wideMode ? "" : "max-w-[960px]"}`}>
            <div className="flex items-center gap-3">
              <div>
                <p className={`text-[10px] font-mono tracking-[0.15em] uppercase text-muted-foreground ${isToday ? "opacity-100" : "opacity-35"}`}>
                  {isToday ? "Today" : activeDate < todayISO ? "Past" : "Future"}
                </p>
                <h1 className="text-2xl font-bold leading-tight">{topBarDate}</h1>
              </div>
            </div>
            <span className="text-[12px] text-muted-foreground tabular-nums font-mono">
              <Clock />
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="flex flex-1 overflow-hidden justify-center">
          <div className={`flex overflow-hidden transition-all duration-300 ${wideMode ? "flex-1" : "w-[960px] max-w-full"}`}>
            <Editor
              dayId={currentDay.id}
              initialBody={currentDay.body ?? ""}
              events={dayEvents}
            />
            <RightBar
              events={dayEvents}
              tasks={allTasks}
              todayISO={todayISO}
              activeDate={activeDate}
              onToggleTask={toggleTask}
            />
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
