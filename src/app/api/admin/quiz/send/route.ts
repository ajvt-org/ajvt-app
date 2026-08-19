import { NextResponse } from "next/server";
import { requireAdminRole } from "@/lib/auth";
import { withRoute } from "@/lib/route";
import { RETIRED } from "@/lib/quizNotify";

export const POST = withRoute("POST /api/admin/quiz/send", async () => {
  await requireAdminRole("QUIZ");
  return NextResponse.json({ error: RETIRED }, { status: 410 });
});
