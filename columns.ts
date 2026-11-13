export type ZoneKey = "acc" | "disc" | "ext";

export type ColumnLetters = Record<ZoneKey, Record<string, string>>;

/** Convert an Excel-style column letter ("A", "Z", "AB") to a zero-based index. -1 when invalid. */
export function colIndex(letter: string | undefined): number {
  const s = (letter || "").trim().toUpperCase();
  if (!/^[A-Z]{1,3}$/.test(s)) return -1;
  let n = 0;
  for (const ch of s) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
}

/** Normalise an account cell: numbers are rounded, text has spaces/quotes and trailing ".0" removed. */
export function normAcc(v: unknown): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "number") return Number.isFinite(v) ? String(Math.round(v)) : "";
  return String(v).replace(/[\s'"]/g, "").replace(/\.0+$/, "");
}

export function clean(v: unknown): string {
  return v === null || v === undefined ? "" : String(v).trim();
}

/** Real accounts are at least 6 digits. This skips repeated header rows and blank rows. */
export const isAccount = (a: string): boolean => /^\d{6,}$/.test(a);
