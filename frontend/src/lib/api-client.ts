export const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080";

export function apiUrl(path: string) {
  const normalizedBase = apiBaseUrl.replace(/\/$/, "");
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const apiPath = normalizedPath.startsWith("/api/") ? normalizedPath.slice(4) : normalizedPath;
  if (typeof window !== "undefined") {
    return `/backend-api${apiPath}`;
  }

  return `${normalizedBase}${normalizedPath}`;
}

export type ApiStatus = "SUCCESS" | "FAILED";

export type ApiResponse<T> = {
  data: T | null;
  status: ApiStatus;
  code: number;
  errorMessage: string | null;
};

export class ApiError extends Error {
  readonly code: number;

  constructor(message: string, code: number) {
    super(message);
    this.name = "ApiError";
    this.code = code;
  }
}

export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body !== undefined && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(apiUrl(path), {
    ...init,
    headers
  });
  const payload = await readApiResponse<T>(response);

  if (!response.ok || payload.status === "FAILED") {
    throw new ApiError(payload.errorMessage ?? `Request failed with status ${response.status}`, payload.code);
  }

  return payload.data as T;
}

async function readApiResponse<T>(response: Response): Promise<ApiResponse<T>> {
  const contentType = response.headers.get("Content-Type") ?? "";
  if (contentType.includes("application/json")) {
    return response.json() as Promise<ApiResponse<T>>;
  }

  return {
    data: null,
    status: "FAILED",
    code: response.status,
    errorMessage: await response.text()
  };
}
