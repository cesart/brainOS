import Airtable from "airtable";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(
  process.env.AIRTABLE_BASE_ID!
);

const ITEMS_TABLE = "tblpowlLwHkOWJrhJ";
const DAYS_TABLE = "tblSIblOyNCFhXIVR";

const ITEM_TEMPLATES = [
  { name: "Team standup", type: "event", body: "Daily sync with the team" },
  { name: "Review pull requests", type: "task", body: "" },
  { name: "Write design doc", type: "task", body: "Document the new architecture" },
  { name: "Idea: dark mode", type: "note", body: "Could use prefers-color-scheme + CSS variables" },
  { name: "1:1 with manager", type: "event", body: "Bi-weekly check-in" },
  { name: "Fix auth bug", type: "task", body: "Users getting logged out unexpectedly" },
  { name: "Read: SICP Chapter 3", type: "note", body: "Streams and lazy evaluation" },
  { name: "Deploy to production", type: "task", body: "After QA sign-off" },
  { name: "Doctor appointment", type: "event", body: "Annual checkup, 2pm" },
  { name: "Refactor API layer", type: "task", body: "Split into smaller modules" },
  { name: "Insight: use optimistic updates", type: "note", body: "Feels much snappier than waiting for server" },
  { name: "Sprint planning", type: "event", body: "Pick tickets for next sprint" },
  { name: "Write tests for payments", type: "task", body: "Edge cases: failed card, expired card" },
  { name: "Idea: keyboard shortcuts", type: "note", body: "Power users love them" },
  { name: "Call with client", type: "event", body: "Demo new features" },
  { name: "Update dependencies", type: "task", body: "Several packages flagged by audit" },
  { name: "Retro meeting", type: "event", body: "What went well, what didn't" },
  { name: "Research: vector DBs", type: "note", body: "Pinecone vs Weaviate vs pgvector" },
  { name: "Set up monitoring", type: "task", body: "Datadog for API latency" },
  { name: "Lunch with team", type: "event", body: "Celebrate ship week" },
];

function randomSubset<T>(arr: T[], min: number, max: number): T[] {
  const count = Math.floor(Math.random() * (max - min + 1)) + min;
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

async function seed() {
  console.log("Creating items...");

  // Create all items first
  const createdItems: { id: string; name: string }[] = [];
  for (const item of ITEM_TEMPLATES) {
    const record = await base(ITEMS_TABLE).create({
      Name: item.name,
      Type: item.type,
      ...(item.body && { Body: item.body }),
      Completed: false,
    });
    createdItems.push({ id: record.id, name: item.name });
    process.stdout.write(".");
  }
  console.log(`\n✓ Created ${createdItems.length} items`);

  console.log("Creating days for March 2026...");

  // Create a day for each day in March, skip days already created
  for (let day = 1; day <= 17; day++) {
    const dateStr = `2026-03-${String(day).padStart(2, "0")}`;
    const name = new Date(dateStr + "T12:00:00").toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

    // Assign 0-4 random items per day (weekends get fewer)
    const date = new Date(dateStr + "T12:00:00");
    const isWeekend = date.getDay() === 0 || date.getDay() === 6;
    const subset = randomSubset(createdItems, isWeekend ? 0 : 1, isWeekend ? 2 : 4);

    await base(DAYS_TABLE).create({
      Name: name,
      Date: dateStr,
      ...(subset.length > 0 && { Items: subset.map((i) => i.id) }),
    });
    process.stdout.write(".");
  }

  console.log("\n✓ Created 17 days (Mar 1–17)");
  console.log("\nDone! Refresh localhost:3000 to see today's items.");
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
