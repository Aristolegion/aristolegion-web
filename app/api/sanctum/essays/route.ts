import { cookies } from "next/headers";
import { SANCTUM_SESSION_COOKIE, isValidSessionToken } from "@/lib/sanctum/auth";
import {
  PUBLICATIONS_BUCKET,
  buildEssayCoverPath,
  getImageExtension,
  isImageFile,
} from "@/lib/sanctum/publicationStorage";
import { supabaseInsertReturning, supabaseUploadFile } from "@/lib/supabase";
import type { Essay, EssayStatus } from "@/lib/sanctum/types";

const VALID_STATUSES: EssayStatus[] = ["draft", "published"];
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function isNonEmptyString(value: FormDataEntryValue | null): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isOptionalString(value: FormDataEntryValue | null): value is string | null {
  return value === null || typeof value === "string";
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
  const excerpt = formData.get("excerpt");
  const content = formData.get("content");
  const status = formData.get("status");
  const linkedinUrl = formData.get("linkedinUrl");
  const cover = formData.get("cover");

  if (
    !isNonEmptyString(title) ||
    !isNonEmptyString(slug) ||
    !isNonEmptyString(excerpt) ||
    !isNonEmptyString(content)
  ) {
    return Response.json(
      { success: false, error: "Title, slug, excerpt, and essay body are required." },
      { status: 400 }
    );
  }

  if (!SLUG_PATTERN.test(slug)) {
    return Response.json(
      { success: false, error: "Slug must be lowercase letters, numbers, and hyphens only." },
      { status: 400 }
    );
  }

  if (typeof status !== "string" || !VALID_STATUSES.includes(status as EssayStatus)) {
    return Response.json({ success: false, error: "Invalid status." }, { status: 400 });
  }

  if (!isOptionalString(linkedinUrl)) {
    return Response.json({ success: false, error: "Invalid LinkedIn URL." }, { status: 400 });
  }

  const trimmedSlug = slug.trim();
  let coverPath: string | null = null;

  try {
    if (isImageFile(cover)) {
      coverPath = buildEssayCoverPath(trimmedSlug, getImageExtension(cover));
      const uploadResult = await supabaseUploadFile(
        PUBLICATIONS_BUCKET,
        coverPath,
        cover,
        cover.type || "image/webp"
      );

      if (!uploadResult.ok) {
        console.error("ESSAY CMS ERROR:", {
          source: "cover_upload",
          status: uploadResult.status,
          message: uploadResult.message,
        });
        return Response.json(
          { success: false, error: "Unable to upload the cover image. Please try again." },
          { status: 500 }
        );
      }
    }

    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const result = await supabaseInsertReturning<Essay>("essays", {
      id,
      title: title.trim(),
      slug: trimmedSlug,
      excerpt: excerpt.trim(),
      content: content.trim(),
      cover_image_url: coverPath,
      status,
      linkedin_url: isNonEmptyString(linkedinUrl) ? linkedinUrl.trim() : null,
      published_at: status === "published" ? now : null,
    });

    if (!result.ok) {
      console.error("ESSAY CMS ERROR:", {
        source: "insert",
        status: result.status,
        message: result.message,
      });
      return Response.json(
        { success: false, error: "Unable to save the essay. Please try again." },
        { status: 500 }
      );
    }

    return Response.json({ success: true, essay: result.data });
  } catch (error) {
    console.error("ESSAY CMS ERROR:", { source: "create", error });
    return Response.json(
      { success: false, error: "Unable to save the essay. Please try again." },
      { status: 500 }
    );
  }
}
