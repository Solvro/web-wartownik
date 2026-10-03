import Constants from "expo-constants";

const extra = Constants.expoConfig?.extra as
  { apiUrl?: string; eas?: { projectId?: string } } | undefined;

export const API_URL =
  process.env.EXPO_PUBLIC_API_URL ??
  extra?.apiUrl ??
  "https://defensownik.solvro.pl";

export const EAS_PROJECT_ID = extra?.eas?.projectId;
