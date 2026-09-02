import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pflege Admin — Medication Reminders",
  description: "Medication reminder dashboard for care staff",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-paper text-ink antialiased">{children}</body>
    </html>
  );
}
