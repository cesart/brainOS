export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getItems, createItem } from "@/lib/airtable";
import { isDemoRequest, makeDemoItem } from "@/lib/demo";

export async function GET(request: Request) {
  try {
    if (isDemoRequest(request)) return NextResponse.json([]);
    const items = await getItems();
    return NextResponse.json(items);
  } catch {
    return NextResponse.json({ error: "Failed to fetch items" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!body.body || !body.type || !body.dayId) {
      return NextResponse.json(
        { error: "body, type, and dayId are required" },
        { status: 400 }
      );
    }
    if (isDemoRequest(request)) return NextResponse.json(makeDemoItem(body), { status: 201 });
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
