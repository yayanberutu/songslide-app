import { getSession } from "next-auth/react";

export const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080";

export function apiUrl(path: string) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const apiPath = normalizedPath.startsWith("/api/") ? normalizedPath.slice(4) : normalizedPath;
  if (typeof window !== "undefined") {
    return `/backend-api${apiPath}`;
  }

  let serverBase = process.env.BACKEND_INTERNAL_URL ?? apiBaseUrl;
  if (serverBase.includes("localhost") && process.env.NODE_ENV === "production") {
    // In docker, fallback to backend container
    serverBase = "http://backend:8080/api";
  }
  const normalizedBase = serverBase.replace(/\/$/, "");
  console.log("Fetching API from server:", `${normalizedBase}${apiPath}`);
  return `${normalizedBase}${apiPath}`;
}

export type ApiStatus = "SUCCESS" | "FAILED";

export type ApiResponse<T> = {
  data: T | null;
  status: ApiStatus;
  code: number;
  errorMessage: string | null;
};

export type PaginatedData<T> = {
  items: T[];
  totalCount: number;
  page: number;
  limit: number;
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

  if (typeof window !== "undefined") {
    const session = await getSession();
    if (session?.accessToken) {
      headers.set("Authorization", `Bearer ${session.accessToken}`);
    }
  }

  const response = await fetch(apiUrl(path), {
    ...init,
    headers
  });
  const payload = await readApiResponse<T>(response);

  if (!response.ok || payload.status === "FAILED") {
    const errorMsg = payload.errorMessage || `Request failed with status ${response.status}`;
    throw new ApiError(errorMsg, payload.code);
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
