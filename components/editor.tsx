"use client";

import React, { useRef, useState, useEffect } from "react";
import { Square, SquareCheck, Minus } from "lucide-react";
import { AirtableItem } from "@/lib/airtable";

interface EditorProps {
  dayId: string;
  initialBody: string;
  events: AirtableItem[];
  className?: string;
}

// ── Inline markdown parser ──────────────────────────────────────────────────
function parseInline(text: string): React.ReactNode {
  const out: React.ReactNode[] = [];
  let i = 0, k = 0, buf = "";

  const flush = () => { if (buf) { out.push(<span key={k++}>{buf}</span>); buf = ""; } };

  while (i < text.length) {
    if (text.startsWith("https://", i) || text.startsWith("http://", i)) {
      const m = text.slice(i).match(/^https?:\/\/[^\s)>\]"'`]*/);
      if (m) {
        flush();
        out.push(<a key={k++} href={m[0]} className="text-primary underline underline-offset-2" target="_blank" rel="noopener noreferrer">{m[0]}</a>);
        i += m[0].length; continue;
      }
    }
    if (text.startsWith("**", i)) {
      const e = text.indexOf("**", i + 2);
      if (e !== -1) { flush(); out.push(<strong key={k++} className="font-semibold">{text.slice(i + 2, e)}</strong>); i = e + 2; continue; }
    }
    if (text.startsWith("~~", i)) {
      const e = text.indexOf("~~", i + 2);
      if (e !== -1) { flush(); out.push(<s key={k++} className="text-muted-foreground">{text.slice(i + 2, e)}</s>); i = e + 2; continue; }
    }
    if (text[i] === "`") {
      const e = text.indexOf("`", i + 1);
      if (e !== -1) { flush(); out.push(<code key={k++} className="font-mono text-[0.82em] bg-sidebar-accent px-1 py-px rounded">{text.slice(i + 1, e)}</code>); i = e + 1; continue; }
    }
    if (text[i] === "_") {
      const e = text.indexOf("_", i + 1);
      if (e !== -1 && e > i + 1) { flush(); out.push(<em key={k++}>{text.slice(i + 1, e)}</em>); i = e + 1; continue; }
    }
    if (text[i] === "[" && text[i + 1] !== "]" && text[i + 1] !== "x" && text[i + 1] !== "X") {
      const cb = text.indexOf("]", i + 1);
      if (cb !== -1 && text[cb + 1] === "(") {
        const cp = text.indexOf(")", cb + 2);
        if (cp !== -1) {
          flush();
          out.push(<a key={k++} href={text.slice(cb + 2, cp)} className="text-primary underline underline-offset-2" target="_blank" rel="noopener noreferrer">{text.slice(i + 1, cb)}</a>);
          i = cp + 1; continue;
        }
      }
    }
    buf += text[i++];
  }
  flush();
  return out.length === 0 ? null : out.length === 1 ? out[0] : <>{out}</>;
}

// ── Per-line renderer ───────────────────────────────────────────────────────
function Line({ line }: { line: string }) {
  if (!line.trim()) return <p>{"\u00a0"}</p>;
  if (line.trim() === "---") return (
    <p className="relative"><span className="invisible select-none">---</span>
      <span className="absolute inset-x-0 top-1/2 -translate-y-px border-t border-border/60 pointer-events-none" />
    </p>
  );

  const h1 = line.match(/^#\s+(.*)/);
  const h2 = line.match(/^##\s+(.*)/);
  const h3 = line.match(/^###\s+(.*)/);
  const bq = line.match(/^>\s?(.*)/);
  const task0 = line.match(/^\[\]\s(.*)/);
  const taskX = line.match(/^\[[xX]\]\s(.*)/);
  const ul = line.match(/^[-*]\s(.*)/);
  const ol = line.match(/^(\d+)\.\s(.*)/);

  // Invisible prefix preserves textarea alignment
  function Pfx({ content }: { content: string }) {
    return <span className="invisible select-none">{line.slice(0, line.length - content.length)}</span>;
  }

  const ico = "absolute left-0 top-[5px] w-[13px] h-[13px] text-muted-foreground";

  if (h1) return (
    <p className="relative font-bold border-b border-border/40 pb-px">
      <Pfx content={h1[1]} />{parseInline(h1[1])}
    </p>
  );
  if (h2) return (
    <p className="relative font-semibold text-foreground/90">
      <span className="absolute left-0 top-[3px] bottom-[3px] w-0.5 bg-primary/60 rounded-full" />
      <Pfx content={h2[1]} />{parseInline(h2[1])}
    </p>
  );
  if (h3) return (
    <p className="font-medium text-muted-foreground">
      <Pfx content={h3[1]} />{parseInline(h3[1])}
    </p>
  );
  if (task0) return (
    <p className="relative"><Pfx content={task0[1]} />
      <Square className={ico} />{parseInline(task0[1])}
    </p>
  );
  if (taskX) return (
    <p className="relative opacity-40 line-through"><Pfx content={taskX[1]} />
      <SquareCheck className={ico} />{parseInline(taskX[1])}
    </p>
  );
  if (bq) return (
    <p className="relative italic text-muted-foreground">
      <span className="absolute left-0 inset-y-0 w-0.5 bg-muted-foreground/25 rounded-full" />
      <Pfx content={bq[1]} />{parseInline(bq[1])}
    </p>
  );
  if (ul) return (
    <p className="relative"><Pfx content={ul[1]} />
      <Minus className={ico} />{parseInline(ul[1])}
    </p>
  );
  if (ol) return (
    <p className="relative"><Pfx content={ol[2]} />
      <span className="absolute left-0 top-0 text-muted-foreground/60 text-[0.8em]">{ol[1]}.</span>
      {parseInline(ol[2])}
    </p>
  );

  return <p>{parseInline(line)}</p>;
}

// ── Editor ──────────────────────────────────────────────────────────────────
export default function Editor({ dayId, initialBody, events, className }: EditorProps) {
  const [body, setBody] = useState(initialBody);
  const [atBottom, setAtBottom] = useState(false);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef(body);
  const savedRef = useRef(initialBody);
  const dayIdRef = useRef(dayId);

  useEffect(() => { bodyRef.current = body; }, [body]);

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

  useEffect(() => {
    const onHide = () => { if (document.visibilityState === "hidden") save(); };
    document.addEventListener("visibilitychange", onHide);
    const id = setInterval(save, 5000);
    return () => { document.removeEventListener("visibilitychange", onHide); clearInterval(id); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key !== "Enter") return;
    const el = taRef.current!;
    const pos = el.selectionStart;
    const lineStart = body.lastIndexOf("\n", pos - 1) + 1;
    const lineEnd = body.indexOf("\n", pos);
    const line = body.slice(lineStart, lineEnd === -1 ? body.length : lineEnd);

    const m = line.match(/^(\[\]|[-*]|\d+\.) /) || line.match(/^\[[xX]\] /);
    if (!m) return;

    const prefix = line.startsWith("[]") ? "[] " : line.startsWith("[x]") || line.startsWith("[X]") ? "[] "
      : line.match(/^\d+\./) ? `${parseInt(line) + 1}. `
      : m[0];
    const prefixLen = m[0].length;

    if (line.slice(prefixLen).trim() === "") {
      e.preventDefault();
      const next = body.slice(0, lineStart) + body.slice(lineStart + prefixLen);
      setBody(next);
      requestAnimationFrame(() => { el.selectionStart = el.selectionEnd = lineStart; el.focus(); });
      return;
    }
    e.preventDefault();
    const next = body.slice(0, pos) + "\n" + prefix + body.slice(pos);
    setBody(next);
    requestAnimationFrame(() => { el.selectionStart = el.selectionEnd = pos + 1 + prefix.length; el.focus(); });
  }

  return (
    <div className={`flex flex-col flex-1 overflow-hidden md:border-r md:border-border${className ? ` ${className}` : ""}`}>

      {/* Writing area */}
      <div className="relative flex-1 overflow-hidden cursor-text" onClick={() => taRef.current?.focus()}>

        {/* Fade */}
        <div className={`absolute bottom-0 inset-x-0 h-20 bg-gradient-to-t from-background to-transparent pointer-events-none z-10 transition-opacity duration-300 ${atBottom ? "opacity-0" : "opacity-100"}`} />

        {/* Overlay */}
        <div ref={overlayRef} className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="editor-prose px-10 py-8 max-w-[680px]">
            {body
              ? body.split("\n").map((line, i) => <Line key={i} line={line} />)
              : <p className="text-muted-foreground/30 select-none">Start writing…</p>
            }
          </div>
        </div>

        {/* Textarea */}
        <textarea
          ref={taRef}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onBlur={save}
          onKeyDown={handleKeyDown}
          onClick={() => {
            requestAnimationFrame(() => {
              const el = taRef.current;
              if (!el || el.selectionStart !== el.selectionEnd) return;
              const pos = el.selectionStart;
              const ls = body.lastIndexOf("\n", pos - 1) + 1;
              const le = body.indexOf("\n", pos);
              const line = body.slice(ls, le === -1 ? body.length : le);
              const rel = pos - ls;
              if (line.startsWith("[] ") && rel <= 2) setBody(body.slice(0, ls) + "[x] " + body.slice(ls + 3));
              else if ((line.startsWith("[x] ") || line.startsWith("[X] ")) && rel <= 3) setBody(body.slice(0, ls) + "[] " + body.slice(ls + 4));
            });
          }}
          onScroll={(e) => {
            const el = e.target as HTMLTextAreaElement;
            if (overlayRef.current) overlayRef.current.style.transform = `translateY(-${el.scrollTop}px)`;
            setAtBottom(el.scrollTop + el.clientHeight >= el.scrollHeight - 4);
          }}
          style={{ color: "transparent", caretColor: "var(--foreground)", lineHeight: "1.85", fontSize: "1rem" }}
          className="absolute inset-0 w-full h-full bg-transparent resize-none outline-none px-10 py-8"
          spellCheck
        />
      </div>

      {/* Events */}
      {events.length > 0 && (
        <div className="flex-shrink-0 px-10 pb-8">
          <div className="h-px bg-border/50 mb-4 max-w-[600px]" />
          <div className="flex flex-col gap-0.5 max-w-[600px]">
            {events.map((ev) => (
              <div key={ev.id} className="flex items-baseline justify-between py-1">
                <span className="text-sm text-muted-foreground/40">{ev.name}</span>
                {ev.dueDate && (
                  <span className="text-xs text-muted-foreground/30 tabular-nums font-mono">
                    {new Date(ev.dueDate + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
