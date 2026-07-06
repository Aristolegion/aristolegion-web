"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { PublicationsSection } from "@/components/sanctum/PublicationsSection";
import type {
  ApplicationStatus,
  InnerCircleApplication,
  NewsletterSubscriber,
  PublicationWithPreview,
} from "@/lib/sanctum/types";

interface SanctumDashboardProps {
  applications: InnerCircleApplication[];
  subscribers: NewsletterSubscriber[];
  publications: PublicationWithPreview[];
  loadError: string | null;
}

const STATUS_OPTIONS: ApplicationStatus[] = ["pending", "accepted", "rejected"];

const STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  accepted: "Accepted",
  rejected: "Rejected",
};

const STATUS_BADGE_CLASSES: Record<string, string> = {
  pending: "border-gold-muted text-gold",
  accepted: "border-emerald/40 text-emerald",
  rejected: "border-crimson/40 text-crimson",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function StatusBadge({ status }: { status: string }) {
  const classes = STATUS_BADGE_CLASSES[status] ?? STATUS_BADGE_CLASSES.pending;
  return (
    <span
      className={`inline-block border px-2 py-1 font-body text-xs font-medium uppercase tracking-wide ${classes}`}
    >
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}

function MetricCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="border border-gold-muted bg-charcoal p-6">
      <p className="font-body text-xs font-medium uppercase tracking-[0.15em] text-gold">
        {label}
      </p>
      <p className="mt-3 font-display text-4xl font-bold text-ivory">
        {value.toLocaleString()}
      </p>
    </div>
  );
}

export function SanctumDashboard({
  applications: initialApplications,
  subscribers,
  publications,
  loadError,
}: SanctumDashboardProps) {
  const [applications, setApplications] = useState(initialApplications);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [updateError, setUpdateError] = useState("");
  const [loggingOut, setLoggingOut] = useState(false);

  const selectedApplication = applications.find((app) => app.id === selectedId) ?? null;

  useEffect(() => {
    if (!selectedId) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setSelectedId(null);
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [selectedId]);

  async function handleStatusChange(id: string, status: ApplicationStatus) {
    setUpdatingId(id);
    setUpdateError("");

    try {
      const response = await fetch(`/api/sanctum/applications/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setUpdateError(data.error || "Unable to update status.");
        return;
      }

      setApplications((prev) =>
        prev.map((app) => (app.id === id ? { ...app, status } : app))
      );
    } catch {
      setUpdateError("Something went wrong. Please check your connection.");
    } finally {
      setUpdatingId(null);
    }
  }

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await fetch("/api/sanctum/logout", { method: "POST" });
    } finally {
      window.location.reload();
    }
  }

  return (
    <div className="min-h-screen bg-navy">
      <header className="border-b border-gold-muted px-6 py-6 md:px-10">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-body text-xs font-medium uppercase tracking-[0.15em] text-gold">
              Aristolegion
            </p>
            <h1 className="mt-1 font-display text-2xl font-bold text-ivory md:text-3xl">
              Command Center
            </h1>
          </div>
          <Button
            type="button"
            variant="ghost"
            disabled={loggingOut}
            className="self-start sm:self-auto"
            onClick={handleLogout}
          >
            {loggingOut ? "Logging out…" : "Log Out"}
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-10 md:px-10">
        {loadError && (
          <p
            role="alert"
            className="mb-8 border border-crimson/40 bg-crimson/10 p-4 font-body text-sm text-crimson"
          >
            {loadError}
          </p>
        )}

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <MetricCard label="Total Newsletter Subscribers" value={subscribers.length} />
          <MetricCard label="Total Inner Circle Applications" value={applications.length} />
          <MetricCard label="Total Publications" value={publications.length} />
        </div>

        <section className="mt-12">
          <h2 className="font-display text-xl font-semibold text-ivory md:text-2xl">
            Newsletter Subscribers
          </h2>
          <div className="mt-4 overflow-x-auto border border-gold-muted">
            <table className="w-full min-w-[420px] text-left">
              <thead>
                <tr className="border-b border-gold-muted bg-charcoal">
                  <th className="px-4 py-3 font-body text-xs font-medium uppercase tracking-wider text-ivory-muted">
                    Email
                  </th>
                  <th className="px-4 py-3 font-body text-xs font-medium uppercase tracking-wider text-ivory-muted">
                    Subscribed
                  </th>
                </tr>
              </thead>
              <tbody>
                {subscribers.map((subscriber) => (
                  <tr
                    key={subscriber.id}
                    className="border-b border-gold-muted/20 last:border-0"
                  >
                    <td className="px-4 py-3 font-body text-sm text-ivory">
                      {subscriber.email}
                    </td>
                    <td className="px-4 py-3 font-body text-sm text-ivory-muted">
                      {formatDate(subscriber.created_at)}
                    </td>
                  </tr>
                ))}
                {subscribers.length === 0 && (
                  <tr>
                    <td
                      colSpan={2}
                      className="px-4 py-8 text-center font-body text-sm text-ivory-muted"
                    >
                      No subscribers yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-12">
          <h2 className="font-display text-xl font-semibold text-ivory md:text-2xl">
            Inner Circle Applications
          </h2>
          <div className="mt-4 overflow-x-auto border border-gold-muted">
            <table className="w-full min-w-[640px] text-left">
              <thead>
                <tr className="border-b border-gold-muted bg-charcoal">
                  <th className="px-4 py-3 font-body text-xs font-medium uppercase tracking-wider text-ivory-muted">
                    Full Name
                  </th>
                  <th className="px-4 py-3 font-body text-xs font-medium uppercase tracking-wider text-ivory-muted">
                    Email
                  </th>
                  <th className="px-4 py-3 font-body text-xs font-medium uppercase tracking-wider text-ivory-muted">
                    Role
                  </th>
                  <th className="px-4 py-3 font-body text-xs font-medium uppercase tracking-wider text-ivory-muted">
                    Applied
                  </th>
                  <th className="px-4 py-3 font-body text-xs font-medium uppercase tracking-wider text-ivory-muted">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {applications.map((application) => (
                  <tr
                    key={application.id}
                    onClick={() => setSelectedId(application.id)}
                    className="cursor-pointer border-b border-gold-muted/20 transition-colors duration-200 last:border-0 hover:bg-charcoal"
                  >
                    <td className="px-4 py-3 font-body text-sm text-ivory">
                      {application.full_name}
                    </td>
                    <td className="px-4 py-3 font-body text-sm text-ivory-muted">
                      {application.email}
                    </td>
                    <td className="px-4 py-3 font-body text-sm text-ivory-muted">
                      {application.role_title}
                    </td>
                    <td className="px-4 py-3 font-body text-sm text-ivory-muted">
                      {formatDate(application.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={application.status} />
                    </td>
                  </tr>
                ))}
                {applications.length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-8 text-center font-body text-sm text-ivory-muted"
                    >
                      No applications yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <PublicationsSection initialPublications={publications} />
      </main>

      {selectedApplication && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-navy/80 p-4"
          onClick={() => setSelectedId(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="application-detail-heading"
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto border border-gold-muted bg-charcoal p-6 md:p-8"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-body text-xs font-medium uppercase tracking-[0.15em] text-gold">
                  Inner Circle Application
                </p>
                <h2
                  id="application-detail-heading"
                  className="mt-2 font-display text-2xl font-semibold text-ivory"
                >
                  {selectedApplication.full_name}
                </h2>
              </div>
              <button
                type="button"
                aria-label="Close"
                onClick={() => setSelectedId(null)}
                className="font-body text-sm text-ivory-muted transition-colors duration-200 hover:text-gold"
              >
                ✕
              </button>
            </div>

            <dl className="mt-8 space-y-6">
              <div>
                <dt className="font-body text-xs font-medium uppercase tracking-wider text-gold">
                  Email
                </dt>
                <dd className="mt-1 font-body text-sm text-ivory">
                  {selectedApplication.email}
                </dd>
              </div>
              <div>
                <dt className="font-body text-xs font-medium uppercase tracking-wider text-gold">
                  Current Role
                </dt>
                <dd className="mt-1 font-body text-sm text-ivory">
                  {selectedApplication.role_title}
                </dd>
              </div>
              <div>
                <dt className="font-body text-xs font-medium uppercase tracking-wider text-gold">
                  Why do you want to join?
                </dt>
                <dd className="mt-1 font-body text-sm leading-relaxed text-ivory-muted">
                  {selectedApplication.why_join}
                </dd>
              </div>
              <div>
                <dt className="font-body text-xs font-medium uppercase tracking-wider text-gold">
                  What capability are you developing?
                </dt>
                <dd className="mt-1 font-body text-sm leading-relaxed text-ivory-muted">
                  {selectedApplication.capability_goal}
                </dd>
              </div>
              <div>
                <dt className="font-body text-xs font-medium uppercase tracking-wider text-gold">
                  What do you hope to contribute?
                </dt>
                <dd className="mt-1 font-body text-sm leading-relaxed text-ivory-muted">
                  {selectedApplication.contribution}
                </dd>
              </div>
              <div>
                <dt className="font-body text-xs font-medium uppercase tracking-wider text-gold">
                  Applied
                </dt>
                <dd className="mt-1 font-body text-sm text-ivory-muted">
                  {formatDate(selectedApplication.created_at)}
                </dd>
              </div>
            </dl>

            <div className="mt-8 border-t border-gold-muted/30 pt-6">
              <p className="font-body text-xs font-medium uppercase tracking-wider text-gold">
                Update Status
              </p>
              <div className="mt-3 flex flex-wrap gap-3">
                {STATUS_OPTIONS.map((option) => {
                  const isCurrent = selectedApplication.status === option;
                  const isUpdating = updatingId === selectedApplication.id;
                  return (
                    <Button
                      key={option}
                      type="button"
                      variant={isCurrent ? "primary" : "secondary"}
                      disabled={isUpdating || isCurrent}
                      onClick={() => handleStatusChange(selectedApplication.id, option)}
                    >
                      {STATUS_LABELS[option]}
                    </Button>
                  );
                })}
              </div>
              {updateError && (
                <p role="alert" className="mt-3 font-body text-sm text-crimson">
                  {updateError}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
