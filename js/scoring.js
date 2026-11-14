export function buildResultsListMarkup(results, labelText, esc, wordRenderer) {
  return (results || []).map((item) => `
    <div class="result">
      <strong>${wordRenderer ? wordRenderer(item.word) : esc(item.word)}</strong>
      <span>${item.correct ? '✅' : '✏️ ' + esc(item.answer || labelText)}</span>
    </div>
  `).join('');
}

export function buildHistoryCsv(entries, formatDate, colorName) {
  const rows = [['Player', 'Date', 'Colour', 'Score', 'Total', 'Percent']].concat(
    entries.map((entry) => [
      entry.player,
      formatDate(entry.date),
      colorName(entry.color),
      entry.score,
      entry.total,
      entry.percentage
    ])
  );

  return rows.map((row) => row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(';')).join('\n');
}

export function exportHistory(entries, formatDate, colorName, filename = 'ord-eventyr-resultater.csv') {
  if (!entries.length) return false;
  const csv = '\ufeff' + buildHistoryCsv(entries, formatDate, colorName);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
  return true;
}
