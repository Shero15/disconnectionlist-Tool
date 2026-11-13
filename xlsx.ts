import * as XLSX from "xlsx";

export { XLSX };

type Cell = { v?: unknown } | undefined;

/** Read every sheet of a workbook and emit each row as an array of raw cell values. */
export function readXlsx(buf: ArrayBuffer, onRow: (vals: unknown[]) => void): void {
  const wb = XLSX.read(buf, {
    type: "array",
    dense: true,
    cellText: false,
    cellHTML: false,
    cellFormula: false,
    cellStyles: false,
    cellNF: false,
    sheetStubs: false,
  });

  for (const name of wb.SheetNames) {
    const ws = wb.Sheets[name] as unknown as Record<string, unknown>;
    // SheetJS 0.20+ keeps dense rows in "!data"; older builds make the sheet itself an array.
    const rows = (ws["!data"] as Cell[][] | undefined) ?? (ws as unknown as Cell[][]);

    if (Array.isArray(rows)) {
      for (let r = 0; r < rows.length; r++) {
        const cells = rows[r];
        if (!cells) continue;
        const vals: unknown[] = [];
        for (let c = 0; c < cells.length; c++) vals[c] = cells[c] ? cells[c]!.v : "";
        onRow(vals);
      }
    } else {
      const byRow = new Map<number, unknown[]>();
      for (const addr in ws) {
        if (addr[0] === "!") continue;
        const { r, c } = XLSX.utils.decode_cell(addr);
        if (!byRow.has(r)) byRow.set(r, []);
        byRow.get(r)![c] = (ws[addr] as { v?: unknown }).v;
      }
      [...byRow.keys()].sort((a, b) => a - b).forEach((r) => onRow(byRow.get(r)!));
    }
  }
}
