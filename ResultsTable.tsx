import { cn } from "@/utils/cn";
import type { Row } from "@/lib/merge";

export const MAX_VISIBLE = 2000;

interface Props {
  rows: Row[];
  hasResult: boolean;
}

const th = "sticky top-0 whitespace-nowrap bg-[#7a3d0c] px-2.5 py-2 text-left font-semibold text-white";

export function ResultsTable({ rows, hasResult }: Props) {
  const visible = rows.slice(0, MAX_VISIBLE);

  return (
    <div className="mt-3 max-h-[520px] overflow-auto rounded-lg border border-line">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr>
            <th className={th}>Account</th>
            <th className={th}>Meter Number</th>
            <th className={th}>Customer</th>
            <th className={th}>Address</th>
          </tr>
        </thead>
        <tbody>
          {!rows.length ? (
            <tr>
              <td colSpan={4} className="p-6 text-center text-muted">
                {hasResult ? "No matching rows." : "No results yet."}
              </td>
            </tr>
          ) : (
            visible.map((r) => (
              <tr key={r.Account} className="even:bg-[#1b1e21]">
                <td className="whitespace-nowrap border-t border-[#262c32] px-2.5 py-[7px] font-mono">
                  {r.Account}
                </td>
                <td
                  className={cn(
                    "whitespace-nowrap border-t border-[#262c32] px-2.5 py-[7px] font-mono",
                    !r["Meter Number"] && "text-warn",
                  )}
                >
                  {r["Meter Number"] || "Not found"}
                </td>
                <td
                  dir="auto"
                  className="whitespace-nowrap border-t border-[#262c32] px-2.5 py-[7px] text-center"
                >
                  {r.Customer}
                </td>
                <td
                  dir="auto"
                  className="whitespace-nowrap border-t border-[#262c32] px-2.5 py-[7px] text-center"
                >
                  {r.Address}
                </td>
              </tr>
            ))
          )}
          {rows.length > MAX_VISIBLE && (
            <tr>
              <td colSpan={4} className="p-6 text-center text-muted">
                Showing {MAX_VISIBLE.toLocaleString()} of {rows.length.toLocaleString()} rows. Download to see
                all.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
