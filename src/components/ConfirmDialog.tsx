"use client";

import { useEffect, useId, useRef, type KeyboardEvent } from "react";
import { Button } from "@/components/Button";

export interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm(): void;
  onCancel(): void;
}

export function ConfirmDialog({
  isOpen,
  title,
  description,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const titleId = useId();
  const descriptionId = useId();
  const cancelButtonRef = useRef<HTMLButtonElement>(null);
  const confirmButtonRef = useRef<HTMLButtonElement>(null);
  const previouslyFocusedElementRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      previouslyFocusedElementRef.current = document.activeElement as HTMLElement | null;
      cancelButtonRef.current?.focus();
    } else {
      previouslyFocusedElementRef.current?.focus();
    }
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      onCancel();
      return;
    }

    if (event.key !== "Tab") {
      return;
    }

    const focusables = [cancelButtonRef.current, confirmButtonRef.current];
    const currentIndex = focusables.indexOf(document.activeElement as HTMLButtonElement);

    event.preventDefault();
    const direction = event.shiftKey ? -1 : 1;
    const nextIndex = (currentIndex + direction + focusables.length) % focusables.length;
    focusables[nextIndex]?.focus();
  }

  return (
    <div
      data-testid="confirm-dialog-backdrop"
      className="fixed inset-0 flex items-center justify-center bg-black/50"
      onClick={onCancel}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        onKeyDown={handleKeyDown}
        onClick={(event) => event.stopPropagation()}
        className="flex flex-col gap-4 rounded-md bg-white p-6"
      >
        <h2 id={titleId} className="text-lg font-semibold">
          {title}
        </h2>
        <p id={descriptionId} className="text-sm text-gray-600">
          {description}
        </p>
        <div className="flex justify-end gap-3">
          <Button ref={cancelButtonRef} variant="secondary" onClick={onCancel}>
            {cancelLabel}
          </Button>
          <Button ref={confirmButtonRef} variant="danger" onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
