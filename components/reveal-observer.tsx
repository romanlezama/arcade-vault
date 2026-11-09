"use client";

import { useEffect } from "react";

// Añade la clase `in` a cada `.reveal` cuando entra en pantalla (SPEC 02).
// No renderiza nada. Si no hay IntersectionObserver, muestra todo de inmediato.
// Con prefers-reduced-motion, el CSS ya deja `.reveal` visible sin animación.
export function RevealObserver() {
  useEffect(() => {
    const els = document.querySelectorAll<HTMLElement>(".reveal");

    if (typeof IntersectionObserver === "undefined") {
      els.forEach((el) => el.classList.add("in"));
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("in");
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.12 },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  return null;
}
