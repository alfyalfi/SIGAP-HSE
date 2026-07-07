"use client";

import { useEffect, type ReactNode } from "react";

export function ClientProviders({ children }: { children: ReactNode }) {
  useEffect(() => {
    function blockContextMenu(e: MouseEvent) {
      e.preventDefault();
    }
    document.addEventListener("contextmenu", blockContextMenu);
    return () => document.removeEventListener("contextmenu", blockContextMenu);
  }, []);

  return <>{children}</>;
}
