import { cookies } from "next/headers";
import { SANCTUM_SESSION_COOKIE, isValidSessionToken } from "@/lib/sanctum/auth";
import {
  PUBLICATIONS_BUCKET,
  buildNewsletterCoverPath,
  getImageExtension,
  isImageFile,
} from "@/lib/sanctum/publicationStorage";
import { supabaseInsertReturning, supabaseUploadFile } from "@/lib/supabase";
import type { NewsletterIssue, NewsletterIssueStatus } from "@/lib/sanctum/types";

const VALID_STATUSES: NewsletterIssueStatus[] = ["draft", "published"];
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

  const trimmedSlug = slug.trim();
  let coverPath: string | null = null;

  try {
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
    }

    const id = crypto.randomUUID();
    const result = await supabaseInsertReturning<NewsletterIssue>("newsletter_issues", {
      id,
      title: title.trim(),
      slug: trimmedSlug,
      subtitle: subtitle.trim(),
      issue_number: issueNumber.trim(),
      content: content.trim(),
      cover_image_url: coverPath,
      status,
      sent_at: null,
      sent_count: 0,
    });

    if (!result.ok) {
      console.error("NEWSLETTER ISSUE CMS ERROR:", {
        source: "insert",
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
    console.error("NEWSLETTER ISSUE CMS ERROR:", { source: "create", error });
    return Response.json(
      { success: false, error: "Unable to save the newsletter issue. Please try again." },
      { status: 500 }
    );
  }
}
