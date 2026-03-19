# 🧠 brainOS

A personal life operating system — daily notes, task management, and agenda in one dark-mode interface, live on the web.

This started as a personal itch: I wanted a single place that surfaces what I need to act on today without the overhead of a full productivity suite. The design leans into density and calm — a lot of information without feeling cluttered.

---

## What it does

- **Daily journal** with a custom markdown editor — transparent textarea over a rich-text render layer so formatting (tasks, events, headings, blockquotes) reads cleanly without toggling modes
- **Mini calendar + week view** in the sidebar for quick date navigation
- **Modes** (powered by Airtable) — collections that filter items into focused contexts
- **Mobile view** — a distinct bottom-sheet layout optimized for phone use, not just a shrunk desktop
- **Live clock**, contextual date labels (Today / Past / Future), and ambient details that make the interface feel grounded in the present

---

## Stack

Next.js 14 · TypeScript · Tailwind CSS · shadcn/ui · Airtable API · Framer Motion · Deployed on Vercel

---

## Design process

The design work lives in `brainos-designs.pen` — a [Pencil](https://www.pencil.design) file with the full exploration: layout explorations, component details, type scale, and interaction specs. Open it in the Pencil app to see how the interface decisions were made before they became code.

Most of the implementation was built hands-on using [Claude Code](https://claude.ai/code) as a development partner — iterating directly in the editor, making real-time decisions about interactions and edge cases rather than doing a full handoff. The point wasn't to skip the craft; it was to compress the gap between design intent and working product.

---

## Run locally

```bash
npm install
npm run dev
```

Requires an `.env.local` with Airtable credentials (`AIRTABLE_API_KEY`, `AIRTABLE_BASE_ID`).
