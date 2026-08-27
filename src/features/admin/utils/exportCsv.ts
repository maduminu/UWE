export const exportToCSV = (
  filename: string,
  rows: Record<string, any>[],
  onToast?: (msg: string, type?: 'success' | 'error' | 'info') => void
) => {
  if (!rows || rows.length === 0) {
    if (onToast) onToast('No data records available to export', 'info');
    return;
  }
  const headers = Object.keys(rows[0]);
  const csvContent = [
    headers.join(','),
    ...rows.map((row) =>
      headers
        .map((h) => {
          const val = row[h] ?? '';
          const str = String(val).replace(/"/g, '""');
          return `"${str}"`;
        })
        .join(',')
    ),
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  if (onToast) onToast(`📥 Exported ${rows.length} records to ${filename}.csv!`);
};
