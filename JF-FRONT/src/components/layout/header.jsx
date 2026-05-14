"use client"

import { ModeToggle } from "./mode-toggle"
import { GlobalSearch } from "./global-search"
import { Notifications } from "./notifications"
import { UserMenu } from "./user-menu"
import { Breadcrumbs } from "./breadcrumbs"
import { cn } from "@/lib/utils"
import Image from "next/image"

export function Header({ className }) {
  return (
    <div className="flex flex-col">
      <header className={cn("flex h-14 items-center gap-3 border-b bg-background px-4", className)}>
        {/* Logo solo visible en mobile (sidebar oculto) */}
        <div className="flex items-center gap-2 md:hidden">
          <Image src="/icon.png" alt="ExpresoJF Logo" width={28} height={28} className="rounded-md object-contain" priority />
          <span className="font-semibold text-sm">ExpresoJF</span>
        </div>

        <div className="flex-1" />

        <div className="flex items-center gap-1.5">
          <GlobalSearch />
          <Notifications />
          <ModeToggle />
          <UserMenu />
        </div>
      </header>
      <div className="px-4 pt-3 md:pt-4 md:px-6">
        <Breadcrumbs />
      </div>
    </div>
  )
}

