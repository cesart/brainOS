import type { AirtableDay, AirtableItem } from "./airtable";
import { localDateISO } from "./airtable";

export const DEMO_BODY = `\`\`\`
    __               _       ____  _____
   / /_  _________ _(_)___  / __ \\/ ___/
  / __ \\/ ___/ __ \u0060/ / __ \\/ / / /\\__ \\
 / /_/ / /  / /_/ / / / / / /_/ /___/ / 
/_.___/_/   \\__,_/_/_/ /_/\\____//____/  

\`\`\`
# Welcome to brainOS!
*brainOS* is a daily notes and task system I designed and built using Claude Code, from shaping the product concept to writing and iterating on the code. I'm sharing it publicly to show how I use AI in my design practice.

Feel free to explore: write in the editor, add tasks, lists, code, and other text. You can navigate in the Agenda and I'll soon be extending the functionality of Modes. Make sure to check out the repo on [GitHub](https://github.com/cesart/brainOS). Thanks for looking! 👀

⌖ Made by [Cesar Torres](https://cesart.me) & Claude
cesar@studiohouse.nyc
---
> ⚠️ This is only intended as a live demo of a tool I use personally for my notes — nothing you write here will be saved.! Refresh the page to reset.

`;

export const DEMO_COLLECTIONS = [
  { id: "demo-collection-personal", name: "Personal", description: "", itemIds: [] },
  { id: "demo-collection-work",     name: "Work",     description: "", itemIds: [] },
];

export function makeDemoItems(todayISO: string): AirtableItem[] {
  const dayId = `demo-${todayISO}`;
  const today = localDateISO();
  return [
    {
      id: "demo-item-event-1",
      name: "Check out brainOS",
      body: "Check out brainOS",
      type: "event",
      dueDate: today,
      completed: false,
      createdDate: today,
      collectionIds: ["demo-collection-personal"],
      dayIds: [dayId],
    },
    {
      id: "demo-item-task-1",
      name: "Visit brainOS site",
      body: "Visit brainOS site",
      type: "task",
      completed: true,
      completedDate: today,
      createdDate: today,
      collectionIds: ["demo-collection-personal"],
      dayIds: [dayId],
    },
    {
      id: "demo-item-task-2",
      name: "Edit text on today's page",
      body: "Edit text on today's page",
      type: "task",
      completed: false,
      createdDate: today,
      collectionIds: ["demo-collection-personal"],
      dayIds: [dayId],
    },
    {
      id: "demo-item-task-3",
      name: "Check out brainOS repo",
      body: "Check out brainOS repo",
      type: "task",
      completed: false,
      createdDate: today,
      collectionIds: ["demo-collection-personal"],
      dayIds: [dayId],
    },
    {
      id: "demo-item-task-4",
      name: "Email Cesar with any questions",
      body: "Email Cesar with any questions",
      type: "task",
      completed: false,
      createdDate: today,
      collectionIds: ["demo-collection-personal"],
      dayIds: [dayId],
    },
  ];
}

export function isDemoRequest(request: Request): boolean {
  return request.headers.get("x-demo-mode") === "1";
}

export function makeDemoDay(dateStr: string, overrideBody?: string): AirtableDay {
  const d = new Date(dateStr + "T00:00:00");
  const name = d.toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
  return {
    id: `demo-${dateStr}`,
    name,
    date: dateStr,
    body: overrideBody ?? (dateStr === localDateISO() ? DEMO_BODY : undefined),
    itemIds: [],
  };
}

export function makeDemoItem(data: {
  body: string;
  type: string;
  dayId: string;
  dueDate?: string;
  collectionIds?: string[];
}): AirtableItem {
  return {
    id: `demo-item-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name: data.body.split("\n")[0]?.trim() || "Untitled",
    body: data.body,
    type: data.type as "note" | "task" | "event",
    dueDate: data.dueDate,
    completed: false,
    createdDate: localDateISO(),
    collectionIds: data.collectionIds,
    dayIds: [data.dayId],
  };
}
