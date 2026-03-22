/**
 * Export data as CSV file download.
 * @param {Array<Object>} data - Array of objects to export
 * @param {string} filename - Filename without extension
 * @param {Array<{key: string, label: string}>} columns - Optional column config
 */
export function exportToCsv(data, filename = 'export', columns = null) {
  if (!data || data.length === 0) return;

  // Auto-detect columns from first row if not specified
  const cols = columns || Object.keys(data[0]).map(key => ({ key, label: key }));

  // Header row
  const header = cols.map(c => c.label).join(',');

  // Data rows
  const rows = data.map(row =>
    cols.map(c => {
      let val = row[c.key];
      if (val === null || val === undefined) val = '';
      // Escape commas and quotes
      val = String(val);
      if (val.includes(',') || val.includes('"') || val.includes('\n')) {
        val = `"${val.replace(/"/g, '""')}"`;
      }
      return val;
    }).join(',')
  );

  const csv = [header, ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
