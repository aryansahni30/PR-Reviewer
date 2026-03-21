import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";

export const metadata: Metadata = {
  title: "PR Reviewer — Code Review That Actually Ships",
  description: "Paste any GitHub PR and get expert-level code review in under 30 seconds.",
  keywords: ["code review", "GitHub", "pull request", "code quality"],
  openGraph: {
    title: "PR Reviewer",
    description: "Paste a GitHub PR URL. Get a real code review.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body className="min-h-screen bg-midnight-base text-[#FDF8F5] antialiased font-sans">
        {children}
      </body>
    </html>
  );
}
