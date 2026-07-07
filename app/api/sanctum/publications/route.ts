import { cookies } from "next/headers";
import { SANCTUM_SESSION_COOKIE, isValidSessionToken } from "@/lib/sanctum/auth";
import { SLUG_PATTERN, isExpectedCoverPath, isExpectedPdfPath } from "@/lib/sanctum/publicationStorage";
import { supabaseInsertReturning } from "@/lib/supabase";
import type { Publication, PublicationStatus } from "@/lib/sanctum/types";

const VALID_STATUSES: PublicationStatus[] = ["draft", "published"];

interface CreatePublicationBody {
  title?: unknown;
  slug?: unknown;
  category?: unknown;
  description?: unknown;
  status?: unknown;
  pdfPath?: unknown;
  coverPath?: unknown;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get(SANCTUM_SESSION_COOKIE)?.value;

  if (!isValidSessionToken(token)) {
    return Response.json({ success: false, error: "Unauthorized." }, { status: 401 });
  }

  let body: CreatePublicationBody;
  try {
    body = await request.json();
  } catch {
    return Response.json({ success: false, error: "Invalid request." }, { status: 400 });
  }

  const { title, slug, category, description, status, pdfPath, coverPath } = body;

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

  const trimmedSlug = slug.trim();

  if (!isNonEmptyString(pdfPath) || !isExpectedPdfPath(pdfPath, trimmedSlug)) {
    return Response.json(
      { success: false, error: "A PDF file is required." },
      { status: 400 }
    );
  }

  if (!isNonEmptyString(coverPath) || !isExpectedCoverPath(coverPath, trimmedSlug)) {
    return Response.json(
      { success: false, error: "A cover image (JPG, PNG, or WEBP) is required." },
      { status: 400 }
    );
  }

  try {
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
