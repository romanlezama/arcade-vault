"use client";
// Preferencia de skin (SPEC 08). Mismo patrón que lib/session.ts.
import { useSyncExternalStore } from "react";
import { DEFAULT_SKIN, isSkinId, type SkinId } from "@/games/skins";
/** Clave "av_skin": un SkinId en texto plano, global para todos los juegos. */
const SKIN_KEY = "av_skin";
const listeners = new Set<() => void>();
// Respaldo en memoria por si localStorage está bloqueado (modo privado, etc.).
let memorySkin: string | null = null;
function readRawSkin(): string | null {
  try {
    return localStorage.getItem(SKIN_KEY);
  } catch {
    return memorySkin;
  }
}
// SkinId es un string: el snapshot ya es estable sin caché.
function getSnapshot(): SkinId {
  const raw = readRawSkin();
  return isSkinId(raw) ? raw : DEFAULT_SKIN;
}
function getServerSnapshot(): SkinId {
  return DEFAULT_SKIN;
}
function notify() {
  listeners.forEach((l) => l());
}
function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key === null || e.key === SKIN_KEY) listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}
/** Skin elegida. `DEFAULT_SKIN` en el servidor, en el primer render y si lo guardado no es válido. */
export function useSkin(): SkinId {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
export function setSkinPreference(id: SkinId) {
  memorySkin = id;
  try {
    localStorage.setItem(SKIN_KEY, id);
  } catch {}
  notify();
}
