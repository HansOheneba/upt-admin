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
    <div className="overflow-x-auto rounded-[12px] border border-line bg-card">
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
  );
}
