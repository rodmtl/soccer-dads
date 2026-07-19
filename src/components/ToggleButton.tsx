import type { ReactNode } from "react";

export interface ToggleButtonProps {
  pressed: boolean;
  onToggle(): void;
  disabled?: boolean;
  children: ReactNode;
}

export function ToggleButton({
  pressed,
  onToggle,
  disabled = false,
  children,
}: ToggleButtonProps) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      disabled={disabled}
      onClick={onToggle}
      className="min-h-11 min-w-11 rounded-md border px-4 font-medium disabled:opacity-50"
    >
      {children}
    </button>
  );
}
