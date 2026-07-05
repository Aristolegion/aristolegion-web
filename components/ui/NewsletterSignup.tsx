"use client";

import { useId, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import type { SectionBackground } from "@/lib/content/types";

interface NewsletterSignupProps {
  tone?: SectionBackground;
}

const toneClasses: Record<
  SectionBackground,
  { input: string; label: string; note: string }
> = {
  navy: {
    input:
      "border-gold-muted bg-transparent text-ivory placeholder:text-ivory-muted focus:border-gold",
    label: "text-ivory-muted",
    note: "text-ivory-muted",
  },
  ivory: {
    input:
      "border-charcoal/20 bg-ivory text-charcoal placeholder:text-charcoal/50 focus:border-gold",
    label: "text-charcoal/70",
    note: "text-charcoal/70",
  },
};

type SubmitStatus = "idle" | "submitting" | "success" | "error";

export function NewsletterSignup({ tone = "navy" }: NewsletterSignupProps) {
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [status, setStatus] = useState<SubmitStatus>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const emailId = useId();
  const consentId = useId();
  const classes = toneClasses[tone];

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!email || !consent) return;

    setStatus("submitting");
    setErrorMessage("");

    try {
      const response = await fetch("/api/newsletter/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, consent, source: "website" }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setErrorMessage(
          data.error || "Something went wrong. Please try again."
        );
        setStatus("error");
        return;
      }

      setStatus("success");
    } catch {
      setErrorMessage(
        "Something went wrong. Please check your connection and try again."
      );
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <p
        role="status"
        className={`font-body text-base leading-relaxed ${classes.note}`}
      >
        Thank you — you are on the list. Look for Aristolegion&apos;s next
        dispatch in your inbox.
      </p>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mx-auto flex max-w-md flex-col gap-4"
    >
      <div className="flex flex-col gap-3 sm:flex-row">
        <label htmlFor={emailId} className="sr-only">
          Email address
        </label>
        <input
          id={emailId}
          name="email"
          type="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
          className={`h-12 flex-1 border px-4 font-body text-sm transition-colors duration-200 focus:outline-none ${classes.input}`}
        />
        <Button
          type="submit"
          variant="primary"
          disabled={status === "submitting"}
        >
          {status === "submitting" ? "Subscribing…" : "Subscribe"}
        </Button>
      </div>

      {status === "error" && (
        <p role="alert" className="font-body text-xs text-crimson">
          {errorMessage}
        </p>
      )}

      <label
        htmlFor={consentId}
        className={`flex items-start gap-2 font-body text-xs leading-relaxed ${classes.label}`}
      >
        <input
          id={consentId}
          name="consent"
          type="checkbox"
          required
          checked={consent}
          onChange={(event) => setConsent(event.target.checked)}
          className="mt-0.5 h-4 w-4 accent-gold"
        />
        I would like to receive Aristolegion&apos;s publications and essays
        by email.
      </label>
    </form>
  );
}
