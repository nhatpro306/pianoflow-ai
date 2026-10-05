"use client";

import { useState } from "react";
import { Menu } from "lucide-react";
import { MobileNavDrawer } from "./MobileNavDrawer";

export function MobileNav() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="md:hidden">
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center justify-center rounded-lg p-2 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100 focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:outline-none transition-colors"
        aria-label="Open navigation menu"
        aria-expanded={isOpen}
      >
        <Menu className="h-5 w-5" />
      </button>

      <MobileNavDrawer isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </div>
  );
}
