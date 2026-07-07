"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { DeleteConfirmModal } from "@/components/sanctum/DeleteConfirmModal";
import type { EssayWithPreview } from "@/lib/sanctum/types";

const SITE_URL = "https://www.aristolegion.com";

interface EssaysSectionProps {
  initialEssays: EssayWithPreview[];
}

interface FormState {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  linkedinUrl: string;
  status: "draft" | "published";
}

const EMPTY_FORM: FormState = {
  title: "",
  slug: "",
  excerpt: "",
  content: "",
  linkedinUrl: "",
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

// Normalizes every uploaded cover to .webp client-side via canvas — same
// approach as PublicationsSection, no server-side image dependency needed.
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

function buildFormData(form: FormState, coverFile: File | null): FormData {
  const formData = new FormData();
  formData.set("title", form.title);
  formData.set("slug", form.slug);
  formData.set("excerpt", form.excerpt);
  formData.set("content", form.content);
  formData.set("linkedinUrl", form.linkedinUrl);
  formData.set("status", form.status);
  if (coverFile) {
    formData.set("cover", coverFile);
  }
  return formData;
}

export function EssaysSection({ initialEssays }: EssaysSectionProps) {
  const [essays, setEssays] = useState(initialEssays);
  const [modalMode, setModalMode] = useState<"create" | "edit" | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [convertingCover, setConvertingCover] = useState(false);
  const [slugTouched, setSlugTouched] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [listError, setListError] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [confirmSendId, setConfirmSendId] = useState<string | null>(null);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [testSendingId, setTestSendingId] = useState<string | null>(null);
  const [testSentId, setTestSentId] = useState<string | null>(null);

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
    setCoverFile(null);
    setSlugTouched(false);
    setFormError("");
    setEditingId(null);
    setModalMode("create");
  }

  function openEditModal(essay: EssayWithPreview) {
    setForm({
      title: essay.title,
      slug: essay.slug,
      excerpt: essay.excerpt,
      content: essay.content,
      linkedinUrl: essay.linkedin_url ?? "",
      status: essay.status === "published" ? "published" : "draft",
    });
    setCoverFile(null);
    setSlugTouched(true);
    setFormError("");
    setEditingId(essay.id);
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
    setSubmitting(true);

    try {
      const formData = buildFormData(form, coverFile);
      const response =
        modalMode === "create"
          ? await fetch("/api/sanctum/essays", { method: "POST", body: formData })
          : await fetch(`/api/sanctum/essays/${editingId}`, { method: "PATCH", body: formData });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setFormError(data.error || "Unable to save the essay.");
        return;
      }

      const saved: EssayWithPreview = { ...data.essay, coverPreviewUrl: null };

      setEssays((prev) => {
        if (modalMode === "create") {
          return [saved, ...prev];
        }
        return prev.map((item) =>
          item.id === saved.id ? { ...saved, coverPreviewUrl: item.coverPreviewUrl } : item
        );
      });

      closeModal();
    } catch {
      setFormError("Something went wrong. Please check your connection.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleToggleStatus(essay: EssayWithPreview) {
    setTogglingId(essay.id);
    setListError("");

    const nextStatus = essay.status === "published" ? "draft" : "published";
    const formData = new FormData();
    formData.set("title", essay.title);
    formData.set("slug", essay.slug);
    formData.set("excerpt", essay.excerpt);
    formData.set("content", essay.content);
    formData.set("linkedinUrl", essay.linkedin_url ?? "");
    formData.set("status", nextStatus);

    try {
      const response = await fetch(`/api/sanctum/essays/${essay.id}`, {
        method: "PATCH",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setListError(data.error || "Unable to update status.");
        return;
      }

      setEssays((prev) =>
        prev.map((item) =>
          item.id === essay.id ? { ...data.essay, coverPreviewUrl: item.coverPreviewUrl } : item
        )
      );
    } catch {
      setListError("Something went wrong. Please check your connection.");
    } finally {
      setTogglingId(null);
    }
  }

  async function handleCopyLink(essay: EssayWithPreview) {
    try {
      await navigator.clipboard.writeText(`${SITE_URL}/essays/${essay.slug}`);
      setCopiedId(essay.id);
      setTimeout(() => setCopiedId((current) => (current === essay.id ? null : current)), 2000);
    } catch {
      setListError("Unable to copy the link. Please copy it manually.");
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    setListError("");

    try {
      const response = await fetch(`/api/sanctum/essays/${id}`, { method: "DELETE" });
      const data = await response.json();

      if (!response.ok || !data.success) {
        setListError(data.error || "Unable to delete the essay.");
        return;
      }

      setEssays((prev) => prev.filter((item) => item.id !== id));
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
      const response = await fetch(`/api/sanctum/essays/${id}/send`, { method: "POST" });
      const data = await response.json();

      if (!response.ok || !data.success) {
        setListError(data.error || "Unable to send this essay.");
        return;
      }

      setEssays((prev) =>
        prev.map((item) =>
          item.id === id
            ? { ...item, sent_at: data.essay.sent_at, sent_count: data.essay.sent_count }
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

  async function handleSendTestEmail(id: string) {
    setTestSendingId(id);
    setListError("");

    try {
      const response = await fetch(`/api/sanctum/essays/${id}/test-send`, { method: "POST" });
      const data = await response.json();

      if (!response.ok || !data.success) {
        setListError(data.error || "Unable to send the test email.");
        return;
      }

      setTestSentId(id);
      setTimeout(() => setTestSentId((current) => (current === id ? null : current)), 2000);
    } catch {
      setListError("Something went wrong. Please check your connection.");
    } finally {
      setTestSendingId(null);
    }
  }

  const sendingEssay = essays.find((item) => item.id === confirmSendId) ?? null;

  return (
    <section className="mt-12">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="font-display text-xl font-semibold text-ivory md:text-2xl">Essays</h2>
        <Button type="button" variant="secondary" onClick={openCreateModal}>
          New Essay
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
            {essays.map((essay) => (
              <tr key={essay.id} className="border-b border-gold-muted/20 last:border-0">
                <td className="px-4 py-3">
                  {essay.coverPreviewUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={essay.coverPreviewUrl}
                      alt={essay.title}
                      className="h-14 w-11 border border-gold-muted object-cover"
                    />
                  ) : (
                    <div className="h-14 w-11 border border-gold-muted bg-navy" />
                  )}
                </td>
                <td className="px-4 py-3 font-body text-sm text-ivory">{essay.title}</td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-block border px-2 py-1 font-body text-xs font-medium uppercase tracking-wide ${
                      essay.status === "published"
                        ? "border-emerald/40 text-emerald"
                        : "border-gold-muted text-gold"
                    }`}
                  >
                    {essay.status === "published" ? "Published" : "Draft"}
                  </span>
                </td>
                <td className="px-4 py-3 font-body text-sm text-ivory-muted">
                  {formatDate(essay.created_at)}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-3">
                    <a
                      href={
                        essay.status === "published"
                          ? `/essays/${essay.slug}`
                          : `/essays/${essay.slug}?preview=true`
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-body text-sm font-medium text-gold transition-colors duration-200 hover:text-ivory"
                    >
                      {essay.status === "published" ? "View Live ↗" : "Preview Draft ↗"}
                    </a>
                    <button
                      type="button"
                      onClick={() => handleCopyLink(essay)}
                      className="font-body text-sm font-medium text-ivory-muted transition-colors duration-200 hover:text-gold"
                    >
                      {copiedId === essay.id ? "Copied!" : "Copy Link"}
                    </button>
                    <button
                      type="button"
                      onClick={() => openEditModal(essay)}
                      className="font-body text-sm font-medium text-gold transition-colors duration-200 hover:text-ivory"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      disabled={togglingId === essay.id}
                      onClick={() => handleToggleStatus(essay)}
                      className="font-body text-sm font-medium text-ivory-muted transition-colors duration-200 hover:text-gold disabled:opacity-50"
                    >
                      {togglingId === essay.id
                        ? "Updating…"
                        : essay.status === "published"
                          ? "Unpublish"
                          : "Publish"}
                    </button>
                    {essay.status === "published" &&
                      (essay.sent_at ? (
                        <div className="font-body text-sm leading-snug">
                          <p className="font-medium text-emerald">Announcement Sent ✓</p>
                          <p className="text-xs text-ivory-muted">{formatDate(essay.sent_at)}</p>
                          <p className="text-xs text-ivory-muted">
                            {essay.sent_count} subscriber{essay.sent_count === 1 ? "" : "s"}
                          </p>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmSendId(essay.id)}
                          className="font-body text-sm font-medium text-gold transition-colors duration-200 hover:text-ivory"
                        >
                          Send Announcement
                        </button>
                      ))}
                    <button
                      type="button"
                      disabled={testSendingId === essay.id}
                      onClick={() => handleSendTestEmail(essay.id)}
                      className="font-body text-sm font-medium text-ivory-muted transition-colors duration-200 hover:text-gold disabled:opacity-50"
                    >
                      {testSendingId === essay.id
                        ? "Sending…"
                        : testSentId === essay.id
                          ? "Test Sent ✓"
                          : "Send Test Email"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteId(essay.id)}
                      className="font-body text-sm font-medium text-crimson transition-colors duration-200 hover:text-ivory"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {essays.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center font-body text-sm text-ivory-muted">
                  No essays yet.
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
            aria-labelledby="essay-form-heading"
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto border border-gold-muted bg-charcoal p-6 md:p-8"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <h2 id="essay-form-heading" className="font-display text-2xl font-semibold text-ivory">
                {modalMode === "create" ? "New Essay" : "Edit Essay"}
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
                <label htmlFor="essay-title" className="font-body text-xs font-medium uppercase tracking-wider text-gold">
                  Title
                </label>
                <input
                  id="essay-title"
                  required
                  value={form.title}
                  onChange={(event) => handleTitleChange(event.target.value)}
                  className="mt-2 h-11 w-full border border-gold-muted bg-transparent px-3 font-body text-sm text-ivory focus:border-gold focus:outline-none"
                />
              </div>

              <div>
                <label htmlFor="essay-slug" className="font-body text-xs font-medium uppercase tracking-wider text-gold">
                  Slug
                </label>
                <input
                  id="essay-slug"
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
                <label htmlFor="essay-excerpt" className="font-body text-xs font-medium uppercase tracking-wider text-gold">
                  Excerpt
                </label>
                <textarea
                  id="essay-excerpt"
                  required
                  rows={2}
                  value={form.excerpt}
                  onChange={(event) => setForm((prev) => ({ ...prev, excerpt: event.target.value }))}
                  className="mt-2 w-full border border-gold-muted bg-transparent px-3 py-2 font-body text-sm text-ivory focus:border-gold focus:outline-none"
                />
              </div>

              <div>
                <label htmlFor="essay-cover" className="font-body text-xs font-medium uppercase tracking-wider text-gold">
                  Cover Image (optional){modalMode === "edit" ? " — leave empty to keep current cover" : ""}
                </label>
                <input
                  id="essay-cover"
                  type="file"
                  accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                  onChange={(event) => handleCoverChange(event.target.files?.[0] ?? null)}
                  className="mt-2 w-full font-body text-sm text-ivory-muted file:mr-4 file:border file:border-gold-muted file:bg-transparent file:px-3 file:py-2 file:font-body file:text-sm file:text-gold"
                />
                {convertingCover && (
                  <p className="mt-2 font-body text-xs text-ivory-muted">Preparing cover image…</p>
                )}
                {modalMode === "edit" && editingId && (
                  <CoverPreviewLink essays={essays} editingId={editingId} />
                )}
              </div>

              <div>
                <label htmlFor="essay-content" className="font-body text-xs font-medium uppercase tracking-wider text-gold">
                  Essay Body (Markdown — # heading, ## section, **bold**, *italic*, &gt; quote, - list)
                </label>
                <textarea
                  id="essay-content"
                  required
                  rows={14}
                  value={form.content}
                  onChange={(event) => setForm((prev) => ({ ...prev, content: event.target.value }))}
                  className="mt-2 w-full border border-gold-muted bg-transparent px-3 py-2 font-mono text-sm text-ivory focus:border-gold focus:outline-none"
                />
              </div>

              <div>
                <label htmlFor="essay-linkedin" className="font-body text-xs font-medium uppercase tracking-wider text-gold">
                  LinkedIn URL (optional)
                </label>
                <input
                  id="essay-linkedin"
                  type="url"
                  value={form.linkedinUrl}
                  onChange={(event) => setForm((prev) => ({ ...prev, linkedinUrl: event.target.value }))}
                  placeholder="https://www.linkedin.com/…"
                  className="mt-2 h-11 w-full border border-gold-muted bg-transparent px-3 font-body text-sm text-ivory placeholder:text-ivory-muted focus:border-gold focus:outline-none"
                />
                <p className="mt-2 font-body text-xs text-ivory-muted">
                  Paste the LinkedIn post URL after you publish it manually — the public essay page
                  will then show &quot;Continue discussion on LinkedIn ↗&quot;.
                </p>
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
                  {submitting ? "Saving…" : "Save Essay"}
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
          message="Delete this essay permanently?"
          deleting={deletingId === confirmDeleteId}
          onCancel={() => setConfirmDeleteId(null)}
          onConfirm={() => handleDelete(confirmDeleteId)}
        />
      )}

      {sendingEssay && (
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
                disabled={sendingId === sendingEssay.id}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="primary"
                disabled={sendingId === sendingEssay.id}
                onClick={() => handleSendAnnouncement(sendingEssay.id)}
              >
                {sendingId === sendingEssay.id ? "Sending…" : "Send Announcement"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function CoverPreviewLink({
  essays,
  editingId,
}: {
  essays: EssayWithPreview[];
  editingId: string;
}) {
  const essay = essays.find((item) => item.id === editingId);

  if (!essay?.coverPreviewUrl) return null;

  return (
    <a
      href={essay.coverPreviewUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-2 inline-block font-body text-sm font-medium text-gold transition-colors duration-200 hover:text-ivory"
    >
      View current cover ↗
    </a>
  );
}
