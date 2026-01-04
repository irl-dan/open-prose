import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "OpenProse - A new kind of language for a new kind of computer",
  description: "An AI session is a Turing-complete computer. OpenProse is a programming language for it. Structure English into unambiguous control flow—the session is the runtime.",
  keywords: ["AI agents", "programming language", "LLM", "Claude Code", "OpenProse", "intelligent IoC", "agent orchestration", "multi-agent workflows"],
  authors: [{ name: "OpenProse" }],
  metadataBase: new URL("https://www.prose.md"),
  openGraph: {
    title: "OpenProse",
    description: "An AI session is a Turing-complete computer. OpenProse is a programming language for it.",
    type: "website",
    url: "https://prose.md",
    siteName: "OpenProse",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "OpenProse - A new kind of language for a new kind of computer",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "OpenProse",
    description: "An AI session is a Turing-complete computer. OpenProse is a programming language for it.",
    creator: "@openprose",
    images: ["/og-image.png"],
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
