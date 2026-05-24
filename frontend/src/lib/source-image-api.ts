import { ApiError, apiUrl, type ApiResponse } from "@/lib/api-client";

export type SourceImage = {
  id: string;
  songId: string;
  storageKey: string;
  originalFilename: string;
  contentType: "image/png" | "image/jpeg";
  sizeBytes: number;
  pageNumber: number | null;
  widthPx: number | null;
  heightPx: number | null;
  contentUrl: string;
  createdAt: string;
  updatedAt: string;
};

export function listSourceImages(songId: string) {
  return jsonRequest<SourceImage[]>(`/api/songs/${songId}/source-images`);
}

export function uploadSourceImage(songId: string, file: File, pageNumber?: number) {
  const formData = new FormData();
  formData.append("file", file);
  if (pageNumber !== undefined) {
    formData.append("pageNumber", pageNumber.toString());
  }

  return jsonRequest<SourceImage>(`/api/songs/${songId}/source-images`, {
    method: "POST",
    body: formData
  });
}

export function sourceImageHref(sourceImage: SourceImage) {
  return apiUrl(sourceImage.contentUrl);
}

async function jsonRequest<T>(path: string, init: RequestInit = {}) {
  const response = await fetch(apiUrl(path), init);
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
