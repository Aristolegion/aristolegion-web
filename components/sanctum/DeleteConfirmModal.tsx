"use client";

import { Button } from "@/components/ui/Button";

interface DeleteConfirmModalProps {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  deleting: boolean;
}

export function DeleteConfirmModal({
  message,
  onConfirm,
  onCancel,
  deleting,
}: DeleteConfirmModalProps) {
  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-navy/80 p-4"
      onClick={onCancel}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        className="w-full max-w-sm border border-gold-muted bg-charcoal p-6 text-center"
        onClick={(event) => event.stopPropagation()}
      >
        <p className="font-body text-base text-ivory">{message}</p>
        <div className="mt-6 flex justify-center gap-3">
          <Button type="button" variant="secondary" onClick={onCancel} disabled={deleting}>
            Cancel
          </Button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={deleting}
            className="inline-flex h-12 items-center justify-center border border-crimson px-6 font-body text-sm font-medium tracking-wide text-crimson transition-colors duration-200 hover:bg-crimson hover:text-ivory disabled:opacity-50"
          >
            {deleting ? "Deleting…" : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}
