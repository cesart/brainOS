"use client";

import { Calendar, ClipboardList, Layers, Square, SquareCheck } from "lucide-react";
import { AirtableItem } from "@/lib/airtable";

interface RightBarProps {
  events: AirtableItem[];
  tasks: AirtableItem[];
  todayISO: string;
  activeDate: string;
  onToggleTask: (id: string, completed: boolean) => void;
  activeModeColor?: string;
  activeModeName?: string;
  peekaboo?: boolean;
}

function daysDiff(dueDate: string, todayISO: string): number {
  const due = new Date(dueDate + "T00:00:00");
  const today = new Date(todayISO + "T00:00:00");
  return Math.round((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function TaskRow({
  item,
  todayISO,
  onToggle,
}: {
  item: AirtableItem;
  todayISO: string;
  onToggle: (id: string, completed: boolean) => void;
}) {
  const dueLabel = (() => {
    if (!item.dueDate) return null;
    const diff = daysDiff(item.dueDate, todayISO);
    if (diff < 0) {
      const n = Math.abs(diff);
      return { text: n === 1 ? "Due yesterday" : `Due ${n} days ago`, color: "#ff6669" };
    }
    if (diff === 0) return { text: "Due today", color: "var(--muted-foreground)" };
    return null;
  })();

  return (
    <div
      className="flex items-start gap-2.5 px-1.5 py-2 rounded-md cursor-pointer hover:bg-accent/30 transition-colors"
      style={item.completed ? { opacity: 0.75 } : {}}
      onClick={() => onToggle(item.id, !item.completed)}
    >
      {item.completed
        ? <SquareCheck className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
        : <Square className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
      }
      <div className="flex flex-col min-w-0 gap-0.5">
        <span className={`text-sm leading-snug ${item.completed ? "text-muted-foreground" : "text-foreground"}`}>
          {item.name}
        </span>
        {dueLabel && (
          <span className="text-[11px]" style={{ color: dueLabel.color }}>
            {dueLabel.text}
          </span>
        )}
      </div>
    </div>
  );
}

export default function RightBar({ events, tasks, todayISO, activeDate, onToggleTask, activeModeColor, activeModeName, peekaboo }: RightBarProps) {
  const pastDue   = tasks.filter((t) => !t.completed && t.dueDate && daysDiff(t.dueDate, todayISO) < 0);
  const dueToday  = tasks.filter((t) => !t.completed && t.dueDate && daysDiff(t.dueDate, todayISO) === 0);
  const upcoming  = tasks.filter((t) => !t.completed && t.dueDate && daysDiff(t.dueDate, todayISO) > 0);
  const noDate    = tasks.filter((t) => !t.completed && !t.dueDate);
  const completed = tasks.filter((t) => t.completed && t.completedDate === activeDate);
  const visibleTaskCount = pastDue.length + dueToday.length + upcoming.length + noDate.length + completed.length;

  return (
    <div className="flex flex-col w-80 flex-shrink-0 overflow-y-auto py-0 pl-3 pr-0 border-l border-sidebar-border">
      {/* Overview header */}
      <div className="flex-shrink-0">
        <div className="flex items-center gap-2 pl-3 pr-0 py-3">
          <ClipboardList className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">Overview</span>
        </div>
        <div className={`h-px bg-sidebar-border ${peekaboo ? "mr-1" : ""}`} />
      </div>

      <div className="flex flex-col gap-4 px-2 py-3">
        {/* Events */}
        {events.length > 0 && (
          <section>
            <div className="flex items-center gap-1.5 px-1.5 pb-2">
              <p className="text-[10px] font-normal tracking-[1.5px] text-muted-foreground uppercase">Events</p>
            </div>
            <div className="flex flex-col gap-0.5">
              {events.map((event) => (
                <div key={event.id} className="flex items-center gap-2.5 px-1.5 py-2 rounded-md hover:bg-accent/30 transition-colors">
                  <Calendar className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <span className="text-sm text-foreground flex-1 min-w-0 truncate">{event.name}</span>
                  {event.dueDate && (
                    <span className="text-sm text-muted-foreground tabular-nums flex-shrink-0">
                      {new Date(event.dueDate + "T00:00:00").toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Tasks */}
        {visibleTaskCount > 0 && (
          <section>
            <div className="flex items-center gap-1.5 px-1.5 pb-2">
              <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground" style={activeModeColor ? { background: activeModeColor } : {}} />
              <p className="text-[10px] font-normal tracking-[1.5px] text-muted-foreground uppercase">Tasks</p>
            </div>
            <div className="flex flex-col gap-0.5">
              {pastDue.map((t)   => <TaskRow key={t.id} item={t} todayISO={todayISO} onToggle={onToggleTask} />)}
              {dueToday.map((t)  => <TaskRow key={t.id} item={t} todayISO={todayISO} onToggle={onToggleTask} />)}
              {upcoming.map((t)  => <TaskRow key={t.id} item={t} todayISO={todayISO} onToggle={onToggleTask} />)}
              {noDate.map((t)    => <TaskRow key={t.id} item={t} todayISO={todayISO} onToggle={onToggleTask} />)}
              {completed.map((t) => <TaskRow key={t.id} item={t} todayISO={todayISO} onToggle={onToggleTask} />)}
            </div>
          </section>
        )}

        {events.length === 0 && visibleTaskCount === 0 && (
          <div className="flex flex-col items-center gap-3 py-8">
            <Layers className="w-14 h-14 text-muted" />
            {activeModeName
              ? <div className="flex items-center gap-1.5 text-sm text-muted font-medium">
                  <span>No events or tasks for</span>
                  <span className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={activeModeColor ? { background: activeModeColor } : {}} />
                    <span>{activeModeName}&hellip;</span>
                  </span>
                </div>
              : <p className="text-sm text-muted text-center">No events or tasks&hellip;</p>
            }
          </div>
        )}
      </div>
    </div>
  );
}
