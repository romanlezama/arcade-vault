import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
const NO_STORE = { "Cache-Control": "no-store" };
/** Diagnóstico de la conexión con Supabase: llama a la función SQL `public.health()`. */
export async function GET() {
  // Nunca prerenderizar: sin esto, un fallo de entorno durante el build quedaría congelado.
  await connection();
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("health");
    if (error) throw new Error(error.message);
    if (data !== "ok")
      throw new Error(`Respuesta inesperada de health(): ${String(data)}`);
    return Response.json({ supabase: "ok" }, { headers: NO_STORE });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return Response.json(
      { supabase: "error", message },
      { status: 503, headers: NO_STORE },
    );
  }
}
