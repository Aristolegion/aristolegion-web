import { cookies } from "next/headers";
import { SANCTUM_SESSION_COOKIE, isValidSessionToken } from "@/lib/sanctum/auth";
import {
  PUBLICATIONS_BUCKET,
  buildCoverPath,
  buildPdfPath,
  getImageExtension,
  isImageFile,
  isPdfFile,
} from "@/lib/sanctum/publicationStorage";
import { supabaseInsertReturning, supabaseUploadFile } from "@/lib/supabase";
import type { Publication, PublicationStatus } from "@/lib/sanctum/types";

const VALID_STATUSES: PublicationStatus[] = ["draft", "published"];
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function isNonEmptyString(value: FormDataEntryValue | null): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get(SANCTUM_SESSION_COOKIE)?.value;

  if (!isValidSessionToken(token)) {
    return Response.json({ success: false, error: "Unauthorized." }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return Response.json({ success: false, error: "Invalid request." }, { status: 400 });
  }

  const title = formData.get("title");
  const slug = formData.get("slug");
  const category = formData.get("category");
  const description = formData.get("description");
  const status = formData.get("status");
  const pdf = formData.get("pdf");
  const cover = formData.get("cover");

  if (
    !isNonEmptyString(title) ||
    !isNonEmptyString(slug) ||
    !isNonEmptyString(category) ||
    !isNonEmptyString(description)
  ) {
    return Response.json(
      { success: false, error: "Title, slug, category, and description are required." },
      { status: 400 }
    );
  }

  if (!SLUG_PATTERN.test(slug)) {
    return Response.json(
      { success: false, error: "Slug must be lowercase letters, numbers, and hyphens only." },
      { status: 400 }
    );
  }

  if (typeof status !== "string" || !VALID_STATUSES.includes(status as PublicationStatus)) {
    return Response.json({ success: false, error: "Invalid status." }, { status: 400 });
  }

  if (!isPdfFile(pdf)) {
    return Response.json({ success: false, error: "A PDF file is required." }, { status: 400 });
  }

  if (!isImageFile(cover)) {
    return Response.json(
      { success: false, error: "A cover image (JPG, PNG, or WEBP) is required." },
      { status: 400 }
    );
  }

  const trimmedSlug = slug.trim();
  const pdfPath = buildPdfPath(trimmedSlug);
  const coverPath = buildCoverPath(trimmedSlug, getImageExtension(cover));

  try {
    const [pdfUpload, coverUpload] = await Promise.all([
      supabaseUploadFile(PUBLICATIONS_BUCKET, pdfPath, pdf, "application/pdf"),
      supabaseUploadFile(PUBLICATIONS_BUCKET, coverPath, cover, cover.type || "image/webp"),
    ]);

    if (!pdfUpload.ok || !coverUpload.ok) {
      console.error("SANCTUM PUBLICATION UPLOAD ERROR:", {
        pdf: pdfUpload.ok ? null : { status: pdfUpload.status, message: pdfUpload.message },
        cover: coverUpload.ok ? null : { status: coverUpload.status, message: coverUpload.message },
      });
      return Response.json(
        { success: false, error: "Unable to upload files. Please try again." },
        { status: 500 }
      );
    }

    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const result = await supabaseInsertReturning<Publication>("publications", {
      id,
      title: title.trim(),
      slug: trimmedSlug,
      category: category.trim(),
      description: description.trim(),
      pdf_url: pdfPath,
      cover_image_url: coverPath,
      status,
      published_at: status === "published" ? now : null,
    });

    if (!result.ok) {
      console.error("SANCTUM PUBLICATION INSERT ERROR:", {
        status: result.status,
        message: result.message,
      });
      return Response.json(
        { success: false, error: "Unable to save the publication. Please try again." },
        { status: 500 }
      );
    }

    return Response.json({ success: true, publication: result.data });
  } catch (error) {
    console.error("SANCTUM PUBLICATION CREATE ERROR:", error);
    return Response.json(
      { success: false, error: "Unable to save the publication. Please try again." },
      { status: 500 }
    );
  }
}
