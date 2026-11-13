import { clean, isAccount, normAcc } from "./columns";
import { streamCsv } from "./csv";
import { readXlsx } from "./xlsx";

const tick = () => new Promise<void>((r) => setTimeout(r, 0));

/** A parsed record. Index 0 is always the account; the rest follow the order of the configured columns. */
export type Rec = string[];

/**
 * Read one or more files and pull out the configured columns.
 * `idx[0]` must be the account column. Rows without a valid account number are skipped.
 */
export async function parseFiles(
  files: File[],
  idx: number[],
  onStatus: (msg: string) => void,
): Promise<Rec[]> {
  const out: Rec[] = [];

  const pick = (vals: unknown[]) => {
    const a = normAcc(vals[idx[0]]);
    if (!isAccount(a)) return;
    const rec: Rec = [a];
    for (let k = 1; k < idx.length; k++) rec.push(idx[k] >= 0 ? clean(vals[idx[k]]) : "");
    out.push(rec);
  };

  for (const f of files) {
    const mb = (f.size / 1048576).toFixed(1);
    if (/\.(csv|txt)$/i.test(f.name)) {
      await streamCsv(f, (row) => pick(row), () => {
        onStatus(`Reading ${f.name} (${mb} MB) · ${out.length.toLocaleString()} accounts...`);
      });
    } else {
      onStatus(`Reading ${f.name} (${mb} MB)...`);
      await tick();
      readXlsx(await f.arrayBuffer(), pick);
    }
  }

  return out;
}
