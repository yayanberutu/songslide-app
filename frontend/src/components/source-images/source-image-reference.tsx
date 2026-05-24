"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { ApiError } from "@/lib/api-client";
import {
  listSourceImages,
  sourceImageHref,
  type SourceImage,
  uploadSourceImage
} from "@/lib/source-image-api";
import { Button, EmptyState, Field, InlineError, LoadingState, TextInput } from "@/components/ui";

type SourceImageReferenceProps = {
  songId: string;
};

const zoomStep = 25;
const minZoom = 50;
const maxZoom = 200;

export function SourceImageReference({ songId }: SourceImageReferenceProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [images, setImages] = useState<SourceImage[]>([]);
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);
  const [pageNumber, setPageNumber] = useState("");
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);
  const [zoom, setZoom] = useState(100);

  useEffect(() => {
    async function loadImages() {
      setLoading(true);
      setLoadError(null);
      try {
        const loadedImages = await listSourceImages(songId);
        setImages(loadedImages);
        setSelectedImageId(selectInitialImageId(loadedImages));
      } catch (error) {
        setLoadError(errorMessage(error, "Unable to load source images"));
      } finally {
        setLoading(false);
      }
    }

    void loadImages();
  }, [songId]);

  const selectedImage = useMemo(() => {
    if (images.length === 0) {
      return null;
    }
    return images.find((image) => image.id === selectedImageId) ?? images[images.length - 1];
  }, [images, selectedImageId]);

  async function handleUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      setUploadError("Choose a PNG or JPEG file to upload.");
      return;
    }

    setUploading(true);
    setUploadError(null);
    setUploadMessage(null);
    try {
      const uploadedImage = await uploadSourceImage(songId, file, normalizePageNumber(pageNumber));
      setImages((currentImages) => [...currentImages, uploadedImage]);
      setSelectedImageId(uploadedImage.id);
      setUploadMessage("Source image uploaded.");
      setPageNumber("");
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (error) {
      setUploadError(errorMessage(error, "Unable to upload source image"));
    } finally {
      setUploading(false);
    }
  }

  function adjustZoom(delta: number) {
    setZoom((currentZoom) => Math.min(maxZoom, Math.max(minZoom, currentZoom + delta)));
  }

  if (loading) {
    return <LoadingState label="Loading source images..." />;
  }

  return (
    <div className="space-y-4 rounded-md border border-zinc-200 bg-white p-4">
      <div>
        <h2 className="text-base font-semibold text-ink-950">Source image reference</h2>
        <p className="mt-1 text-sm leading-6 text-ink-500">
          Upload a notation scan for side-by-side manual entry.
        </p>
      </div>

      <InlineError message={loadError} />

      <form onSubmit={(event) => void handleUpload(event)} className="space-y-3">
        <Field label="Image file">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg"
            className="w-full text-sm text-ink-700 file:mr-3 file:rounded-md file:border-0 file:bg-ink-950 file:px-3 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-ink-700"
          />
        </Field>
        <Field label="Page number">
          <TextInput
            type="number"
            min={1}
            inputMode="numeric"
            value={pageNumber}
            onChange={(event) => setPageNumber(event.target.value)}
            placeholder="Optional"
          />
        </Field>
        <Button type="submit" variant="primary" className="w-full" disabled={uploading}>
          {uploading ? "Uploading..." : "Upload image"}
        </Button>
        <InlineError message={uploadError} />
        {uploadMessage ? (
          <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            {uploadMessage}
          </div>
        ) : null}
      </form>

      {images.length > 1 ? (
        <Field label="Reference image">
          <select
            value={selectedImage?.id ?? ""}
            onChange={(event) => setSelectedImageId(event.target.value)}
            className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-ink-950 shadow-sm outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200"
          >
            {images.map((image) => (
              <option key={image.id} value={image.id}>
                {imageLabel(image)}
              </option>
            ))}
          </select>
        </Field>
      ) : null}

      {selectedImage ? (
        <div className="space-y-3">
          <div className="rounded-md border border-zinc-200 bg-zinc-50 p-3 text-sm text-ink-700">
            <p className="font-semibold text-ink-950">{selectedImage.originalFilename}</p>
            <p className="mt-1">{imageMetadata(selectedImage)}</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" onClick={() => adjustZoom(-zoomStep)} disabled={zoom <= minZoom}>
              Zoom out
            </Button>
            <Button type="button" onClick={() => setZoom(100)}>
              {zoom}%
            </Button>
            <Button type="button" onClick={() => adjustZoom(zoomStep)} disabled={zoom >= maxZoom}>
              Zoom in
            </Button>
          </div>

          <div className="max-h-[520px] overflow-auto rounded-md border border-zinc-200 bg-zinc-100 p-2">
            <Image
              src={sourceImageHref(selectedImage)}
              alt={`Notation reference ${selectedImage.originalFilename}`}
              width={selectedImage.widthPx ?? 1200}
              height={selectedImage.heightPx ?? 1600}
              unoptimized
              className="mx-auto h-auto max-w-none rounded-sm border border-zinc-200 bg-white"
              style={{ width: `${zoom}%` }}
            />
          </div>
        </div>
      ) : (
        <EmptyState title="No source image" description="Upload a PNG or JPEG reference image for this song." />
      )}
    </div>
  );
}

function selectInitialImageId(images: SourceImage[]) {
  return images.length > 0 ? images[images.length - 1].id : null;
}

function normalizePageNumber(pageNumber: string) {
  const trimmed = pageNumber.trim();
  return trimmed.length > 0 ? Number(trimmed) : undefined;
}

function imageLabel(image: SourceImage) {
  return image.pageNumber ? `Page ${image.pageNumber} - ${image.originalFilename}` : image.originalFilename;
}

function imageMetadata(image: SourceImage) {
  const dimensions = image.widthPx && image.heightPx ? `${image.widthPx} x ${image.heightPx}` : "Unknown size";
  const page = image.pageNumber ? `Page ${image.pageNumber}` : "No page number";
  return `${page} | ${dimensions} | ${formatBytes(image.sizeBytes)} | ${image.contentType}`;
}

function formatBytes(bytes: number) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function errorMessage(error: unknown, fallback: string) {
  if (error instanceof ApiError) {
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return fallback;
}
