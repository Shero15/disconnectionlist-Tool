const tick = () => new Promise<void>((r) => setTimeout(r, 0));

/**
 * Streaming CSV reader. It handles very large files without loading them fully into memory.
 * Auto-detects the delimiter (comma, semicolon or tab), quoted fields, escaped quotes,
 * CRLF line endings, and quotes that are split across stream chunks.
 */
export async function streamCsv(
  file: File,
  onRow: (row: string[]) => void,
  onProgress: (charsRead: number) => void,
): Promise<void> {
  const reader = file
    .stream()
    .pipeThrough(new TextDecoderStream("utf-8") as unknown as ReadableWritablePair<string, Uint8Array>)
    .getReader();

  let delim: string | null = null;
  let field = "";
  let row: string[] = [];
  let inQ = false;
  let quoteSeen = false;
  let pendingQuote = false; // a closing quote sat at the very end of the previous chunk
  let read = 0;

  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    const s: string = value;

    if (delim === null) {
      const nl = s.indexOf("\n");
      const first = s.slice(0, nl >= 0 ? nl : s.length);
      const count = (c: string) => first.split(c).length;
      delim = [",", ";", "\t"].sort((a, b) => count(b) - count(a))[0];
    }

    let start = 0;

    if (pendingQuote) {
      pendingQuote = false;
      if (s[0] === '"') {
        field += '"'; // it was an escaped quote ("") split across chunks
        start = 1;
      } else {
        inQ = false;
      }
    }

    for (let i = start; i < s.length; i++) {
      const c = s[i];
      if (inQ) {
        if (c === '"') {
          if (i + 1 >= s.length) {
            field += s.slice(start, i);
            start = i + 1;
            pendingQuote = true;
          } else if (s[i + 1] === '"') {
            field += s.slice(start, i + 1);
            i++;
            start = i + 1;
          } else {
            field += s.slice(start, i);
            inQ = false;
            start = i + 1;
          }
        }
      } else if (c === '"' && !quoteSeen && field === "" && start === i) {
        inQ = true;
        quoteSeen = true;
        start = i + 1;
      } else if (c === delim) {
        row.push(field + s.slice(start, i));
        field = "";
        quoteSeen = false;
        start = i + 1;
      } else if (c === "\n" || c === "\r") {
        row.push(field + s.slice(start, i));
        field = "";
        quoteSeen = false;
        if (c === "\r" && s[i + 1] === "\n") i++;
        start = i + 1;
        if (row.length > 1 || row[0] !== "") onRow(row);
        row = [];
      }
    }

    field += s.slice(start);
    read += s.length;
    onProgress(read);
    await tick();
  }

  if (field !== "" || row.length) {
    row.push(field);
    onRow(row);
  }
}
