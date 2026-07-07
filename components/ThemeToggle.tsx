"use client";

import { useEffect, useState } from "react";

export function ThemeToggle() {
  const [theme, setTheme] = useState("light");

  useEffect(() => {
    const saved = localStorage.getItem("sigap:theme") || "light";
    setTheme(saved);
    document.documentElement.dataset.theme = saved;
  }, []);

  function toggle() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.dataset.theme = next;
    localStorage.setItem("sigap:theme", next);
  }

  return (
    <button type="button" className="theme-toggle" onClick={toggle} aria-label="Toggle tema">
      {theme === "dark" ? "◑" : "◐"}
    </button>
  );
}
