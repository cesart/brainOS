export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getOrCreateToday, localDateISO } from "@/lib/airtable";
import { isDemoRequest, makeDemoDay } from "@/lib/demo";

export async function GET(request: Request) {
  try {
    if (isDemoRequest(request)) return NextResponse.json(makeDemoDay(localDateISO()));
    const day = await getOrCreateToday();
    return NextResponse.json(day);
  } catch {
    return NextResponse.json({ error: "Failed to get today" }, { status: 500 });
  }
}
