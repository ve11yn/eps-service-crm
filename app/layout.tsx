import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  description: "Internal business dashboard for WhatsApp-first CRM operations.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body>{children}</body>
    </html>
  );
}
