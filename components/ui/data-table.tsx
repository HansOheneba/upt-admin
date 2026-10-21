import type { ReactNode } from "react";

export type TableColumn = {
  key: string;
  header: string;
  className?: string;
};

export function DataTable({
  columns,
  rows,
  empty,
  density = "default",
}: {
  columns: TableColumn[];
  rows: { id: string; cells: Record<string, ReactNode> }[];
  empty?: ReactNode;
  density?: "default" | "queue";
}) {
  if (rows.length === 0 && empty) {
    return (
      <div className="overflow-hidden rounded-[12px] border border-line bg-card">
        {empty}
      </div>
    );
  }

  return (
    <>
      <div className="hidden overflow-x-auto rounded-[12px] border border-line bg-card md:block">
        <table
          className={`w-full text-left text-[13px] ${
            density === "queue" ? "min-w-[880px] table-fixed" : "min-w-[720px]"
          }`}
        >
          <thead className="border-b border-line bg-[#F5F7FA] text-xs text-muted">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={`px-4 font-medium whitespace-nowrap ${
                    density === "queue" ? "h-[42px]" : "py-3"
                  } ${column.className ?? ""}`}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.id}
                className={`border-b border-line last:border-0 ${
                  density === "queue" ? "hover:bg-[#F7F9FC]" : ""
                }`}
              >
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={`px-4 align-middle text-foreground ${
                      density === "queue" ? "h-12" : "py-3"
                    } ${column.className ?? ""}`}
                  >
                    {row.cells[column.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ul className="flex flex-col gap-3 md:hidden">
        {rows.map((row) => (
          <li key={row.id} className="rounded-[12px] border border-line bg-card px-4 py-3">
            <dl className="flex flex-col gap-2.5">
              {columns.map((column) => (
                <div key={column.key} className="flex items-start justify-between gap-3">
                  <dt className="shrink-0 pt-0.5 text-xs text-muted">{column.header}</dt>
                  <dd className="min-w-0 text-right text-sm break-words text-foreground">
                    {row.cells[column.key]}
                  </dd>
                </div>
              ))}
            </dl>
          </li>
        ))}
      </ul>
    </>
  );
}
