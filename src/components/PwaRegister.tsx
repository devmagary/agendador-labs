"use client";

import { useEffect } from "react";

export function PwaRegister() {
  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      window.addEventListener("load", () => {
        navigator.serviceWorker
          .register("/sw.js")
          .then((registration) => {
            console.log("PWA ServiceWorker registrado com sucesso:", registration.scope);
          })
          .catch((error) => {
            console.warn("Falha ao registrar ServiceWorker do PWA:", error);
          });
      });
    }
  }, []);

  return null;
}
