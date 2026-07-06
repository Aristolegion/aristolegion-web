"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";

type SubmitStatus = "idle" | "submitting" | "error";

export function SanctumLoginForm() {
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<SubmitStatus>("idle");
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("submitting");
    setErrorMessage("");

    try {
      const response = await fetch("/api/sanctum/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setErrorMessage(data.error || "Incorrect password.");
        setStatus("error");
        return;
      }

      // Reload so the server component re-checks the new session cookie.
      window.location.reload();
    } catch {
      setErrorMessage("Something went wrong. Please try again.");
      setStatus("error");
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-navy px-6">
      <div className="w-full max-w-sm border border-gold-muted bg-charcoal p-8 text-center md:p-10">
        <p className="font-body text-xs font-medium uppercase tracking-[0.15em] text-gold">
          Aristolegion
        </p>
        <h1 className="mt-3 font-display text-2xl font-semibold text-ivory">
          Command Center
        </h1>
        <p className="mt-2 font-body text-sm text-ivory-muted">
          Founder access only.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <label htmlFor="admin-password" className="sr-only">
            Password
          </label>
          <input
            id="admin-password"
            name="password"
            type="password"
            required
            autoFocus
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Password"
            className="h-12 w-full border border-gold-muted bg-transparent px-4 text-center font-body text-sm text-ivory placeholder:text-ivory-muted focus:border-gold focus:outline-none"
          />

          {status === "error" && (
            <p role="alert" className="font-body text-sm text-crimson">
              {errorMessage}
            </p>
          )}

          <Button
            type="submit"
            variant="primary"
            disabled={status === "submitting"}
            className="w-full"
          >
            {status === "submitting" ? "Verifying…" : "Enter"}
          </Button>
        </form>
      </div>
    </div>
  );
}
