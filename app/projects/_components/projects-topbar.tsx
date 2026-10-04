"use client";

import { AccountMenu } from "@/app/projects/_components/account-menu";
import { Bell, Settings } from "lucide-react";
import Link from "next/link";

export function BrandMark() {
  return (
    <Link href="/projects" className="flex items-center gap-2.5" aria-label="Spotibase home">
      <span className="relative flex h-8 w-8 items-center justify-center rounded-[9px] bg-gradient-to-br from-[#ff7186] via-[#fd4f6a] to-[#b8253f] shadow-[0_6px_18px_-6px_rgba(253,79,106,0.8)]">
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden="true">
          <path d="M4 5l8 14 8-14" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="12" cy="9" r="1.8" fill="#fff" />
        </svg>
      </span>
      <span className="studio-heading text-xl leading-none">Spotibase</span>
    </Link>
  );
}

export function ProjectsTopbar() {
  return (
    <header className="sticky top-0 z-40 border-b border-[var(--studio-line)] bg-[rgba(9,15,31,0.86)] backdrop-blur-xl">
      <div className="mx-auto flex h-14 w-full max-w-[1320px] items-center justify-between gap-3 px-4 sm:h-16 sm:px-6 lg:px-8">
        <BrandMark />

        <div className="flex items-center gap-1">
          <button type="button" className="studio-icon-btn" aria-label="Notifications" title="Notifications (coming soon)">
            <Bell />
          </button>
          <button type="button" className="studio-icon-btn" aria-label="Settings" title="Settings (coming soon)">
            <Settings />
          </button>
          <AccountMenu />
        </div>
      </div>
    </header>
  );
}
