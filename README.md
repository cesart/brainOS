# 🧠 brainOS

A personal life operating system — daily notes, task management, and agenda in one dark-mode interface, live on the web.

This started as a personal itch: I wanted a single place that surfaces what I need to act on today without the overhead of a full productivity suite. The design leans into density and calm — a lot of information without feeling cluttered.

---

## Design process

The design work lives in `brainos-designs.pen` [[view](brainos-designs.pen)] — a [Pencil](https://www.pencil.design) file with the full exploration: layout explorations, component details, type scale, and interaction specs. Open it in the Pencil app to see how the interface decisions were made before they became code.

Most of the implementation was built hands-on using [Claude Code](https://claude.ai/code) as a development partner — iterating directly in the editor, making real-time decisions about interactions and edge cases rather than doing a full handoff. The point wasn't to skip the craft; it was to compress the gap between design intent and working product.

---

## What it does

- **Daily journal** with a custom Markdown editor — transparent textarea over a rich-text render layer so formatting (tasks, events, headings, blockquotes) reads cleanly without toggling modes
- **Mini calendar + week view** in the sidebar for quick date navigation
- **Modes** (powered by Airtable) — collections that filter items into focused contexts
- **Mobile view** — a distinct bottom-sheet layout optimized for phone use, not just a shrunk desktop
- **Design details** like contextual date labels, pixel polish, microinteractions, and other ambient details that make the interface feel grounded and alive

---

## Stack

Next.js 14 · TypeScript · Tailwind CSS · shadcn/ui · Airtable API · Deployed on Vercel · Framer Motion

### Typography
- [Mona Sans](https://fonts.google.com/specimen/Mona+Sans): A strong and versatile typeface, designed together with Degarism and inspired by industrial-era grotesques. A variable font made custom for GitHub.
- [DM Mono](https://fonts.google.com/specimen/DM+Mono): A three weight, three style family designed for DeepMind. The type design and font development was commissioned from Colophon Foundry, with Creative Direction from the DeepMind team.

---

## Run locally

```bash
npm install
npm run dev
```

Requires an `.env.local` with Airtable credentials (`AIRTABLE_API_KEY`, `AIRTABLE_BASE_ID`).
