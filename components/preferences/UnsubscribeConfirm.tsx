"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";

interface UnsubscribeConfirmProps {
  token: string;
  alreadyUnsubscribed: boolean;
}

export function UnsubscribeConfirm({ token, alreadyUnsubscribed }: UnsubscribeConfirmProps) {
  const [done, setDone] = useState(alreadyUnsubscribed);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleConfirm() {
    setSubmitting(true);
    setError("");

    try {
      const response = await fetch(`/api/unsubscribe/${token}`, { method: "POST" });
      const data = await response.json();

      if (!response.ok || !data.success) {
        setError(data.error || "Unable to unsubscribe. Please try again.");
        return;
      }

      setDone(true);
    } catch {
      setError("Something went wrong. Please check your connection.");
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <p className="mt-8 font-body text-sm text-ivory-muted">
        You have been unsubscribed from Aristolegion emails.
      </p>
    );
  }

  return (
    <div className="mt-8">
      {error && (
        <p role="alert" className="mb-4 font-body text-sm text-crimson">
          {error}
        </p>
      )}
      <Button type="button" variant="primary" disabled={submitting} onClick={handleConfirm}>
        {submitting ? "Unsubscribing…" : "Confirm Unsubscribe"}
      </Button>
    </div>
  );
}
