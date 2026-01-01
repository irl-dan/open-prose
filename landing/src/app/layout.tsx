import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "prose.md - Talk to Your Programs",
  description: "A novel programming language for orchestrating AI agent sessions. Write programs that understand prose, with an intelligent interpreter that evaluates semantic conditions.",
  keywords: ["AI agents", "programming language", "LLM", "orchestration", "prose", "semantic programming"],
  authors: [{ name: "prose.md" }],
  openGraph: {
    title: "prose.md - Talk to Your Programs",
    description: "A novel programming language for orchestrating AI agent sessions. Break the fourth wall and speak directly to your computer.",
    type: "website",
    url: "https://prose.md",
  },
  twitter: {
    card: "summary_large_image",
    title: "prose.md - Talk to Your Programs",
    description: "A novel programming language for orchestrating AI agent sessions.",
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
