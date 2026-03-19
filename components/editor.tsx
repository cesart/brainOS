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
  const bodyRef = useRef(body);
  const savedRef = useRef(initialBody);
  const dayIdRef = useRef(dayId);

  useEffect(() => {
    bodyRef.current = body;
  }, [body]);

  useEffect(() => {
    setBody(initialBody);
    savedRef.current = initialBody;
    dayIdRef.current = dayId;
  }, [dayId, initialBody]);

  async function save() {
    if (bodyRef.current === savedRef.current) return;
    savedRef.current = bodyRef.current;
    await fetch(`/api/days/${dayIdRef.current}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: bodyRef.current }),
    });
  }

  // Save on blur, page hide, and every 5s while dirty
  useEffect(() => {
    const onVisibilityChange = () => { if (document.visibilityState === "hidden") save(); };
    document.addEventListener("visibilitychange", onVisibilityChange);
    const saveInterval = setInterval(save, 5000);
    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      clearInterval(saveInterval);
    };
  }, []);

  // Poll for remote changes every 5s when not focused
  useEffect(() => {
    const syncInterval = setInterval(async () => {
      if (document.activeElement === textareaRef.current) return;
      const res = await fetch(`/api/days/${dayIdRef.current}`);
      if (!res.ok) return;
      const day = await res.json();
      const remote = day.body ?? "";
      // Only sync from remote if we have no local unsaved changes
      if (remote !== savedRef.current && bodyRef.current === savedRef.current) {
        savedRef.current = remote;
        bodyRef.current = remote;
        setBody(remote);
      }
    }, 5000);
    return () => clearInterval(syncInterval);
  }, []);

  function wrapSelection(prefix: string, suffix = "") {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selected = body.slice(start, end);
    // Toggle off if already wrapped (check surrounding characters)
    const before = body.slice(start - prefix.length, start);
    const after = body.slice(end, end + suffix.length);
    if (before === prefix && after === suffix) {
      const newValue = body.slice(0, start - prefix.length) + selected + body.slice(end + suffix.length);
      setBody(newValue);
      requestAnimationFrame(() => {
        el.selectionStart = start - prefix.length;
        el.selectionEnd = end - prefix.length;
        el.focus();
      });
      return;
    }
    // Toggle off if selection includes the wrappers
    if (selected.startsWith(prefix) && selected.endsWith(suffix) && selected.length > prefix.length + suffix.length) {
      const inner = selected.slice(prefix.length, selected.length - suffix.length);
      const newValue = body.slice(0, start) + inner + body.slice(end);
      setBody(newValue);
      requestAnimationFrame(() => {
        el.selectionStart = start;
        el.selectionEnd = start + inner.length;
        el.focus();
      });
      return;
    }
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
    // Toggle off if line already has this prefix
    if (body.slice(lineStart, lineStart + prefix.length) === prefix) {
      const newValue = body.slice(0, lineStart) + body.slice(lineStart + prefix.length);
      setBody(newValue);
      requestAnimationFrame(() => {
        el.selectionStart = el.selectionEnd = Math.max(lineStart, start - prefix.length);
        el.focus();
      });
      return;
    }
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
          onBlur={save}
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
      <div className="flex flex-row flex-nowrap overflow-x-auto items-center md:flex-col md:overflow-visible md:items-end gap-2 px-2 py-2 md:py-4 flex-shrink-0">
        {tools.map((tool) => (
          <button
            key={tool.label}
            onClick={tool.action}
            title={tool.label}
            className="flex items-center justify-center py-1.5 px-2.5 rounded-md text-muted-foreground border border-border hover:text-foreground hover:bg-accent transition-colors"
          >
            {tool.icon}
          </button>
        ))}
      </div>
    </div>
  );
}
