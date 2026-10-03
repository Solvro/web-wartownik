import { appRouter } from "@defensownik/api";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";

function handler(request: Request) {
  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req: request,
    router: appRouter,
    createContext: ({ resHeaders }) => ({ resHeaders }),
    responseMeta: ({ errors, type }) =>
      errors.length > 0 || type !== "query"
        ? { headers: { "Cache-Control": "no-store" } }
        : {},
  });
}

export { handler as GET, handler as POST };
