import type { ReactNode } from "react";

export interface ToggleButtonProps {
  pressed: boolean;
  onToggle(): void;
  disabled?: boolean;
  children: ReactNode;
}

// docs/ux/design-tokens.md's ToggleButton spec: the pressed/selected state
// must be conveyed both by `aria-pressed` (for assistive tech) and a paired
// visual signal (never color alone) — here, a checkmark glyph plus a filled
// vs. outlined style.
//
// Disabled state uses `aria-disabled` rather than the native `disabled`
// attribute: docs/ux/02-player-attendance.md's accessibility section
// requires focus to stay on the toggle button through the attendance save
// cycle, but a browser can never keep focus on a natively `disabled`
// element. `aria-disabled` keeps the button focusable and in the tab order;
// the click handler is guarded so it's still a no-op while disabled.
export function ToggleButton({
  pressed,
  onToggle,
  disabled = false,
  children,
}: ToggleButtonProps) {
  function handleClick() {
    if (disabled) return;
    onToggle();
  }

  const className = [
    "min-h-11 min-w-11 rounded-md border px-4 font-medium",
    pressed
      ? "border-blue-600 bg-blue-600 text-white"
      : "border-gray-300 bg-white text-gray-900",
    disabled ? "opacity-50" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      type="button"
      aria-pressed={pressed}
      aria-disabled={disabled ? true : undefined}
      onClick={handleClick}
      className={className}
    >
      {pressed ? (
        <span aria-hidden="true" className="mr-1">
          ✓
        </span>
      ) : null}
      {children}
    </button>
  );
}
