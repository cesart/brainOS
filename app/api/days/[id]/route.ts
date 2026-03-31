export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getDay, updateDay, localDateISO } from "@/lib/airtable";
import { isDemoRequest, makeDemoDay } from "@/lib/demo";

function dateFromDemoId(id: string): string {
  return id.startsWith("demo-") ? id.slice(5) : localDateISO();
}

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    if (isDemoRequest(request)) return NextResponse.json(makeDemoDay(dateFromDemoId(params.id)));
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
    if (isDemoRequest(request)) {
      const date = dateFromDemoId(params.id);
      return NextResponse.json({ ...makeDemoDay(date, body.body) });
    }
    const day = await updateDay(params.id, { body: body.body });
    return NextResponse.json(day);
  } catch {
    return NextResponse.json({ error: "Failed to update day" }, { status: 500 });
  }
}
