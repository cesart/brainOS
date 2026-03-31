export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getItem, updateItem, deleteItem } from "@/lib/airtable";
import { isDemoRequest } from "@/lib/demo";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    if (isDemoRequest(request)) return NextResponse.json({ error: "Item not found" }, { status: 404 });
    const item = await getItem(params.id);
    return NextResponse.json(item);
  } catch {
    return NextResponse.json({ error: "Item not found" }, { status: 404 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    if (isDemoRequest(request)) {
      // Return a synthetic item reflecting the update — client uses optimistic state
      // so fields not included in the PATCH are already correct in local state.
      return NextResponse.json({
        id: params.id,
        name: body.body?.split("\n")[0]?.trim() || "Untitled",
        body: body.body,
        type: body.type,
        dueDate: body.dueDate ?? undefined,
        completed: body.completed ?? false,
        collectionIds: body.collectionIds ?? [],
        dayIds: [],
      });
    }
    const item = await updateItem(params.id, {
      body: body.body,
      type: body.type,
      dueDate: body.dueDate,
      completed: body.completed,
      collectionIds: body.collectionIds,
    });
    return NextResponse.json(item);
  } catch {
    return NextResponse.json({ error: "Failed to update item" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    if (isDemoRequest(request)) return new NextResponse(null, { status: 204 });
    await deleteItem(params.id);
    return new NextResponse(null, { status: 204 });
  } catch {
    return NextResponse.json({ error: "Failed to delete item" }, { status: 500 });
  }
}
