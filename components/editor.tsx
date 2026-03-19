"use client";

import { useRef, useState, useEffect } from "react";
import {
  CheckSquare, Calendar, Heading, Bold, Italic, Strikethrough,
  CodeXml, Link, Quote, List, ListOrdered,
} from "lucide-react";
import { AirtableItem } from "@/lib/airtable";

interface EditorProps {
  dayId: string;
  initialBody: string;
  events: AirtableItem[];
  className?: string;
}

interface ToolDef {
  label: string;
  icon: React.ReactNode;
  action: () => void;
}

export default function Editor({ dayId, initialBody, events, className }: EditorProps) {
  const [body, setBody] = useState(initialBody);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setBody(initialBody);
  }, [dayId, initialBody]);

  async function handleBlur() {
    await fetch(`/api/days/${dayId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body }),
    });
  }

  function wrapSelection(prefix: string, suffix = "") {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selected = body.slice(start, end);
    const newValue = body.slice(0, start) + prefix + selected + suffix + body.slice(end);
    setBody(newValue);
    requestAnimationFrame(() => {
      el.selectionStart = start + prefix.length;
      el.selectionEnd = start + prefix.length + selected.length;
      el.focus();
    });
  }

  function insertLinePrefix(prefix: string) {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const lineStart = body.lastIndexOf("\n", start - 1) + 1;
    const newValue = body.slice(0, lineStart) + prefix + body.slice(lineStart);
    setBody(newValue);
    requestAnimationFrame(() => {
      el.selectionStart = el.selectionEnd = start + prefix.length;
      el.focus();
    });
  }

  const tools: ToolDef[] = [
    { label: "Task",    icon: <CheckSquare className="w-3 h-3" />, action: () => insertLinePrefix("[] ") },
    { label: "Event",   icon: <Calendar className="w-3 h-3" />,    action: () => insertLinePrefix("+ ") },
    { label: "Section", icon: <Heading className="w-3 h-3" />,     action: () => insertLinePrefix("## ") },
    { label: "Bold",    icon: <Bold className="w-3 h-3" />,                         action: () => wrapSelection("**", "**") },
    { label: "Italic",  icon: <Italic className="w-3 h-3" />,                       action: () => wrapSelection("_", "_") },
    { label: "Strike",  icon: <Strikethrough className="w-3 h-3" />,                action: () => wrapSelection("~~", "~~") },
    { label: "Code",    icon: <CodeXml className="w-3 h-3" />,                      action: () => wrapSelection("`", "`") },
    { label: "Link",    icon: <Link className="w-3 h-3" />,                         action: () => wrapSelection("[", "](url)") },
    { label: "Quote",   icon: <Quote className="w-3 h-3" />,                        action: () => insertLinePrefix("> ") },
    { label: "List",    icon: <List className="w-3 h-3" />,                         action: () => insertLinePrefix("- ") },
    { label: "Ordered", icon: <ListOrdered className="w-3 h-3" />,                  action: () => insertLinePrefix("1. ") },
  ];

  return (
    <div className={`flex flex-col md:flex-row flex-1 overflow-hidden border-r border-border${className ? ` ${className}` : ""}`}>
      <div className="flex flex-col flex-1 overflow-hidden">
        <textarea
          ref={textareaRef}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onBlur={handleBlur}
          placeholder="Just start typing today…"
          className="flex-1 bg-transparent resize-none outline-none p-2 leading-relaxed text-foreground placeholder:text-muted"
        />

        {/* Upcoming events — large muted ghost text, thin separator */}
        {events.length > 0 && (
          <div className="flex-shrink-0 px-6 pb-6">
            <p className="text-[10px] tracking-[1.5px] text-muted mb-2 uppercase">
              Upcoming Events
            </p>
            <div className="h-px bg-sidebar-border mb-4" />
            <div className="flex flex-col">
              {events.map((event) => (
                <div key={event.id} className="flex items-baseline justify-between py-1.5 px-3">
                  <span className="text-xl font-semibold text-muted">{event.name}</span>
                  {event.dueDate && (
                    <span className="text-base text-muted">
                      {new Date(event.dueDate + "T00:00:00").toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Toolbar — horizontal on mobile (bottom), vertical on desktop (right) */}
      <div className="flex flex-wrap md:flex-col md:flex-nowrap items-center gap-1.5 px-1.5 py-3 border-t border-border md:border-t-0 md:border-l flex-shrink-0 md:justify-start md:items-center">
        {tools.map((tool) => (
          <button
            key={tool.label}
            onClick={tool.action}
            title={tool.label}
            className="flex items-center justify-center p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            {tool.icon}
          </button>
        ))}
      </div>
    </div>
  );
}
