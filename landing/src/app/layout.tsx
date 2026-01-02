import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "prose.md - Declarative Agents, Intelligent Runtime",
  description: "An open standard for AI orchestration. Declare your agent architecture, let an intelligent interpreter wire it up. No framework lock-in—works with Claude Code, OpenCode, Codex, and more.",
  keywords: ["AI agents", "orchestration", "LLM", "declarative", "Claude Code", "OpenProse", "agent framework", "intelligent IoC"],
  authors: [{ name: "OpenProse" }],
  openGraph: {
    title: "prose.md - Declarative Agents, Intelligent Runtime",
    description: "An open standard for AI orchestration. Declare your agent architecture, let an intelligent interpreter wire it up.",
    type: "website",
    url: "https://prose.md",
  },
  twitter: {
    card: "summary_large_image",
    title: "prose.md - Declarative Agents, Intelligent Runtime",
    description: "An open standard for AI orchestration. No framework lock-in.",
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
