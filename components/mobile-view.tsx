"use client";

import { useState, useRef } from "react";
import {
  Brain, PanelTop, Calendar, CalendarCheck,
  Layers, NotebookPen, EllipsisVertical, Plus,
  Glasses, Square, SquareCheck,
} from "lucide-react";
import { AirtableDay, AirtableItem, AirtableCollection } from "@/lib/airtable";
import Editor from "@/components/editor";
import { Clock } from "@/components/clock";

const MODE_COLORS: Record<number, string> = {
  0: "#6366f1", 1: "#10b981", 2: "#f59e0b",
  3: "#a855f7", 4: "#ef4444", 5: "#06b6d4",
};

const SHEET_PEEK = 56;
const SHEET_UP   = 360;

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
  currentDay, todayISO, weekDates, activeDate, onSelectDate,
  collections, activeModeId, onSelectMode, items,
  dayEvents, allTasks, onToggleTask,
}: MobileViewProps) {
  const [navOpen, setNavOpen] = useState(false);
  const [sheetUp, setSheetUp] = useState(false);

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
        {/* Brand bar */}
        <div className="flex items-center justify-between px-2 py-4 flex-shrink-0 bg-sidebar">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-[10px] bg-sidebar-accent flex items-center justify-center flex-shrink-0">
              <Brain className="w-4 h-4 text-sidebar-accent-foreground" />
            </div>
            <span className="text-base font-semibold font-mono text-sidebar-foreground">brainOS</span>
          </div>
          <button
            onClick={() => setNavOpen(true)}
            className="text-muted-foreground p-1"
          >
            <PanelTop className="w-4 h-4" />
          </button>
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

      {/* Bottom sheet — in-flow spacer that grows/shrinks */}
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

        {/* Scrollable content — visible when card-up */}
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

      {/* Nav backdrop — tap to close */}
      {navOpen && (
        <div
          className="absolute inset-0 z-10"
          onClick={() => setNavOpen(false)}
        />
      )}

      {/* Nav panel — dropdown from top bar, content height */}
      <div
        className="absolute right-4 bg-background/95 backdrop-blur-xl border border-sidebar-border rounded-2xl overflow-hidden z-20 flex flex-col gap-0 transition-all duration-200 w-64 pt-1 pb-2"
        style={{
          top: "16px",
          opacity: navOpen ? 1 : 0,
          pointerEvents: navOpen ? "auto" : "none",
          transform: navOpen ? "translateY(0)" : "translateY(-6px)",
        }}
      >
        {/* Agenda section */}
        <div className="flex-shrink-0">
          <div className="flex items-center justify-between px-3 py-2.5 border-b border-sidebar-border">
            <div className="flex items-center gap-2">
              <NotebookPen className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-sm font-medium text-sidebar-foreground">Agenda</span>
            </div>
            <button className="text-muted-foreground p-0.5">
              <EllipsisVertical className="w-4 h-4" />
            </button>
          </div>
          <div className="flex flex-col gap-0.5 px-1 py-1">
            {weekDates.map((date) => {
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
        </div>

        {/* Modes section */}
        <div className="flex-shrink-0">
          <div className="flex items-center justify-between px-3 py-2.5 border-b border-sidebar-border">
            <div className="flex items-center gap-2">
              <Layers className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-sm font-medium text-sidebar-foreground">Modes</span>
            </div>
            <button className="text-muted-foreground p-0.5">
              <Plus className="w-4 h-4" />
            </button>
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
      </div>
    </div>
  );
}
