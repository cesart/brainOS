"use client";

import React, { useRef, useState, useEffect } from "react";
import {
  CheckSquare, Calendar, Heading, Bold, Italic, Strikethrough,
  CodeXml, Link, Quote, List, ListOrdered, Square, SquareCheck, Minus,
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
    // http(s):// URLs
    if (text.startsWith("http://", i) || text.startsWith("https://", i)) {
      const urlMatch = text.slice(i).match(/^https?:\/\/[^\s)>\]"'`]*/);
      if (urlMatch) {
        if (buf) { segments.push(<span key={key++}>{buf}</span>); buf = ""; }
        const url = urlMatch[0];
        segments.push(
          <a key={key++} href={url} className="text-primary underline" target="_blank" rel="noopener noreferrer">
            {url}
          </a>
        );
        i += url.length;
        continue;
      }
    }
    // Bare domain URLs (e.g. google.com, cesart.me) — only at word boundaries
    const FILE_EXTS = new Set(['tsx','jsx','ts','js','mjs','cjs','py','go','rs','rb','java','cpp','c','h','cs','php','swift','kt','css','scss','html','htm','json','yaml','yml','toml','md','mdx','txt','env','sh','bash','log','png','jpg','jpeg','gif','svg','pdf','zip','tar','gz','mp4','mp3']);
    const atWordBoundary = buf.length === 0 || /[\s(["'`]$/.test(buf);
    if (atWordBoundary && /[a-zA-Z]/.test(text[i])) {
      const domainMatch = text.slice(i).match(/^([a-zA-Z][a-zA-Z0-9\-]*\.)+[a-zA-Z]{2,7}(\/[^\s)>\]"'`]*)?/);
      if (domainMatch) {
        const candidate = domainMatch[0];
        const domainPart = candidate.split("/")[0];
        const parts = domainPart.split(".");
        const tld = parts[parts.length - 1].toLowerCase();
        // Validate: all-letter TLD, not a file extension, at least 2 segments
        if (/^[a-zA-Z]{2,7}$/.test(tld) && !FILE_EXTS.has(tld) && parts.length >= 2) {
          if (buf) { segments.push(<span key={key++}>{buf}</span>); buf = ""; }
          const href = `https://${candidate}`;
          segments.push(
            <a key={key++} href={href} className="text-primary underline" target="_blank" rel="noopener noreferrer">
              {candidate}
            </a>
          );
          i += candidate.length;
          continue;
        }
      }
    }
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
            <a key={key++} href={href} className="text-primary underline" target="_blank" rel="noopener noreferrer">
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
// Markdown line renderer — invisible prefix preserves textarea text layout
// (same wrapping = correct click positions); icon overlays it absolutely.
// ---------------------------------------------------------------------------
function MarkdownLine({ line }: { line: string }) {
  if (line.trim() === "") return <p>{"\u00a0"}</p>;
  if (line.trim() === "---") return (
    <p className="relative">
      <span className="invisible select-none">---</span>
      <hr className="absolute inset-x-0 top-1/2 -translate-y-px border-t border-border" />
    </p>
  );

  const h3Match = line.match(/^###\s+(.*)/);
  const h2Match = line.match(/^##\s+(.*)/);
  const h1Match = line.match(/^#\s+(.*)/);
  const bqMatch = line.match(/^>\s?(.*)/);
  const taskUnchecked = line.match(/^\[\]\s(.*)/);
  const taskChecked = line.match(/^\[[xX]\]\s(.*)/);
  const eventMatch = line.match(/^\+\s(.*)/);
  const ulMatch = line.match(/^[-*]\s(.*)/);
  const olMatch = line.match(/^(\d+)\.\s(.*)/);

  // Invisible prefix reserves the same horizontal space as the raw chars,
  // keeping text wrap identical to the underlying textarea.
  function Pfx({ content }: { content: string }) {
    const chars = line.slice(0, line.length - content.length);
    return <span className="invisible select-none">{chars}</span>;
  }

  // Icon pinned to top-left of the line, overlapping the invisible prefix.
  const iconCls = "absolute left-0 top-[4px] w-[14px] h-[14px] text-muted-foreground";

  if (h1Match) return (
    <p className="font-bold text-foreground">
      <Pfx content={h1Match[1]} />{parseInline(h1Match[1])}
    </p>
  );
  if (h2Match) return (
    <p className="font-semibold text-foreground">
      <Pfx content={h2Match[1]} />{parseInline(h2Match[1])}
    </p>
  );
  if (h3Match) return (
    <p className="font-medium text-muted-foreground">
      <Pfx content={h3Match[1]} />{parseInline(h3Match[1])}
    </p>
  );

  if (taskUnchecked) return (
    <p className="relative">
      <Pfx content={taskUnchecked[1]} />
      <Square className={iconCls} />
      {parseInline(taskUnchecked[1])}
    </p>
  );
  if (taskChecked) return (
    <p className="relative opacity-50">
      <Pfx content={taskChecked[1]} />
      <SquareCheck className={iconCls} />
      {parseInline(taskChecked[1])}
    </p>
  );

  if (eventMatch) return (
    <p className="relative">
      <Pfx content={eventMatch[1]} />
      <Calendar className={iconCls} />
      {parseInline(eventMatch[1])}
    </p>
  );

  if (bqMatch) return (
    <p className="relative italic text-muted-foreground">
      <Pfx content={bqMatch[1]} />
      <span className="absolute left-0 inset-y-0 w-0.5 bg-muted-foreground/30 rounded-full" />
      {parseInline(bqMatch[1])}
    </p>
  );

  if (ulMatch) return (
    <p className="relative">
      <Pfx content={ulMatch[1]} />
      <Minus className={iconCls} />
      {parseInline(ulMatch[1])}
    </p>
  );
  if (olMatch) return (
    <p className="relative">
      <Pfx content={olMatch[2]} />
      <span className="absolute left-0 top-0 text-muted-foreground">{olMatch[1]}.</span>
      {parseInline(olMatch[2])}
    </p>
  );

  return <p className="text-foreground">{parseInline(line)}</p>;
}

const MarkdownView = React.forwardRef<HTMLDivElement, { body: string }>(
  function MarkdownView({ body }, ref) {
    const lines = body.split("\n");
    return (
      <div ref={ref} className="flex flex-col px-2 py-2 leading-relaxed text-base text-foreground">
        {lines.map((line, i) => (
          <MarkdownLine key={i} line={line} />
        ))}
      </div>
    );
  }
);

// ---------------------------------------------------------------------------
// Editor component
// ---------------------------------------------------------------------------
export default function Editor({ dayId, initialBody, events, className }: EditorProps) {
  const [body, setBody] = useState(initialBody);
  const [atBottom, setAtBottom] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const markdownRef = useRef<HTMLDivElement>(null);
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

  function insertLine(content: string) {
    const el = textareaRef.current;
    if (!el) return;
    const pos = el.selectionStart;
    const before = body.slice(0, pos);
    const after = body.slice(pos);
    const sep1 = before.length > 0 && !before.endsWith("\n") ? "\n" : "";
    const sep2 = after.length > 0 && !after.startsWith("\n") ? "\n" : "";
    const insertion = sep1 + content + sep2;
    setBody(before + insertion + after);
    requestAnimationFrame(() => {
      el.selectionStart = el.selectionEnd = pos + insertion.length;
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
    { label: "Rule",    icon: <Minus className="w-3 h-3" />,                        action: () => insertLine("---") },
  ];

  return (
    <div className={`flex flex-col md:flex-row flex-1 overflow-hidden border-r border-border${className ? ` ${className}` : ""}`}>
      <div className="flex flex-col flex-1 overflow-hidden">

        {/* Editor area — rendered view always visible, transparent textarea captures input */}
        <div
          className="relative flex-1 overflow-hidden cursor-text"
          onClick={() => textareaRef.current?.focus()}
        >
          {/* Bottom fade */}
          <div className={`absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-background via-background/80 to-transparent pointer-events-none z-10 transition-opacity duration-300 ${atBottom ? "opacity-0" : "opacity-100"}`} />
          {/* Rendered markdown — always visible, scroll driven by textarea */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {body
              ? <MarkdownView ref={markdownRef} body={body} />
              : <p className="p-2 text-muted">Start brain dumping…</p>
            }
          </div>
          {/* Textarea — transparent text, visible caret, captures all input */}
          <textarea
            ref={textareaRef}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onBlur={save}
            onKeyDown={handleKeyDown}
            onClick={() => {
              requestAnimationFrame(() => {
                const el = textareaRef.current;
                if (!el || el.selectionStart !== el.selectionEnd) return;
                const pos = el.selectionStart;
                const lineStart = body.lastIndexOf("\n", pos - 1) + 1;
                const lineEnd = body.indexOf("\n", pos);
                const line = body.slice(lineStart, lineEnd === -1 ? body.length : lineEnd);
                const relPos = pos - lineStart;
                if (line.startsWith("[] ") && relPos <= 2) {
                  setBody(body.slice(0, lineStart) + "[x] " + body.slice(lineStart + 3));
                } else if ((line.startsWith("[x] ") || line.startsWith("[X] ")) && relPos <= 3) {
                  setBody(body.slice(0, lineStart) + "[] " + body.slice(lineStart + 4));
                }
              });
            }}
            onScroll={(e) => {
              const el = e.target as HTMLTextAreaElement;
              if (markdownRef.current) {
                markdownRef.current.style.transform = `translateY(-${el.scrollTop}px)`;
              }
              setAtBottom(el.scrollTop + el.clientHeight >= el.scrollHeight - 4);
            }}
            style={{ color: "transparent", caretColor: "var(--foreground)" }}
            className="absolute inset-0 w-full h-full bg-transparent resize-none outline-none p-2 leading-relaxed"
          />
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
