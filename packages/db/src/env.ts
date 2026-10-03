import { config } from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

export function loadRootEnv() {
  const root = path.resolve(
    fileURLToPath(new URL("../../..", import.meta.url)),
  );
  config({ path: path.join(root, ".env.local"), quiet: true });
}
