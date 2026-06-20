// src/components/ui/button.tsx
import * as React from "react";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?:
    | "primary"
    | "brand"
    | "outline"
    | "outline-surface"
    | "outline-brand"
    | "outline-success"
    | "outline-warning"
    | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className = "", variant = "primary", size = "default", ...props },
    ref,
  ) => {
    const base =
      "inline-flex items-center justify-center font-semibold font-sans transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none cursor-pointer";

    const variants = {
      primary: "bg-brand text-white hover:opacity-85 active:scale-[0.98]",
      brand: "bg-brand text-white hover:opacity-85 active:scale-[0.98]",
      outline:
        "border-2 border-foreground/70 text-foreground hover:border-foreground hover:bg-foreground/5 active:scale-[0.98] dark:border-foreground/40 dark:text-foreground/80 dark:hover:border-foreground/70",
      "outline-surface":
        "border border-divider bg-background text-foreground shadow-[inset_0_0_0_1px_var(--divider)] hover:bg-surface-hover hover:shadow-[inset_0_0_0_1px_var(--navbar-border)] active:scale-[0.98] dark:border-surface-border",
      "outline-brand":
        "border-2 border-brand text-brand bg-brand/10 hover:bg-brand/20 active:scale-[0.98]",
      "outline-success":
        "border-2 border-feedback-success text-feedback-success bg-feedback-success/10 hover:bg-feedback-success/20 active:scale-[0.98]",
      "outline-warning":
        "border-2 border-warning text-warning bg-warning/10 hover:bg-warning/20 active:scale-[0.98]",
      ghost: "text-foreground hover:bg-foreground/5",
    };

    const sizes = {
      default: "px-8 py-4 rounded-full text-lg",
      sm: "px-5 py-2.5 rounded-full text-base",
      lg: "px-10 py-5 rounded-full text-xl",
      icon: "p-2 rounded-full",
    };

    return (
      <button
        ref={ref}
        className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
        {...props}
      />
    );
  },
);

Button.displayName = "Button";

export { Button };
