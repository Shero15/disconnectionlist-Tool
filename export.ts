import { HEADERS, type Row } from "./merge";
import { XLSX } from "./xlsx";

const stamp = () => new Date().toISOString().slice(0, 10);

function makeSheet(rows: Row[]) {
  const ws = XLSX.utils.json_to_sheet(rows, { header: [...HEADERS] });
  ws["!cols"] = [{ wch: 16 }, { wch: 16 }, { wch: 28 }, { wch: 44 }];
  ws["!autofilter"] = { ref: ws["!ref"] as string };
  return ws;
}

export function downloadXlsx(rows: Row[]): void {
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, makeSheet(rows), "Sheet1");
  XLSX.writeFile(wb, `disconnection-list-${stamp()}.xlsx`);
}

export function downloadCsv(rows: Row[]): void {
  const csv = "\ufeff" + XLSX.utils.sheet_to_csv(makeSheet(rows));
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  a.download = `disconnection-list-${stamp()}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}

function legacyCopy(text: string): boolean {
  const ta = document.createElement("textarea");
  ta.value = text;
  ta.setAttribute("readonly", "");
  ta.style.position = "fixed";
  ta.style.opacity = "0";
  document.body.appendChild(ta);
  ta.select();
  let ok = false;
  try {
    ok = document.execCommand("copy");
  } catch {
    ok = false;
  }
  ta.remove();
  return ok;
}

/** Copy all rows as tab-separated text (with headers) so it pastes straight into Excel. */
export async function copyRows(rows: Row[]): Promise<boolean> {
  const flat = (v: unknown) => String(v ?? "").replace(/[\t\r\n]+/g, " ");
  const lines = [HEADERS.join("\t")].concat(
    rows.map((r) => HEADERS.map((h) => flat(r[h])).join("\t")),
  );
  const text = lines.join("\r\n");
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return legacyCopy(text);
  }
}
