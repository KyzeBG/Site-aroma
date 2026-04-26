"use client";

import * as React from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "outline" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  isLoading?: boolean;
};

const base =
  "inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-[transform,background-color,color,border-color] duration-200 ease-out hover:-translate-y-0.5 active:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 disabled:opacity-50 disabled:pointer-events-none";

const variants: Record<Variant, string> = {
  primary: "bg-primary text-primaryFg hover:bg-primary/90 shadow-soft hover:shadow-card",
  secondary: "bg-muted text-fg hover:bg-muted/80 shadow-soft hover:shadow-card",
  outline: "border border-border bg-transparent hover:bg-muted/60",
  ghost: "bg-transparent hover:bg-muted/60",
  danger: "bg-danger text-dangerFg hover:bg-danger/90 shadow-soft hover:shadow-card"
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-3 text-sm",
  md: "h-11 px-4 text-sm",
  lg: "h-12 px-5 text-base"
};

export function Button({
  className,
  variant = "primary",
  size = "md",
  isLoading,
  children,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(base, variants[variant], sizes[size], className)}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <span
          className="h-4 w-4 rounded-full border-2 border-primaryFg/30 border-t-primaryFg animate-spin"
          aria-hidden="true"
        />
      ) : null}
      <span>{children}</span>
    </button>
  );
}
