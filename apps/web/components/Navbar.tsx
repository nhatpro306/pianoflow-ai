"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { useUserProgress } from "@/lib/hooks";
import { Button } from "@/components/ui/Button";
import { UserMenu } from "@/components/UserMenu";
import { MobileNav } from "@/components/MobileNav";

interface NavLinkItem {
  href: string;
  label: string;
}

const NAV_ITEMS: NavLinkItem[] = [
  { href: "/", label: "Home" },
  { href: "/songs", label: "Songs" },
  { href: "/create", label: "Create" },
  { href: "/projects", label: "Projects" },
  { href: "/pricing", label: "Pricing" },
];

export function Navbar() {
  const pathname = usePathname();
  const { user } = useAuth();
  const { data: progressData } = useUserProgress();

  const streakDays =
    progressData?.current_streak_days && progressData.current_streak_days > 0
      ? progressData.current_streak_days
      : 1;

  const isRouteActive = (href: string) => {
    if (href === "/") {
      return pathname === "/";
    }
    if (href === "/songs") {
      return (
        pathname === "/songs" ||
        pathname.startsWith("/songs/") ||
        pathname === "/demo" ||
        pathname.startsWith("/demo/")
      );
    }
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  return (
    <header className="sticky top-0 z-50 border-b border-white/5 bg-[#050507]/80 backdrop-blur-xl transition-colors duration-200">
      <nav
        aria-label="Desktop navigation"
        className="relative mx-auto flex h-14 max-w-6xl items-center justify-between px-6"
      >
        {/* Brand & Desktop Links */}
        <div className="flex items-center gap-6">
          <Link
            href="/"
            className="flex items-center gap-2 font-bold tracking-tight text-zinc-100 hover:text-white transition-colors"
          >
            <span className="text-lg select-none" aria-hidden="true">
              🎹
            </span>
            <span>
              PianoFlow <span className="text-cyan-400">AI</span>
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-1">
            {NAV_ITEMS.map((item) => {
              const active = isRouteActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  data-testid={`nav-link-${item.label.toLowerCase()}`}
                  data-active={active ? "true" : "false"}
                  className={`rounded-full px-3 py-1.5 text-sm transition-all duration-150 select-none ${
                    active
                      ? "text-white bg-white/10 font-semibold shadow-inner border border-white/10"
                      : "text-zinc-400 hover:text-zinc-200 hover:bg-white/5"
                  }`}
                >
                  {item.label}
                  {item.href === "/songs" && (
                    <span
                      data-testid="nav-link-demo"
                      data-active={active ? "true" : "false"}
                      className={active ? "bg-white/10 sr-only" : "sr-only"}
                      aria-hidden="true"
                    />
                  )}
                </Link>
              );
            })}
          </div>
        </div>

        {/* Right Action Cluster */}
        <div className="flex items-center gap-3">
          {/* Persistent Streak & Level Pill */}
          <Link
            href="/projects"
            data-testid="navbar-streak-pill"
            aria-label={`Current practice streak: ${streakDays} days`}
            className="flex items-center gap-1.5 rounded-full bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-300 border border-amber-500/20 hover:bg-amber-500/20 shadow-[0_0_12px_rgba(245,158,11,0.15)] transition-all select-none"
          >
            <span className="text-sm" aria-hidden="true">
              🔥
            </span>
            <span>{streakDays}d</span>
          </Link>

          {/* Upgrade CTA */}
          <Link href="/create" className="hidden sm:inline-flex">
            <Button
              variant="gradient"
              size="sm"
              data-testid="navbar-cta-button"
            >
              {user ? "New Project" : "Start Free"}
            </Button>
          </Link>

          {/* User Menu */}
          <UserMenu />

          {/* Mobile Drawer Trigger */}
          <MobileNav />
        </div>
      </nav>
    </header>
  );
}
