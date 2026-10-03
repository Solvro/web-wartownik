import type { ReportFormValues } from "@wartownik/shared/schemas/report";

import { queryClient } from "./query-client";
import { trpcClient } from "./trpc";

export const REPORT_MUTATION_KEY = ["reports", "create"] as const;

queryClient.setMutationDefaults(REPORT_MUTATION_KEY, {
  mutationFn: (values: ReportFormValues) =>
    trpcClient.reports.create.mutate(values),
  networkMode: "offlineFirst",
  retry: 3,
});
