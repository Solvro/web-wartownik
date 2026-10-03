import type { LucideProps } from "lucide-react";

import { ICONS } from "@/config/icons";
import type { IconName } from "@/config/icons";

export function Icon({ name, ...props }: LucideProps & { name: IconName }) {
  const Component = ICONS[name].component;
  return <Component {...props} />;
}
