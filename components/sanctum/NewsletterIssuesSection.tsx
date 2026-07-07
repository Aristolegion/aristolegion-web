"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { DeleteConfirmModal } from "@/components/sanctum/DeleteConfirmModal";
import type { NewsletterIssueWithPreview } from "@/lib/sanctum/types";

const SITE_URL = "https://www.aristolegion.com";

interface NewsletterIssuesSectionProps {
  initialIssues: NewsletterIssueWithPreview[];
}

interface FormState {
  title: string;
  slug: string;
  subtitle: string;
  issueNumber: string;
  content: string;
  status: "draft" | "published";
}

const EMPTY_FORM: FormState = {
  title: "",
  slug: "",
  subtitle: "",
  issueNumber: "",
  content: "",
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

// Same client-side webp conversion as Essays/Publications — no server-side
// image-processing dependency needed.
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
  formData.set("subtitle", form.subtitle);
  formData.set("issueNumber", form.issueNumber);
  formData.set("content", form.content);
  formData.set("status", form.status);
  if (coverFile) {
    formData.set("cover", coverFile);
  }
  return formData;
}

export function NewsletterIssuesSection({ initialIssues }: NewsletterIssuesSectionProps) {
  const [issues, setIssues] = useState(initialIssues);
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

  function openEditModal(issue: NewsletterIssueWithPreview) {
    setForm({
      title: issue.title,
      slug: issue.slug,
      subtitle: issue.subtitle,
      issueNumber: issue.issue_number,
      content: issue.content,
      status: issue.status === "published" ? "published" : "draft",
    });
    setCoverFile(null);
    setSlugTouched(true);
    setFormError("");
    setEditingId(issue.id);
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
          ? await fetch("/api/sanctum/newsletter-issues", { method: "POST", body: formData })
          : await fetch(`/api/sanctum/newsletter-issues/${editingId}`, {
              method: "PATCH",
              body: formData,
            });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setFormError(data.error || "Unable to save the newsletter issue.");
        return;
      }

      const saved: NewsletterIssueWithPreview = { ...data.issue, coverPreviewUrl: null };

      setIssues((prev) => {
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

  async function handleToggleStatus(issue: NewsletterIssueWithPreview) {
    setTogglingId(issue.id);
    setListError("");

    const nextStatus = issue.status === "published" ? "draft" : "published";
    const formData = new FormData();
    formData.set("title", issue.title);
    formData.set("slug", issue.slug);
    formData.set("subtitle", issue.subtitle);
    formData.set("issueNumber", issue.issue_number);
    formData.set("content", issue.content);
    formData.set("status", nextStatus);

    try {
      const response = await fetch(`/api/sanctum/newsletter-issues/${issue.id}`, {
        method: "PATCH",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setListError(data.error || "Unable to update status.");
        return;
      }

      setIssues((prev) =>
        prev.map((item) =>
          item.id === issue.id ? { ...data.issue, coverPreviewUrl: item.coverPreviewUrl } : item
        )
      );
    } catch {
      setListError("Something went wrong. Please check your connection.");
    } finally {
      setTogglingId(null);
    }
  }

  async function handleCopyLink(issue: NewsletterIssueWithPreview) {
    try {
      await navigator.clipboard.writeText(`${SITE_URL}/newsletter/${issue.slug}`);
      setCopiedId(issue.id);
      setTimeout(() => setCopiedId((current) => (current === issue.id ? null : current)), 2000);
    } catch {
      setListError("Unable to copy the link. Please copy it manually.");
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    setListError("");

    try {
      const response = await fetch(`/api/sanctum/newsletter-issues/${id}`, { method: "DELETE" });
      const data = await response.json();

      if (!response.ok || !data.success) {
        setListError(data.error || "Unable to delete the newsletter issue.");
        return;
      }

      setIssues((prev) => prev.filter((item) => item.id !== id));
      setConfirmDeleteId(null);
    } catch {
      setListError("Something went wrong. Please check your connection.");
    } finally {
      setDeletingId(null);
    }
  }

  async function handleSend(id: string) {
    setSendingId(id);
    setListError("");

    try {
      const response = await fetch(`/api/sanctum/newsletter-issues/${id}/send`, { method: "POST" });
      const data = await response.json();

      if (!response.ok || !data.success) {
        setListError(data.error || "Unable to send this issue.");
        return;
      }

      setIssues((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, sent_at: data.issue.sent_at, sent_count: data.issue.sent_count } : item
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
      const response = await fetch(`/api/sanctum/newsletter-issues/${id}/test-send`, { method: "POST" });
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

  const sendingIssue = issues.find((item) => item.id === confirmSendId) ?? null;

  return (
    <section className="mt-12">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="font-display text-xl font-semibold text-ivory md:text-2xl">
          Newsletter Issues
        </h2>
        <Button type="button" variant="secondary" onClick={openCreateModal}>
          New Issue
        </Button>
      </div>

      {listError && (
        <p role="alert" className="mt-4 font-body text-sm text-crimson">
          {listError}
        </p>
      )}

      <div className="mt-4 overflow-x-auto border border-gold-muted">
        <table className="w-full min-w-[820px] text-left">
          <thead>
            <tr className="border-b border-gold-muted bg-charcoal">
              <th className="px-4 py-3 font-body text-xs font-medium uppercase tracking-wider text-ivory-muted">
                Cover
              </th>
              <th className="px-4 py-3 font-body text-xs font-medium uppercase tracking-wider text-ivory-muted">
                Title
              </th>
              <th className="px-4 py-3 font-body text-xs font-medium uppercase tracking-wider text-ivory-muted">
                Issue #
              </th>
              <th className="px-4 py-3 font-body text-xs font-medium uppercase tracking-wider text-ivory-muted">
                Status
              </th>
              <th className="px-4 py-3 font-body text-xs font-medium uppercase tracking-wider text-ivory-muted">
                Sent
              </th>
              <th className="px-4 py-3 font-body text-xs font-medium uppercase tracking-wider text-ivory-muted">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {issues.map((issue) => (
              <tr key={issue.id} className="border-b border-gold-muted/20 last:border-0">
                <td className="px-4 py-3">
                  {issue.coverPreviewUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={issue.coverPreviewUrl}
                      alt={issue.title}
                      className="h-14 w-11 border border-gold-muted object-cover"
                    />
                  ) : (
                    <div className="h-14 w-11 border border-gold-muted bg-navy" />
                  )}
                </td>
                <td className="px-4 py-3 font-body text-sm text-ivory">{issue.title}</td>
                <td className="px-4 py-3 font-body text-sm text-ivory-muted">{issue.issue_number}</td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-block border px-2 py-1 font-body text-xs font-medium uppercase tracking-wide ${
                      issue.status === "published"
                        ? "border-emerald/40 text-emerald"
                        : "border-gold-muted text-gold"
                    }`}
                  >
                    {issue.status === "published" ? "Published" : "Draft"}
                  </span>
                </td>
                <td className="px-4 py-3 font-body text-sm text-ivory-muted">
                  {issue.sent_at ? `${formatDate(issue.sent_at)} · ${issue.sent_count} sent` : "—"}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-3">
                    <a
                      href={
                        issue.status === "published"
                          ? `/newsletter/${issue.slug}`
                          : `/newsletter/${issue.slug}?preview=true`
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-body text-sm font-medium text-gold transition-colors duration-200 hover:text-ivory"
                    >
                      {issue.status === "published" ? "View Live ↗" : "Preview Draft ↗"}
                    </a>
                    <button
                      type="button"
                      onClick={() => handleCopyLink(issue)}
                      className="font-body text-sm font-medium text-ivory-muted transition-colors duration-200 hover:text-gold"
                    >
                      {copiedId === issue.id ? "Copied!" : "Copy Link"}
                    </button>
                    <button
                      type="button"
                      onClick={() => openEditModal(issue)}
                      className="font-body text-sm font-medium text-gold transition-colors duration-200 hover:text-ivory"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      disabled={togglingId === issue.id}
                      onClick={() => handleToggleStatus(issue)}
                      className="font-body text-sm font-medium text-ivory-muted transition-colors duration-200 hover:text-gold disabled:opacity-50"
                    >
                      {togglingId === issue.id
                        ? "Updating…"
                        : issue.status === "published"
                          ? "Unpublish"
                          : "Publish"}
                    </button>
                    {issue.sent_at ? (
                      <span className="font-body text-sm font-medium text-ivory-muted">Sent ✓</span>
                    ) : issue.status === "published" ? (
                      <button
                        type="button"
                        onClick={() => setConfirmSendId(issue.id)}
                        className="font-body text-sm font-medium text-gold transition-colors duration-200 hover:text-ivory"
                      >
                        Send to Subscribers
                      </button>
                    ) : (
                      <span className="font-body text-sm text-ivory-muted/60">Publish to send</span>
                    )}
                    <button
                      type="button"
                      disabled={testSendingId === issue.id}
                      onClick={() => handleSendTestEmail(issue.id)}
                      className="font-body text-sm font-medium text-ivory-muted transition-colors duration-200 hover:text-gold disabled:opacity-50"
                    >
                      {testSendingId === issue.id
                        ? "Sending…"
                        : testSentId === issue.id
                          ? "Test Sent ✓"
                          : "Send Test Email"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteId(issue.id)}
                      className="font-body text-sm font-medium text-crimson transition-colors duration-200 hover:text-ivory"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {issues.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center font-body text-sm text-ivory-muted">
                  No newsletter issues yet.
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
            aria-labelledby="newsletter-issue-form-heading"
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto border border-gold-muted bg-charcoal p-6 md:p-8"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <h2
                id="newsletter-issue-form-heading"
                className="font-display text-2xl font-semibold text-ivory"
              >
                {modalMode === "create" ? "New Issue" : "Edit Issue"}
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
                <label htmlFor="issue-title" className="font-body text-xs font-medium uppercase tracking-wider text-gold">
                  Title
                </label>
                <input
                  id="issue-title"
                  required
                  value={form.title}
                  onChange={(event) => handleTitleChange(event.target.value)}
                  className="mt-2 h-11 w-full border border-gold-muted bg-transparent px-3 font-body text-sm text-ivory focus:border-gold focus:outline-none"
                />
              </div>

              <div>
                <label htmlFor="issue-slug" className="font-body text-xs font-medium uppercase tracking-wider text-gold">
                  Slug
                </label>
                <input
                  id="issue-slug"
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
                <label htmlFor="issue-subtitle" className="font-body text-xs font-medium uppercase tracking-wider text-gold">
                  Subtitle
                </label>
                <input
                  id="issue-subtitle"
                  required
                  value={form.subtitle}
                  onChange={(event) => setForm((prev) => ({ ...prev, subtitle: event.target.value }))}
                  className="mt-2 h-11 w-full border border-gold-muted bg-transparent px-3 font-body text-sm text-ivory focus:border-gold focus:outline-none"
                />
              </div>

              <div>
                <label htmlFor="issue-number" className="font-body text-xs font-medium uppercase tracking-wider text-gold">
                  Issue Number
                </label>
                <input
                  id="issue-number"
                  required
                  placeholder="e.g. 01"
                  value={form.issueNumber}
                  onChange={(event) => setForm((prev) => ({ ...prev, issueNumber: event.target.value }))}
                  className="mt-2 h-11 w-full border border-gold-muted bg-transparent px-3 font-body text-sm text-ivory placeholder:text-ivory-muted focus:border-gold focus:outline-none"
                />
              </div>

              <div>
                <label htmlFor="issue-cover" className="font-body text-xs font-medium uppercase tracking-wider text-gold">
                  Cover Image (optional){modalMode === "edit" ? " — leave empty to keep current cover" : ""}
                </label>
                <input
                  id="issue-cover"
                  type="file"
                  accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                  onChange={(event) => handleCoverChange(event.target.files?.[0] ?? null)}
                  className="mt-2 w-full font-body text-sm text-ivory-muted file:mr-4 file:border file:border-gold-muted file:bg-transparent file:px-3 file:py-2 file:font-body file:text-sm file:text-gold"
                />
                {convertingCover && (
                  <p className="mt-2 font-body text-xs text-ivory-muted">Preparing cover image…</p>
                )}
                {modalMode === "edit" && editingId && (
                  <CoverPreviewLink issues={issues} editingId={editingId} />
                )}
              </div>

              <div>
                <label htmlFor="issue-content" className="font-body text-xs font-medium uppercase tracking-wider text-gold">
                  Issue Body (Markdown — # heading, ## section, **bold**, *italic*, &gt; quote, - list)
                </label>
                <textarea
                  id="issue-content"
                  required
                  rows={14}
                  value={form.content}
                  onChange={(event) => setForm((prev) => ({ ...prev, content: event.target.value }))}
                  className="mt-2 w-full border border-gold-muted bg-transparent px-3 py-2 font-mono text-sm text-ivory focus:border-gold focus:outline-none"
                />
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
                  {submitting ? "Saving…" : "Save Issue"}
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
          message="Delete this newsletter issue permanently?"
          deleting={deletingId === confirmDeleteId}
          onCancel={() => setConfirmDeleteId(null)}
          onConfirm={() => handleDelete(confirmDeleteId)}
        />
      )}

      {sendingIssue && (
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
              Send &quot;{sendingIssue.title}&quot; to every newsletter subscriber? This cannot be undone.
            </p>
            <div className="mt-6 flex justify-center gap-3">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setConfirmSendId(null)}
                disabled={sendingId === sendingIssue.id}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="primary"
                disabled={sendingId === sendingIssue.id}
                onClick={() => handleSend(sendingIssue.id)}
              >
                {sendingId === sendingIssue.id ? "Sending…" : "Send to Subscribers"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function CoverPreviewLink({
  issues,
  editingId,
}: {
  issues: NewsletterIssueWithPreview[];
  editingId: string;
}) {
  const issue = issues.find((item) => item.id === editingId);

  if (!issue?.coverPreviewUrl) return null;

  return (
    <a
      href={issue.coverPreviewUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-2 inline-block font-body text-sm font-medium text-gold transition-colors duration-200 hover:text-ivory"
    >
      View current cover ↗
    </a>
  );
}
