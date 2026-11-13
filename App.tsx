import { useDeferredValue, useMemo, useRef, useState } from "react";
import { Button } from "@/components/Button";
import { DropZone, type ZoneConfig, type ZoneStatus } from "@/components/DropZone";
import { ResultsTable } from "@/components/ResultsTable";
import { StatsGrid } from "@/components/StatsGrid";
import { colIndex, type ColumnLetters, type ZoneKey } from "@/lib/columns";
import { copyRows, downloadCsv, downloadXlsx } from "@/lib/export";
import { HEADERS, mergeLists, type Row, type Stats } from "@/lib/merge";
import { parseFiles, type Rec } from "@/lib/parse";

const ZONES: ZoneConfig[] = [
  {
    key: "acc",
    tag: "ACC",
    title: "Generated accounts",
    columns: "Account · Customer · Address",
    aria: "Upload generated accounts files",
    fields: [
      { id: "account", label: "Acc" },
      { id: "customer", label: "Name" },
      { id: "address", label: "Addr" },
    ],
  },
  {
    key: "disc",
    tag: "DISC",
    title: "Disconnected list",
    columns: "Account · Customer · Address",
    aria: "Upload disconnected list files",
    fields: [
      { id: "account", label: "Acc" },
      { id: "customer", label: "Name" },
      { id: "address", label: "Addr" },
    ],
  },
  {
    key: "ext",
    tag: "EXT",
    title: "Customer extraction",
    columns: "Account · Meter number",
    aria: "Upload customer extraction files",
    fields: [
      { id: "account", label: "Acc" },
      { id: "meter", label: "Meter" },
    ],
  },
];

const DEFAULT_LETTERS: ColumnLetters = {
  acc: { account: "B", customer: "A", address: "D" },
  disc: { account: "Z", customer: "Y", address: "T" },
  ext: { account: "L", meter: "V" },
};

const MSG_START = "Add the generated accounts and customer extraction to start.";
const MSG_READY = "Ready. Press Build list.";

const idle: ZoneStatus = { text: "", state: "idle" };

const indicesFor = (key: ZoneKey, letters: ColumnLetters) =>
  ZONES.find((z) => z.key === key)!.fields.map((f) => colIndex(letters[key][f.id]));

export default function App() {
  const [letters, setLetters] = useState<ColumnLetters>(DEFAULT_LETTERS);
  const [status, setStatus] = useState<Record<ZoneKey, ZoneStatus>>({ acc: idle, disc: idle, ext: idle });
  const [msg, setMsg] = useState(MSG_START);
  const [ready, setReady] = useState(false);
  const [building, setBuilding] = useState(false);

  const [result, setResult] = useState<Row[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [dlMsg, setDlMsg] = useState<string | null>(null);

  // Heavy data lives in refs so large files never trigger re-renders.
  const filesRef = useRef<Record<ZoneKey, File[]>>({ acc: [], disc: [], ext: [] });
  const dataRef = useRef<Record<ZoneKey, Rec[]>>({ acc: [], disc: [], ext: [] });
  const parsedWithRef = useRef<Record<ZoneKey, string>>({ acc: "", disc: "", ext: "" });
  const tokenRef = useRef<Record<ZoneKey, number>>({ acc: 0, disc: 0, ext: 0 });

  const setZone = (key: ZoneKey, s: ZoneStatus) => setStatus((prev) => ({ ...prev, [key]: s }));

  const refreshReady = () => {
    const ok = dataRef.current.acc.length > 0 && dataRef.current.ext.length > 0;
    setReady(ok);
    setMsg(ok ? MSG_READY : MSG_START);
  };

  async function parseZone(key: ZoneKey, lt: ColumnLetters) {
    const files = filesRef.current[key];
    if (!files.length) return;
    const idx = indicesFor(key, lt);
    const token = ++tokenRef.current[key];
    const current = () => token === tokenRef.current[key];

    setZone(key, { text: "Reading...", state: "loading" });
    try {
      const out = await parseFiles(files, idx, (text) => {
        if (current()) setZone(key, { text, state: "loading" });
      });
      if (!current()) return;
      dataRef.current[key] = out;
      parsedWithRef.current[key] = idx.join(",");
      const names = files.map((f) => f.name).join(", ");
      if (out.length) {
        setZone(key, { text: `${names} · ${out.length.toLocaleString()} accounts`, state: "loaded" });
      } else {
        setZone(key, {
          text: `${names} · 0 accounts found. Check the column letters.`,
          state: "error",
        });
      }
    } catch (e) {
      if (!current()) return;
      dataRef.current[key] = [];
      parsedWithRef.current[key] = "";
      setZone(key, {
        text:
          "Could not read file: " +
          (e instanceof Error ? e.message : String(e)) +
          ". For very large Excel files, save as CSV UTF-8 and upload that.",
        state: "error",
      });
    }
    refreshReady();
  }

  async function loadFiles(key: ZoneKey, list: File[]) {
    filesRef.current[key] = list;
    await parseZone(key, letters);
  }

  async function build() {
    const must = [indicesFor("ext", letters), indicesFor("acc", letters)];
    if ([must[0][0], must[0][1], must[1][0]].some((i) => i < 0)) {
      setMsg("Check the column letters.");
      return;
    }

    setBuilding(true);
    setMsg("Building...");
    // Re-read any file whose column letters changed since it was parsed.
    for (const z of ZONES) {
      const sig = indicesFor(z.key, letters).join(",");
      if (filesRef.current[z.key].length && parsedWithRef.current[z.key] !== sig) {
        await parseZone(z.key, letters);
      }
    }

    const { rows, stats: s } = mergeLists(dataRef.current.acc, dataRef.current.disc, dataRef.current.ext);
    setResult(rows);
    setStats(s);
    setDlMsg(null);
    setMsg(
      rows.length
        ? `Built ${rows.length.toLocaleString()} rows.`
        : "No accounts found. Check the column letters.",
    );
    setBuilding(false);
  }

  const hay = useMemo(
    () => result.map((r) => HEADERS.map((h) => r[h]).join("\n").toLowerCase()),
    [result],
  );

  const filtered = useMemo(() => {
    const q = deferredSearch.trim().toLowerCase();
    if (!q) return result;
    const out: Row[] = [];
    for (let i = 0; i < result.length; i++) if (hay[i].includes(q)) out.push(result[i]);
    return out;
  }, [result, hay, deferredSearch]);

  const hasResult = result.length > 0;

  async function onCopy() {
    const ok = await copyRows(result);
    setDlMsg(
      ok
        ? `Copied ${result.length.toLocaleString()} rows with headers. Paste into Excel with Ctrl+V.`
        : "Copy was blocked by the browser. Open this page in a normal browser tab and use Download XLSX.",
    );
  }

  function onDownload(kind: "xlsx" | "csv") {
    try {
      if (kind === "xlsx") downloadXlsx(result);
      else downloadCsv(result);
      setDlMsg(`Downloaded ${result.length.toLocaleString()} rows as ${kind.toUpperCase()}.`);
    } catch {
      setDlMsg("Download was blocked by the browser. Use Copy all rows and paste into Excel instead.");
    }
  }

  return (
    <main className="mx-auto max-w-[1040px] px-5 pb-12 pt-8">
      <div className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">
        Collections / Disconnections
      </div>
      <h1 className="mb-1 mt-2 text-[clamp(28px,5vw,40px)] font-semibold tracking-[-0.02em]">
        Disconnection list builder
      </h1>
      <p className="mb-6 text-muted">
        Merge generated accounts with the disconnected list and customer extraction to get meter numbers.
      </p>

      {/* Step 1 */}
      <section aria-labelledby="s1" className="mb-4 rounded-[10px] border border-line bg-card p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 id="s1" className="flex items-center gap-3 text-lg font-semibold">
            <span className="rounded-md bg-[#252b31] px-2 py-1 font-mono text-xs font-normal text-accent">
              01
            </span>
            Add exports
          </h2>
          <span className="text-[13px] text-muted">XLSX or CSV · multiple files</span>
        </div>

        <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-3">
          {ZONES.map((z) => (
            <DropZone
              key={z.key}
              zone={z}
              letters={letters[z.key]}
              status={status[z.key]}
              onLetterChange={(field, value) =>
                setLetters((prev) => ({ ...prev, [z.key]: { ...prev[z.key], [field]: value } }))
              }
              onFiles={(files) => loadFiles(z.key, files)}
            />
          ))}
        </div>

        <p className="mt-3.5 text-[13px] text-muted">
          Customer and address come from the disconnected list first, then from the accounts file. Repeated
          header rows and blank rows are skipped. Everything runs in your browser, files are not uploaded
          anywhere.
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Button variant="primary" disabled={!ready || building} onClick={build}>
            Build list
          </Button>
          <span role="status" aria-live="polite" className="text-[13px] text-muted">
            {msg}
          </span>
        </div>
      </section>

      {/* Step 2 */}
      <section aria-labelledby="s2" className="mb-4 rounded-[10px] border border-line bg-card p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 id="s2" className="flex items-center gap-3 text-lg font-semibold">
            <span className="rounded-md bg-[#252b31] px-2 py-1 font-mono text-xs font-normal text-accent">
              02
            </span>
            Disconnection list
          </h2>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="primary" disabled={!hasResult} onClick={onCopy}>
              Copy all rows
            </Button>
            <Button disabled={!hasResult} onClick={() => onDownload("xlsx")}>
              Download XLSX
            </Button>
            <Button disabled={!hasResult} onClick={() => onDownload("csv")}>
              Download CSV
            </Button>
          </div>
        </div>

        <p role="status" aria-live="polite" className="mb-3.5 text-[13px] text-muted">
          {dlMsg ?? (
            <>
              If downloads are blocked in this preview, click <b>Copy all rows</b>, then paste into a blank
              Excel sheet (Ctrl+V). Open this page in a normal browser tab and the download buttons will
              work too.
            </>
          )}
        </p>

        <StatsGrid stats={stats} />

        <label htmlFor="search" className="sr-only">
          Search results
        </label>
        <input
          id="search"
          type="search"
          placeholder="Search account, meter, name..."
          disabled={!hasResult}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-80 rounded-md border border-line bg-[#15181a] px-2.5 py-2 text-sm text-ink placeholder:text-muted/70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-60"
        />

        <ResultsTable rows={filtered} hasResult={hasResult} />
      </section>
    </main>
  );
}
