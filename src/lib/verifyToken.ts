import { randomBytes } from "crypto";

export function generateVerifyToken(): string {
  return randomBytes(16).toString("hex");
}
