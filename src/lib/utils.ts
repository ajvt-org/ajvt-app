import { prisma } from "./prisma";

export async function generateMemberNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const count = await prisma.member.count();
  const seq = String(count + 1).padStart(4, "0");
  return `AJVT-${year}-${seq}`;
}

export function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString("ar-DZ", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export const CITIES = [
  "Ø§Ù„Ø¬Ø²Ø§Ø¦Ø± Ø§Ù„Ø¹Ø§ØµÙ…Ø©",
  "ÙˆÙ‡Ø±Ø§Ù†",
  "Ù‚Ø³Ù†Ø·ÙŠÙ†Ø©",
  "Ø¹Ù†Ø§Ø¨Ø©",
  "Ø¨Ø¬Ø§ÙŠØ©",
  "ØªÙŠØ²ÙŠ ÙˆØ²Ùˆ",
  "Ø³Ø·ÙŠÙ",
  "Ø¨Ø§ØªÙ†Ø©",
  "ØªÙ„Ù…Ø³Ø§Ù†",
  "Ø¨Ø³ÙƒØ±Ø©",
  "Ø§Ù„Ù…Ø³ÙŠÙ„Ø©",
  "Ø¨Ø±Ø¬ Ø¨ÙˆØ¹Ø±ÙŠØ±ÙŠØ¬",
  "Ø§Ù„Ø£ØºÙˆØ§Ø·",
  "Ø§Ù„Ø£ÙˆØ±Ø§Ø³",
  "Ø§Ù„Ø´Ù„Ù",
  "ØªØ¨Ø³Ø©",
  "Ø¬ÙŠØ¬Ù„",
  "Ø³ÙƒÙŠÙƒØ¯Ø©",
  "Ø³ÙˆÙ‚ Ø£Ù‡Ø±Ø§Ø³",
  "ØªÙŠØ§Ø±Øª",
  "Ø§Ù„Ø¬Ù„ÙØ©",
  "Ø®Ù†Ø´Ù„Ø©",
  "Ù…ÙŠÙ„Ø©",
  "Ø£Ø®Ø±Ù‰",
];
