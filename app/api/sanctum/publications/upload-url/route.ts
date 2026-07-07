import { cookies } from "next/headers";
import { SANCTUM_SESSION_COOKIE, isValidSessionToken } from "@/lib/sanctum/auth";
import {
  PUBLICATIONS_BUCKET,
  SLUG_PATTERN,
  buildCoverPath,
  buildPdfPath,
  getImageExtensionFromContentType,
} from "@/lib/sanctum/publicationStorage";
import { supabaseCreateSignedUploadUrl } from "@/lib/supabase";

interface UploadUrlRequestBody {
  slug?: unknown;
  pdf?: unknown;
  coverContentType?: unknown;
}

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get(SANCTUM_SESSION_COOKIE)?.value;

  if (!isValidSessionToken(token)) {
    return Response.json({ success: false, error: "Unauthorized." }, { status: 401 });
  }

  let body: UploadUrlRequestBody;
  try {
    body = await request.json();
  } catch {
    return Response.json({ success: false, error: "Invalid request." }, { status: 400 });
  }

  const { slug, pdf, coverContentType } = body;

  if (typeof slug !== "string" || !SLUG_PATTERN.test(slug)) {
    return Response.json(
      { success: false, error: "A valid slug is required." },
      { status: 400 }
    );
  }

  const wantsPdf = pdf === true;
  const wantsCover = typeof coverContentType === "string" && coverContentType.length > 0;

  if (!wantsPdf && !wantsCover) {
    return Response.json(
      { success: false, error: "Nothing to upload." },
      { status: 400 }
    );
  }

  let coverExtension: string | null = null;
  if (wantsCover) {
    coverExtension = getImageExtensionFromContentType(coverContentType as string);
    if (!coverExtension) {
      return Response.json(
        { success: false, error: "Unsupported cover image type." },
        { status: 400 }
      );
    }
  }

  try {
    const result: { success: true; pdf?: { path: string; uploadUrl: string }; cover?: { path: string; uploadUrl: string } } = {
      success: true,
    };

    if (wantsPdf) {
      const pdfPath = buildPdfPath(slug);
      const signed = await supabaseCreateSignedUploadUrl(PUBLICATIONS_BUCKET, pdfPath);

      if (!signed.ok) {
        console.error("SANCTUM PUBLICATION UPLOAD URL ERROR:", {
          source: "pdf",
          status: signed.status,
          message: signed.message,
        });
        return Response.json(
          { success: false, error: "Unable to prepare the PDF upload. Please try again." },
          { status: 500 }
        );
      }

      result.pdf = { path: pdfPath, uploadUrl: signed.url };
    }

    if (wantsCover && coverExtension) {
      const coverPath = buildCoverPath(slug, coverExtension);
      const signed = await supabaseCreateSignedUploadUrl(PUBLICATIONS_BUCKET, coverPath);

      if (!signed.ok) {
        console.error("SANCTUM PUBLICATION UPLOAD URL ERROR:", {
          source: "cover",
          status: signed.status,
          message: signed.message,
        });
        return Response.json(
          { success: false, error: "Unable to prepare the cover upload. Please try again." },
          { status: 500 }
        );
      }

      result.cover = { path: coverPath, uploadUrl: signed.url };
    }

    return Response.json(result);
  } catch (error) {
    console.error("SANCTUM PUBLICATION UPLOAD URL ERROR:", error);
    return Response.json(
      { success: false, error: "Unable to prepare the upload. Please try again." },
      { status: 500 }
    );
  }
}
