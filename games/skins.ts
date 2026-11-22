// Contrato de skins (SPEC 08): ids comunes a todos los juegos reales con
// skins. Sin React ni window: lo usan motores, canvas y GamePlayer.
export type SkinId = "clasico" | "neon" | "retro";
export const SKIN_IDS: readonly SkinId[] = ["clasico", "neon", "retro"];
export const SKIN_LABELS: Record<SkinId, string> = {
  clasico: "CLÁSICO",
  neon: "NEÓN",
  retro: "RETRO",
};
export const DEFAULT_SKIN: SkinId = "clasico";
// Valida lo leído de localStorage.
export function isSkinId(value: unknown): value is SkinId {
  return (
    typeof value === "string" && (SKIN_IDS as readonly string[]).includes(value)
  );
}
