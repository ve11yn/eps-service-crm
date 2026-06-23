import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "EPS Services CRM",
  description: "Internal business dashboard for WhatsApp-first CRM operations.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
