"use client";

import { useEffect, useMemo, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

function isStandalone() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(display-mode: standalone)").matches || (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
}

function isMobileDevice() {
  if (typeof navigator === "undefined") return false;
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}

export function InstallAppPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [installed, setInstalled] = useState(false);

  const mobile = useMemo(() => isMobileDevice(), []);

  useEffect(() => {
    if (isStandalone()) {
      setInstalled(true);
      return;
    }

    const onBeforeInstall = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
      setVisible(true);
    };

    const onInstalled = () => {
      setInstalled(true);
      setVisible(false);
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);

    const timer = window.setTimeout(() => {
      if (!installed && mobile && !deferredPrompt) {
        setVisible(true);
      }
    }, 2500);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
      window.clearTimeout(timer);
    };
  }, [deferredPrompt, installed, mobile]);

  if (installed || !visible || !mobile) return null;

  async function handleInstall() {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    try {
      await deferredPrompt.userChoice;
    } finally {
      setDeferredPrompt(null);
      setVisible(false);
    }
  }

  const hasNativePrompt = Boolean(deferredPrompt);

  return (
    <div className="install-app-banner" role="dialog" aria-live="polite" aria-label="Install aplikasi SIGAP HSE">
      <div>
        <div className="install-app-title">Pasang SIGAP HSE</div>
        <div className="install-app-subtitle">
          {hasNativePrompt
            ? "Buka sebagai aplikasi penuh layar di perangkat mobile untuk akses yang lebih cepat dan konsisten."
            : "Di iPhone atau browser yang tidak mendukung prompt otomatis, buka menu Share lalu pilih Add to Home Screen."}
        </div>
      </div>
      <div className="install-app-actions">
        {hasNativePrompt ? (
          <>
            <button type="button" className="admin-btn admin-btn-sm" onClick={() => setVisible(false)}>
              Nanti
            </button>
            <button type="button" className="admin-btn admin-btn-primary admin-btn-sm" onClick={handleInstall}>
              Pasang
            </button>
          </>
        ) : (
          <button type="button" className="admin-btn admin-btn-primary admin-btn-sm" onClick={() => setVisible(false)}>
            Tutup
          </button>
        )}
      </div>
    </div>
  );
}
