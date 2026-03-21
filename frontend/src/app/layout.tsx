import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "PR Code Reviewer — AI-Powered GitHub PR Analysis",
  description:
    "Analyze GitHub Pull Requests with Claude AI. Get instant feedback on code quality, bugs, and suggestions.",
  keywords: ["code review", "AI", "GitHub", "pull request", "Claude", "Anthropic"],
  openGraph: {
    title: "PR Code Reviewer",
    description: "AI-powered GitHub PR analysis using Claude",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} dark`}>
      <body className="min-h-screen bg-gray-950 text-white antialiased font-sans">
        {children}
      </body>
    </html>
  );
}
