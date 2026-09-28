import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { Providers } from "./providers";
import { UserMenu } from "@/components/UserMenu";

export const metadata: Metadata = {
  title: "PianoFlow AI",
  description:
    "Turn any piano MIDI into a tutorial video, sheet music, and a beginner-friendly version.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-zinc-950 text-zinc-100 antialiased">
        <Providers>
          <header className="border-b border-zinc-800">
            <nav className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
              <div className="flex items-center gap-6">
                <Link href="/" className="font-bold tracking-tight">
                  <span aria-hidden="true">🎹</span> PianoFlow <span className="text-cyan-400">AI</span>
                </Link>
                <div className="flex gap-4 text-sm text-zinc-400">
                  <Link href="/create" className="hover:text-zinc-100">
                    Create
                  </Link>
                  <Link href="/projects" className="hover:text-zinc-100">
                    Projects
                  </Link>
                </div>
              </div>
              <UserMenu />
            </nav>
          </header>
          {children}
        </Providers>
      </body>
    </html>
  );
}
