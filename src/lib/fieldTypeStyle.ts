// Maps a dataSchema field type to a short label + a Tailwind color class,
// used wherever a field type needs a compact visual representation (the
// dashboard's per-app "schema fingerprint" chips today).
export const FIELD_TYPE_STYLE: Record<string, { label: string; dot: string }> = {
  STRING: { label: "Aa", dot: "bg-violet" },
  NUMBER: { label: "#", dot: "bg-mint" },
  BOOLEAN: { label: "?!", dot: "bg-amber" },
  DATE: { label: "31", dot: "bg-ink/60" },
  EMAIL: { label: "@", dot: "bg-violet-deep" },
  SELECT: { label: "▾", dot: "bg-mint" },
};

export function fieldTypeStyle(type: string) {
  return FIELD_TYPE_STYLE[type] ?? { label: "?", dot: "bg-ink/30" };
}