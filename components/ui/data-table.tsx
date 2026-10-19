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
}: {
  columns: TableColumn[];
  rows: { id: string; cells: Record<string, ReactNode> }[];
  empty?: ReactNode;
}) {
  if (rows.length === 0 && empty) {
    return (
      <div className="overflow-hidden rounded-xl border border-line bg-card">
        {empty}
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-line bg-card">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-line bg-[#F8F9FB] text-xs text-muted">
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                className={`px-4 py-3 font-medium ${column.className ?? ""}`}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-b border-line last:border-0">
              {columns.map((column) => (
                <td
                  key={column.key}
                  className={`px-4 py-3 align-middle text-foreground ${column.className ?? ""}`}
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
