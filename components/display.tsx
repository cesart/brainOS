"use client";

import { Sun, Moon, Monitor } from "lucide-react";

const OPTIONS = [
  { id: "auto",  Icon: Monitor, label: "Auto"  },
  { id: "light", Icon: Sun,     label: "Light" },
  { id: "dark",  Icon: Moon,    label: "Dark"  },
] as const;

interface DisplayProps {
  theme: "auto" | "light" | "dark";
  onSetTheme: (t: "auto" | "light" | "dark") => void;
}

export function Display({ theme, onSetTheme }: DisplayProps) {
  return (
    <div className="flex gap-1">
      {OPTIONS.map(({ id, Icon, label }) => (
        <button
          key={id}
          onClick={() => onSetTheme(id)}
          className={`flex-1 flex flex-col items-center gap-2 p-2 rounded-md text-[10px] transition-colors ${
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
}
