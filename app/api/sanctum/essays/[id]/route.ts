import { cookies } from "next/headers";
import { SANCTUM_SESSION_COOKIE, isValidSessionToken } from "@/lib/sanctum/auth";
import {
  PUBLICATIONS_BUCKET,
  buildEssayCoverPath,
  getExtensionFromPath,
  getImageExtension,
  isImageFile,
} from "@/lib/sanctum/publicationStorage";
import {
  supabaseDelete,
  supabaseDeleteFile,
  supabaseMoveFile,
  supabaseSelect,
  supabaseUpdateReturning,
  supabaseUploadFile,
} from "@/lib/supabase";
import type { Essay, EssayStatus } from "@/lib/sanctum/types";

const VALID_STATUSES: EssayStatus[] = ["draft", "published"];
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

interface RouteParams {
  params: Promise<{ id: string }>;
}

function isNonEmptyString(value: FormDataEntryValue | null): value is string {
  return typeof value === "string" && value.trim().length > 0;
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

  try {
    const existingResult = await supabaseSelect<Essay>("essays", {
      filter: { id: `eq.${id}` },
    });

    if (!existingResult.ok || existingResult.data.length === 0) {
      return Response.json({ success: false, error: "Essay not found." }, { status: 404 });
    }

    const existing = existingResult.data[0];
    const trimmedSlug = slug.trim();
    const slugChanged = trimmedSlug !== existing.slug;

    let coverPath = existing.cover_image_url;

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
    } else if (slugChanged && existing.cover_image_url) {
      const newCoverPath = buildEssayCoverPath(trimmedSlug, getExtensionFromPath(existing.cover_image_url));
      const moveResult = await supabaseMoveFile(PUBLICATIONS_BUCKET, existing.cover_image_url, newCoverPath);

      if (!moveResult.ok) {
        console.error("ESSAY CMS ERROR:", {
          source: "cover_move",
          status: moveResult.status,
          message: moveResult.message,
        });
        return Response.json(
          { success: false, error: "Unable to rename the cover image. Please try again." },
          { status: 500 }
        );
      }
      coverPath = newCoverPath;
    }

    const patch: Record<string, unknown> = {
      title: title.trim(),
      slug: trimmedSlug,
      excerpt: excerpt.trim(),
      content: content.trim(),
      status,
      cover_image_url: coverPath,
      linkedin_url: isNonEmptyString(linkedinUrl) ? linkedinUrl.trim() : null,
    };

    if (status === "published" && !existing.published_at) {
      patch.published_at = new Date().toISOString();
    }

    const result = await supabaseUpdateReturning<Essay>("essays", { id }, patch);

    if (!result.ok) {
      console.error("ESSAY CMS ERROR:", {
        source: "update",
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
    console.error("ESSAY CMS ERROR:", { source: "update", error });
    return Response.json(
      { success: false, error: "Unable to save the essay. Please try again." },
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
    const existingResult = await supabaseSelect<Essay>("essays", {
      filter: { id: `eq.${id}` },
    });

    if (!existingResult.ok || existingResult.data.length === 0) {
      return Response.json({ success: false, error: "Essay not found." }, { status: 404 });
    }

    const existing = existingResult.data[0];

    if (existing.cover_image_url) {
      const deleteFilesResult = await supabaseDeleteFile(PUBLICATIONS_BUCKET, [existing.cover_image_url]);

      if (!deleteFilesResult.ok) {
        console.error("ESSAY CMS ERROR:", {
          source: "cover_delete",
          status: deleteFilesResult.status,
          message: deleteFilesResult.message,
        });
        return Response.json(
          { success: false, error: "Unable to delete the essay's cover image. Please try again." },
          { status: 500 }
        );
      }
    }

    const deleteRowResult = await supabaseDelete("essays", { id });

    if (!deleteRowResult.ok) {
      console.error("ESSAY CMS ERROR:", {
        source: "delete",
        status: deleteRowResult.status,
        message: deleteRowResult.message,
      });
      return Response.json(
        { success: false, error: "Unable to delete the essay. Please try again." },
        { status: 500 }
      );
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error("ESSAY CMS ERROR:", { source: "delete", error });
    return Response.json(
      { success: false, error: "Unable to delete the essay. Please try again." },
      { status: 500 }
    );
  }
}
