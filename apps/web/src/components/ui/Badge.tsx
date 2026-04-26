import * as React from "react";
import { cn } from "@/lib/cn";

type Variant = "default" | "accent" | "outline";

export function Badge({
  className,
  variant = "default",
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { variant?: Variant }) {
  const styles: Record<Variant, string> = {
    default: "bg-muted text-fg",
    accent: "bg-accent text-accentFg",
    outline: "border border-border text-fg"
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium",
        styles[variant],
        className
      )}
      {...props}
    />
  );
}

