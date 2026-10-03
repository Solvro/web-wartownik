import { cn } from "@/lib/utils";

const LOGO_PATH =
  "M12 2.2 19.8 5.1c.4.15.6.5.6.9v5.4c0 5.1-3.4 8.8-7.9 10.8a1.2 1.2 0 0 1-1 0C7 20.2 3.6 16.5 3.6 11.4V6c0-.4.25-.75.6-.9Z M6.25 11.6a5.75 5.75 0 1 0 11.5 0a5.75 5.75 0 1 0 -11.5 0Z M7.55 11.6a4.45 4.45 0 1 0 8.9 0a4.45 4.45 0 1 0 -8.9 0Z M12 11.6V7.9A3.7 3.7 0 0 1 15.2 9.75Z M8.75 13.3a0.95 0.95 0 1 0 1.9 0a0.95 0.95 0 1 0 -1.9 0Z";

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className}>
      <path fill="currentColor" fillRule="evenodd" d={LOGO_PATH} />
    </svg>
  );
}

export function Brand({ className }: { className?: string }) {
  return (
    <span className={cn("flex items-center gap-2", className)}>
      <span className="flex size-8 items-center justify-center rounded-lg bg-linear-to-br from-blue-500 to-blue-700 text-white shadow-md shadow-blue-600/30">
        <LogoMark className="size-5" />
      </span>
      <span className="text-[17px] font-semibold tracking-tight">
        Wartownik
      </span>
    </span>
  );
}
