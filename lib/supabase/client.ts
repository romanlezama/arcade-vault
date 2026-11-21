import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/lib/database.types";
/** Cliente de Supabase para Client Components (navegador). */
export function createClient() {
  // Referencias literales: Next solo inlinea `process.env.NEXT_PUBLIC_*` escritas así.
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url)
    throw new Error("Falta la variable de entorno NEXT_PUBLIC_SUPABASE_URL");
  if (!key)
    throw new Error(
      "Falta la variable de entorno NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    );
  return createBrowserClient<Database>(url, key);
}
