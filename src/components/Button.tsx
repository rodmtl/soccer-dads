import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";

export interface ButtonProps extends Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "children"
> {
  variant: "primary" | "secondary" | "danger" | "ghost";
  size?: "md" | "sm";
  isLoading?: boolean;
  children: ReactNode;
}

const variantClasses: Record<ButtonProps["variant"], string> = {
  primary: "bg-blue-600 text-white hover:bg-blue-700",
  secondary: "bg-gray-200 text-gray-900 hover:bg-gray-300",
  danger: "bg-red-600 text-white hover:bg-red-700",
  ghost: "bg-transparent text-blue-600 hover:bg-gray-100",
};

const sizeClasses: Record<NonNullable<ButtonProps["size"]>, string> = {
  md: "min-h-11 px-4 text-base",
  sm: "min-h-11 px-3 text-sm",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant,
    size = "md",
    isLoading = false,
    disabled,
    children,
    className,
    type = "button",
    ...rest
  },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled}
      className={[
        "inline-flex items-center justify-center rounded-md font-medium disabled:opacity-50",
        variantClasses[variant],
        sizeClasses[size],
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...rest}
    >
      {isLoading ? (
        <span aria-hidden="true" className="mr-2">
          ⟳
        </span>
      ) : null}
      {children}
    </button>
  );
});
