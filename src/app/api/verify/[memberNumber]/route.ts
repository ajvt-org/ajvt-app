import { NextResponse } from "next/server";

// This endpoint is no longer used in the new schema (no memberNumber field)
export async function GET() {
  return NextResponse.json({ valid: false, message: "هذا المسار غير متاح" }, { status: 410 });
}
