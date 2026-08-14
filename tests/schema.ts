import type { ZodType } from "zod";
import { parse } from "@/lib/validation";
import { HttpError } from "@/lib/errors";

export function rejectionOf<T>(schema: ZodType<T>, body: unknown): string {
  try {
    parse(schema, body);
  } catch (err) {
    if (err instanceof HttpError) return err.clientMessage;
    throw err;
  }
  throw new Error("expected the schema to reject this body");
}
