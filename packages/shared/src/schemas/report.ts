import { z } from "zod";

import {
  REPORT_DESCRIPTION_MAX_LENGTH,
  REPORT_EVENT_TYPES,
} from "../config/reports";

export const reportFormSchema = z.object({
  reportEventType: z.enum(REPORT_EVENT_TYPES),
  description: z.string().max(REPORT_DESCRIPTION_MAX_LENGTH, {
    message: "Opis powinien zawierać nie więcej niż 500 znaków",
  }),
  lat: z.number({ error: "Wybierz lokalizację na mapie" }),
  lng: z.number({ error: "Wybierz lokalizację na mapie" }),
});

export type ReportFormValues = z.infer<typeof reportFormSchema>;
