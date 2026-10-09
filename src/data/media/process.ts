/**
 * Prepares a photo picked on the phone: turned upright (the browser applies the camera's
 * rotation), shrunk to FULL_SIZE and to a THUMB_SIZE thumbnail, and saved again as JPEG.
 * Drawing it on a canvas also drops its metadata (GPS position, camera, date).
 */
import { FULL_SIZE, fitInside, THUMB_SIZE } from "@/domain/photos";

export interface ProcessedPhoto {
  full: Blob;
  thumb: Blob;
  width: number;
  height: number;
}

async function decode(file: Blob): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.decoding = "async";
    image.src = url;
    await image.decode();
    return image;
  } finally {
    URL.revokeObjectURL(url);
  }
}

function encode(image: HTMLImageElement, max: number, quality: number): Promise<{ blob: Blob; width: number; height: number }> {
  const size = fitInside(image.naturalWidth, image.naturalHeight, max);
  const canvas = document.createElement("canvas");
  canvas.width = size.width;
  canvas.height = size.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return Promise.reject(new Error("Canvas not available"));
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(image, 0, 0, size.width, size.height);
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve({ blob, ...size }) : reject(new Error("Could not encode the photo"))),
      "image/jpeg",
      quality,
    );
  });
}

export async function processPhoto(file: Blob): Promise<ProcessedPhoto> {
  const image = await decode(file);
  const full = await encode(image, FULL_SIZE, 0.85);
  const thumb = await encode(image, THUMB_SIZE, 0.8);
  return { full: full.blob, thumb: thumb.blob, width: full.width, height: full.height };
}
