import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_BASE_URL || "https://ajvt-app.onrender.com"
  ),
  title: "رابطة شباب التاكلالت",
  description: "منصة إدارة عضوية جمعية AJVT - التسجيل وبطاقات الأعضاء الرقمية",
  keywords: "AJVT, جمعية, عضوية, بطاقة عضو",
  openGraph: {
    title: "رابطة شباب التاكلالت",
    description: "منصة إدارة عضوية جمعية AJVT - التسجيل وبطاقات الأعضاء الرقمية",
    images: ["/version-final.png"],
  },
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
