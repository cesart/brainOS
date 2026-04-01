"use client";

import React, { useRef, useEffect, useImperativeHandle, forwardRef } from "react";
import {
  CheckSquare, Calendar, Heading, Bold, Italic, Strikethrough,
  CodeXml, Link, Quote, List, ListOrdered, Minus,
} from "lucide-react";
import { AirtableItem } from "@/lib/airtable";
import {
  EditorState,
  EditorSelection,
  StateField,
  StateEffect,
  RangeSetBuilder,
} from "@codemirror/state";
import {
  EditorView,
  ViewPlugin,
  ViewUpdate,
  Decoration,
  DecorationSet,
  WidgetType,
  keymap,
  drawSelection,
} from "@codemirror/view";
import { history, historyKeymap, defaultKeymap } from "@codemirror/commands";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export interface EditorHandle {
  wrapSelection: (open: string, close: string) => void;
  insertLinePrefix: (prefix: string) => void;
  insertLine: (content: string) => void;
}

interface EditorProps {
  dayId: string;
  initialBody: string;
  events: AirtableItem[];
  className?: string;
  cursorColor?: string;
}

// ---------------------------------------------------------------------------
// Fold state
// ---------------------------------------------------------------------------
const toggleFold = StateEffect.define<number>();

const foldState = StateField.define<Set<number>>({
  create: () => new Set<number>(),
  update(value, tr) {
    let changed = false;
    const next = new Set(value);
    for (const effect of tr.effects) {
      if (effect.is(toggleFold)) {
        changed = true;
        if (next.has(effect.value)) next.delete(effect.value);
        else next.add(effect.value);
      }
    }
    return changed ? next : value;
  },
});

// ---------------------------------------------------------------------------
// Heading helpers
// ---------------------------------------------------------------------------
function headingInfo(text: string): { level: number; prefix: string; content: string } | null {
  if (text.startsWith("# ") && !text.startsWith("## ")) {
    return { level: 1, prefix: "# ", content: text.slice(2) };
  }
  return null;
}

function foldRange(
  doc: EditorState["doc"],
  headingLineNum: number,
  level: number
): { first: number; last: number } | null {
  const totalLines = doc.lines;
  if (headingLineNum >= totalLines) return null;
  let last = totalLines;
  for (let i = headingLineNum + 1; i <= totalLines; i++) {
    const info = headingInfo(doc.line(i).text);
    if (info && info.level <= level) { last = i - 1; break; }
  }
  if (last < headingLineNum + 1) return null;
  return { first: headingLineNum + 1, last };
}

// ---------------------------------------------------------------------------
// Inline span parser — returns structured spans with marker lengths
// ---------------------------------------------------------------------------
interface InlineSpan {
  kind: 'styled' | 'url';
  from: number;
  to: number;
  openLen: number;
  closeLen: number;
  cls: string;
}

function parseInlineSpans(text: string): InlineSpan[] {
  const spans: InlineSpan[] = [];
  const FILE_EXTS = new Set(["tsx","jsx","ts","js","mjs","cjs","py","go","rs","rb","java","cpp","c","h","css","scss","html","json","yaml","yml","md","sh","log","png","jpg","svg","pdf","zip","mp4","mp3"]);
  let i = 0;

  while (i < text.length) {
    // https?:// URL
    if (text.startsWith("http://", i) || text.startsWith("https://", i)) {
      const m = text.slice(i).match(/^https?:\/\/[^\s)>\]"'`]*/);
      if (m) { spans.push({ kind: 'url', from: i, to: i + m[0].length, openLen: 0, closeLen: 0, cls: "cm-md-link" }); i += m[0].length; continue; }
    }
    // Email address (must come before bare-domain to avoid matching domain part alone)
    if ((i === 0 || /[\s(["'`]/.test(text[i - 1])) && /[a-zA-Z0-9._%+\-]/.test(text[i])) {
      const m = text.slice(i).match(/^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/);
      if (m) { spans.push({ kind: 'url', from: i, to: i + m[0].length, openLen: 0, closeLen: 0, cls: "cm-md-link" }); i += m[0].length; continue; }
    }
    // Bare domain (cesart.me)
    const atBoundary = i === 0 || /[\s(["'`]/.test(text[i - 1]);
    if (atBoundary && /[a-zA-Z]/.test(text[i])) {
      const m = text.slice(i).match(/^([a-zA-Z][a-zA-Z0-9-]*\.)+[a-zA-Z]{2,7}(\/[^\s)>\]"'`]*)?/);
      if (m) {
        const tld = m[0].split("/")[0].split(".").pop()!.toLowerCase();
        if (/^[a-z]{2,7}$/.test(tld) && !FILE_EXTS.has(tld)) {
          spans.push({ kind: 'url', from: i, to: i + m[0].length, openLen: 0, closeLen: 0, cls: "cm-md-link" }); i += m[0].length; continue;
        }
      }
    }
    // *bold*
    if (text[i] === "*" && !text.startsWith("**", i)) {
      const end = text.indexOf("*", i + 1);
      if (end !== -1 && end > i + 1) {
        spans.push({ kind: 'styled', from: i, to: end + 1, openLen: 1, closeLen: 1, cls: "cm-md-bold" });
        i = end + 1; continue;
      }
    }
    // ~~strike~~
    if (text.startsWith("~~", i)) {
      const end = text.indexOf("~~", i + 2);
      if (end !== -1) {
        spans.push({ kind: 'styled', from: i, to: end + 2, openLen: 2, closeLen: 2, cls: "cm-md-strike" });
        i = end + 2; continue;
      }
    }
    // `code` (skip ``` fences — handled at block level)
    if (text[i] === "`") {
      if (text.startsWith("```", i)) { i += 3; continue; }
      const end = text.indexOf("`", i + 1);
      if (end !== -1 && end > i + 1) {
        spans.push({ kind: 'styled', from: i, to: end + 1, openLen: 1, closeLen: 1, cls: "cm-md-code" });
        i = end + 1; continue;
      }
    }
    // _italic_
    if (text[i] === "_") {
      const end = text.indexOf("_", i + 1);
      if (end !== -1 && end > i + 1) {
        spans.push({ kind: 'styled', from: i, to: end + 1, openLen: 1, closeLen: 1, cls: "cm-md-italic" });
        i = end + 1; continue;
      }
    }
    // [text](url)
    if (text[i] === "[") {
      const cb = text.indexOf("]", i + 1);
      if (cb !== -1 && text[cb + 1] === "(") {
        const cp = text.indexOf(")", cb + 2);
        if (cp !== -1) {
          spans.push({ kind: 'styled', from: i, to: cp + 1, openLen: 1, closeLen: cp + 1 - cb, cls: "cm-md-link" });
          i = cp + 1; continue;
        }
      }
    }
    i++;
  }
  return spans;
}

// ---------------------------------------------------------------------------
// Widgets
// ---------------------------------------------------------------------------
class FoldWidget extends WidgetType {
  constructor(readonly folded: boolean, readonly lineNum: number) { super(); }
  eq(other: FoldWidget) { return other.folded === this.folded && other.lineNum === this.lineNum; }
  toDOM(view: EditorView): HTMLElement {
    const wrapper = document.createElement("span");
    wrapper.style.cssText = "display:inline-flex;align-items:center;position:relative;";

    // Zero-width heading-size anchor: forces the line box to heading height
    // the moment the prefix is detected — before any content is typed.
    const anchor = document.createElement("span");
    anchor.style.cssText = "font-size:1.1em;line-height:inherit;width:0;overflow:hidden;";
    anchor.textContent = "\u200B";
    wrapper.appendChild(anchor);

    const btn = document.createElement("span");
    btn.className = "cm-fold-btn";
    btn.textContent = this.folded ? "▸ " : "▾ ";
    btn.addEventListener("mousedown", (e) => {
      e.preventDefault();
      view.dispatch({ effects: toggleFold.of(this.lineNum) });
    });
    wrapper.appendChild(btn);
    return wrapper;
  }
  ignoreEvent() { return true; }
}

class CheckboxWidget extends WidgetType {
  constructor(readonly checked: boolean, readonly lineFrom: number) { super(); }
  eq(other: CheckboxWidget) { return other.checked === this.checked; }
  toDOM(view: EditorView): HTMLElement {
    const span = document.createElement("span");
    span.className = "cm-checkbox";
    span.innerHTML = this.checked
      ? `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display:block;"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="m9 12 2 2 4-4"/></svg>`
      : `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display:block;"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>`;
    span.addEventListener("mousedown", (e) => {
      e.preventDefault();
      const line = view.state.doc.lineAt(this.lineFrom);
      if (line.text.startsWith("[] ")) {
        view.dispatch({ changes: { from: line.from, to: line.from + 3, insert: "[x] " } });
      } else {
        view.dispatch({ changes: { from: line.from, to: line.from + 4, insert: "[] " } });
      }
    });
    return span;
  }
  ignoreEvent() { return false; }
}

class HrWidget extends WidgetType {
  toDOM(): HTMLElement {
    const div = document.createElement("div");
    div.className = "cm-hr";
    return div;
  }
  ignoreEvent() { return true; }
}

class BulletWidget extends WidgetType {
  toDOM(): HTMLElement {
    const span = document.createElement("span");
    span.className = "cm-bullet";
    span.textContent = "• ";
    return span;
  }
  ignoreEvent() { return true; }
}

class CodeBlockWidget extends WidgetType {
  constructor(readonly lines: string[]) { super(); }
  toDOM(view: EditorView): HTMLElement {
    const wrap = document.createElement("div");
    wrap.className = "cm-code-block-wrap";

    // Measure view.dom (.cm-editor) — constrained by its container, not by content width.
    // Applying maxWidth to the wrap (not the pre) means CodeMirror sees a bounded widget,
    // preventing cm-content from expanding and pushing regular text under the right panel.
    const applyWidth = () => {
      wrap.style.maxWidth = view.dom.clientWidth + "px";
    };
    applyWidth();
    const ro = new ResizeObserver(applyWidth);
    ro.observe(view.dom);
    const origDestroy = this.destroy?.bind(this);
    this.destroy = (dom: HTMLElement) => { ro.disconnect(); origDestroy?.(dom); };

    const pre = document.createElement("pre");
    pre.className = "cm-code-block-pre";
    pre.textContent = this.lines.join("\n");

    wrap.appendChild(pre);

    return wrap;
  }
  eq(other: CodeBlockWidget): boolean {
    return other.lines.length === this.lines.length &&
      other.lines.every((l, i) => l === this.lines[i]);
  }
}

// ---------------------------------------------------------------------------
// Fenced code block scanner
// ---------------------------------------------------------------------------
function findCodeBlocks(doc: EditorState["doc"]): Array<{ open: number; close: number }> {
  const blocks: Array<{ open: number; close: number }> = [];
  let openLine: number | null = null;
  for (let i = 1; i <= doc.lines; i++) {
    const text = doc.line(i).text;
    if (text.startsWith("```")) {
      if (openLine === null) openLine = i;
      else { blocks.push({ open: openLine, close: i }); openLine = null; }
    }
  }
  return blocks;
}

// ---------------------------------------------------------------------------
// StateField: code block decorations (single widget per fence block)
// ---------------------------------------------------------------------------
function buildCodeBlockDecos(state: EditorState): DecorationSet {
  const builder = new RangeSetBuilder<Decoration>();
  for (const { open, close } of findCodeBlocks(state.doc)) {
    const openLine = state.doc.line(open);
    const closeLine = state.doc.line(close);
    const lines: string[] = [];
    for (let i = open + 1; i < close; i++) lines.push(state.doc.line(i).text);
    builder.add(openLine.from, closeLine.to, Decoration.replace({
      widget: new CodeBlockWidget(lines),
      block: true,
    }));
  }
  return builder.finish();
}

const codeBlockDeco = StateField.define<DecorationSet>({
  create: (state) => buildCodeBlockDecos(state),
  update: (value, tr) => tr.docChanged ? buildCodeBlockDecos(tr.state) : value.map(tr.changes),
  provide: (f) => EditorView.decorations.from(f),
});

// ---------------------------------------------------------------------------
// StateField: fold range decorations (spans line breaks → must be StateField)
// ---------------------------------------------------------------------------
function buildFoldDecorations(state: EditorState): DecorationSet {
  const builder = new RangeSetBuilder<Decoration>();
  const folded = state.field(foldState);
  const doc = state.doc;

  const sortedLines: number[] = [];
  folded.forEach((n) => sortedLines.push(n));
  sortedLines.sort((a, b) => a - b);

  let lastHideTo = -1;
  for (const lineNum of sortedLines) {
    if (lineNum > doc.lines) continue;
    const line = doc.line(lineNum);
    if (line.from <= lastHideTo) continue; // nested fold, already hidden
    const info = headingInfo(line.text);
    if (!info) continue;
    const range = foldRange(doc, lineNum, info.level);
    if (!range) continue;
    const hideFrom = doc.line(range.first).from - 1;
    const hideTo = doc.line(range.last).to;
    if (hideFrom < hideTo) {
      builder.add(hideFrom, hideTo, Decoration.replace({}));
      lastHideTo = hideTo;
    }
  }
  return builder.finish();
}

const foldDecorations = StateField.define<DecorationSet>({
  create: (state) => buildFoldDecorations(state),
  update(deco, tr) {
    const foldChanged = tr.effects.some((e) => e.is(toggleFold));
    if (!tr.docChanged && !foldChanged) return deco.map(tr.changes);
    return buildFoldDecorations(tr.state);
  },
  provide: (f) => EditorView.decorations.from(f),
});

// StateField (not ViewPlugin) so CodeMirror uses it for line-height computation.
// Applies cm-h1-line to heading lines so the line is already at heading height
// before any content is typed — prevents the jump when the first char is added.
function buildHeadingLineDecos(state: EditorState): DecorationSet {
  const builder = new RangeSetBuilder<Decoration>();
  for (let i = 1; i <= state.doc.lines; i++) {
    const line = state.doc.line(i);
    if (headingInfo(line.text)) {
      builder.add(line.from, line.from, Decoration.line({ class: "cm-h1-line" }));
    }
  }
  return builder.finish();
}

const headingLineDeco = StateField.define<DecorationSet>({
  create: (state) => buildHeadingLineDecos(state),
  update(deco, tr) {
    if (!tr.docChanged) return deco.map(tr.changes);
    return buildHeadingLineDecos(tr.state);
  },
  provide: (f) => EditorView.decorations.from(f),
});

// ---------------------------------------------------------------------------
// Atomic prefix ranges — prevents cursor from landing before block widgets
// ---------------------------------------------------------------------------
function buildPrefixAtomicRanges(view: EditorView): DecorationSet {
  const builder = new RangeSetBuilder<Decoration>();
  const { doc } = view.state;
  for (let i = 1; i <= doc.lines; i++) {
    const line = doc.line(i);
    const text = line.text;
    const hInfo = headingInfo(text);
    if (hInfo) {
      builder.add(line.from, line.from + hInfo.prefix.length, Decoration.replace({}));
      continue;
    }
    if (text.startsWith("[] ")) {
      builder.add(line.from, line.from + 3, Decoration.replace({}));
      continue;
    }
    if (text.startsWith("[x] ") || text.startsWith("[X] ")) {
      builder.add(line.from, line.from + 4, Decoration.replace({}));
      continue;
    }
    if (/^[-*] /.test(text)) {
      builder.add(line.from, line.from + 2, Decoration.replace({}));
      continue;
    }
  }
  return builder.finish();
}

// ---------------------------------------------------------------------------
// ViewPlugin: single-line decorations only
// ---------------------------------------------------------------------------
function buildDecorations(view: EditorView): DecorationSet {
  const builder = new RangeSetBuilder<Decoration>();
  const { doc } = view.state;
  const folded = view.state.field(foldState);

  // Pre-compute hidden lines (inside folds) so we skip them
  const hiddenLines = new Set<number>();
  folded.forEach((lineNum) => {
    if (lineNum > doc.lines) return;
    const info = headingInfo(doc.line(lineNum).text);
    if (!info) return;
    const range = foldRange(doc, lineNum, info.level);
    if (range) {
      for (let j = range.first; j <= range.last; j++) hiddenLines.add(j);
    }
  });

  // Pre-scan for fenced code blocks
  // Code block lines are handled entirely by codeBlockDeco StateField — skip them here
  const codeBlockLines = new Set<number>();
  for (const { open, close } of findCodeBlocks(doc)) {
    for (let j = open; j <= close; j++) codeBlockLines.add(j);
  }

  for (let i = 1; i <= doc.lines; i++) {
    if (hiddenLines.has(i)) continue;
    if (codeBlockLines.has(i)) continue;

    const line = doc.line(i);
    const text = line.text;

    // ── Headings ──────────────────────────────────────────────────────────
    const hInfo = headingInfo(text);
    if (hInfo) {
      const isFolded = folded.has(i);
      const prefixEnd = line.from + hInfo.prefix.length;
      builder.add(line.from, prefixEnd, Decoration.replace({ widget: new FoldWidget(isFolded, i) }));
      if (prefixEnd < line.to) {
        builder.add(prefixEnd, line.to, Decoration.mark({ class: `cm-h${hInfo.level}` }));
      }
      continue;
    }

    // ── Horizontal rule ───────────────────────────────────────────────────
    if (text.trim() === "---") {
      builder.add(line.from, line.to, Decoration.replace({ widget: new HrWidget() }));
      continue;
    }

    // ── Tasks ─────────────────────────────────────────────────────────────
    const isUnchecked = text.startsWith("[] ");
    const isChecked = text.startsWith("[x] ") || text.startsWith("[X] ");
    if (isUnchecked || isChecked) {
      const prefixLen = isChecked ? 4 : 3;
      const contentStart = line.from + prefixLen;
      builder.add(line.from, contentStart, Decoration.replace({ widget: new CheckboxWidget(isChecked, line.from) }));
      if (isChecked && contentStart < line.to) {
        builder.add(contentStart, line.to, Decoration.mark({ class: "cm-task-done" }));
      }
      if (!isChecked && contentStart < line.to) {
        addInlineMarks(builder, contentStart, text.slice(prefixLen));
      }
      continue;
    }

    // ── Event (+ text) ────────────────────────────────────────────────────
    if (text.startsWith("+ ")) {
      const contentStart = line.from + 2;
      builder.add(line.from, contentStart, Decoration.mark({ class: "cm-md-prefix" }));
      if (contentStart < line.to) {
        builder.add(contentStart, line.to, Decoration.mark({ class: "cm-md-event" }));
        addInlineMarks(builder, contentStart, text.slice(2));
      }
      continue;
    }

    // ── Blockquote (> text) ───────────────────────────────────────────────
    if (text.startsWith("> ") || text === ">") {
      const prefixLen = text.startsWith("> ") ? 2 : 1;
      const contentStart = line.from + prefixLen;
      builder.add(line.from, line.from, Decoration.line({ class: "cm-blockquote-line" }));
      builder.add(line.from, contentStart, Decoration.replace({}));
      if (contentStart < line.to) {
        builder.add(contentStart, line.to, Decoration.mark({ class: "cm-md-blockquote" }));
        addInlineMarks(builder, contentStart, text.slice(prefixLen));
      }
      continue;
    }

    // ── Unordered list (- / * text) ───────────────────────────────────────
    const ulMatch = text.match(/^([-*]) (.*)/);
    if (ulMatch) {
      const contentStart = line.from + 2;
      builder.add(line.from, line.from, Decoration.line({ class: "cm-list-line" }));
      builder.add(line.from, contentStart, Decoration.replace({ widget: new BulletWidget() }));
      if (contentStart < line.to) addInlineMarks(builder, contentStart, ulMatch[2]);
      continue;
    }

    // ── Ordered list (1. text) ────────────────────────────────────────────
    const olMatch = text.match(/^(\d+\.) (.*)/);
    if (olMatch) {
      const prefixLen = olMatch[1].length + 1;
      const contentStart = line.from + prefixLen;
      builder.add(line.from, line.from, Decoration.line({ class: "cm-list-line" }));
      builder.add(line.from, line.from + olMatch[1].length, Decoration.mark({ class: "cm-ol-num" }));
      if (contentStart < line.to) addInlineMarks(builder, contentStart, olMatch[2]);
      continue;
    }

    // ── Plain line — inline marks only ────────────────────────────────────
    if (line.to > line.from) {
      addInlineMarks(builder, line.from, text);
    }
  }

  return builder.finish();
}

/**
 * Adds inline formatting decorations for `content` starting at `contentStart`.
 * Always hides markers and shows styled content (Slack-style WYSIWYG — no syntax reveal on cursor).
 */
function addInlineMarks(
  builder: RangeSetBuilder<Decoration>,
  contentStart: number,
  content: string,
) {
  const spans = parseInlineSpans(content);
  for (const span of spans) {
    const absFrom = contentStart + span.from;
    const absTo = contentStart + span.to;

    if (span.kind === 'url') {
      builder.add(absFrom, absTo, Decoration.mark({ class: span.cls }));
      continue;
    }

    const contentFrom = absFrom + span.openLen;
    const contentTo = absTo - span.closeLen;

    // Always hide markers, style the content
    if (absFrom < contentFrom) builder.add(absFrom, contentFrom, Decoration.replace({}));
    if (contentFrom < contentTo) builder.add(contentFrom, contentTo, Decoration.mark({ class: span.cls }));
    if (contentTo < absTo) builder.add(contentTo, absTo, Decoration.replace({}));
  }
}

const markdownPlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;
    atomics: DecorationSet;
    constructor(view: EditorView) {
      this.decorations = buildDecorations(view);
      this.atomics = buildPrefixAtomicRanges(view);
    }
    update(update: ViewUpdate) {
      if (
        update.docChanged ||
        update.selectionSet ||
        update.viewportChanged ||
        update.transactions.some((tr) => tr.effects.some((e) => e.is(toggleFold)))
      ) {
        this.decorations = buildDecorations(update.view);
        if (update.docChanged) this.atomics = buildPrefixAtomicRanges(update.view);
      }
    }
  },
  {
    decorations: (v) => v.decorations,
    provide: (plugin) => EditorView.atomicRanges.of((view) => view.plugin(plugin)?.atomics ?? Decoration.none),
  }
);

// ---------------------------------------------------------------------------
// Theme
// ---------------------------------------------------------------------------
const brainTheme = EditorView.theme({
  "&": { height: "100%", outline: "none", biackground: "transparent" },
  ".cm-scroller": { fontFamily: "inherit", lineHeight: "1.65", overflowX: "hidden", overflowY: "auto", height: "100%" },
  ".cm-content": {
    padding: "3rem 1rem 1rem 0.5rem",
    caretColor: "transparent",
    color: "var(--foreground)",
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
  },
  ".cm-line": { paddingLeft: "1.5rem" },
  "&.cm-focused .cm-cursor, &.cm-focused .cm-dropCursor": { display: "block", borderLeftStyle: "solid", borderLeftWidth: "2px", borderLeftColor: "var(--cm-cursor-color, var(--muted-foreground))" },
  ".cm-selectionBackground": { background: "oklch(1 0 0 / 0.08) !important" },
  "&.cm-focused .cm-selectionBackground": { background: "oklch(1 0 0 / 0.11) !important" },
  ".cm-content ::selection": { background: "transparent" },
  "&.cm-focused": { outline: "none" },
  ".cm-gutters": { display: "none" },

  // Headings — line decoration locks the line height before content is typed
  ".cm-h1-line": { fontSize: "1.1em" },
  ".cm-h1": { fontSize: "1.1em", fontWeight: "600", color: "var(--foreground)" },

  // Muted syntax prefix (shown on cursor line for headings, and for block prefixes)
  ".cm-md-prefix": { color: "var(--muted-foreground)", opacity: "0.4" },

  // Fold toggle icon — hangs left so heading text aligns with body
  ".cm-fold-btn": {
    cursor: "pointer",
    userSelect: "none",
    fontSize: "0.85em",
    opacity: "0.3",
    display: "inline-block",
    position: "relative",
    left: "-1.4em",
    marginRight: "-1.4em",
    width: "1.4em",
    textAlign: "right",
    lineHeight: "1",
    paddingRight: "0.25em",
  },
  // Heading lines are 1.1em — tighten the hang so the button doesn't clip
  ".cm-h1-line .cm-fold-btn": {
    left: "-1.35em",
    marginRight: "-1.35em",
    width: "1.35em",
  },
  ".cm-fold-btn:hover": { opacity: "0.7" },

  // Checkbox
  ".cm-checkbox": {
    cursor: "pointer",
    color: "var(--muted-foreground)",
    marginRight: "0.4em",
    display: "inline-block",
    lineHeight: "1",
    verticalAlign: "middle",
  },
  ".cm-task-done": { opacity: "0.4", textDecoration: "line-through" },

  // Horizontal rule
  ".cm-hr": {
    display: "block",
    height: "0.875em",
    background: "linear-gradient(var(--border), var(--border)) no-repeat center / 100% 1px",
    pointerEvents: "none",
  },

  // Block types
  ".cm-blockquote-line": { borderLeft: "3px solid var(--muted)", marginLeft: "1em", paddingLeft: "1em" },
  ".cm-md-blockquote": { fontFamily: "var(--font-mono)", color: "var(--muted-foreground)", letterSpacing: "0" },
  ".cm-md-event": { color: "var(--foreground)", opacity: "0.8" },

  // Fenced code blocks
  ".cm-code-block-wrap": { display: "block", width: "100%", marginTop: "0.25em", marginBottom: "1.5em", marginRight: "3rem", overflowX: "auto" },
  ".cm-code-block-pre": { display: "block", margin: "0", padding: "2rem 1.5rem", fontFamily: "var(--font-mono)", fontSize: "0.875em", background: "color-mix(in oklch, var(--muted-foreground) 6%, transparent)", borderRadius: "16px", whiteSpace: "pre", wordBreak: "normal" },
  ".cm-code-block-wrap::-webkit-scrollbar": { height: "3px" },
  ".cm-code-block-wrap::-webkit-scrollbar-thumb": { background: "var(--muted)" },

  // Inline formatting
  ".cm-md-bold": { fontWeight: "600" },
  ".cm-md-italic": { fontStyle: "italic" },
  ".cm-md-strike": { textDecoration: "line-through", color: "var(--muted-foreground)" },
  ".cm-md-code": {
    fontFamily: "var(--font-mono)",
    color: "var(--muted-foreground)",
    background: "var(--card)",
    padding: "0.1em 0.5em",
    margin: "0 0.3em",
    borderRadius: "3px",
  },
  ".cm-md-link": { color: "var(--primary)", textDecoration: "none", cursor: "pointer", fontFamily: "var(--font-mono)", padding: "0 0.125em" },
  ".cm-md-link:hover": { textDecoration: "underline" },
  // Bullet

  ".cm-bullet": { color: "color-mix(in oklch, var(--foreground) 50%, transparent)", fontSize: "1.5em", lineHeight: "1", marginRight: "0.2em" },
  ".cm-ol-num": { color: "color-mix(in oklch, var(--foreground) 50%, transparent)", marginRight: "0.35em" },
});

// ---------------------------------------------------------------------------
// Enter key handler
// ---------------------------------------------------------------------------
function makeEnterHandler(): (view: EditorView) => boolean {
  return (view) => {
    const { head } = view.state.selection.main;
    const line = view.state.doc.lineAt(head);
    const textBefore = line.text.slice(0, head - line.from);

    // Code fence: ``` → insert closing fence with blank line in between
    if (line.text.trimEnd() === "```" && head === line.to) {
      view.dispatch({
        changes: { from: head, insert: "\n\n```" },
        selection: { anchor: head + 1 },
      });
      return true;
    }

    const taskMatch  = textBefore.match(/^(\s*)\[[ xX]?\] /);
    const ulMatch    = textBefore.match(/^(\s*)[-*] /);
    const olMatch    = textBefore.match(/^(\s*)(\d+)\. /);
    const eventMatch = textBefore.match(/^(\s*)\+ /);

    let prefix = ""; let prefixLen = 0;
    if (taskMatch)       { prefix = taskMatch[1]  + "[] ";                                   prefixLen = taskMatch[0].length; }
    else if (ulMatch)    { prefix = ulMatch[0];                                               prefixLen = prefix.length; }
    else if (eventMatch) { prefix = eventMatch[1] + "+ ";                                    prefixLen = eventMatch[0].length; }
    else if (olMatch)    { prefix = olMatch[1]    + `${parseInt(olMatch[2]) + 1}. `;         prefixLen = olMatch[0].length; }
    if (!prefix) return false;

    const lineContent = line.text.slice(prefixLen).trim();
    if (lineContent === "") {
      view.dispatch({ changes: { from: line.from, to: line.from + prefixLen, insert: "" }, selection: { anchor: line.from } });
      return true;
    }
    view.dispatch({ changes: { from: head, insert: "\n" + prefix }, selection: { anchor: head + 1 + prefix.length } });
    return true;
  };
}

function makeTabHandler(dedent: boolean): (view: EditorView) => boolean {
  return (view) => {
    const { head } = view.state.selection.main;
    const line = view.state.doc.lineAt(head);
    if (!line.text.match(/^\s*([-*] |\[[ xX]?\] |\d+\. |\+ )/)) return false;
    if (dedent) {
      if (line.text.length < 2 || line.text.slice(0, 2) !== "  ") return false;
      view.dispatch({
        changes: { from: line.from, to: line.from + 2, insert: "" },
        selection: { anchor: Math.max(line.from, head - 2) },
      });
    } else {
      view.dispatch({
        changes: { from: line.from, to: line.from, insert: "  " },
        selection: { anchor: head + 2 },
      });
    }
    return true;
  };
}

// ---------------------------------------------------------------------------
// Editor component
// ---------------------------------------------------------------------------
const Editor = forwardRef<EditorHandle, EditorProps>(function Editor(
  { dayId, initialBody, events, className, cursorColor }: EditorProps,
  ref
) {
  const editorDomRef = useRef<HTMLDivElement>(null);
  const cmRef = useRef<EditorView | null>(null);
  const bodyRef = useRef(initialBody);
  const savedRef = useRef(initialBody);
  const dayIdRef = useRef(dayId);
  const [kbVisible, setKbVisible] = React.useState(false);
  const [atBottom, setAtBottom] = React.useState(false);
  const [focused, setFocused] = React.useState(false);
  const [hasContent, setHasContent] = React.useState(initialBody.length > 0);

  // ── Update cursor color when mode changes ─────────────────────────────────
  const cursorColorInitial = useRef(true);
  useEffect(() => {
    if (!editorDomRef.current) return;
    if (cursorColor) {
      editorDomRef.current.style.setProperty("--cm-cursor-color", cursorColor);
    } else {
      editorDomRef.current.style.removeProperty("--cm-cursor-color");
    }
    if (!cursorColorInitial.current) cmRef.current?.focus();
    cursorColorInitial.current = false;
  }, [cursorColor]);

  // ── Mount CodeMirror ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!editorDomRef.current) return;
    const enterHandler = makeEnterHandler();
    const tabHandler = makeTabHandler(false);
    const shiftTabHandler = makeTabHandler(true);
    const view = new EditorView({
      state: EditorState.create({
        doc: initialBody,
        selection: EditorSelection.cursor(initialBody.length),
        extensions: [
          history(),
          drawSelection(),
          keymap.of([{ key: "Enter", run: enterHandler }, { key: "Tab", run: tabHandler }, { key: "Shift-Tab", run: shiftTabHandler }, ...historyKeymap, ...defaultKeymap]),
          foldState,
          foldDecorations,
          headingLineDeco,
          markdownPlugin,
          brainTheme,
          EditorView.lineWrapping,
          EditorView.updateListener.of((update) => {
            if (update.docChanged) {
              const content = update.state.doc.toString();
              bodyRef.current = content;
              setHasContent(content.length > 0);
            }
          }),
          EditorView.domEventHandlers({
            focus() { setFocused(true); return false; },
            blur() { setFocused(false); save(); return false; },
            scroll(_e, view) {
              const s = view.scrollDOM;
              setAtBottom(s.scrollTop + s.clientHeight >= s.scrollHeight - 4);
              return false;
            },
            click(event, view) {
              const target = event.target as HTMLElement;
              if (!target.classList.contains("cm-md-link")) return false;
              const pos = view.posAtCoords({ x: event.clientX, y: event.clientY });
              if (pos === null) return false;
              const line = view.state.doc.lineAt(pos);
              const text = line.text;
              const offset = pos - line.from;
              // [text](url) or [text](url||target)
              const mdLink = /\[([^\]]*)\]\(([^)]+)\)/g;
              let m: RegExpExecArray | null;
              while ((m = mdLink.exec(text)) !== null) {
                if (m.index <= offset && offset < m.index + m[0].length) {
                  const url = m[2].split("||")[0];
                  window.open(url, "_blank", "noopener,noreferrer");
                  return true;
                }
              }
              // bare https?:// URL
              const bareUrl = /https?:\/\/[^\s)>\]"'`]*/g;
              while ((m = bareUrl.exec(text)) !== null) {
                if (m.index <= offset && offset < m.index + m[0].length) {
                  window.open(m[0], "_blank", "noopener,noreferrer");
                  return true;
                }
              }
              // bare email address
              const bareEmail = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;
              while ((m = bareEmail.exec(text)) !== null) {
                if (m.index <= offset && offset < m.index + m[0].length) {
                  window.open(`mailto:${m[0]}`, "_self");
                  return true;
                }
              }
              return false;
            },
          }),
          codeBlockDeco,
        ],
      }),
      parent: editorDomRef.current,
    });
    cmRef.current = view;
    return () => { view.destroy(); cmRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Sync on dayId / initialBody change ───────────────────────────────────
  useEffect(() => {
    dayIdRef.current = dayId;
    bodyRef.current = initialBody;
    savedRef.current = initialBody;
    const view = cmRef.current;
    if (!view) return;
    if (view.state.doc.toString() !== initialBody) {
      view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: initialBody } });
    }
  }, [dayId, initialBody]);

  // ── iOS keyboard ──────────────────────────────────────────────────────────
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const check = () => setKbVisible(vv.height < window.innerHeight - 100);
    vv.addEventListener("resize", check);
    return () => vv.removeEventListener("resize", check);
  }, []);

  // ── Save ──────────────────────────────────────────────────────────────────
  async function save() {
    if (bodyRef.current === savedRef.current) return;
    savedRef.current = bodyRef.current;
    await fetch(`/api/days/${dayIdRef.current}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: bodyRef.current }),
      keepalive: true,
    });
  }

  useEffect(() => {
    const onVisibility = () => { if (document.visibilityState === "hidden") save(); };
    const onUnload = () => save();
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("beforeunload", onUnload);
    const interval = setInterval(save, 5000);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("beforeunload", onUnload);
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Remote sync ───────────────────────────────────────────────────────────
  useEffect(() => {
    const interval = setInterval(async () => {
      const view = cmRef.current;
      if (!view || view.hasFocus) return;
      const res = await fetch(`/api/days/${dayIdRef.current}`);
      if (!res.ok) return;
      const day = await res.json();
      const remote = day.body ?? "";
      if (remote !== savedRef.current && bodyRef.current === savedRef.current) {
        savedRef.current = remote;
        bodyRef.current = remote;
        view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: remote } });
      }
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // ── Toolbar helpers ───────────────────────────────────────────────────────
  function wrapSelection(open: string, close: string) {
    const view = cmRef.current; if (!view) return;
    const { from, to } = view.state.selection.main;
    const selected = view.state.sliceDoc(from, to);
    const before = from >= open.length ? view.state.sliceDoc(from - open.length, from) : "";
    const after = view.state.sliceDoc(to, to + close.length);
    if (before === open && after === close) {
      view.dispatch({
        changes: [{ from: from - open.length, to: from, insert: "" }, { from: to, to: to + close.length, insert: "" }],
        selection: { anchor: from - open.length, head: to - open.length },
      });
    } else if (selected.startsWith(open) && selected.endsWith(close) && selected.length > open.length + close.length) {
      const inner = selected.slice(open.length, selected.length - close.length);
      view.dispatch({ changes: { from, to, insert: inner }, selection: { anchor: from, head: from + inner.length } });
    } else {
      view.dispatch({
        changes: { from, to, insert: open + selected + close },
        selection: { anchor: from + open.length, head: from + open.length + selected.length },
      });
    }
    view.focus();
  }

  function insertLinePrefix(prefix: string) {
    const view = cmRef.current; if (!view) return;
    const { head } = view.state.selection.main;
    const line = view.state.doc.lineAt(head);
    if (line.text.startsWith(prefix)) {
      view.dispatch({ changes: { from: line.from, to: line.from + prefix.length, insert: "" }, selection: { anchor: Math.max(line.from, head - prefix.length) } });
    } else {
      view.dispatch({ changes: { from: line.from, insert: prefix }, selection: { anchor: head + prefix.length } });
    }
    view.focus();
  }

  function insertLine(content: string) {
    const view = cmRef.current; if (!view) return;
    const { head } = view.state.selection.main;
    const line = view.state.doc.lineAt(head);
    view.dispatch({ changes: { from: line.to, insert: "\n" + content }, selection: { anchor: line.to + 1 + content.length } });
    view.focus();
  }

  // ── Expose actions to parent ──────────────────────────────────────────────
  useImperativeHandle(ref, () => ({ wrapSelection, insertLinePrefix, insertLine }));

  // ── Tools ─────────────────────────────────────────────────────────────────
  const tools = [
    { label: "Task",    icon: <CheckSquare className="w-4 h-4" />, action: () => insertLinePrefix("[] ") },
    { label: "Event",   icon: <Calendar className="w-4 h-4" />,    action: () => insertLinePrefix("+ ") },
    { label: "Section", icon: <Heading className="w-4 h-4" />,     action: () => insertLinePrefix("## ") },
    { label: "Bold",    icon: <Bold className="w-4 h-4" />,        action: () => wrapSelection("*", "*") },
    { label: "Italic",  icon: <Italic className="w-4 h-4" />,      action: () => wrapSelection("_", "_") },
    { label: "Strike",  icon: <Strikethrough className="w-4 h-4" />, action: () => wrapSelection("~~", "~~") },
    { label: "Code",    icon: <CodeXml className="w-4 h-4" />,     action: () => wrapSelection("`", "`") },
    { label: "Link",    icon: <Link className="w-4 h-4" />,        action: () => wrapSelection("[", "](url)") },
    { label: "Quote",   icon: <Quote className="w-4 h-4" />,       action: () => insertLinePrefix("> ") },
    { label: "List",    icon: <List className="w-4 h-4" />,        action: () => insertLinePrefix("- ") },
    { label: "Ordered", icon: <ListOrdered className="w-4 h-4" />, action: () => insertLinePrefix("1. ") },
    { label: "Rule",    icon: <Minus className="w-4 h-4" />,       action: () => insertLine("---") },
  ];

  // ── Render ────────────────────────────────────────────────────────────────
  const toolbarButtons = tools.map((tool) => (
    <button
      key={tool.label}
      onClick={tool.action}
      title={tool.label}
      className="flex items-center justify-center py-1.5 px-2.5 rounded-md text-muted-foreground border border-border hover:text-foreground hover:bg-accent transition-colors"
    >
      {tool.icon}
    </button>
  ));

  return (
    <div className={`flex flex-col flex-1 overflow-hidden${className ? ` ${className}` : ""}`}>
        <div className="relative flex-1 overflow-hidden cursor-text" onClick={() => cmRef.current?.focus()}>
          <div className={`absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-background via-background/80 to-transparent pointer-events-none z-10 transition-opacity duration-300 ${atBottom ? "opacity-0" : "opacity-100"}`} />
          {!hasContent && (
            <p
              className="absolute inset-0 flex items-center justify-center pointer-events-none select-none text-base leading-relaxed transition-opacity duration-300"
              style={{ color: "var(--muted-foreground)", opacity: focused ? 0 : 0.2 }}
            >
              Start brain dumping…
            </p>
          )}
          <div ref={editorDomRef} className="absolute inset-0" />
        </div>

        {events.length > 0 && (
          <div className="flex-shrink-0 px-6 pb-6">
            <p className="text-[10px] tracking-[1.5px] text-muted mb-2 uppercase">Upcoming Events</p>
            <div className="h-px bg-sidebar-border mb-4" />
            <div className="flex flex-col">
              {events.map((event) => (
                <div key={event.id} className="flex items-baseline justify-between py-1.5 px-3">
                  <span className="text-xl font-semibold text-muted">{event.name}</span>
                  {event.dueDate && (
                    <span className="text-base text-muted">
                      {new Date(event.dueDate + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Mobile toolbar */}
        <div className={`md:hidden flex flex-row flex-nowrap overflow-x-auto items-center gap-2 px-2 flex-shrink-0 ${kbVisible ? "py-1" : "py-2"}`}>
          {toolbarButtons}
        </div>
    </div>
  );
});

export default Editor;
