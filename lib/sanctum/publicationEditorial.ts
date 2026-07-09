import type { PublicationFramework, PublicationKeyInsight } from "./types";

// Shared by the publication create (POST) and update (PATCH) routes.
// Every field is optional on input: `undefined` means "not provided" (the
// caller should leave the existing/default value untouched), while an
// empty/blank value normalizes to `null` (explicitly cleared). This lets the
// PATCH route's status-toggle call, which never sends these fields, leave
// existing editorial metadata intact.

type FieldResult<T> =
  | { ok: true; value: T | null | undefined }
  | { ok: false; error: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function parseIntelligenceBrief(value: unknown): FieldResult<string> {
  if (value === undefined) return { ok: true, value: undefined };
  if (value === null) return { ok: true, value: null };
  if (typeof value !== "string") {
    return { ok: false, error: "Intelligence brief must be text." };
  }
  const trimmed = value.trim();
  return { ok: true, value: trimmed.length > 0 ? trimmed : null };
}

export function parseCentralQuestion(value: unknown): FieldResult<string> {
  if (value === undefined) return { ok: true, value: undefined };
  if (value === null) return { ok: true, value: null };
  if (typeof value !== "string") {
    return { ok: false, error: "Central question must be text." };
  }
  const trimmed = value.trim();
  return { ok: true, value: trimmed.length > 0 ? trimmed : null };
}

export function parseKeyInsights(value: unknown): FieldResult<PublicationKeyInsight[]> {
  if (value === undefined) return { ok: true, value: undefined };
  if (value === null) return { ok: true, value: null };
  if (!Array.isArray(value)) {
    return { ok: false, error: "Key insights must be a list." };
  }

  const insights: PublicationKeyInsight[] = [];
  for (const item of value) {
    if (
      !isRecord(item) ||
      typeof item.title !== "string" ||
      !item.title.trim() ||
      typeof item.description !== "string" ||
      !item.description.trim()
    ) {
      return { ok: false, error: "Each key insight needs a title and a description." };
    }
    insights.push({ title: item.title.trim(), description: item.description.trim() });
  }

  return { ok: true, value: insights.length > 0 ? insights : null };
}

export function parseFramework(value: unknown): FieldResult<PublicationFramework> {
  if (value === undefined) return { ok: true, value: undefined };
  if (value === null) return { ok: true, value: null };
  if (!isRecord(value)) {
    return { ok: false, error: "Framework must be an object with a title and steps." };
  }

  const { title, steps } = value;

  if (typeof title !== "string" || !title.trim()) {
    return { ok: false, error: "Framework needs a title." };
  }

  if (
    !Array.isArray(steps) ||
    steps.length === 0 ||
    steps.some((step) => typeof step !== "string" || !step.trim())
  ) {
    return { ok: false, error: "Framework needs at least one step." };
  }

  return {
    ok: true,
    value: { title: title.trim(), steps: steps.map((step) => (step as string).trim()) },
  };
}

export function parseFeatured(value: unknown): FieldResult<boolean> {
  if (value === undefined) return { ok: true, value: undefined };
  if (typeof value !== "boolean") {
    return { ok: false, error: "Featured must be true or false." };
  }
  return { ok: true, value };
}

export function parseFeaturedOrder(value: unknown): FieldResult<number> {
  if (value === undefined) return { ok: true, value: undefined };
  if (value === null) return { ok: true, value: null };
  if (typeof value !== "number" || !Number.isInteger(value)) {
    return { ok: false, error: "Featured order must be a whole number." };
  }
  return { ok: true, value };
}
