"use server";

import { db } from "@/lib/db";
import { reportFormSchema } from "@/schemas/report";
import type { ReportFormValues } from "@/schemas/report";

import { reports } from "../../drizzle/schema";

export async function addReport(values: ReportFormValues) {
  const data = reportFormSchema.parse(values);
  await db.insert(reports).values(data);
  return { success: true, message: "Report added successfully." } as const;
}
