export default function DataTable({ columns, rows, maxRows = 10 }) {
  if (!rows || rows.length === 0) {
    return <p className="text-sm text-center py-4" style={{ color: 'var(--text-muted)' }}>No data</p>;
  }

  const displayRows = rows.slice(0, maxRows);

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr style={{ borderBottom: '1px solid var(--border)' }}>
            {columns.map(col => (
              <th key={col.key} className="text-left py-2 px-3 text-xs font-medium uppercase" style={{ color: 'var(--text-muted)' }}>
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {displayRows.map((row, i) => (
            <tr key={i}
              style={{ borderBottom: '1px solid var(--bg-card-border)' }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-card-hover)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              {columns.map(col => (
                <td key={col.key} className="py-2 px-3" style={{ color: 'var(--text-secondary)' }}>
                  {col.render ? col.render(row[col.key], row) : row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length > maxRows && (
        <p className="text-xs mt-2 text-center" style={{ color: 'var(--text-muted)' }}>Showing {maxRows} of {rows.length} rows</p>
      )}
    </div>
  );
}
