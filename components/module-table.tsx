type ModuleTableProps = {
  title: string;
  description: string;
  columns: string[];
  rows: string[][];
};

export function ModuleTable({ title, description, columns, rows }: ModuleTableProps) {
  return (
    <section className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-normal text-foreground">{title}</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{description}</p>
      </div>
      <div className="overflow-hidden rounded-md border bg-white">
        <table className="w-full min-w-[640px] border-collapse text-left text-sm">
          <thead className="bg-muted text-xs uppercase text-muted-foreground">
            <tr>
              {columns.map((column) => (
                <th key={column} className="px-4 py-3 font-semibold">
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.join("-")} className="border-t">
                {row.map((cell) => (
                  <td key={cell} className="px-4 py-3 text-foreground">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
