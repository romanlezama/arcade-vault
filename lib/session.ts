"use client";

import { useSyncExternalStore } from "react";

/** Clave "av_user" */
export type SessionUser = { name: string };
/** Clave "av_scores" (array) */
export type SavedScore = { game: string; score: number; name: string; at: number };

const USER_KEY = "av_user";
const SCORES_KEY = "av_scores";

const listeners = new Set<() => void>();

// Respaldo en memoria por si localStorage está bloqueado (modo privado, etc.).
let memoryUser: string | null = null;

// Caché del snapshot: useSyncExternalStore exige devolver la misma referencia
// mientras el valor no cambie.
let cachedRaw: string | null = null;
let cachedUser: SessionUser | null = null;

function readRawUser(): string | null {
  try {
    return localStorage.getItem(USER_KEY);
  } catch {
    return memoryUser;
  }
}

function getSnapshot(): SessionUser | null {
  const raw = readRawUser();
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    try {
      cachedUser = raw ? (JSON.parse(raw) as SessionUser) : null;
    } catch {
      cachedUser = null;
    }
  }
  return cachedUser;
}

function getServerSnapshot(): SessionUser | null {
  return null;
}

function notify() {
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key === null || e.key === USER_KEY) listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

/** Usuario actual. `null` en el servidor y en el primer render del cliente. */
export function useUser(): SessionUser | null {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function signIn(user: SessionUser) {
  const raw = JSON.stringify(user);
  memoryUser = raw;
  try {
    localStorage.setItem(USER_KEY, raw);
  } catch {}
  notify();
}

export function signOut() {
  memoryUser = null;
  try {
    localStorage.removeItem(USER_KEY);
  } catch {}
  notify();
}

export function saveScore(entry: Omit<SavedScore, "at">) {
  try {
    const all = JSON.parse(localStorage.getItem(SCORES_KEY) || "[]") as SavedScore[];
    all.push({ ...entry, at: Date.now() });
    localStorage.setItem(SCORES_KEY, JSON.stringify(all));
  } catch {}
}
