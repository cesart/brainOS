"use client";

import { useState, useCallback } from "react";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AirtableDay, AirtableItem, AirtableCollection } from "@/lib/airtable";
import LeftBar from "@/components/leftbar";
import Editor from "@/components/editor";
import RightBar from "@/components/rightbar";
import MobileView from "@/components/mobile-view";
import { Clock } from "@/components/clock";
import { useIsMobile } from "@/hooks/use-mobile";
import { PanelLeft } from "lucide-react";

interface DailyViewProps {
  initialDay: AirtableDay;
  todayISO: string;
  weekDates: string[];
  weekDays: (AirtableDay | null)[];
  allItems: AirtableItem[];
  collections: AirtableCollection[];
}

export default function DailyView({
  initialDay,
  todayISO,
  weekDates,
  weekDays,
  allItems,
  collections,
}: DailyViewProps) {
  const [activeDate, setActiveDate] = useState(todayISO);
  const [activeModeId, setActiveModeId] = useState<string | null>(null);
  const [currentDay, setCurrentDay] = useState<AirtableDay>(initialDay);
  const [leftBarOpen, setLeftBarOpen] = useState(true);
  const [items, setItems] = useState<AirtableItem[]>(allItems);
  const [dayCache, setDayCache] = useState<Record<string, AirtableDay>>(() => {
    const cache: Record<string, AirtableDay> = {};
    weekDays.forEach((d) => { if (d?.date) cache[d.date] = d; });
    return cache;
  });

  async function switchDay(date: string) {
    setActiveDate(date);
    if (dayCache[date]) {
      setCurrentDay(dayCache[date]);
      return;
    }
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
    setItems((prev) =>
      prev.map((i) => (i.id === itemId ? { ...i, completed } : i))
    );
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

  const isMobile = useIsMobile();

  const activeD = new Date(activeDate + "T00:00:00");
  const isToday = activeDate === todayISO;
  const topBarDate = activeD.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
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
        />
      </div>

      <SidebarInset className="flex flex-col overflow-hidden min-w-0">
        {/* Top bar */}
        <div className="flex items-center justify-between pl-2 pr-6 py-4 border-b border-border flex-shrink-0">
          <div className="flex items-center gap-3">
            {!leftBarOpen && (
              <button
                onClick={() => setLeftBarOpen(true)}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <PanelLeft className="w-4 h-4" />
              </button>
            )}
            <div>
              <p className="text-[10px] font-normal tracking-[0.15em] text-muted-foreground uppercase">
                {isToday ? "Today" : activeD.toLocaleDateString("en-US", { weekday: "long" })}
              </p>
              <h1 className="text-2xl font-bold leading-tight">{topBarDate}</h1>
            </div>
          </div>
          <span className="text-[13px] font-semibold text-muted-foreground tabular-nums font-mono">
            <Clock />
          </span>
        </div>

        {/* Content */}
        <div className="flex flex-1 overflow-hidden">
          <Editor
            dayId={currentDay.id}
            initialBody={currentDay.body ?? ""}
            events={dayEvents}
          />
          <RightBar
            events={dayEvents}
            tasks={allTasks}
            todayISO={todayISO}
            onToggleTask={toggleTask}
          />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
