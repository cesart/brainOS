export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getCollections } from "@/lib/airtable";

export async function GET() {
  try {
    const collections = await getCollections();
    return NextResponse.json(collections);
  } catch (_error) {
    return NextResponse.json({ error: "Failed to fetch collections" }, { status: 500 });
  }
}
