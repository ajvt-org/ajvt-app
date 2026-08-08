import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ø¬Ù…Ø¹ÙŠØ© AJVT - Ø¥Ø¯Ø§Ø±Ø© Ø§Ù„Ø¹Ø¶ÙˆÙŠØ©",
  description: "Ù…Ù†ØµØ© Ø¥Ø¯Ø§Ø±Ø© Ø¹Ø¶ÙˆÙŠØ© Ø¬Ù…Ø¹ÙŠØ© AJVT - Ø§Ù„ØªØ³Ø¬ÙŠÙ„ ÙˆØ¨Ø·Ø§Ù‚Ø§Øª Ø§Ù„Ø£Ø¹Ø¶Ø§Ø¡ Ø§Ù„Ø±Ù‚Ù…ÙŠØ©",
  keywords: "AJVT, Ø¬Ù…Ø¹ÙŠØ©, Ø¹Ø¶ÙˆÙŠØ©, Ø¨Ø·Ø§Ù‚Ø© Ø¹Ø¶Ùˆ",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" dir="rtl">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="min-h-screen flex flex-col">{children}</body>
    </html>
  );
}
