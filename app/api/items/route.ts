import { NextResponse } from "next/server";
import { getItems, createItem } from "@/lib/airtable";

export async function GET() {
  try {
    const items = await getItems();
    return NextResponse.json(items);
  } catch {
    return NextResponse.json({ error: "Failed to fetch items" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    // Required: body (string), type, dayId
    if (!body.body || !body.type || !body.dayId) {
      return NextResponse.json(
        { error: "body, type, and dayId are required" },
        { status: 400 }
      );
    }
    const item = await createItem({
      body: body.body,
      type: body.type,
      dayId: body.dayId,
      dueDate: body.dueDate,
      collectionIds: body.collectionIds,
    });
    return NextResponse.json(item, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to create item" }, { status: 500 });
  }
}
