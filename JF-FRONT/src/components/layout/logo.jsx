"use client";

import { Bus } from 'lucide-react';
import { cn } from "@/lib/utils";

export function Logo({ className, showText = true }) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary">
        <Bus className="h-5 w-5 text-primary-foreground" />
      </div>
      {showText && (
        <span className="font-semibold text-lg tracking-tight">
          ExpresoJFTaller
        </span>
      )}
    </div>
  );
}