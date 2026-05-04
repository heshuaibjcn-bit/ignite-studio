import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "燃启工作室 — AI短视频创作平台",
  description: "AI驱动的短剧创作、数字人口播、混剪一体化制作平台",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="zh-CN"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <TooltipProvider>
          <div className="flex flex-1 min-h-0">
            <Sidebar />
            <div className="flex flex-1 flex-col min-w-0">
              <Header />
              <main className="flex-1 overflow-auto p-4 md:p-6">
                {children}
              </main>
            </div>
          </div>
        </TooltipProvider>
        <Toaster />
      </body>
    </html>
  );
}
