export class FetchError extends Error {
  constructor(
    public readonly response: Response,
    url: string,
  ) {
    super(`Failed to fetch ${url}: ${response.statusText}`);
    this.name = "FetchError";
  }
}

export async function fetchQuery<T>(
  url: string,
  init?: RequestInit,
  isJson = true,
): Promise<T> {
  const response = await fetch(url, init);
  if (!response.ok) {
    throw new FetchError(response, url);
  }
  return (isJson ? response.json() : response.text()) as Promise<T>;
}
