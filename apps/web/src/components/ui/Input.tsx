"use client";

import * as React from "react";
import { cn } from "@/lib/cn";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export const Input = React.forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, type, ...props },
  ref
) {
  return (
    <input
      ref={ref}
      type={type}
      className={cn(
        "h-11 w-full rounded-xl border border-border bg-card px-3 text-sm text-fg placeholder:text-fg/40 shadow-soft outline-none focus-visible:ring-2 focus-visible:ring-ring/60",
        className
      )}
      {...props}
    />
  );
});

