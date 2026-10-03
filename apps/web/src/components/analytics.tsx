import Script from "next/script";

import { env } from "@/env";

export function Analytics() {
  const src = env.NEXT_PUBLIC_ANALYTICS_SRC;
  const websiteId = env.NEXT_PUBLIC_ANALYTICS_WEBSITE_ID;
  if (src === undefined || websiteId === undefined) {
    return null;
  }
  return (
    <Script
      defer
      src={src}
      data-website-id={websiteId}
      data-domains={new URL(env.NEXT_PUBLIC_SITE_URL).hostname}
    />
  );
}
