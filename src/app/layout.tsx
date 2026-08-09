import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "جمعية AJVT - إدارة العضوية",
  description: "منصة إدارة عضوية جمعية AJVT - التسجيل وبطاقات الأعضاء الرقمية",
  keywords: "AJVT, جمعية, عضوية, بطاقة عضو",
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
