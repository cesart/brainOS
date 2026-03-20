export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getDay, updateDay } from "@/lib/airtable";

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const day = await getDay(params.id);
    return NextResponse.json(day);
  } catch {
    return NextResponse.json({ error: "Day not found" }, { status: 404 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const day = await updateDay(params.id, { body: body.body });
    return NextResponse.json(day);
  } catch {
    return NextResponse.json({ error: "Failed to update day" }, { status: 500 });
  }
}
