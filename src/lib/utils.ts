export function dateTime(
  value: string | null | undefined,
  timeZone = localStorage.getItem('st-timezone') || 'America/Sao_Paulo',
) {
  if (!value) return 'Indisponível';
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone,
  }).format(new Date(value));
}
export function csvDownload(
  name: string,
  rows: (string | number | null | undefined)[][],
) {
  const csv =
    '\uFEFF' +
    rows
      .map((row) =>
        row
          .map((value) => `"${String(value ?? '').replaceAll('"', '""')}"`)
          .join(';'),
      )
      .join('\r\n');
  const url = URL.createObjectURL(
    new Blob([csv], { type: 'text/csv;charset=utf-8' }),
  );
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
}
