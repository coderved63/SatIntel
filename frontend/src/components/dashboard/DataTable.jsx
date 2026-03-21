export default function DataTable({ columns, rows, maxRows = 10 }) {
  if (!rows || rows.length === 0) {
    return <p className="text-slate-500 text-sm text-center py-4">No data</p>;
  }

  const displayRows = rows.slice(0, maxRows);

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-700">
            {columns.map(col => (
              <th key={col.key} className="text-left py-2 px-3 text-xs font-medium text-slate-400 uppercase">
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {displayRows.map((row, i) => (
            <tr key={i} className="border-b border-slate-800 hover:bg-slate-800/50">
              {columns.map(col => (
                <td key={col.key} className="py-2 px-3 text-slate-300">
                  {col.render ? col.render(row[col.key], row) : row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length > maxRows && (
        <p className="text-xs text-slate-500 mt-2 text-center">Showing {maxRows} of {rows.length} rows</p>
      )}
    </div>
  );
}
