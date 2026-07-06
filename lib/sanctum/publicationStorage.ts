export const PUBLICATIONS_BUCKET = "publications";

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
