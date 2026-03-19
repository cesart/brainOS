import { NextResponse } from "next/server";
import { getCollection } from "@/lib/airtable";

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const collection = await getCollection(params.id);
    return NextResponse.json(collection);
  } catch (_error) {
    return NextResponse.json({ error: "Collection not found" }, { status: 404 });
  }
}
