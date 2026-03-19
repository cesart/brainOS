"use client";

import { useRef, useState, useEffect } from "react";
import {
  CheckSquare, Calendar, Heading, Bold, Italic, Strikethrough,
  CodeXml, Link, Quote, List, ListOrdered, Square, SquareCheck,
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

// ---------------------------------------------------------------------------
// Inline markdown parser
// ---------------------------------------------------------------------------
function parseInline(text: string): React.ReactNode {
  const segments: React.ReactNode[] = [];
  let i = 0;
  let key = 0;
  let buf = "";

  while (i < text.length) {
    // **bold**
    if (text.startsWith("**", i)) {
      const end = text.indexOf("**", i + 2);
      if (end !== -1) {
        if (buf) { segments.push(<span key={key++}>{buf}</span>); buf = ""; }
        segments.push(<strong key={key++} className="font-semibold">{text.slice(i + 2, end)}</strong>);
        i = end + 2;
        continue;
      }
    }
    // ~~strike~~
    if (text.startsWith("~~", i)) {
      const end = text.indexOf("~~", i + 2);
      if (end !== -1) {
        if (buf) { segments.push(<span key={key++}>{buf}</span>); buf = ""; }
        segments.push(<s key={key++} className="line-through text-muted-foreground">{text.slice(i + 2, end)}</s>);
        i = end + 2;
        continue;
      }
    }
    // `code`
    if (text[i] === "`") {
      const end = text.indexOf("`", i + 1);
      if (end !== -1) {
        if (buf) { segments.push(<span key={key++}>{buf}</span>); buf = ""; }
        segments.push(<code key={key++} className="font-mono text-[0.85em] bg-sidebar-accent px-1 rounded">{text.slice(i + 1, end)}</code>);
        i = end + 1;
        continue;
      }
    }
    // _italic_
    if (text[i] === "_") {
      const end = text.indexOf("_", i + 1);
      if (end !== -1 && end > i + 1) {
        if (buf) { segments.push(<span key={key++}>{buf}</span>); buf = ""; }
        segments.push(<em key={key++} className="italic">{text.slice(i + 1, end)}</em>);
        i = end + 1;
        continue;
      }
    }
    // [text](url)
    if (text[i] === "[") {
      const closeBracket = text.indexOf("]", i + 1);
      if (closeBracket !== -1 && text[closeBracket + 1] === "(") {
        const closeParen = text.indexOf(")", closeBracket + 2);
        if (closeParen !== -1) {
          const linkText = text.slice(i + 1, closeBracket);
          const href = text.slice(closeBracket + 2, closeParen);
          if (buf) { segments.push(<span key={key++}>{buf}</span>); buf = ""; }
          segments.push(
            <a key={key++} href={href} className="text-blue-400 underline" target="_blank" rel="noopener noreferrer">
              {linkText}
            </a>
          );
          i = closeParen + 1;
          continue;
        }
      }
    }
    buf += text[i];
    i++;
  }

  if (buf) segments.push(<span key={key++}>{buf}</span>);
  if (segments.length === 0) return null;
  if (segments.length === 1) return segments[0];
  return <>{segments}</>;
}

// ---------------------------------------------------------------------------
// Markdown line renderer
// ---------------------------------------------------------------------------
function MarkdownLine({ line }: { line: string }) {
  const h1Match = line.match(/^#\s+(.*)/);
  const h2Match = line.match(/^##\s+(.*)/);
  const h3Match = line.match(/^###\s+(.*)/);
  const bqMatch = line.match(/^>\s?(.*)/);
  const taskUnchecked = line.match(/^\[\]\s(.*)/);
  const taskChecked = line.match(/^\[[xX]\]\s(.*)/);
  const eventMatch = line.match(/^\+\s(.*)/);
  const ulMatch = line.match(/^[-*]\s(.*)/);
  const olMatch = line.match(/^(\d+)\.\s(.*)/);

  // Headings (most-specific first to avoid false matches on ##)
  if (h3Match) return <h3 className="text-base font-semibold text-foreground leading-tight">{parseInline(h3Match[1])}</h3>;
  if (h2Match) return <h2 className="text-xl font-bold text-foreground leading-tight">{parseInline(h2Match[1])}</h2>;
  if (h1Match) return <h1 className="text-2xl font-bold text-foreground leading-tight">{parseInline(h1Match[1])}</h1>;

  if (bqMatch) return (
    <div className="border-l-2 border-sidebar-border pl-3 text-muted-foreground italic leading-relaxed">
      {parseInline(bqMatch[1])}
    </div>
  );

  if (taskUnchecked) return (
    <div className="flex items-start gap-2 leading-relaxed">
      <Square className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-muted-foreground" />
      <span className="text-foreground">{parseInline(taskUnchecked[1])}</span>
    </div>
  );

  if (taskChecked) return (
    <div className="flex items-start gap-2 leading-relaxed">
      <SquareCheck className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-muted-foreground" />
      <span className="text-muted-foreground line-through">{parseInline(taskChecked[1])}</span>
    </div>
  );

  if (eventMatch) return (
    <div className="flex items-start gap-2 leading-relaxed">
      <Calendar className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-muted-foreground" />
      <span className="text-foreground">{parseInline(eventMatch[1])}</span>
    </div>
  );

  if (ulMatch) return (
    <div className="flex items-start gap-2 leading-relaxed pl-1">
      <span className="w-1 h-1 rounded-full bg-muted-foreground mt-[9px] flex-shrink-0" />
      <span className="text-foreground">{parseInline(ulMatch[1])}</span>
    </div>
  );

  if (olMatch) return (
    <div className="flex items-start gap-2 leading-relaxed pl-1">
      <span className="text-muted-foreground text-[0.8em] min-w-[1.2em] text-right mt-0.5 flex-shrink-0">{olMatch[1]}.</span>
      <span className="text-foreground">{parseInline(olMatch[2])}</span>
    </div>
  );

  if (line.trim() === "") return <div className="h-3" />;

  return <p className="text-foreground leading-relaxed">{parseInline(line)}</p>;
}

function MarkdownView({ body }: { body: string }) {
  const lines = body.split("\n");
  return (
    <div className="flex flex-col px-2 py-2">
      {lines.map((line, i) => (
        <MarkdownLine key={i} line={line} />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Editor component
// ---------------------------------------------------------------------------
export default function Editor({ dayId, initialBody, events, className }: EditorProps) {
  const [body, setBody] = useState(initialBody);
  const [focused, setFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const bodyRef = useRef(body);
  const savedRef = useRef(initialBody);
  const dayIdRef = useRef(dayId);
  const blurTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    bodyRef.current = body;
  }, [body]);

  useEffect(() => {
    setBody(initialBody);
    savedRef.current = initialBody;
    dayIdRef.current = dayId;
    setFocused(false);
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

  function handleFocus() {
    if (blurTimeoutRef.current) {
      clearTimeout(blurTimeoutRef.current);
      blurTimeoutRef.current = null;
    }
    setFocused(true);
  }

  function handleBlur() {
    save();
    blurTimeoutRef.current = setTimeout(() => {
      setFocused(false);
      blurTimeoutRef.current = null;
    }, 150);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key !== "Enter") return;

    const el = textareaRef.current;
    if (!el) return;

    const cursorPos = el.selectionStart;
    const lineStart = body.lastIndexOf("\n", cursorPos - 1) + 1;
    // Full current line (for detecting prefix)
    const lineEnd = body.indexOf("\n", cursorPos);
    const fullLine = body.slice(lineStart, lineEnd === -1 ? body.length : lineEnd);

    const taskMatch = fullLine.match(/^\[[xX ]?\]\s/);
    const ulMatch = fullLine.match(/^[-*] /);
    const olMatch = fullLine.match(/^(\d+)\. /);
    const eventMatch = fullLine.match(/^\+ /);

    let prefix = "";
    let prefixLen = 0;

    if (taskMatch) {
      prefix = "[] ";
      prefixLen = taskMatch[0].length;
    } else if (ulMatch) {
      prefix = ulMatch[0];
      prefixLen = prefix.length;
    } else if (eventMatch) {
      prefix = "+ ";
      prefixLen = 2;
    } else if (olMatch) {
      prefix = `${parseInt(olMatch[1]) + 1}. `;
      prefixLen = olMatch[0].length;
    }

    if (!prefix) return; // let normal Enter handle it

    // If line content after prefix is empty → exit list
    const lineContent = fullLine.slice(prefixLen).trim();
    if (lineContent === "") {
      e.preventDefault();
      const newVal = body.slice(0, lineStart) + body.slice(lineStart + prefixLen);
      setBody(newVal);
      requestAnimationFrame(() => {
        el.selectionStart = el.selectionEnd = lineStart;
        el.focus();
      });
      return;
    }

    // Insert newline + prefix at cursor
    e.preventDefault();
    const newVal = body.slice(0, cursorPos) + "\n" + prefix + body.slice(cursorPos);
    setBody(newVal);
    requestAnimationFrame(() => {
      el.selectionStart = el.selectionEnd = cursorPos + 1 + prefix.length;
      el.focus();
    });
  }

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

        {/* Editor area — textarea (always mounted) overlaid with rendered view */}
        <div className="relative flex-1 overflow-hidden">
          <textarea
            ref={textareaRef}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onFocus={handleFocus}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            placeholder="Just start typing today…"
            style={{
              opacity: focused ? 1 : 0,
              pointerEvents: focused ? "auto" : "none",
            }}
            className="absolute inset-0 w-full h-full bg-transparent resize-none outline-none p-2 leading-relaxed text-foreground placeholder:text-muted"
          />
          {!focused && (
            <div
              className="absolute inset-0 overflow-auto cursor-text"
              onClick={() => {
                setFocused(true);
                requestAnimationFrame(() => textareaRef.current?.focus());
              }}
            >
              {body ? (
                <MarkdownView body={body} />
              ) : (
                <p className="p-2 text-muted">Just start typing today…</p>
              )}
            </div>
          )}
        </div>

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
