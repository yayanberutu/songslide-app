import { ApiError, apiUrl, type ApiResponse } from "@/lib/api-client";

export type PartiturImportResult = {
  status: string;
  rawFileStorageKey: string;
  originalFilename: string;
  detectedKeySignature: string;
  detectedTimeSignature: string;
  noteCount: number;
  measureCount: number;
  lines: string[];
  rawNotation: string;
  warnings: string[];
};

export async function importPartitur(songId: string, file: File): Promise<PartiturImportResult> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(apiUrl(`/api/songs/${songId}/partitur-import`), {
    method: "POST",
    body: formData
  });

  const payload = await readApiResponse<PartiturImportResult>(response);

  if (!response.ok || payload.status === "FAILED") {
    throw new ApiError(payload.errorMessage ?? `Import gagal dengan status ${response.status}`, payload.code);
  }

  return payload.data as PartiturImportResult;
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
