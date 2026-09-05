import type { Metadata, Viewport } from "next";
import "./globals.css";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";
import { ToastProvider } from "@/components/Toast";
import InstallPrompt from "@/components/InstallPrompt";
import VisitTracker from "@/components/VisitTracker";
import PullToRefresh from "@/components/PullToRefresh";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL || "https://ajvt-app.onrender.com"),
  title: "رابطة شباب التاكلالت",
  description: "منصة إدارة عضوية جمعية AJVT - التسجيل وبطاقات الأعضاء الرقمية",
  keywords: "AJVT, جمعية, عضوية, بطاقة عضو",
  manifest: "/manifest.json",
  openGraph: {
    title: "رابطة شباب التاكلالت",
    description: "منصة إدارة عضوية جمعية AJVT - التسجيل وبطاقات الأعضاء الرقمية",
    images: ["/icon-512.png"],
  },
};

export const viewport: Viewport = {
  themeColor: "#265c49",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl" data-scroll-behavior="smooth">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="min-h-screen flex flex-col">
        <ServiceWorkerRegister />
        <VisitTracker />
        <PullToRefresh />
        <ToastProvider>
          {children}
          <InstallPrompt />
        </ToastProvider>
      </body>
    </html>
  );
}
