import { cookies } from "next/headers";
import { SANCTUM_SESSION_COOKIE, isValidSessionToken } from "@/lib/sanctum/auth";
import {
  parseCentralQuestion,
  parseFeatured,
  parseFeaturedOrder,
  parseFramework,
  parseIntelligenceBrief,
  parseKeyInsights,
} from "@/lib/sanctum/publicationEditorial";
import {
  PUBLICATIONS_BUCKET,
  SLUG_PATTERN,
  buildCoverPath,
  buildPdfPath,
  getExtensionFromPath,
  isExpectedCoverPath,
  isExpectedPdfPath,
} from "@/lib/sanctum/publicationStorage";
import {
  supabaseDelete,
  supabaseDeleteFile,
  supabaseMoveFile,
  supabaseSelect,
  supabaseUpdateReturning,
} from "@/lib/supabase";
import type { Publication, PublicationStatus } from "@/lib/sanctum/types";

const VALID_STATUSES: PublicationStatus[] = ["draft", "published"];

interface RouteParams {
  params: Promise<{ id: string }>;
}

interface UpdatePublicationBody {
  title?: unknown;
  slug?: unknown;
  category?: unknown;
  description?: unknown;
  status?: unknown;
  pdfPath?: unknown;
  coverPath?: unknown;
  intelligenceBrief?: unknown;
  centralQuestion?: unknown;
  keyInsights?: unknown;
  framework?: unknown;
  featured?: unknown;
  featuredOrder?: unknown;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const cookieStore = await cookies();
  const token = cookieStore.get(SANCTUM_SESSION_COOKIE)?.value;

  if (!isValidSessionToken(token)) {
    return Response.json({ success: false, error: "Unauthorized." }, { status: 401 });
  }

  const { id } = await params;

  let body: UpdatePublicationBody;
  try {
    body = await request.json();
  } catch {
    return Response.json({ success: false, error: "Invalid request." }, { status: 400 });
  }

  const { title, slug, category, description, status, pdfPath: newPdfPath, coverPath: newCoverPath } = body;

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

  if (newPdfPath !== undefined && (!isNonEmptyString(newPdfPath) || !isExpectedPdfPath(newPdfPath, slug.trim()))) {
    return Response.json({ success: false, error: "Invalid PDF file reference." }, { status: 400 });
  }

  if (
    newCoverPath !== undefined &&
    (!isNonEmptyString(newCoverPath) || !isExpectedCoverPath(newCoverPath, slug.trim()))
  ) {
    return Response.json({ success: false, error: "Invalid cover image reference." }, { status: 400 });
  }

  const intelligenceBrief = parseIntelligenceBrief(body.intelligenceBrief);
  if (!intelligenceBrief.ok) {
    return Response.json({ success: false, error: intelligenceBrief.error }, { status: 400 });
  }

  const centralQuestion = parseCentralQuestion(body.centralQuestion);
  if (!centralQuestion.ok) {
    return Response.json({ success: false, error: centralQuestion.error }, { status: 400 });
  }

  const keyInsights = parseKeyInsights(body.keyInsights);
  if (!keyInsights.ok) {
    return Response.json({ success: false, error: keyInsights.error }, { status: 400 });
  }

  const framework = parseFramework(body.framework);
  if (!framework.ok) {
    return Response.json({ success: false, error: framework.error }, { status: 400 });
  }

  const featured = parseFeatured(body.featured);
  if (!featured.ok) {
    return Response.json({ success: false, error: featured.error }, { status: 400 });
  }

  const featuredOrder = parseFeaturedOrder(body.featuredOrder);
  if (!featuredOrder.ok) {
    return Response.json({ success: false, error: featuredOrder.error }, { status: 400 });
  }

  try {
    const existingResult = await supabaseSelect<Publication>("publications", {
      filter: { id: `eq.${id}` },
    });

    if (!existingResult.ok || existingResult.data.length === 0) {
      return Response.json(
        { success: false, error: "Publication not found." },
        { status: 404 }
      );
    }

    const existing = existingResult.data[0];
    const trimmedSlug = slug.trim();
    const slugChanged = trimmedSlug !== existing.slug;

    let pdfPath = existing.pdf_url;

    if (isNonEmptyString(newPdfPath)) {
      pdfPath = newPdfPath;
    } else if (slugChanged && existing.pdf_url) {
      const movedPdfPath = buildPdfPath(trimmedSlug);
      const moveResult = await supabaseMoveFile(PUBLICATIONS_BUCKET, existing.pdf_url, movedPdfPath);

      if (!moveResult.ok) {
        console.error("SANCTUM PUBLICATION MOVE ERROR:", {
          status: moveResult.status,
          message: moveResult.message,
        });
        return Response.json(
          { success: false, error: "Unable to rename the PDF file. Please try again." },
          { status: 500 }
        );
      }
      pdfPath = movedPdfPath;
    }

    let coverPath = existing.cover_image_url;

    if (isNonEmptyString(newCoverPath)) {
      coverPath = newCoverPath;
    } else if (slugChanged && existing.cover_image_url) {
      const movedCoverPath = buildCoverPath(trimmedSlug, getExtensionFromPath(existing.cover_image_url));
      const moveResult = await supabaseMoveFile(PUBLICATIONS_BUCKET, existing.cover_image_url, movedCoverPath);

      if (!moveResult.ok) {
        console.error("SANCTUM PUBLICATION MOVE ERROR:", {
          status: moveResult.status,
          message: moveResult.message,
        });
        return Response.json(
          { success: false, error: "Unable to rename the cover image. Please try again." },
          { status: 500 }
        );
      }
      coverPath = movedCoverPath;
    }

    const patch: Record<string, unknown> = {
      title: title.trim(),
      slug: trimmedSlug,
      category: category.trim(),
      description: description.trim(),
      status,
      pdf_url: pdfPath,
      cover_image_url: coverPath,
      intelligence_brief:
        intelligenceBrief.value !== undefined ? intelligenceBrief.value : existing.intelligence_brief,
      central_question: centralQuestion.value !== undefined ? centralQuestion.value : existing.central_question,
      key_insights: keyInsights.value !== undefined ? keyInsights.value : existing.key_insights,
      framework: framework.value !== undefined ? framework.value : existing.framework,
      featured: featured.value !== undefined ? featured.value : existing.featured,
      featured_order: featuredOrder.value !== undefined ? featuredOrder.value : existing.featured_order,
    };

    if (status === "published" && !existing.published_at) {
      patch.published_at = new Date().toISOString();
    }

    const result = await supabaseUpdateReturning<Publication>("publications", { id }, patch);

    if (!result.ok) {
      console.error("SANCTUM PUBLICATION UPDATE ERROR:", {
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
    console.error("SANCTUM PUBLICATION UPDATE ERROR:", error);
    return Response.json(
      { success: false, error: "Unable to save the publication. Please try again." },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  const cookieStore = await cookies();
  const token = cookieStore.get(SANCTUM_SESSION_COOKIE)?.value;

  if (!isValidSessionToken(token)) {
    return Response.json({ success: false, error: "Unauthorized." }, { status: 401 });
  }

  const { id } = await params;

  try {
    const existingResult = await supabaseSelect<Publication>("publications", {
      filter: { id: `eq.${id}` },
    });

    if (!existingResult.ok || existingResult.data.length === 0) {
      return Response.json(
        { success: false, error: "Publication not found." },
        { status: 404 }
      );
    }

    const existing = existingResult.data[0];
    const paths = [existing.pdf_url, existing.cover_image_url].filter(
      (path): path is string => Boolean(path)
    );

    if (paths.length > 0) {
      const deleteFilesResult = await supabaseDeleteFile(PUBLICATIONS_BUCKET, paths);

      if (!deleteFilesResult.ok) {
        console.error("SANCTUM PUBLICATION DELETE ERROR:", {
          status: deleteFilesResult.status,
          message: deleteFilesResult.message,
        });
        return Response.json(
          { success: false, error: "Unable to delete the publication's files. Please try again." },
          { status: 500 }
        );
      }
    }

    const deleteRowResult = await supabaseDelete("publications", { id });

    if (!deleteRowResult.ok) {
      console.error("SANCTUM PUBLICATION DELETE ERROR:", {
        status: deleteRowResult.status,
        message: deleteRowResult.message,
      });
      return Response.json(
        { success: false, error: "Unable to delete the publication. Please try again." },
        { status: 500 }
      );
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error("SANCTUM PUBLICATION DELETE ERROR:", error);
    return Response.json(
      { success: false, error: "Unable to delete the publication. Please try again." },
      { status: 500 }
    );
  }
}
