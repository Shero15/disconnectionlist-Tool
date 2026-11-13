import { useState } from "react";
import { cn } from "@/utils/cn";

export interface ZoneField {
  id: string;
  label: string;
}

export interface ZoneConfig {
  key: "acc" | "disc" | "ext";
  tag: string;
  title: string;
  columns: string;
  aria: string;
  fields: ZoneField[];
}

export interface ZoneStatus {
  text: string;
  state: "idle" | "loading" | "loaded" | "error";
}

interface Props {
  zone: ZoneConfig;
  letters: Record<string, string>;
  status: ZoneStatus;
  onLetterChange: (fieldId: string, value: string) => void;
  onFiles: (files: File[]) => void;
}

export function DropZone({ zone, letters, status, onLetterChange, onFiles }: Props) {
  const [over, setOver] = useState(false);

  return (
    <div
      data-key={zone.key}
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragEnter={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        const dropped = [...e.dataTransfer.files];
        if (dropped.length) onFiles(dropped);
      }}
      className={cn(
        "relative cursor-pointer rounded-lg border border-dashed border-line px-3.5 py-5 text-center transition-colors",
        "hover:border-accent hover:bg-[#20262c]",
        over && "border-accent bg-[#20262c]",
        status.state === "loaded" && "border-solid border-[#3b5a45]",
      )}
    >
      <input
        type="file"
        multiple
        accept=".xlsx,.xls,.csv"
        aria-label={zone.aria}
        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
        onChange={(e) => {
          const picked = [...(e.target.files ?? [])];
          if (picked.length) onFiles(picked);
          e.target.value = ""; // allow picking the same file again
        }}
      />

      <svg
        width="26"
        height="26"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        aria-hidden="true"
        className="mx-auto text-accent"
      >
        <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
        <path d="M14 3v5h5M9 13h6M9 17h6" />
      </svg>
      <div className="mt-1.5 text-xs tracking-[0.1em] text-muted">{zone.tag}</div>
      <div className="my-0.5 font-semibold">{zone.title}</div>
      <div className="font-mono text-xs text-muted">{zone.columns}</div>

      <div className="relative z-[2] mt-2.5 flex flex-wrap justify-center gap-1.5">
        {zone.fields.map((f) => (
          <label key={f.id} className="flex items-center gap-1 text-[11px] text-muted">
            {f.label}
            <input
              value={letters[f.id] ?? ""}
              maxLength={3}
              spellCheck={false}
              autoComplete="off"
              onChange={(e) => onLetterChange(f.id, e.target.value)}
              className="w-[38px] cursor-text rounded border border-line bg-[#15181a] px-1 py-0.5 text-center font-mono text-xs uppercase text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            />
          </label>
        ))}
      </div>

      <div
        className={cn(
          "mt-1.5 break-all text-xs text-ok empty:hidden",
          status.state === "loading" && "text-muted",
          status.state === "error" && "text-warn",
        )}
      >
        {status.text}
      </div>
    </div>
  );
}
