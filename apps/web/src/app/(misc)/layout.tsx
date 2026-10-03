import Link from "next/link";
import type { ReactNode } from "react";

import { Brand } from "@/components/brand";

export default function MiscLayout({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto flex min-h-dvh max-w-3xl flex-col px-5">
      <header className="py-5">
        <Link href="/">
          <Brand />
        </Link>
      </header>
      <main className="flex-1 py-10">{children}</main>
    </div>
  );
}
