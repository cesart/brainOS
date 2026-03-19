import { NextResponse } from "next/server";
import { getItem, updateItem, deleteItem } from "@/lib/airtable";

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
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
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await deleteItem(params.id);
    return new NextResponse(null, { status: 204 });
  } catch {
    return NextResponse.json({ error: "Failed to delete item" }, { status: 500 });
  }
}
