export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getDays, getDayByDate, getOrCreateDayByDate } from "@/lib/airtable";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date");

    if (date) {
      const day = await getDayByDate(date);
      if (!day) return NextResponse.json({ error: "Day not found" }, { status: 404 });
      return NextResponse.json(day);
    }

    const days = await getDays();
    return NextResponse.json(days);
  } catch {
    return NextResponse.json({ error: "Failed to fetch days" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { date } = await request.json();
    if (!date) return NextResponse.json({ error: "date is required" }, { status: 400 });
    const day = await getOrCreateDayByDate(date);
    return NextResponse.json(day, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to create day" }, { status: 500 });
  }
}
