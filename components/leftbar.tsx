"use client";

import {
  Brain, PanelLeft, NotebookPen, EllipsisVertical,
  Calendar, CalendarCheck, Layers, Plus,
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

// Exact colors from the Pencil design
const MODE_COLORS: Record<number, string> = {
  0: "#6366f1",
  1: "#10b981",
  2: "#f59e0b",
  3: "#a855f7",
  4: "#ef4444",
  5: "#06b6d4",
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
}

function getDayLabel(date: string, todayISO: string): string {
  const d = new Date(todayISO + "T00:00:00");
  d.setDate(d.getDate() - 1);
  const yesterdayISO = d.toISOString().slice(0, 10);
  if (date === todayISO) return "Today";
  if (date === yesterdayISO) return "Yesterday";
  return new Date(date + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export default function LeftBar({
  todayISO,
  weekDates,
  activeDate,
  onSelectDate,
  collections,
  activeModeId,
  onSelectMode,
  items,
  onHide,
}: LeftBarProps) {
  function countForCollection(id: string) {
    return items.filter((i) => i.collectionIds?.includes(id)).length;
  }

  return (
    <Sidebar collapsible="none" className="rounded-2xl h-full w-64 flex-shrink-0 p-2">
      {/* Header: brainOS logo + collapse */}
      <SidebarHeader className="flex flex-row items-center justify-between px-2 py-2">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-sidebar-accent flex items-center justify-center flex-shrink-0">
            <Brain className="w-4 h-4 text-sidebar-accent-foreground" />
          </div>
          <span className="text-base font-semibold font-mono text-sidebar-foreground">brainOS</span>
        </div>
        <button
          onClick={onHide}
          className="text-muted-foreground hover:text-sidebar-foreground transition-colors"
        >
          <PanelLeft className="w-4 h-4" />
        </button>
      </SidebarHeader>

      <SidebarContent className="gap-0">
        {/* Agenda section */}
        <div>
          <div className="flex items-center justify-between px-2 py-2 border-b border-sidebar-border">
            <div className="flex items-center gap-2">
              <NotebookPen className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-sm font-medium text-sidebar-foreground">Agenda</span>
            </div>
            <button className="text-muted-foreground hover:text-sidebar-foreground transition-colors">
              <EllipsisVertical className="w-4 h-4" />
            </button>
          </div>

          <SidebarMenu className="px-1 py-1 gap-0.5">
            {weekDates.map((date) => {
              const isActive = date === activeDate;
              const isToday = date === todayISO;
              const label = getDayLabel(date, todayISO);
              return (
                <SidebarMenuItem key={date}>
                  <SidebarMenuButton
                    isActive={isActive}
                    onClick={() => onSelectDate(date)}
                    className="gap-2 text-xs"
                  >
                    {isToday
                      ? <CalendarCheck className="w-4 h-4 flex-shrink-0" />
                      : <Calendar className="w-4 h-4 flex-shrink-0" />
                    }
                    {label}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </div>

        {/* Modes section */}
        <div className="mt-4">
          <div className="flex items-center justify-between px-2 py-2 border-b border-sidebar-border">
            <div className="flex items-center gap-2">
              <Layers className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-sm font-medium text-sidebar-foreground">Modes</span>
            </div>
            <button className="text-muted-foreground hover:text-sidebar-foreground transition-colors">
              <Plus className="w-4 h-4" />
            </button>
          </div>

          <SidebarMenu className="px-1 py-1 gap-0.5">
            {/* All */}
            <SidebarMenuItem>
              <SidebarMenuButton
                isActive={activeModeId === null}
                onClick={() => onSelectMode(null)}
                className="gap-2 text-xs"
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
                  className="gap-2 text-xs"
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
