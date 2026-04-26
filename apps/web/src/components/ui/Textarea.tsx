"use client";

import * as React from "react";
import { cn } from "@/lib/cn";

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { className, ...props },
  ref
) {
  return (
    <textarea
      ref={ref}
      className={cn(
        "min-h-28 w-full rounded-xl border border-border bg-card px-3 py-2 text-sm text-fg placeholder:text-fg/40 shadow-soft outline-none focus-visible:ring-2 focus-visible:ring-ring/60",
        className
      )}
      {...props}
    />
  );
});

