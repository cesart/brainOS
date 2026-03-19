"use client";

import { useState, useRef, useEffect } from "react";
import {
  Brain, PanelLeft, NotebookPen, EllipsisVertical,
  Calendar, CalendarCheck, Layers, Maximize2,
  ChevronLeft, ChevronRight,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar";
import { AirtableItem, AirtableCollection } from "@/lib/airtable";
import MonthCalendar from "@/components/month-calendar";

const MODE_COLORS: Record<number, string> = {
  0: "#6366f1", 1: "#10b981", 2: "#f59e0b",
  3: "#a855f7", 4: "#ef4444", 5: "#06b6d4",
};

const MONTHS_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

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
}

function getWeekDayLabel(date: string): string {
  return new Date(date + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "short", month: "short", day: "numeric",
  });
}

export default function LeftBar({
  todayISO, weekDates, activeDate, onSelectDate,
  collections, activeModeId, onSelectMode, items,
  onHide, wideMode, onToggleWide,
}: LeftBarProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const [agendaView, setAgendaView] = useState<"month" | "week">("month");
  const [showWeekends, setShowWeekends] = useState(true);
  const [agendaMenuOpen, setAgendaMenuOpen] = useState(false);
  const agendaMenuRef = useRef<HTMLDivElement>(null);

  const [calMonth, setCalMonth] = useState(() => {
    const d = new Date(activeDate + "T00:00:00");
    return { year: d.getFullYear(), month: d.getMonth() };
  });

  // Sync calendar month when active date changes
  useEffect(() => {
    const d = new Date(activeDate + "T00:00:00");
    setCalMonth({ year: d.getFullYear(), month: d.getMonth() });
  }, [activeDate]);

  // Close panel menu on outside click
  useEffect(() => {
    if (!menuOpen) return;
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [menuOpen]);

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

  // "·" when on current month, "Mar '26" when navigated away
  const todayDate = new Date(todayISO + "T00:00:00");
  const isCurrentMonth = calMonth.year === todayDate.getFullYear() && calMonth.month === todayDate.getMonth();
  const calNavLabel = isCurrentMonth
    ? "·"
    : `${MONTHS_SHORT[calMonth.month]} '${String(calMonth.year).slice(2)}`;

  function countForCollection(id: string) {
    return items.filter((i) => i.collectionIds?.includes(id)).length;
  }

  return (
    <Sidebar collapsible="none" className="rounded-2xl h-full w-64 flex-shrink-0 p-2">
      {/* Header */}
      <SidebarHeader className="flex flex-row items-center justify-between px-2 py-2">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-sidebar-accent flex items-center justify-center flex-shrink-0">
            <Brain className="w-4 h-4 text-sidebar-accent-foreground" />
          </div>
          <span className="text-base font-semibold font-mono text-sidebar-foreground">brainOS</span>
        </div>
        {/* Panel icon → dropdown */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen((o) => !o)}
            className="text-muted-foreground hover:text-sidebar-foreground transition-colors p-1 rounded"
          >
            <PanelLeft className="w-4 h-4" />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-full mt-1 w-48 bg-background/95 backdrop-blur-xl border border-sidebar-border rounded-2xl shadow-lg z-50 py-1 overflow-hidden">
              <button
                onClick={() => { onHide?.(); setMenuOpen(false); }}
                className="flex items-center gap-2.5 w-full px-3 py-2 text-xs text-foreground hover:bg-sidebar-accent transition-colors"
              >
                <PanelLeft className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                Hide sidebar
              </button>
              <div className="h-px bg-sidebar-border mx-2" />
              <button
                onClick={() => { onToggleWide(); }}
                className="flex items-center gap-2.5 w-full px-3 py-2 text-xs text-foreground hover:bg-sidebar-accent transition-colors"
              >
                <Maximize2 className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                <span className="flex-1 text-left">Full width</span>
                <div className={`relative w-7 h-4 rounded-full transition-colors flex-shrink-0 ${wideMode ? "bg-foreground" : "bg-sidebar-border"}`}>
                  <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-background transition-all ${wideMode ? "left-[14px]" : "left-0.5"}`} />
                </div>
              </button>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="gap-0">
        {/* Agenda section */}
        <div>
          <div className="flex items-center justify-between px-2 py-2 border-b border-sidebar-border">
            <div className="flex items-center gap-2">
              <NotebookPen className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-sm font-medium text-sidebar-foreground">Agenda</span>
            </div>
            <div className="flex items-center gap-0.5">
              {/* Month nav — only in month view */}
              {agendaView === "month" && (
                <>
                  <button
                    onClick={prevMonth}
                    className="p-1 text-muted-foreground hover:text-foreground transition-colors"
                    title="Previous month"
                  >
                    <ChevronLeft className="w-3 h-3" />
                  </button>
                  <button
                    onClick={goToToday}
                    className="text-[10px] font-mono text-muted-foreground hover:text-foreground transition-colors min-w-[2.5rem] text-center leading-none py-1"
                    title="Go to today"
                  >
                    {calNavLabel}
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
              {/* Agenda options dropdown */}
              <div className="relative" ref={agendaMenuRef}>
                <button
                  onClick={() => setAgendaMenuOpen((o) => !o)}
                  className="text-muted-foreground hover:text-sidebar-foreground transition-colors p-1"
                >
                  <EllipsisVertical className="w-4 h-4" />
                </button>
                {agendaMenuOpen && (
                  <div className="absolute right-0 top-full mt-1 w-44 bg-background/95 backdrop-blur-xl border border-sidebar-border rounded-2xl shadow-lg z-50 py-1 overflow-hidden">
                    {/* View toggle */}
                    <div className="flex gap-1 px-2 py-1.5">
                      <button
                        onClick={() => setAgendaView("month")}
                        className={`flex-1 text-xs py-1 rounded-md transition-colors ${agendaView === "month" ? "bg-sidebar-accent text-foreground font-medium" : "text-muted-foreground hover:text-foreground"}`}
                      >
                        Month
                      </button>
                      <button
                        onClick={() => setAgendaView("week")}
                        className={`flex-1 text-xs py-1 rounded-md transition-colors ${agendaView === "week" ? "bg-sidebar-accent text-foreground font-medium" : "text-muted-foreground hover:text-foreground"}`}
                      >
                        Week
                      </button>
                    </div>
                    <div className="h-px bg-sidebar-border mx-2" />
                    {/* Weekends toggle */}
                    <button
                      onClick={() => setShowWeekends((w) => !w)}
                      className="flex items-center gap-2.5 w-full px-3 py-2 text-xs text-foreground hover:bg-sidebar-accent transition-colors"
                    >
                      <span className="flex-1 text-left">Weekends</span>
                      <div className={`relative w-7 h-4 rounded-full transition-colors flex-shrink-0 ${showWeekends ? "bg-foreground" : "bg-sidebar-border"}`}>
                        <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-background transition-all ${showWeekends ? "left-[14px]" : "left-0.5"}`} />
                      </div>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {agendaView === "month" ? (
            <MonthCalendar
              year={calMonth.year}
              month={calMonth.month}
              activeDate={activeDate}
              todayISO={todayISO}
              showWeekends={showWeekends}
              onSelectDate={onSelectDate}
            />
          ) : (
            <SidebarMenu className="px-1 py-1 gap-0.5">
              {weekDates.map((date) => {
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
                      {isToday && (
                        <span className="text-[9px] text-muted-foreground bg-sidebar-border rounded px-1 flex-shrink-0">Today</span>
                      )}
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
                <span className="w-2 h-2 rounded-full bg-accent-foreground flex-shrink-0" />
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
