import { ShieldHalf } from "lucide-react";

import { cn } from "@/lib/utils";

export function Brand({ className }: { className?: string }) {
  return (
    <span className={cn("flex items-center gap-2", className)}>
      <span className="flex size-8 items-center justify-center rounded-lg bg-linear-to-br from-blue-500 to-blue-700 text-white shadow-md shadow-blue-600/30">
        <ShieldHalf className="size-4.5" strokeWidth={2.25} />
      </span>
      <span className="text-[17px] font-semibold tracking-tight">
        Wartownik
      </span>
    </span>
  );
}
