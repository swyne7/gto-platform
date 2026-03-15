import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "@/components/layout/Sidebar";

export const metadata: Metadata = {
  title: "GTO Platform",
  description: "Poker GTO training platform",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="flex min-h-screen antialiased" style={{ background: "var(--background)" }}>
        <Sidebar />
        <main className="flex-1 ml-56 p-6 min-h-screen">
          {children}
        </main>
      </body>
    </html>
  );
}
