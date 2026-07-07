"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { DeleteConfirmModal } from "@/components/sanctum/DeleteConfirmModal";
import type { PublicationWithPreview } from "@/lib/sanctum/types";

const SITE_URL = "https://www.aristolegion.com";

interface PublicationsSectionProps {
  initialPublications: PublicationWithPreview[];
}

interface FormState {
  title: string;
  slug: string;
  category: string;
  description: string;
  status: "draft" | "published";
}

const EMPTY_FORM: FormState = {
  title: "",
  slug: "",
  category: "",
  description: "",
  status: "draft",
};

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

// Normalizes every uploaded cover to .webp client-side via canvas, so the
// stored file matches the "publication-slug-cover.webp" storage convention
// without needing a server-side image-processing dependency.
function convertImageToWebp(file: File, quality = 0.85): Promise<File> {
  return new Promise((resolve) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d");

      if (!ctx) {
        resolve(file);
        return;
      }

      ctx.drawImage(img, 0, 0);
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            resolve(file);
            return;
          }
          const webpName = file.name.replace(/\.[^.]+$/, "") + ".webp";
          resolve(new File([blob], webpName, { type: "image/webp" }));
        },
        "image/webp",
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(file);
    };

    img.src = objectUrl;
  });
}

interface UploadUrlResponse {
  success: boolean;
  error?: string;
  pdf?: { path: string; uploadUrl: string };
  cover?: { path: string; uploadUrl: string };
}

// Uploads go straight from the browser to Supabase Storage using a signed
// URL minted by our API — the file body never passes through a Vercel
// function, so large PDFs can't hit FUNCTION_PAYLOAD_TOO_LARGE.
async function uploadFileToSignedUrl(uploadUrl: string, file: File): Promise<boolean> {
  const response = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      "Content-Type": file.type || "application/octet-stream",
      "x-upsert": "true",
    },
    body: file,
  });
  return response.ok;
}

function buildMetadataBody(
  form: FormState,
  slug: string,
  pdfPath: string | undefined,
  coverPath: string | undefined
) {
  return {
    title: form.title,
    slug,
    category: form.category,
    description: form.description,
    status: form.status,
    ...(pdfPath ? { pdfPath } : {}),
    ...(coverPath ? { coverPath } : {}),
  };
}

export function PublicationsSection({ initialPublications }: PublicationsSectionProps) {
  const [publications, setPublications] = useState(initialPublications);
  const [modalMode, setModalMode] = useState<"create" | "edit" | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [convertingCover, setConvertingCover] = useState(false);
  const [slugTouched, setSlugTouched] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [progressMessage, setProgressMessage] = useState("");
  const [formError, setFormError] = useState("");
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [listError, setListError] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [confirmSendId, setConfirmSendId] = useState<string | null>(null);
  const [sendingId, setSendingId] = useState<string | null>(null);

  useEffect(() => {
    if (!modalMode) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closeModal();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [modalMode]);

  function openCreateModal() {
    setForm(EMPTY_FORM);
    setPdfFile(null);
    setCoverFile(null);
    setSlugTouched(false);
    setFormError("");
    setEditingId(null);
    setModalMode("create");
  }

  function openEditModal(publication: PublicationWithPreview) {
    setForm({
      title: publication.title,
      slug: publication.slug,
      category: publication.category,
      description: publication.description,
      status: publication.status === "published" ? "published" : "draft",
    });
    setPdfFile(null);
    setCoverFile(null);
    setSlugTouched(true);
    setFormError("");
    setEditingId(publication.id);
    setModalMode("edit");
  }

  function closeModal() {
    setModalMode(null);
    setEditingId(null);
  }

  function handleTitleChange(value: string) {
    setForm((prev) => ({
      ...prev,
      title: value,
      slug: slugTouched ? prev.slug : slugify(value),
    }));
  }

  async function handleCoverChange(file: File | null) {
    if (!file) {
      setCoverFile(null);
      return;
    }

    setConvertingCover(true);
    try {
      const webpFile = await convertImageToWebp(file);
      setCoverFile(webpFile);
    } finally {
      setConvertingCover(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");

    if (modalMode === "create" && !pdfFile) {
      setFormError("A PDF file is required.");
      return;
    }

    if (modalMode === "create" && !coverFile) {
      setFormError("A cover image is required.");
      return;
    }

    setSubmitting(true);

    try {
      const trimmedSlug = form.slug.trim();
      let pdfPath: string | undefined;
      let coverPath: string | undefined;

      if (pdfFile || coverFile) {
        setProgressMessage(pdfFile ? "Uploading PDF…" : "Uploading cover…");

        const urlResponse = await fetch("/api/sanctum/publications/upload-url", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            slug: trimmedSlug,
            pdf: Boolean(pdfFile),
            coverContentType: coverFile ? coverFile.type || "image/webp" : undefined,
          }),
        });

        const urlData: UploadUrlResponse = await urlResponse.json();

        if (!urlResponse.ok || !urlData.success) {
          setFormError(urlData.error || "Unable to prepare the upload.");
          return;
        }

        if (pdfFile) {
          if (!urlData.pdf) {
            setFormError("Unable to prepare the PDF upload.");
            return;
          }
          setProgressMessage("Uploading PDF…");
          const uploaded = await uploadFileToSignedUrl(urlData.pdf.uploadUrl, pdfFile);
          if (!uploaded) {
            setFormError("Unable to upload the PDF. Please try again.");
            return;
          }
          pdfPath = urlData.pdf.path;
        }

        if (coverFile) {
          if (!urlData.cover) {
            setFormError("Unable to prepare the cover upload.");
            return;
          }
          setProgressMessage("Uploading cover…");
          const uploaded = await uploadFileToSignedUrl(urlData.cover.uploadUrl, coverFile);
          if (!uploaded) {
            setFormError("Unable to upload the cover image. Please try again.");
            return;
          }
          coverPath = urlData.cover.path;
        }
      }

      setProgressMessage("Saving publication…");

      const metadataBody = buildMetadataBody(form, trimmedSlug, pdfPath, coverPath);
      const response =
        modalMode === "create"
          ? await fetch("/api/sanctum/publications", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(metadataBody),
            })
          : await fetch(`/api/sanctum/publications/${editingId}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(metadataBody),
            });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setFormError(data.error || "Unable to save the publication.");
        return;
      }

      const saved: PublicationWithPreview = {
        ...data.publication,
        pdfPreviewUrl: null,
        coverPreviewUrl: null,
      };

      setPublications((prev) => {
        if (modalMode === "create") {
          return [saved, ...prev];
        }
        return prev.map((item) =>
          item.id === saved.id
            ? { ...saved, pdfPreviewUrl: item.pdfPreviewUrl, coverPreviewUrl: item.coverPreviewUrl }
            : item
        );
      });

      closeModal();
    } catch {
      setFormError("Something went wrong. Please check your connection.");
    } finally {
      setSubmitting(false);
      setProgressMessage("");
    }
  }

  async function handleToggleStatus(publication: PublicationWithPreview) {
    setTogglingId(publication.id);
    setListError("");

    const nextStatus = publication.status === "published" ? "draft" : "published";

    try {
      const response = await fetch(`/api/sanctum/publications/${publication.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: publication.title,
          slug: publication.slug,
          category: publication.category,
          description: publication.description,
          status: nextStatus,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setListError(data.error || "Unable to update status.");
        return;
      }

      setPublications((prev) =>
        prev.map((item) =>
          item.id === publication.id
            ? { ...data.publication, pdfPreviewUrl: item.pdfPreviewUrl, coverPreviewUrl: item.coverPreviewUrl }
            : item
        )
      );
    } catch {
      setListError("Something went wrong. Please check your connection.");
    } finally {
      setTogglingId(null);
    }
  }

  async function handleCopyLink(publication: PublicationWithPreview) {
    try {
      await navigator.clipboard.writeText(`${SITE_URL}/library/${publication.slug}`);
      setCopiedId(publication.id);
      setTimeout(() => setCopiedId((current) => (current === publication.id ? null : current)), 2000);
    } catch {
      setListError("Unable to copy the link. Please copy it manually.");
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    setListError("");

    try {
      const response = await fetch(`/api/sanctum/publications/${id}`, { method: "DELETE" });
      const data = await response.json();

      if (!response.ok || !data.success) {
        setListError(data.error || "Unable to delete the publication.");
        return;
      }

      setPublications((prev) => prev.filter((item) => item.id !== id));
      setConfirmDeleteId(null);
    } catch {
      setListError("Something went wrong. Please check your connection.");
    } finally {
      setDeletingId(null);
    }
  }

  async function handleSendAnnouncement(id: string) {
    setSendingId(id);
    setListError("");

    try {
      const response = await fetch(`/api/sanctum/publications/${id}/send`, { method: "POST" });
      const data = await response.json();

      if (!response.ok || !data.success) {
        setListError(data.error || "Unable to send this publication.");
        return;
      }

      setPublications((prev) =>
        prev.map((item) =>
          item.id === id
            ? { ...item, sent_at: data.publication.sent_at, sent_count: data.publication.sent_count }
            : item
        )
      );
      setConfirmSendId(null);
    } catch {
      setListError("Something went wrong. Please check your connection.");
    } finally {
      setSendingId(null);
    }
  }

  const sendingPublication = publications.find((item) => item.id === confirmSendId) ?? null;

  return (
    <section className="mt-12">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="font-display text-xl font-semibold text-ivory md:text-2xl">
          Publications
        </h2>
        <Button type="button" variant="secondary" onClick={openCreateModal}>
          New Publication
        </Button>
      </div>

      {listError && (
        <p role="alert" className="mt-4 font-body text-sm text-crimson">
          {listError}
        </p>
      )}

      <div className="mt-4 overflow-x-auto border border-gold-muted">
        <table className="w-full min-w-[720px] text-left">
          <thead>
            <tr className="border-b border-gold-muted bg-charcoal">
              <th className="px-4 py-3 font-body text-xs font-medium uppercase tracking-wider text-ivory-muted">
                Cover
              </th>
              <th className="px-4 py-3 font-body text-xs font-medium uppercase tracking-wider text-ivory-muted">
                Title
              </th>
              <th className="px-4 py-3 font-body text-xs font-medium uppercase tracking-wider text-ivory-muted">
                Category
              </th>
              <th className="px-4 py-3 font-body text-xs font-medium uppercase tracking-wider text-ivory-muted">
                Status
              </th>
              <th className="px-4 py-3 font-body text-xs font-medium uppercase tracking-wider text-ivory-muted">
                Created
              </th>
              <th className="px-4 py-3 font-body text-xs font-medium uppercase tracking-wider text-ivory-muted">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {publications.map((publication) => (
              <tr key={publication.id} className="border-b border-gold-muted/20 last:border-0">
                <td className="px-4 py-3">
                  {publication.coverPreviewUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={publication.coverPreviewUrl}
                      alt={publication.title}
                      className="h-14 w-11 border border-gold-muted object-cover"
                    />
                  ) : (
                    <div className="h-14 w-11 border border-gold-muted bg-navy" />
                  )}
                </td>
                <td className="px-4 py-3 font-body text-sm text-ivory">{publication.title}</td>
                <td className="px-4 py-3 font-body text-sm text-ivory-muted">
                  {publication.category}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-block border px-2 py-1 font-body text-xs font-medium uppercase tracking-wide ${
                      publication.status === "published"
                        ? "border-emerald/40 text-emerald"
                        : "border-gold-muted text-gold"
                    }`}
                  >
                    {publication.status === "published" ? "Published" : "Draft"}
                  </span>
                </td>
                <td className="px-4 py-3 font-body text-sm text-ivory-muted">
                  {formatDate(publication.created_at)}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-3">
                    <a
                      href={
                        publication.status === "published"
                          ? `/library/${publication.slug}`
                          : `/library/${publication.slug}?preview=true`
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-body text-sm font-medium text-gold transition-colors duration-200 hover:text-ivory"
                    >
                      {publication.status === "published" ? "View Live ↗" : "Preview Draft ↗"}
                    </a>
                    <button
                      type="button"
                      onClick={() => handleCopyLink(publication)}
                      className="font-body text-sm font-medium text-ivory-muted transition-colors duration-200 hover:text-gold"
                    >
                      {copiedId === publication.id ? "Copied!" : "Copy Link"}
                    </button>
                    <button
                      type="button"
                      onClick={() => openEditModal(publication)}
                      className="font-body text-sm font-medium text-gold transition-colors duration-200 hover:text-ivory"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      disabled={togglingId === publication.id}
                      onClick={() => handleToggleStatus(publication)}
                      className="font-body text-sm font-medium text-ivory-muted transition-colors duration-200 hover:text-gold disabled:opacity-50"
                    >
                      {togglingId === publication.id
                        ? "Updating…"
                        : publication.status === "published"
                          ? "Unpublish"
                          : "Publish"}
                    </button>
                    {publication.status === "published" && (
                      <button
                        type="button"
                        disabled={Boolean(publication.sent_at)}
                        onClick={() => setConfirmSendId(publication.id)}
                        className="font-body text-sm font-medium text-gold transition-colors duration-200 hover:text-ivory disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:text-gold"
                      >
                        {publication.sent_at ? "Announced ✓" : "Send Announcement"}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteId(publication.id)}
                      className="font-body text-sm font-medium text-crimson transition-colors duration-200 hover:text-ivory"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {publications.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center font-body text-sm text-ivory-muted">
                  No publications yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {modalMode && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-navy/80 p-4"
          onClick={closeModal}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="publication-form-heading"
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto border border-gold-muted bg-charcoal p-6 md:p-8"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <h2
                id="publication-form-heading"
                className="font-display text-2xl font-semibold text-ivory"
              >
                {modalMode === "create" ? "New Publication" : "Edit Publication"}
              </h2>
              <button
                type="button"
                aria-label="Close"
                onClick={closeModal}
                className="font-body text-sm text-ivory-muted transition-colors duration-200 hover:text-gold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-8 space-y-5">
              <div>
                <label htmlFor="pub-title" className="font-body text-xs font-medium uppercase tracking-wider text-gold">
                  Title
                </label>
                <input
                  id="pub-title"
                  required
                  value={form.title}
                  onChange={(event) => handleTitleChange(event.target.value)}
                  className="mt-2 h-11 w-full border border-gold-muted bg-transparent px-3 font-body text-sm text-ivory focus:border-gold focus:outline-none"
                />
              </div>

              <div>
                <label htmlFor="pub-slug" className="font-body text-xs font-medium uppercase tracking-wider text-gold">
                  Slug
                </label>
                <input
                  id="pub-slug"
                  required
                  value={form.slug}
                  onChange={(event) => {
                    setSlugTouched(true);
                    setForm((prev) => ({ ...prev, slug: event.target.value }));
                  }}
                  className="mt-2 h-11 w-full border border-gold-muted bg-transparent px-3 font-body text-sm text-ivory focus:border-gold focus:outline-none"
                />
              </div>

              <div>
                <label htmlFor="pub-category" className="font-body text-xs font-medium uppercase tracking-wider text-gold">
                  Category
                </label>
                <input
                  id="pub-category"
                  required
                  value={form.category}
                  onChange={(event) => setForm((prev) => ({ ...prev, category: event.target.value }))}
                  className="mt-2 h-11 w-full border border-gold-muted bg-transparent px-3 font-body text-sm text-ivory focus:border-gold focus:outline-none"
                />
              </div>

              <div>
                <label htmlFor="pub-description" className="font-body text-xs font-medium uppercase tracking-wider text-gold">
                  Description
                </label>
                <textarea
                  id="pub-description"
                  required
                  rows={4}
                  value={form.description}
                  onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
                  className="mt-2 w-full border border-gold-muted bg-transparent px-3 py-2 font-body text-sm text-ivory focus:border-gold focus:outline-none"
                />
              </div>

              <div>
                <label htmlFor="pub-cover" className="font-body text-xs font-medium uppercase tracking-wider text-gold">
                  Cover Image{modalMode === "edit" ? " (leave empty to keep current cover)" : ""}
                </label>
                <input
                  id="pub-cover"
                  type="file"
                  accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                  onChange={(event) => handleCoverChange(event.target.files?.[0] ?? null)}
                  className="mt-2 w-full font-body text-sm text-ivory-muted file:mr-4 file:border file:border-gold-muted file:bg-transparent file:px-3 file:py-2 file:font-body file:text-sm file:text-gold"
                />
                {convertingCover && (
                  <p className="mt-2 font-body text-xs text-ivory-muted">Preparing cover image…</p>
                )}
                {modalMode === "edit" && editingId && (
                  <PreviewLink
                    publications={publications}
                    editingId={editingId}
                    field="coverPreviewUrl"
                    label="View current cover"
                  />
                )}
              </div>

              <div>
                <label htmlFor="pub-pdf" className="font-body text-xs font-medium uppercase tracking-wider text-gold">
                  PDF File{modalMode === "edit" ? " (leave empty to keep current file)" : ""}
                </label>
                <input
                  id="pub-pdf"
                  type="file"
                  accept="application/pdf"
                  onChange={(event) => setPdfFile(event.target.files?.[0] ?? null)}
                  className="mt-2 w-full font-body text-sm text-ivory-muted file:mr-4 file:border file:border-gold-muted file:bg-transparent file:px-3 file:py-2 file:font-body file:text-sm file:text-gold"
                />
                {modalMode === "edit" && editingId && (
                  <PreviewLink
                    publications={publications}
                    editingId={editingId}
                    field="pdfPreviewUrl"
                    label="View current PDF"
                  />
                )}
              </div>

              <div>
                <span className="font-body text-xs font-medium uppercase tracking-wider text-gold">
                  Status
                </span>
                <div className="mt-2 flex gap-3">
                  <Button
                    type="button"
                    variant={form.status === "draft" ? "primary" : "secondary"}
                    onClick={() => setForm((prev) => ({ ...prev, status: "draft" }))}
                  >
                    Draft
                  </Button>
                  <Button
                    type="button"
                    variant={form.status === "published" ? "primary" : "secondary"}
                    onClick={() => setForm((prev) => ({ ...prev, status: "published" }))}
                  >
                    Published
                  </Button>
                </div>
              </div>

              {formError && (
                <p role="alert" className="font-body text-sm text-crimson">
                  {formError}
                </p>
              )}

              <div className="flex gap-3 border-t border-gold-muted/30 pt-6">
                <Button type="submit" variant="primary" disabled={submitting || convertingCover}>
                  {submitting ? progressMessage || "Saving…" : "Save Publication"}
                </Button>
                <Button type="button" variant="ghost" onClick={closeModal}>
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {confirmDeleteId && (
        <DeleteConfirmModal
          message="Delete this publication permanently?"
          deleting={deletingId === confirmDeleteId}
          onCancel={() => setConfirmDeleteId(null)}
          onConfirm={() => handleDelete(confirmDeleteId)}
        />
      )}

      {sendingPublication && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-navy/80 p-4"
          onClick={() => setConfirmSendId(null)}
        >
          <div
            role="alertdialog"
            aria-modal="true"
            className="w-full max-w-sm border border-gold-muted bg-charcoal p-6 text-center"
            onClick={(event) => event.stopPropagation()}
          >
            <p className="font-body text-base text-ivory">
              Send this to all newsletter subscribers?
            </p>
            <div className="mt-6 flex justify-center gap-3">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setConfirmSendId(null)}
                disabled={sendingId === sendingPublication.id}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="primary"
                disabled={sendingId === sendingPublication.id}
                onClick={() => handleSendAnnouncement(sendingPublication.id)}
              >
                {sendingId === sendingPublication.id ? "Sending…" : "Send Announcement"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function PreviewLink({
  publications,
  editingId,
  field,
  label,
}: {
  publications: PublicationWithPreview[];
  editingId: string;
  field: "pdfPreviewUrl" | "coverPreviewUrl";
  label: string;
}) {
  const publication = publications.find((item) => item.id === editingId);
  const url = publication?.[field];

  if (!url) return null;

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-2 inline-block font-body text-sm font-medium text-gold transition-colors duration-200 hover:text-ivory"
    >
      {label} ↗
    </a>
  );
}
