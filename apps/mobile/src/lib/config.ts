import Constants, { ExecutionEnvironment } from "expo-constants";

const extra = Constants.expoConfig?.extra as
  { apiUrl?: string; eas?: { projectId?: string } } | undefined;

const DEV_API_PORT = 3000;

function devServerApiUrl(): string | undefined {
  const host = Constants.expoConfig?.hostUri?.split(":")[0];
  return __DEV__ && host !== undefined && host !== ""
    ? `http://${host}:${DEV_API_PORT}`
    : undefined;
}

export const API_URL =
  process.env.EXPO_PUBLIC_API_URL ??
  devServerApiUrl() ??
  extra?.apiUrl ??
  "https://defensownik.solvro.pl";

export const EAS_PROJECT_ID = extra?.eas?.projectId;

export const IS_EXPO_GO =
  Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
