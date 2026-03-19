import Airtable from "airtable";

const base = new Airtable({
  apiKey: process.env.AIRTABLE_API_KEY,
}).base(process.env.AIRTABLE_BASE_ID!);

export const TABLES = {
  ITEMS: "tblpowlLwHkOWJrhJ",
  DAYS: "tblSIblOyNCFhXIVR",
  COLLECTIONS: "tblSBQrAVKlNNZ2LS",
} as const;

// Field IDs for writes (immune to field renames in Airtable)
const FIELDS = {
  ITEMS: {
    NAME: "fldNdz4xRZmJ7ZE5D",
    BODY: "fldMs8gnhmgpDwhKu",
    TYPE: "fldlAy4l7dydv6zrP",
    DUE_DATE: "fldHfEWET20rCSeqa",
    COMPLETED: "fldddpFYA0f1N8KyE",
    CREATED_DATE: "fldq5uEy5NNFB88x9",
    COLLECTION: "fldfHvzyaxDIfKKGB",
    DAY: "fldpTt7AIKEuzO94l",
  },
  DAYS: {
    NAME: "fldt6hPYoD6ADeyJW",
    DATE: "fld7pmYTScQlG65id",
    ITEMS: "fld4sl12FR4aceZ50",
    BODY: "fldOuWM1sTTObwTeA",
  },
  COLLECTIONS: {
    NAME: "fldGweEEt9gWK8UQP",
    DESCRIPTION: "fld46jWORJgbfXK5s",
    ITEMS: "fldCz7YKemgCCF1h7",
  },
} as const;

export type ItemType = "note" | "task" | "event";

export interface AirtableItem {
  id: string;
  name: string;
  body?: string;
  type?: ItemType;
  dueDate?: string;
  completed: boolean;
  createdDate?: string;
  collectionIds?: string[];
  dayIds?: string[];
}

export interface AirtableDay {
  id: string;
  name: string;
  date?: string;
  body?: string;
  itemIds?: string[];
}

export function localDateISO(offsetDays = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export interface AirtableCollection {
  id: string;
  name: string;
  description?: string;
  createdDate?: string;
  itemIds?: string[];
}

// Name is always derived from the first line of body
export function nameFromBody(body: string): string {
  return body.split("\n")[0]?.trim() || "Untitled";
}


// ─── Items ────────────────────────────────────────────────────────────────────

function mapItem(r: Airtable.Record<Airtable.FieldSet>): AirtableItem {
  return {
    id: r.id,
    name: r.get("Name") as string,
    body: r.get("Body") as string | undefined,
    type: r.get("Type") as ItemType | undefined,
    dueDate: r.get("Due Date") as string | undefined,
    completed: (r.get("Completed") as boolean) ?? false,
    createdDate: r.get("Created Date") as string | undefined,
    collectionIds: r.get("Collection") as string[] | undefined,
    dayIds: r.get("Day") as string[] | undefined,
  };
}

export async function getItems(): Promise<AirtableItem[]> {
  const records = await base(TABLES.ITEMS).select().all();
  return records.map(mapItem);
}

export async function getItem(id: string): Promise<AirtableItem> {
  return mapItem(await base(TABLES.ITEMS).find(id));
}

export async function createItem(data: {
  body: string;
  type: ItemType;
  dayId: string;
  dueDate?: string;
  collectionIds?: string[];
}): Promise<AirtableItem> {
  const name = nameFromBody(data.body);
  const fields: Record<string, unknown> = {
    [FIELDS.ITEMS.NAME]: name,
    [FIELDS.ITEMS.BODY]: data.body,
    [FIELDS.ITEMS.TYPE]: data.type,
    [FIELDS.ITEMS.DAY]: [data.dayId],
    [FIELDS.ITEMS.COMPLETED]: false,
    [FIELDS.ITEMS.CREATED_DATE]: localDateISO(),
  };
  // Only set Due Date for tasks and events
  if (data.dueDate && (data.type === "task" || data.type === "event")) {
    fields[FIELDS.ITEMS.DUE_DATE] = data.dueDate;
  }
  if (data.collectionIds?.length) {
    fields[FIELDS.ITEMS.COLLECTION] = data.collectionIds;
  }
  const r = await base(TABLES.ITEMS).create(fields as Airtable.FieldSet);
  return getItem(r.id);
}

export async function updateItem(
  id: string,
  data: {
    body?: string;
    type?: ItemType;
    dueDate?: string | null;
    completed?: boolean;
    collectionIds?: string[];
  }
): Promise<AirtableItem> {
  const fields: Record<string, unknown> = {};
  if (data.body !== undefined) {
    fields[FIELDS.ITEMS.BODY] = data.body;
    fields[FIELDS.ITEMS.NAME] = nameFromBody(data.body);
  }
  if (data.type !== undefined) fields[FIELDS.ITEMS.TYPE] = data.type;
  if (data.dueDate !== undefined) fields[FIELDS.ITEMS.DUE_DATE] = data.dueDate ?? "";
  if (data.completed !== undefined) fields[FIELDS.ITEMS.COMPLETED] = data.completed;
  if (data.collectionIds !== undefined) fields[FIELDS.ITEMS.COLLECTION] = data.collectionIds;
  await base(TABLES.ITEMS).update(id, fields as Airtable.FieldSet);
  return getItem(id);
}

export async function deleteItem(id: string): Promise<void> {
  await base(TABLES.ITEMS).destroy(id);
}

// ─── Days ─────────────────────────────────────────────────────────────────────

function mapDay(r: Airtable.Record<Airtable.FieldSet>): AirtableDay {
  return {
    id: r.id,
    name: r.get("Name") as string,
    date: r.get("Date") as string | undefined,
    body: r.get("Body") as string | undefined,
    itemIds: r.get("Items") as string[] | undefined,
  };
}

export async function getDays(): Promise<AirtableDay[]> {
  const records = await base(TABLES.DAYS).select().all();
  return records.map(mapDay);
}

export async function getDay(id: string): Promise<AirtableDay> {
  return mapDay(await base(TABLES.DAYS).find(id));
}

export async function updateDay(id: string, data: { body?: string }): Promise<AirtableDay> {
  const fields: Record<string, unknown> = {};
  if (data.body !== undefined) fields[FIELDS.DAYS.BODY] = data.body;
  await base(TABLES.DAYS).update(id, fields as Airtable.FieldSet);
  return getDay(id);
}

export async function getOrCreateDayByDate(dateStr: string): Promise<AirtableDay> {
  const existing = await getDayByDate(dateStr);
  if (existing) return existing;
  const d = new Date(dateStr + "T00:00:00");
  const name = d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  const r = await base(TABLES.DAYS).create({
    [FIELDS.DAYS.NAME]: name,
    [FIELDS.DAYS.DATE]: dateStr,
  } as Airtable.FieldSet);
  return mapDay(r);
}

export async function getDayByDate(dateStr: string): Promise<AirtableDay | null> {
  const days = await getDays();
  return days.find((d) => d.date === dateStr) ?? null;
}

export async function getOrCreateToday(): Promise<AirtableDay> {
  const today = localDateISO();
  const existing = await getDayByDate(today);
  if (existing) return existing;

  const name = new Date().toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const r = await base(TABLES.DAYS).create({
    [FIELDS.DAYS.NAME]: name,
    [FIELDS.DAYS.DATE]: today,
  } as Airtable.FieldSet);
  return mapDay(r);
}

// ─── Collections ──────────────────────────────────────────────────────────────

function mapCollection(r: Airtable.Record<Airtable.FieldSet>): AirtableCollection {
  return {
    id: r.id,
    name: r.get("Name") as string,
    description: r.get("Description") as string | undefined,
    createdDate: r.get("Created Date") as string | undefined,
    itemIds: r.get("Items") as string[] | undefined,
  };
}

export async function getCollections(): Promise<AirtableCollection[]> {
  const records = await base(TABLES.COLLECTIONS).select().all();
  return records.map(mapCollection);
}

export async function getCollection(id: string): Promise<AirtableCollection> {
  return mapCollection(await base(TABLES.COLLECTIONS).find(id));
}
