"use client";

import * as React from "react";
import { Button } from "@/components/ui/Button";

function getInitialTheme() {
  if (typeof window === "undefined") return "light";
  const saved = window.localStorage.getItem("theme");
  if (saved === "light" || saved === "dark") return saved;
  return window.matchMedia?.("(prefers-color-scheme: dark)")?.matches ? "dark" : "light";
}

export function ThemeToggle() {
  const [theme, setTheme] = React.useState<"light" | "dark">(getInitialTheme);

  React.useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", theme === "dark");
    window.localStorage.setItem("theme", theme);
  }, [theme]);

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      aria-label={theme === "dark" ? "Ativar modo claro" : "Ativar modo escuro"}
      onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
    >
      {theme === "dark" ? "Claro" : "Escuro"}
    </Button>
  );
}

