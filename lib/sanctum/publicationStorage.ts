export const PUBLICATIONS_BUCKET = "publications";

export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const IMAGE_EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export function isPdfFile(value: FormDataEntryValue | null): value is File {
  if (!(value instanceof File) || value.size === 0) return false;
  return value.type === "application/pdf" || value.name.toLowerCase().endsWith(".pdf");
}

export function isImageFile(value: FormDataEntryValue | null): value is File {
  if (!(value instanceof File) || value.size === 0) return false;
  if (value.type in IMAGE_EXTENSIONS) return true;
  return /\.(jpe?g|png|webp)$/i.test(value.name);
}

export function getImageExtension(file: File): string {
  if (file.type in IMAGE_EXTENSIONS) return IMAGE_EXTENSIONS[file.type];
  const match = file.name.toLowerCase().match(/\.(jpe?g|png|webp)$/);
  if (!match) return "webp";
  return match[1] === "jpeg" ? "jpg" : match[1];
}

// Used by the direct-to-storage upload flow, where the browser describes a
// file by its MIME type in a JSON request rather than handing over the File
// itself (which never passes through our API routes at all).
export function getImageExtensionFromContentType(contentType: string): string | null {
  return IMAGE_EXTENSIONS[contentType] ?? null;
}

export function isPdfContentType(contentType: string): boolean {
  return contentType === "application/pdf";
}

export function getExtensionFromPath(path: string): string {
  const match = path.toLowerCase().match(/\.([a-z0-9]+)$/);
  return match ? match[1] : "webp";
}

export function buildPdfPath(slug: string): string {
  return `pdfs/${slug}.pdf`;
}

export function buildCoverPath(slug: string, extension: string): string {
  return `covers/${slug}-cover.${extension}`;
}

export function buildEssayCoverPath(slug: string, extension: string): string {
  return `essay-covers/${slug}-cover.${extension}`;
}

// The client only ever hands back a storage path it was itself just given a
// signed upload URL for, but we re-derive and compare rather than trust it
// outright — so a tampered request can't point a publication row at some
// other object already sitting in the private bucket.
export function isExpectedPdfPath(path: string, slug: string): boolean {
  return path === buildPdfPath(slug);
}

export function isExpectedCoverPath(path: string, slug: string): boolean {
  const extension = getExtensionFromPath(path);
  return Object.values(IMAGE_EXTENSIONS).includes(extension) && path === buildCoverPath(slug, extension);
}
