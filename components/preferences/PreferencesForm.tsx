"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";

interface PreferencesFormProps {
  token: string;
  initialConsent: boolean;
}

// All three currently map to the same underlying `consent` flag — see
// app/api/preferences/[token]/route.ts — so they're kept in lockstep by a
// single piece of state rather than three independent booleans.
const OPTIONS = ["Receive Intelligence Journals", "Receive Essays", "Receive Dispatches"];

export function PreferencesForm({ token, initialConsent }: PreferencesFormProps) {
  const [consent, setConsent] = useState(initialConsent);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  async function handleSave() {
    setSaving(true);
    setError("");
    setSaved(false);

    try {
      const response = await fetch(`/api/preferences/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ consent }),
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        setError(data.error || "Unable to save your preferences.");
        return;
      }

      setSaved(true);
    } catch {
      setError("Something went wrong. Please check your connection.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mt-10 text-left">
      <div className="space-y-4 border border-gold-muted bg-charcoal p-6">
        {OPTIONS.map((label) => (
          <label key={label} className="flex items-center gap-3 font-body text-sm text-ivory">
            <input
              type="checkbox"
              checked={consent}
              onChange={(event) => setConsent(event.target.checked)}
              className="h-4 w-4 accent-gold"
            />
            {label}
          </label>
        ))}
      </div>

      {error && (
        <p role="alert" className="mt-4 font-body text-sm text-crimson">
          {error}
        </p>
      )}
      {saved && !error && (
        <p role="status" className="mt-4 font-body text-sm text-emerald">
          Preferences saved.
        </p>
      )}

      <Button type="button" variant="primary" className="mt-6" disabled={saving} onClick={handleSave}>
        {saving ? "Saving…" : "Save Preferences"}
      </Button>
    </div>
  );
}
