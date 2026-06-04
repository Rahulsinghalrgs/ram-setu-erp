type RecordTableProps = {
  title: string;
  description: string;
  columns: string[];
  rows: Array<Array<string | number>>;
};

export function RecordTable({ title, description, columns, rows }: RecordTableProps) {
  return (
    <section className="surface-panel overflow-hidden rounded-md">
      <div className="border-b bg-white px-4 py-3">
        <h1 className="text-xl font-semibold">{title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="bg-muted/70 text-xs uppercase text-muted-foreground">
            <tr>
              {columns.map((column) => (
                <th key={column} className="px-4 py-3 font-semibold">
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.length ? (
              rows.map((row, rowIndex) => (
                <tr key={`${title}-${rowIndex}`} className="hover:bg-slate-50/80">
                  {row.map((cell, cellIndex) => (
                    <td key={`${title}-${rowIndex}-${cellIndex}`} className="px-4 py-3">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td className="px-4 py-6 text-muted-foreground" colSpan={columns.length}>
                  No records yet. Add the first entry using the form above.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
