import { cookies } from "next/headers";
import { SANCTUM_SESSION_COOKIE, isValidSessionToken } from "@/lib/sanctum/auth";
import {
  PUBLICATIONS_BUCKET,
  buildNewsletterCoverPath,
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
import type { NewsletterIssue, NewsletterIssueStatus } from "@/lib/sanctum/types";

const VALID_STATUSES: NewsletterIssueStatus[] = ["draft", "published"];
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
  const subtitle = formData.get("subtitle");
  const issueNumber = formData.get("issueNumber");
  const content = formData.get("content");
  const status = formData.get("status");
  const cover = formData.get("cover");

  if (
    !isNonEmptyString(title) ||
    !isNonEmptyString(slug) ||
    !isNonEmptyString(subtitle) ||
    !isNonEmptyString(issueNumber) ||
    !isNonEmptyString(content)
  ) {
    return Response.json(
      { success: false, error: "Title, slug, subtitle, issue number, and content are required." },
      { status: 400 }
    );
  }

  if (!SLUG_PATTERN.test(slug)) {
    return Response.json(
      { success: false, error: "Slug must be lowercase letters, numbers, and hyphens only." },
      { status: 400 }
    );
  }

  if (typeof status !== "string" || !VALID_STATUSES.includes(status as NewsletterIssueStatus)) {
    return Response.json({ success: false, error: "Invalid status." }, { status: 400 });
  }

  try {
    const existingResult = await supabaseSelect<NewsletterIssue>("newsletter_issues", {
      filter: { id: `eq.${id}` },
    });

    if (!existingResult.ok || existingResult.data.length === 0) {
      return Response.json({ success: false, error: "Newsletter issue not found." }, { status: 404 });
    }

    const existing = existingResult.data[0];
    const trimmedSlug = slug.trim();
    const slugChanged = trimmedSlug !== existing.slug;

    let coverPath = existing.cover_image_url;

    if (isImageFile(cover)) {
      coverPath = buildNewsletterCoverPath(trimmedSlug, getImageExtension(cover));
      const uploadResult = await supabaseUploadFile(
        PUBLICATIONS_BUCKET,
        coverPath,
        cover,
        cover.type || "image/webp"
      );

      if (!uploadResult.ok) {
        console.error("NEWSLETTER ISSUE CMS ERROR:", {
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
      const newCoverPath = buildNewsletterCoverPath(
        trimmedSlug,
        getExtensionFromPath(existing.cover_image_url)
      );
      const moveResult = await supabaseMoveFile(PUBLICATIONS_BUCKET, existing.cover_image_url, newCoverPath);

      if (!moveResult.ok) {
        console.error("NEWSLETTER ISSUE CMS ERROR:", {
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

    // sent_at / sent_count are deliberately never touched here — publishing
    // or editing an issue must never affect whether/how many times it has
    // been emailed. Only POST .../[id]/send owns those two columns.
    const patch: Record<string, unknown> = {
      title: title.trim(),
      slug: trimmedSlug,
      subtitle: subtitle.trim(),
      issue_number: issueNumber.trim(),
      content: content.trim(),
      status,
      cover_image_url: coverPath,
    };

    const result = await supabaseUpdateReturning<NewsletterIssue>("newsletter_issues", { id }, patch);

    if (!result.ok) {
      console.error("NEWSLETTER ISSUE CMS ERROR:", {
        source: "update",
        status: result.status,
        message: result.message,
      });
      return Response.json(
        { success: false, error: "Unable to save the newsletter issue. Please try again." },
        { status: 500 }
      );
    }

    return Response.json({ success: true, issue: result.data });
  } catch (error) {
    console.error("NEWSLETTER ISSUE CMS ERROR:", { source: "update", error });
    return Response.json(
      { success: false, error: "Unable to save the newsletter issue. Please try again." },
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
    const existingResult = await supabaseSelect<NewsletterIssue>("newsletter_issues", {
      filter: { id: `eq.${id}` },
    });

    if (!existingResult.ok || existingResult.data.length === 0) {
      return Response.json({ success: false, error: "Newsletter issue not found." }, { status: 404 });
    }

    const existing = existingResult.data[0];

    if (existing.cover_image_url) {
      const deleteFilesResult = await supabaseDeleteFile(PUBLICATIONS_BUCKET, [existing.cover_image_url]);

      if (!deleteFilesResult.ok) {
        console.error("NEWSLETTER ISSUE CMS ERROR:", {
          source: "cover_delete",
          status: deleteFilesResult.status,
          message: deleteFilesResult.message,
        });
        return Response.json(
          { success: false, error: "Unable to delete the issue's cover image. Please try again." },
          { status: 500 }
        );
      }
    }

    const deleteRowResult = await supabaseDelete("newsletter_issues", { id });

    if (!deleteRowResult.ok) {
      console.error("NEWSLETTER ISSUE CMS ERROR:", {
        source: "delete",
        status: deleteRowResult.status,
        message: deleteRowResult.message,
      });
      return Response.json(
        { success: false, error: "Unable to delete the newsletter issue. Please try again." },
        { status: 500 }
      );
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error("NEWSLETTER ISSUE CMS ERROR:", { source: "delete", error });
    return Response.json(
      { success: false, error: "Unable to delete the newsletter issue. Please try again." },
      { status: 500 }
    );
  }
}
