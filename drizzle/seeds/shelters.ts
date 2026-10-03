import { syncShelters } from "../../src/lib/services/shelters";

syncShelters()
  .then((count) => {
    console.log(`Synced ${count} shelters.`);
    process.exit(0);
  })
  .catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  });
