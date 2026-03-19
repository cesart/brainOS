import Airtable from "airtable";
import { readFileSync } from "fs";

const env = readFileSync(".env.local", "utf8");
for (const line of env.split("\n")) {
  const [key, ...rest] = line.split("=");
  if (key && rest.length) process.env[key.trim()] = rest.join("=").trim();
}

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(
  process.env.AIRTABLE_BASE_ID
);

const ITEMS_TABLE = "tblpowlLwHkOWJrhJ";

const NEW_CONTENT = [
  { body: "Send follow-up email to Stripe recruiter\nReached out last Tuesday, haven't heard back." },
  { body: "Prep for system design interview\nReview: distributed systems, CAP theorem, consistent hashing." },
  { body: "Update resume with BrainOS project\nHighlight: Next.js, Airtable API, full-stack solo build." },
  { body: "Coffee chat with Maya (ex-Notion)\nAsked for 30 min to learn about their growth eng team." },
  { body: "Research Linear's engineering culture\nCheck their eng blog, recent talks, and open roles." },
  { body: "Practice behavioral questions\nFocus: conflict resolution, times I disagreed with a decision." },
  { body: "Note: companies to track\nVercel, Linear, Notion, Raycast, Loom — all doing interesting product-led work." },
  { body: "Review offer from Acme Co\nCompare: base, equity, remote policy, growth trajectory." },
  { body: "Phone screen with Figma\n11am PST. Hiring manager: Sarah Chen." },
  { body: "Write cover letter for Loom\nEmphasize async communication angle — aligns with their mission." },
  { body: "Book dentist appointment\nOverdue by 3 months. Check if Dr. Kim is still in-network." },
  { body: "Renew gym membership\nExpires end of March." },
  { body: "Call mom\nHaven't caught up since the move." },
  { body: "Grocery run\nRunning low on coffee, eggs, olive oil." },
  { body: "Read: Designing Data-Intensive Applications\nOn chapter 5 — replication." },
  { body: "Walk in Prospect Park\nAiming for 30 min in the morning before job apps." },
  { body: "Fix leaky kitchen faucet\nBeen dripping for a week. Watch a YouTube tutorial first." },
  { body: "Idea: BrainOS daily digest email\nSend myself a morning summary of today's items." },
  { body: "Watch Raycast demo from Config 2024" },
  { body: "Reply to Alex re: freelance project\nHe wants a quick landing page by end of month." },
];

async function seed() {
  console.log("Fetching existing items...");
  const records = await base(ITEMS_TABLE).select().all();
  console.log(`Found ${records.length} items, updating with new content...`);

  for (let i = 0; i < Math.min(records.length, NEW_CONTENT.length); i++) {
    const { body } = NEW_CONTENT[i];
    const name = body.split("\n")[0].trim();
    await base(ITEMS_TABLE).update(records[i].id, { Name: name, Body: body });
    process.stdout.write(".");
  }

  console.log(`\n✓ Updated ${Math.min(records.length, NEW_CONTENT.length)} items`);
  console.log("Done!");
}

seed().catch((err) => { console.error(err); process.exit(1); });
