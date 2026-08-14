import { NextResponse } from "next/server";
import { HttpError } from "./errors";

export function withRoute<Args extends unknown[]>(
  name: string,
  handler: (...args: Args) => Promise<NextResponse>,
) {
  return async (...args: Args): Promise<NextResponse> => {
    try {
      return await handler(...args);
    } catch (err) {
      if (err instanceof HttpError) {
        return NextResponse.json({ error: err.clientMessage }, { status: err.status });
      }
      console.error(`${name} error:`, err);
      return NextResponse.json({ error: "خطأ في الخادم" }, { status: 500 });
    }
  };
}
