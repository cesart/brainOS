import { NextResponse } from "next/server";
import { getOrCreateToday } from "@/lib/airtable";

export async function GET() {
  try {
    const day = await getOrCreateToday();
    return NextResponse.json(day);
  } catch {
    return NextResponse.json({ error: "Failed to get today" }, { status: 500 });
  }
}
