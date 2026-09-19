import { NextResponse } from "next/server";
import { buildDashboard } from "@/lib/dashboard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
async function respond(insightNote = "") {
  try {
    return NextResponse.json(await buildDashboard(insightNote), { headers: { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
  } catch {
    return NextResponse.json({ error: "We couldn't retrieve your RescueTime activity." }, { status: 502, headers: { "Cache-Control": "no-store" } });
  }
}
export async function GET() { return respond(); }

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();
    if (!body || typeof body !== "object" || !("insightNote" in body) ||
      typeof body.insightNote !== "string" || body.insightNote.length > 400) {
      return NextResponse.json({ error: "Please use a note of 400 characters or fewer." }, { status: 400 });
    }
    return respond(body.insightNote.trim());
  } catch {
    return NextResponse.json({ error: "Please provide a valid insight note." }, { status: 400 });
  }
}
