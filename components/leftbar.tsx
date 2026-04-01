"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  Brain, PanelLeft, SquareChevronLeft, SquareChevronRight, NotebookPen,
  Calendar, CalendarCheck, CalendarDays, CalendarRange, Layers, UnfoldHorizontal,
  ChevronLeft, ChevronRight, ChevronDown, ChevronUp,
} from "lucide-react";
import { Display } from "@/components/display";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar";
import { AirtableItem, AirtableCollection } from "@/lib/airtable";
import MonthCalendar from "@/components/calendar";

const MODE_COLORS: Record<number, string> = {
  0: "#6366f1", 1: "#10b981", 2: "#f59e0b",
  3: "#a855f7", 4: "#ef4444", 5: "#06b6d4",
};

interface LeftBarProps {
  todayISO: string;
  weekDates: string[];
  activeDate: string;
  onSelectDate: (date: string) => void;
  collections: AirtableCollection[];
  activeModeId: string | null;
  onSelectMode: (id: string | null) => void;
  items: AirtableItem[];
  onHide?: () => void;
  wideMode: boolean;
  onToggleWide: () => void;
  theme: "auto" | "light" | "dark";
  onSetTheme: (t: "auto" | "light" | "dark") => void;
  peekaboo?: boolean;
  onMenuOpenChange?: (open: boolean) => void;
  activeModeColor?: string;
}

function getWeekDayLabel(date: string): string {
  return new Date(date + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "short", month: "short", day: "numeric",
  });
}

function pad2(n: number): string { return String(n).padStart(2, "0"); }

function addDays(dateISO: string, n: number): string {
  const d = new Date(dateISO + "T00:00:00");
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

export default function LeftBar({
  todayISO, weekDates: _weekDates, activeDate, onSelectDate,
  collections, activeModeId, onSelectMode, items,
  onHide, wideMode, onToggleWide, theme, onSetTheme, peekaboo, onMenuOpenChange, activeModeColor,
}: LeftBarProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  // Notify parent when menu open state changes so it can pin peekaboo sidebar
  useEffect(() => { onMenuOpenChange?.(menuOpen); }, [menuOpen, onMenuOpenChange]);
  const menuTriggerRef = useRef<HTMLDivElement>(null);
  const menuDropdownRef = useRef<HTMLDivElement>(null);
  const [menuAnchor, setMenuAnchor] = useState<{ top: number; right: number } | null>(null);

  const [agendaView, setAgendaView] = useState<"month" | "week">("month");
  const [agendaMenuOpen, setAgendaMenuOpen] = useState(false);
  const agendaMenuRef = useRef<HTMLDivElement>(null);

  const [weekViewStart, setWeekViewStart] = useState(todayISO);

  const [calMonth, setCalMonth] = useState(() => {
    const d = new Date(activeDate + "T00:00:00");
    return { year: d.getFullYear(), month: d.getMonth() };
  });

  // Sync calendar month when active date changes
  useEffect(() => {
    const d = new Date(activeDate + "T00:00:00");
    setCalMonth({ year: d.getFullYear(), month: d.getMonth() });
  }, [activeDate]);

  // Close panel menu on outside click (checks both trigger and portal dropdown)
  useEffect(() => {
    if (!menuOpen) return;
    function handleClick(e: MouseEvent) {
      const inTrigger = menuTriggerRef.current?.contains(e.target as Node);
      const inDropdown = menuDropdownRef.current?.contains(e.target as Node);
      if (!inTrigger && !inDropdown) setMenuOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [menuOpen]);

  function openMenu() {
    if (menuTriggerRef.current) {
      const r = menuTriggerRef.current.getBoundingClientRect();
      setMenuAnchor({ top: r.bottom + 4, right: window.innerWidth - r.right });
    }
    setMenuOpen((o) => !o);
  }

  // Close agenda menu on outside click
  useEffect(() => {
    if (!agendaMenuOpen) return;
    function handleClick(e: MouseEvent) {
      if (agendaMenuRef.current && !agendaMenuRef.current.contains(e.target as Node)) {
        setAgendaMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [agendaMenuOpen]);

  function prevMonth() {
    setCalMonth((c) => c.month === 0 ? { year: c.year - 1, month: 11 } : { ...c, month: c.month - 1 });
  }

  function nextMonth() {
    setCalMonth((c) => c.month === 11 ? { year: c.year + 1, month: 0 } : { ...c, month: c.month + 1 });
  }

  function goToToday() {
    const d = new Date(todayISO + "T00:00:00");
    setCalMonth({ year: d.getFullYear(), month: d.getMonth() });
  }

  function prevDay() { setWeekViewStart((s) => addDays(s, -1)); }
  function nextDay() { setWeekViewStart((s) => addDays(s, 1)); }
  function goToTodayWeek() { setWeekViewStart(todayISO); }

  const isWeekAtToday = weekViewStart === todayISO;
  const rollingDates = [0, 1, 2, 3, 4].map((i) => addDays(weekViewStart, i));

  function countForCollection(id: string) {
    return items.filter((i) => i.collectionIds?.includes(id)).length;
  }

  return (
    <Sidebar collapsible="none" className={`rounded-2xl h-full w-64 flex-shrink-0 p-2${peekaboo ? " !bg-transparent" : ""}`}>
      {/* Header */}
      <SidebarHeader className="flex flex-row items-center justify-between px-2 py-2">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-sidebar-accent flex items-center justify-center flex-shrink-0">
            <Brain className="w-4 h-4 text-sidebar-accent-foreground transition-colors" style={activeModeColor ? { color: activeModeColor } : {}} />
          </div>
          <span className="text-base font-semibold font-mono text-sidebar-foreground">brainOS</span>
        </div>
        {/* Panel icon — dropdown portaled to body so backdrop-blur works in all states */}
        <div className="relative" ref={menuTriggerRef}>
          <button
            onClick={openMenu}
            className="text-muted-foreground hover:text-sidebar-foreground transition-colors p-1 rounded"
          >
            <PanelLeft className="w-4 h-4" />
          </button>
        </div>
        {menuOpen && menuAnchor && typeof window !== "undefined" && createPortal(
          <div
            ref={menuDropdownRef}
            className="fixed w-48 bg-sidebar/75 backdrop-blur-xl border border-sidebar-border rounded-2xl shadow-lg z-[200] py-1 overflow-hidden"
            style={{ top: menuAnchor.top, right: menuAnchor.right }}
          >
            <button
              onClick={() => { onHide?.(); setMenuOpen(false); }}
              className="flex items-center gap-2.5 w-full px-3 py-2 text-xs text-foreground hover:bg-sidebar-accent transition-colors"
            >
              {peekaboo
                ? <SquareChevronRight className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                : <SquareChevronLeft className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
              }
              {peekaboo ? "Show sidebar" : "Hide sidebar"}
            </button>
            <button
              onClick={() => { onToggleWide(); }}
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
              <Display theme={theme} onSetTheme={onSetTheme} />
            </div>
          </div>,
          document.body
        )}
      </SidebarHeader>

      <SidebarContent className="gap-0">
        {/* Agenda section */}
        <div>
          <div className="flex items-center justify-between px-2 py-2 border-b border-sidebar-border">
            <div className="flex items-center gap-2">
              <NotebookPen className="w-3.5 h-3.5 text-muted-foreground" />
              {/* View dropdown — "Agenda ˅" is one clickable unit */}
              <div className="relative" ref={agendaMenuRef}>
                <button
                  onClick={() => setAgendaMenuOpen((o) => !o)}
                  className="flex items-center gap-1 text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent transition-colors px-1 py-0.5 rounded -mx-1"
                >
                  Agenda
                  <ChevronDown className="w-3 h-3 text-muted-foreground" />
                </button>
                {agendaMenuOpen && (
                  <div className="absolute left-0 top-full mt-1 w-44 bg-sidebar/75 backdrop-blur-xl border border-sidebar-border rounded-2xl shadow-lg z-50 py-1 overflow-hidden">
                    <button
                      onClick={() => { setAgendaView("month"); setAgendaMenuOpen(false); }}
                      className={`flex items-center gap-2.5 w-full px-3 py-2 text-xs transition-colors ${agendaView === "month" ? "text-foreground font-medium" : "text-muted-foreground hover:text-foreground"} hover:bg-sidebar-accent`}
                    >
                      <CalendarDays className="w-3.5 h-3.5 flex-shrink-0" />
                      View as month
                    </button>
                    <button
                      onClick={() => { setAgendaView("week"); setAgendaMenuOpen(false); }}
                      className={`flex items-center gap-2.5 w-full px-3 py-2 text-xs transition-colors ${agendaView === "week" ? "text-foreground font-medium" : "text-muted-foreground hover:text-foreground"} hover:bg-sidebar-accent`}
                    >
                      <CalendarRange className="w-3.5 h-3.5 flex-shrink-0" />
                      View as week
                    </button>
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-0.5">
              {agendaView === "month" && (
                <>
                  {activeDate !== todayISO && (
                    <button
                      onClick={() => { onSelectDate(todayISO); goToToday(); }}
                      className="text-[10px] text-muted-foreground hover:text-foreground hover:bg-sidebar-accent transition-colors px-1.5 py-1 leading-none rounded"
                      title="Go to today"
                    >
                      Today
                    </button>
                  )}
                  <button
                    onClick={prevMonth}
                    className="p-1 text-muted-foreground hover:text-foreground transition-colors"
                    title="Previous month"
                  >
                    <ChevronLeft className="w-3 h-3" />
                  </button>
                  <button
                    onClick={nextMonth}
                    className="p-1 text-muted-foreground hover:text-foreground transition-colors"
                    title="Next month"
                  >
                    <ChevronRight className="w-3 h-3" />
                  </button>
                </>
              )}
              {agendaView === "week" && (
                <>
                  {(activeDate !== todayISO || !isWeekAtToday) && (
                    <button
                      onClick={() => { onSelectDate(todayISO); goToTodayWeek(); }}
                      className="text-[10px] text-muted-foreground hover:text-foreground hover:bg-sidebar-accent transition-colors px-1.5 py-1 leading-none rounded"
                      title="Go to today"
                    >
                      Today
                    </button>
                  )}
                  <button
                    onClick={prevDay}
                    className="p-1 text-muted-foreground hover:text-foreground transition-colors"
                    title="Previous day"
                  >
                    <ChevronUp className="w-3 h-3" />
                  </button>
                  <button
                    onClick={nextDay}
                    className="p-1 text-muted-foreground hover:text-foreground transition-colors"
                    title="Next day"
                  >
                    <ChevronDown className="w-3 h-3" />
                  </button>
                </>
              )}
            </div>
          </div>

          {agendaView === "month" ? (
            <MonthCalendar
              year={calMonth.year}
              month={calMonth.month}
              activeDate={activeDate}
              todayISO={todayISO}
              showWeekends={true}
              onSelectDate={onSelectDate}
            />
          ) : (
            <SidebarMenu className="px-1 py-1 gap-0.5">
              {rollingDates.map((date) => {
                const isActive = date === activeDate;
                const isToday = date === todayISO;
                const label = getWeekDayLabel(date);
                return (
                  <SidebarMenuItem key={date}>
                    <SidebarMenuButton
                      isActive={isActive}
                      onClick={() => onSelectDate(date)}
                      className={`gap-2 text-xs ${isActive ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium" : ""}`}
                    >
                      {isToday
                        ? <CalendarCheck className="w-4 h-4 flex-shrink-0" />
                        : <Calendar className="w-4 h-4 flex-shrink-0" />
                      }
                      <span className="flex-1 min-w-0 truncate">{label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          )}
        </div>

        {/* Modes section */}
        <div className="mt-4">
          <div className="flex items-center px-2 py-2 border-b border-sidebar-border">
            <div className="flex items-center gap-2">
              <Layers className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-sm font-medium text-sidebar-foreground">Modes</span>
            </div>
          </div>

          <SidebarMenu className="px-1 py-1 gap-0.5">
            <SidebarMenuItem>
              <SidebarMenuButton
                isActive={activeModeId === null}
                onClick={() => onSelectMode(null)}
                className={`gap-2 text-xs ${activeModeId === null ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium" : ""}`}
              >
                <span className="w-2 h-2 rounded-full bg-muted-foreground flex-shrink-0" />
                <span className="flex-1 font-medium">All</span>
                <span className="tabular-nums text-xs text-muted-foreground">{items.length}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>

            {collections.map((col, i) => (
              <SidebarMenuItem key={col.id}>
                <SidebarMenuButton
                  isActive={activeModeId === col.id}
                  onClick={() => onSelectMode(col.id)}
                  className={`gap-2 text-xs ${activeModeId === col.id ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium" : ""}`}
                >
                  <span
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ background: MODE_COLORS[i] ?? "#6366f1" }}
                  />
                  <span className="flex-1">{col.name}</span>
                  <span className="tabular-nums text-xs text-muted-foreground">
                    {countForCollection(col.id)}
                  </span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </div>
      </SidebarContent>
    </Sidebar>
  );
}
