import type { Rec } from "./parse";

export interface Row {
  Account: string;
  "Meter Number": string;
  Customer: string;
  Address: string;
}

export interface Stats {
  accounts: number;
  withMeter: number;
  missingMeter: number;
  foundInDisc: number;
}

export const HEADERS = ["Account", "Meter Number", "Customer", "Address"] as const;

/**
 * Build the disconnection list.
 * - The generated accounts file decides which accounts appear (duplicates removed, order kept).
 * - Meter numbers come from the customer extraction.
 * - Customer and address come from the disconnected list first, then from the accounts file.
 */
export function mergeLists(acc: Rec[], disc: Rec[], ext: Rec[]): { rows: Row[]; stats: Stats } {
  const meters = new Map<string, string>();
  for (const [a, m] of ext) if (m && !meters.has(a)) meters.set(a, m);

  const discMap = new Map<string, { customer: string; address: string }>();
  for (const [a, customer, address] of disc) {
    if (!discMap.has(a)) discMap.set(a, { customer, address });
  }

  const seen = new Set<string>();
  const rows: Row[] = [];
  let foundInDisc = 0;

  for (const [a, customer, address] of acc) {
    if (seen.has(a)) continue;
    seen.add(a);
    const d = discMap.get(a);
    if (d) foundInDisc++;
    rows.push({
      Account: a,
      "Meter Number": meters.get(a) || "",
      Customer: (d && d.customer) || customer,
      Address: (d && d.address) || address,
    });
  }

  const withMeter = rows.filter((r) => r["Meter Number"]).length;
  return {
    rows,
    stats: {
      accounts: rows.length,
      withMeter,
      missingMeter: rows.length - withMeter,
      foundInDisc,
    },
  };
}
