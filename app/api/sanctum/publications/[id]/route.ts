import { cookies } from "next/headers";
import { SANCTUM_SESSION_COOKIE, isValidSessionToken } from "@/lib/sanctum/auth";
import {
  supabaseSelect,
  supabaseUpdateReturning,
  supabaseUploadFile,
} from "@/lib/supabase";
import type { Publication, PublicationStatus } from "@/lib/sanctum/types";

const VALID_STATUSES: PublicationStatus[] = ["draft", "published"];
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const PDF_BUCKET = "publications";

interface RouteParams {
  params: Promise<{ id: string }>;
}

function isNonEmptyString(value: FormDataEntryValue | null): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isPdfFile(value: FormDataEntryValue | null): value is File {
  if (!(value instanceof File) || value.size === 0) return false;
  return value.type === "application/pdf" || value.name.toLowerCase().endsWith(".pdf");
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const cookieStore = await cookies();
  const token = cookieStore.get(SANCTUM_SESSION_COOKIE)?.value;

  if (!isValidSessionToken(token)) {
    return Response.json({ success: false, error: "Unauthorized." }, { status: 401 });
  }

  const { id } = await params;

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
  const coverImageUrl = formData.get("coverImageUrl");
  const status = formData.get("status");
  const pdf = formData.get("pdf");

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
    const pdfPath = `${id}/document.pdf`;

    if (isPdfFile(pdf)) {
      const uploadResult = await supabaseUploadFile(PDF_BUCKET, pdfPath, pdf, "application/pdf");

      if (!uploadResult.ok) {
        console.error("SANCTUM PUBLICATION UPLOAD ERROR:", {
          status: uploadResult.status,
          message: uploadResult.message,
        });
        return Response.json(
          { success: false, error: "Unable to upload the PDF. Please try again." },
          { status: 500 }
        );
      }
    }

    const patch: Record<string, unknown> = {
      title: title.trim(),
      slug: slug.trim(),
      category: category.trim(),
      description: description.trim(),
      cover_image_url: isNonEmptyString(coverImageUrl) ? coverImageUrl.trim() : null,
      status,
      pdf_url: pdfPath,
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
