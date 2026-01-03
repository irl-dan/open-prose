import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "OpenProse - A new kind of language for a new kind of computer",
  description: "A programming language for AI agent sessions. Intelligent IoC—declare agents and control flow, let the session wire them up.",
  keywords: ["AI agents", "programming language", "LLM", "Claude Code", "OpenProse", "intelligent IoC", "agent sessions"],
  authors: [{ name: "OpenProse" }],
  openGraph: {
    title: "OpenProse - A new kind of language for a new kind of computer",
    description: "A programming language for AI agent sessions. Intelligent IoC—declare agents and control flow, let the session wire them up.",
    type: "website",
    url: "https://prose.md",
  },
  twitter: {
    card: "summary_large_image",
    title: "OpenProse - A new kind of language for a new kind of computer",
    description: "A programming language for AI agent sessions.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="paper-texture">
        {children}
      </body>
    </html>
  );
}
